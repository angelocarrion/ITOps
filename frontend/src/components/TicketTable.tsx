import type { Ticket } from '../types';
import { openTicket } from '../hooks/useNavigation';
import { Badge } from './Badge';
export function formatDate(value: string, detailed = false): string {
  return new Intl.DateTimeFormat(undefined, detailed ? { dateStyle: 'medium', timeStyle: 'short' } : { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
export function TicketTable({ tickets, caption }: { tickets: Ticket[]; caption: string }) {
  return <div className="table-scroll" tabIndex={0} role="region" aria-label={caption}>
    <table><caption className="sr-only">{caption}</caption>
      <thead><tr>{['Ticket Number', 'Title', 'Requester', 'Category', 'Priority', 'Status', 'Assigned To', 'Created'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{tickets.map(ticket => <tr key={ticket.id} onClick={event => { if (!(event.target as HTMLElement).closest('a')) openTicket(ticket.id); }}>
        <td><a className="ticket-number" href={`#/tickets/${ticket.id}`}>{ticket.ticket_number}</a></td>
        <td className="title-cell"><span title={ticket.title}>{ticket.title}</span></td>
        <td><span className="requester">{ticket.requester_name}</span><span className="cell-subtitle">{ticket.department}</span></td>
        <td>{ticket.category}</td><td><Badge value={ticket.priority} kind="priority" /></td><td><Badge value={ticket.status} kind="status" /></td>
        <td>{ticket.assigned_to || <span className="muted">Unassigned</span>}</td>
        <td className="date-cell"><time dateTime={ticket.created_at} title={formatDate(ticket.created_at, true)}>{formatDate(ticket.created_at)}</time></td>
      </tr>)}</tbody>
    </table>
  </div>;
}
