import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';

test('Internal notes API, migration, and restart persistence', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'itops-notes-test-'));
  const path = join(directory, 'test.sqlite');
  process.env.DB_PATH = path;
  const { app } = await import('../dist/app.js');
  const { database } = await import('../dist/database.js');
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let closed = false;
  async function close() {
    if (closed) return;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    database.close(); closed = true;
  }
  t.after(async () => {
    await close();
    for (const file of [path, `${path}-wal`, `${path}-shm`]) if (existsSync(file)) unlinkSync(file);
    rmdirSync(directory);
  });
  async function request(route, method = 'GET', body) {
    const response = await fetch(`${base}${route}`, {
      method, headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }
  let first, second, third;
  await t.test('new database migrates to version 2 and existing tickets start with empty notes', async () => {
    assert.equal(database.prepare('PRAGMA user_version').get().user_version, 2);
    assert.deepEqual((await request('/tickets/1/notes')).data.notes, []);
    assert.equal((await request('/tickets')).data.tickets.length, 9);
  });
  await t.test('multiple notes append, trim input, and sort oldest first with an ID tie-breaker', async () => {
    const a = await request('/tickets/1/notes', 'POST', { author: '  Test Technician  ', content: "  Checked O'Brien's adapter.\nNo signal detected.  " });
    assert.equal(a.status, 201); first = a.data.note;
    assert.equal(first.ticket_id, 1); assert.equal(first.author, 'Test Technician');
    assert.equal(first.content, "Checked O'Brien's adapter.\nNo signal detected.");
    assert.ok(Number.isFinite(Date.parse(first.created_at)));
    second = (await request('/tickets/1/notes', 'POST', { author: 'Another Technician', content: 'Replaced the adapter and confirmed video output.' })).data.note;
    assert.ok(second.id > first.id);
    assert.deepEqual((await request('/tickets/1/notes')).data.notes, [first, second]);
    assert.deepEqual((await request('/tickets/2/notes')).data.notes, []);
    // Force matching timestamps to verify deterministic ordering independently of clock resolution.
    database.prepare('UPDATE ticket_notes SET created_at = ? WHERE id = ?').run(first.created_at, second.id);
    second.created_at = first.created_at;
    assert.deepEqual((await request('/tickets/1/notes')).data.notes, [first, second]);
  });
  await t.test('invalid note fields, bodies, IDs, and missing parents return useful errors', async () => {
    for (const body of [null, [], {}, { author: '', content: 'Note' }, { author: 'Technician', content: ' ' },
      { author: null, content: 'Note' }, { author: 12, content: 'Note' }, { author: 'Technician', content: null },
      { author: 'a'.repeat(101), content: 'Note' }, { author: 'Technician', content: 'x'.repeat(5001) },
      { author: 'Technician', content: 'Note', ticket_id: 2 }, { author: 'Technician', content: 'Note', created_at: '2026-01-01' }]) {
      const result = await request('/tickets/1/notes', 'POST', body);
      assert.equal(result.status, 400, JSON.stringify(body)); assert.ok(result.data.error.message);
    }
    assert.ok((await request('/tickets/1/notes', 'POST', { author: '', content: 'Note' })).data.error.fields.author);
    for (const id of ['0', '-1', 'bad']) {
      assert.equal((await request(`/tickets/${id}/notes`)).status, 400);
      assert.equal((await request(`/tickets/${id}/notes`, 'POST', { author: 'Tech', content: 'Note' })).status, 400);
    }
    assert.equal((await request('/tickets/999999/notes')).status, 404);
    assert.equal((await request('/tickets/999999/notes', 'POST', { author: 'Tech', content: 'Note' })).status, 404);
    assert.equal((await request('/tickets/1/notes/1', 'PATCH', { content: 'Edit' })).status, 404);
    assert.equal((await request('/tickets/1/notes/1', 'DELETE')).status, 404);
    assert.equal((await request('/tickets/1/notes')).data.notes.length, 2);
  });
  await t.test('resolution retains history, adding to resolved appends, and all reopen statuses retain history', async () => {
    await request('/tickets/1', 'PATCH', { status: 'Resolved' });
    assert.deepEqual((await request('/tickets/1/notes')).data.notes, [first, second]);
    third = (await request('/tickets/1/notes', 'POST', { author: 'Test Technician', content: 'Resolution verified. Keep this solution for future incidents.' })).data.note;
    for (const status of ['Open', 'In Progress', 'Pending']) {
      await request('/tickets/1', 'PATCH', { status });
      const ticket = (await request('/tickets/1')).data.ticket;
      assert.equal(ticket.status, status); assert.equal(ticket.resolved_at, null);
      assert.deepEqual((await request('/tickets/1/notes')).data.notes, [first, second, third]);
    }
    await request('/tickets/1', 'PATCH', { status: 'Resolved' });
  });
  await t.test('foreign keys prevent orphans; existing ticket deletion cascades its own notes', async () => {
    assert.throws(() => database.prepare('INSERT INTO ticket_notes (ticket_id, author, content, created_at) VALUES (?, ?, ?, ?)')
      .run(999999, 'Technician', 'Orphan', new Date().toISOString()), /FOREIGN KEY/);
    await request('/tickets/2/notes', 'POST', { author: 'Technician', content: 'Disposable deletion test.' });
    assert.equal((await request('/tickets/2', 'DELETE')).status, 204);
    assert.equal(database.prepare('SELECT count(*) AS n FROM ticket_notes WHERE ticket_id = 2').get().n, 0);
    assert.deepEqual((await request('/tickets/1/notes')).data.notes, [first, second, third]);
  });
  await t.test('notes and resolved status survive a complete API restart', async () => {
    await close();
    const appModule = new URL('../dist/app.js', import.meta.url).href;
    const dbModule = new URL('../dist/database.js', import.meta.url).href;
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
      import { app } from ${JSON.stringify(appModule)};
      import { database } from ${JSON.stringify(dbModule)};
      const server = app.listen(0, '127.0.0.1');
      await new Promise(resolve => server.once('listening', resolve));
      const base = 'http://127.0.0.1:' + server.address().port + '/api/tickets/1';
      const ticket = (await (await fetch(base)).json()).ticket;
      const notes = (await (await fetch(base + '/notes')).json()).notes;
      console.log(JSON.stringify({ ticket, notes }));
      await new Promise(resolve => server.close(resolve)); database.close();
    `], { env: { ...process.env, DB_PATH: path }, encoding: 'utf8' });
    const result = JSON.parse(output);
    assert.equal(result.ticket.status, 'Resolved'); assert.ok(result.ticket.resolved_at);
    assert.deepEqual(result.notes, [first, second, third]);
  });
  await t.test('migration upgrades a version 1 database without losing or reseeding tickets', () => {
    const dbModule = new URL('../dist/database.js', import.meta.url).href;
    execFileSync(process.execPath, ['--input-type=module', '-e', `
      import { DatabaseSync } from 'node:sqlite';
      const database = new DatabaseSync(process.env.DB_PATH);
      database.exec('DROP TABLE ticket_notes; PRAGMA user_version = 1;'); database.close();
    `], { env: { ...process.env, DB_PATH: path } });
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
      import { database } from ${JSON.stringify(dbModule)};
      console.log(JSON.stringify({ version: database.prepare('PRAGMA user_version').get().user_version,
        count: database.prepare('SELECT count(*) AS n FROM tickets').get().n,
        ticket: database.prepare('SELECT * FROM tickets WHERE id = 1').get(),
        notes: database.prepare('SELECT count(*) AS n FROM ticket_notes').get().n })); database.close();
    `], { env: { ...process.env, DB_PATH: path }, encoding: 'utf8' });
    const result = JSON.parse(output);
    assert.equal(result.version, 2); assert.equal(result.count, 8);
    assert.equal(result.ticket.ticket_number, 'INC-1001'); assert.equal(result.ticket.status, 'Resolved');
    assert.equal(result.notes, 0);
  });
});
