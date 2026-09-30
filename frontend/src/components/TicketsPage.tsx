import { useMemo, useState } from 'react';
import { categories, priorities, statuses, type Ticket } from '../types';
import { TicketTable } from './TicketTable';
import { EmptyState } from './Feedback';
import { Icon } from './Icon';
import { selectQueue, type Queue } from '../ticketQueues';
export function TicketsPage({ tickets, queue, onNew }: { tickets: Ticket[]; queue: Queue; onNew: () => void }) {
  const queueTickets = useMemo(() => selectQueue(tickets, queue), [tickets, queue]);
  const resolved = queue === 'resolved';
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('');
  const [priority, setPriority] = useState(''); const [category, setCategory] = useState('');
  const filtered = useMemo(() => queueTickets.filter(ticket => {
    const haystack = [ticket.ticket_number, ticket.title, ticket.description, ticket.requester_name, ticket.requester_email, ticket.department, ticket.category, ticket.assigned_to].join(' ').toLowerCase();
    return haystack.includes(search.trim().toLowerCase()) && (!status || ticket.status === status) && (!priority || ticket.priority === priority) && (!category || ticket.category === category);
  }), [queueTickets, search, status, priority, category]);
  const hasFilters = Boolean(search || status || priority || category);
  function reset() { setSearch(''); setStatus(''); setPriority(''); setCategory(''); }
  return <section className="panel">
    <div className="panel-heading"><div><h2>{resolved ? 'Resolved ticket archive' : 'Active ticket queue'}</h2><p>{resolved ? 'Look up completed incidents and their internal notes.' : 'Find, triage, and manage Open, In Progress, and Pending requests.'}</p></div><span className="count-chip">{queueTickets.length} tickets</span></div>
    <div className={`filters${resolved ? ' resolved-filters' : ''}`}>
      <label className="search-field"><span className="sr-only">Search tickets</span><Icon name="search" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search tickets, people, or keywords…" /></label>
      {!resolved && <label className="filter-field"><span>Status</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="">All active statuses</option>{statuses.filter(value => value !== 'Resolved').map(value => <option key={value}>{value}</option>)}</select></label>}
      <label className="filter-field"><span>Priority</span><select value={priority} onChange={event => setPriority(event.target.value)}><option value="">All priorities</option>{priorities.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="filter-field"><span>Category</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
    </div>
    <div className="filter-summary"><span role="status">Showing {filtered.length} of {queueTickets.length} tickets</span>{hasFilters && <button className="text-button" onClick={reset}>Clear filters</button>}</div>
    {filtered.length ? <TicketTable tickets={filtered} caption={resolved ? 'Resolved tickets' : 'Active tickets'} /> : hasFilters
      ? <EmptyState title="No matching tickets" message="Try different keywords or clear your filters." action={<button className="button secondary" onClick={reset}>Clear filters</button>} />
      : resolved ? <EmptyState title="No resolved tickets yet" message="Tickets appear here when their status becomes Resolved." />
      : <EmptyState title="No active tickets" message="Your work queue is clear. Create a ticket to start a new request." action={<button className="button primary" onClick={onNew}>New Ticket</button>} />}
  </section>;
}
