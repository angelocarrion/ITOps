import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';

test('Ticket API integration and SQLite persistence', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'itops-test-'));
  const path = join(directory, 'test.sqlite');
  process.env.DB_PATH = path;
  const { app } = await import('../dist/app.js');
  const { database } = await import('../dist/database.js');
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  let closed = false;
  async function close() {
    if (closed) return;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    database.close();
    closed = true;
  }
  t.after(async () => {
    await close();
    // Only files in the exact directory created by mkdtemp above are removed.
    for (const file of [path, `${path}-wal`, `${path}-shm`]) if (existsSync(file)) unlinkSync(file);
    rmdirSync(directory);
  });
  async function request(route, method = 'GET', body) {
    const response = await fetch(`${base}/api${route}`, {
      method, headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = response.status === 204 ? null : await response.json();
    return { response, data };
  }
  const input = {
    title: "  Test: O'Brien's docking station  ", description: 'A fictional test request.',
    requester_name: 'Test User', requester_email: 'test.user@example.com', department: 'Testing', category: 'Hardware',
  };
  let created;
  await t.test('health and seeded collection', async () => {
    const health = await request('/health');
    assert.equal(health.response.status, 200); assert.equal(health.data.database, 'ok');
    const { data, response } = await request('/tickets');
    assert.equal(response.status, 200); assert.equal(data.tickets.length, 9);
    assert.equal(data.tickets[0].ticket_number, 'INC-1001');
    assert.ok(data.tickets.every(ticket => ticket.requester_email.endsWith('@example.com')));
  });
  await t.test('create defaults, trimmed strings, auto number, and get', async () => {
    const result = await request('/tickets', 'POST', input);
    assert.equal(result.response.status, 201); created = result.data.ticket;
    assert.equal(created.ticket_number, 'INC-1010');
    assert.equal(result.response.headers.get('location'), `/api/tickets/${created.id}`);
    assert.equal(created.title, input.title.trim()); assert.equal(created.status, 'Open');
    assert.equal(created.priority, 'Medium'); assert.equal(created.assigned_to, '');
    assert.equal(created.resolved_at, null); assert.equal(created.created_at, created.updated_at);
    assert.ok(Number.isFinite(Date.parse(created.created_at)));
    assert.deepEqual((await request(`/tickets/${created.id}`)).data.ticket, created);
  });
  await t.test('patch status, priority, assignment, and preserve created timestamp', async () => {
    const { data, response } = await request(`/tickets/${created.id}`, 'PATCH', { status: 'In Progress', priority: 'Critical', assigned_to: 'Test Technician' });
    assert.equal(response.status, 200); assert.equal(data.ticket.status, 'In Progress');
    assert.equal(data.ticket.priority, 'Critical'); assert.equal(data.ticket.assigned_to, 'Test Technician');
    assert.equal(data.ticket.created_at, created.created_at); assert.ok(data.ticket.updated_at >= created.updated_at);
    assert.equal(data.ticket.resolved_at, null);
  });
  await t.test('resolve, preserve resolution on unrelated edit, reopen, and resolve again', async () => {
    const first = (await request(`/tickets/${created.id}`, 'PATCH', { status: 'Resolved' })).data.ticket;
    assert.equal(first.resolved_at, first.updated_at);
    const edited = (await request(`/tickets/${created.id}`, 'PATCH', { priority: 'Low' })).data.ticket;
    assert.equal(edited.resolved_at, first.resolved_at);
    const reopened = (await request(`/tickets/${created.id}`, 'PATCH', { status: 'Open', assigned_to: '' })).data.ticket;
    assert.equal(reopened.resolved_at, null); assert.equal(reopened.assigned_to, '');
    const resolved = (await request(`/tickets/${created.id}`, 'PATCH', { status: 'Resolved' })).data.ticket;
    assert.equal(resolved.resolved_at, resolved.updated_at); assert.ok(resolved.resolved_at >= first.resolved_at);
  });
  await t.test('reject invalid objects, fields, email, enums, nulls, lengths, and read-only values', async () => {
    for (const body of [null, [], {}, { ...input, title: ' ' }, { ...input, title: 'x'.repeat(161) },
      { ...input, requester_email: 'invalid' }, { ...input, category: 'Security' }, { ...input, priority: 'Urgent' },
      { ...input, priority: null }, { ...input, status: null }, { ...input, status: 'Closed' },
      { ...input, assigned_to: 10 }, { ...input, id: 1 }, { ...input, created_at: '2026-01-01' }]) {
      const result = await request('/tickets', 'POST', body);
      assert.equal(result.response.status, 400, JSON.stringify(body)); assert.ok(result.data.error.message);
    }
    for (const body of [{}, { status: 'Closed' }, { ticket_number: 'INC-2' }, { resolved_at: '2026-01-01' }, { assigned_to: null }]) {
      assert.equal((await request(`/tickets/${created.id}`, 'PATCH', body)).response.status, 400);
    }
    const invalid = await request('/tickets', 'POST', { ...input, requester_email: 'bad' });
    assert.ok(invalid.data.error.fields.requester_email);
  });
  await t.test('bad IDs, not-found resources, malformed JSON, and oversized body', async () => {
    for (const id of ['0', '-1', '1x', '9007199254740993']) assert.equal((await request(`/tickets/${id}`)).response.status, 400);
    assert.equal((await request('/tickets/999999')).response.status, 404);
    assert.equal((await request('/tickets/999999', 'PATCH', { status: 'Open' })).response.status, 404);
    assert.equal((await request('/missing')).response.status, 404);
    const malformed = await fetch(`${base}/api/tickets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"title":' });
    assert.equal(malformed.status, 400); assert.match((await malformed.json()).error.message, /invalid JSON/);
    const large = await request('/tickets', 'POST', { ...input, description: 'x'.repeat(40000) });
    assert.equal(large.response.status, 413);
  });
  await t.test('delete and non-reused ticket numbers', async () => {
    const second = (await request('/tickets', 'POST', { ...input, status: 'Resolved' })).data.ticket;
    assert.ok(second.resolved_at);
    const result = await request(`/tickets/${second.id}`, 'DELETE');
    assert.equal(result.response.status, 204); assert.equal(result.data, null);
    assert.equal((await request(`/tickets/${second.id}`)).response.status, 404);
    assert.equal((await request(`/tickets/${second.id}`, 'DELETE')).response.status, 404);
    const next = (await request('/tickets', 'POST', input)).data.ticket;
    assert.ok(next.id > second.id); assert.notEqual(next.ticket_number, second.ticket_number);
    await request(`/tickets/${next.id}`, 'DELETE');
  });
  await t.test('created and updated data survive a fresh process; deleted data is not reseeded', async () => {
    await close();
    const databaseModule = new URL('../dist/database.js', import.meta.url).href;
    const fresh = execFileSync(process.execPath, ['--input-type=module', '-e', `
      import { database } from ${JSON.stringify(databaseModule)};
      console.log(JSON.stringify({ ticket: database.prepare('SELECT * FROM tickets WHERE id = ?').get(${created.id}), count: database.prepare('SELECT count(*) AS n FROM tickets').get().n }));
      database.prepare('DELETE FROM tickets').run(); database.close();
    `], { env: { ...process.env, DB_PATH: path }, encoding: 'utf8' });
    const result = JSON.parse(fresh);
    assert.equal(result.ticket.title, input.title.trim()); assert.equal(result.ticket.status, 'Resolved');
    assert.equal(result.ticket.priority, 'Low'); assert.ok(result.ticket.resolved_at); assert.equal(result.count, 10);
    const count = execFileSync(process.execPath, ['--input-type=module', '-e', `
      import { database } from ${JSON.stringify(databaseModule)};
      console.log(database.prepare('SELECT count(*) AS n FROM tickets').get().n); database.close();
    `], { env: { ...process.env, DB_PATH: path }, encoding: 'utf8' });
    assert.equal(Number(count.trim()), 0);
  });
});
