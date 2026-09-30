import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { dirname, resolve } from 'node:path';
import { seedTickets } from './tickets/seed.js';

// Relative to this module so the database location does not depend on the working directory.
const directory = new URL('../data/', import.meta.url);
mkdirSync(directory, { recursive: true });
const databasePath = process.env.DB_PATH ? resolve(process.env.DB_PATH) : fileURLToPath(new URL('itops.sqlite', directory));
mkdirSync(dirname(databasePath), { recursive: true });
export const database = new DatabaseSync(databasePath);
database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');

// A versioned, atomic first migration also seeds once. Deleting tickets never reseeds them.
const version = database.prepare('PRAGMA user_version').get() as { user_version: number };
if (version.user_version === 0) {
  database.exec('BEGIN IMMEDIATE');
  try {
    database.exec(`
      CREATE TABLE tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_number TEXT GENERATED ALWAYS AS ('INC-' || (1000 + id)) STORED UNIQUE NOT NULL,
        title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 160),
        description TEXT NOT NULL CHECK(length(trim(description)) BETWEEN 1 AND 5000),
        requester_name TEXT NOT NULL CHECK(length(trim(requester_name)) BETWEEN 1 AND 100),
        requester_email TEXT NOT NULL CHECK(length(trim(requester_email)) BETWEEN 1 AND 254),
        department TEXT NOT NULL CHECK(length(trim(department)) BETWEEN 1 AND 100),
        category TEXT NOT NULL CHECK(category IN ('Hardware', 'Software', 'Network', 'Printer', 'Account Access', 'Microsoft 365', 'Other')),
        priority TEXT NOT NULL CHECK(priority IN ('Low', 'Medium', 'High', 'Critical')),
        status TEXT NOT NULL CHECK(status IN ('Open', 'In Progress', 'Pending', 'Resolved')),
        assigned_to TEXT NOT NULL DEFAULT '' CHECK(length(assigned_to) <= 100),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        resolved_at TEXT,
        CHECK((status = 'Resolved' AND resolved_at IS NOT NULL) OR (status != 'Resolved' AND resolved_at IS NULL))
      );
      CREATE INDEX tickets_created_at ON tickets(created_at DESC, id DESC);
    `);
    const insert = database.prepare(`INSERT INTO tickets
      (title, description, requester_name, requester_email, department, category, priority, status, assigned_to, created_at, updated_at, resolved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const [index, ticket] of seedTickets.entries()) {
      const created = new Date(Date.now() - (index + 1) * 7 * 60 * 60 * 1000).toISOString();
      const updated = new Date(new Date(created).getTime() + 60 * 60 * 1000).toISOString();
      insert.run(ticket.title, ticket.description, ticket.requester_name, ticket.requester_email, ticket.department,
        ticket.category, ticket.priority, ticket.status, ticket.assigned_to, created, updated,
        ticket.status === 'Resolved' ? updated : null);
    }
    database.exec('PRAGMA user_version = 1; COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

// Version 2 is additive: existing tickets and their original IDs are preserved.
if (version.user_version < 2) {
  database.exec('BEGIN IMMEDIATE');
  try {
    database.exec(`
      CREATE TABLE ticket_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        author TEXT NOT NULL CHECK(length(trim(author)) BETWEEN 1 AND 100),
        content TEXT NOT NULL CHECK(length(trim(content)) BETWEEN 1 AND 5000),
        created_at TEXT NOT NULL
      );
      CREATE INDEX ticket_notes_chronology ON ticket_notes(ticket_id, created_at, id);
      PRAGMA user_version = 2;
      COMMIT;
    `);
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
