import type { Ticket } from './types';

export type Queue = 'active' | 'resolved';
export function selectQueue(tickets: Ticket[], queue: Queue): Ticket[] {
  return tickets.filter(ticket => queue === 'resolved'
    ? ticket.status === 'Resolved'
    : ticket.status === 'Open' || ticket.status === 'In Progress' || ticket.status === 'Pending');
}
