import { database } from '../database.js';
import { getTicket } from '../tickets/repository.js';
import type { NoteInput, TicketNote } from './types.js';

export function listNotes(ticketId: number): TicketNote[] {
  getTicket(ticketId); // An unknown ticket is a 404, not an empty note history.
  return database.prepare('SELECT * FROM ticket_notes WHERE ticket_id = ? ORDER BY created_at ASC, id ASC')
    .all(ticketId) as unknown as TicketNote[];
}

export function createNote(ticketId: number, input: NoteInput): TicketNote {
  getTicket(ticketId);
  const result = database.prepare('INSERT INTO ticket_notes (ticket_id, author, content, created_at) VALUES (?, ?, ?, ?)')
    .run(ticketId, input.author, input.content, new Date().toISOString());
  return database.prepare('SELECT * FROM ticket_notes WHERE id = ?')
    .get(result.lastInsertRowid) as unknown as TicketNote;
}
