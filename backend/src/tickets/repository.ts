import { database } from '../database.js';
import { HttpError } from '../errors.js';
import type { Ticket, TicketInput } from './types.js';

export function listTickets(): Ticket[] {
  return database.prepare('SELECT * FROM tickets ORDER BY created_at DESC, id DESC').all() as unknown as Ticket[];
}

export function getTicket(id: number): Ticket {
  const ticket = database.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as unknown as Ticket | undefined;
  if (!ticket) throw new HttpError(404, 'Ticket not found.');
  return ticket;
}

export function createTicket(input: TicketInput): Ticket {
  const now = new Date().toISOString();
  const result = database.prepare(`INSERT INTO tickets
    (title, description, requester_name, requester_email, department, category, priority, status, assigned_to, created_at, updated_at, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(input.title, input.description, input.requester_name, input.requester_email, input.department,
      input.category, input.priority, input.status, input.assigned_to, now, now, input.status === 'Resolved' ? now : null);
  return getTicket(Number(result.lastInsertRowid));
}

export function updateTicket(id: number, patch: Partial<TicketInput>): Ticket {
  const previous = getTicket(id);
  const ticket = { ...previous, ...patch };
  const now = new Date().toISOString();
  const resolved = ticket.status === 'Resolved' ? (previous.resolved_at ?? now) : null;
  // All column names are fixed; user values are bound parameters, never SQL fragments.
  database.prepare(`UPDATE tickets SET title = ?, description = ?, requester_name = ?, requester_email = ?,
    department = ?, category = ?, priority = ?, status = ?, assigned_to = ?, updated_at = ?, resolved_at = ? WHERE id = ?`)
    .run(ticket.title, ticket.description, ticket.requester_name, ticket.requester_email,
      ticket.department, ticket.category, ticket.priority, ticket.status, ticket.assigned_to, now, resolved, id);
  return getTicket(id);
}

export function deleteTicket(id: number): void {
  const result = database.prepare('DELETE FROM tickets WHERE id = ?').run(id);
  if (!result.changes) throw new HttpError(404, 'Ticket not found.');
}
