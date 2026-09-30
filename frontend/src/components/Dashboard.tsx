import type { Ticket } from '../types';
import { Icon } from './Icon';
import { TicketTable } from './TicketTable';
import { EmptyState } from './Feedback';
export function Dashboard({ tickets, onNew }: { tickets: Ticket[]; onNew: () => void }) {
  const metrics = [
    { label: 'Open Tickets', value: tickets.filter(ticket => ticket.status === 'Open').length, detail: 'Awaiting action', icon: 'tickets', color: 'purple' },
    { label: 'In Progress', value: tickets.filter(ticket => ticket.status === 'In Progress').length, detail: 'Being worked on', icon: 'clock', color: 'blue' },
    { label: 'Critical Tickets', value: tickets.filter(ticket => ticket.priority === 'Critical').length, detail: 'Across all statuses', icon: 'alert', color: 'red' },
    { label: 'Resolved Tickets', value: tickets.filter(ticket => ticket.status === 'Resolved').length, detail: 'Completed requests', icon: 'check', color: 'green' },
  ] as const;
  return <>
    <div className="metrics">{metrics.map(metric => <section className="metric-card" key={metric.label} aria-label={metric.label}>
      <div className="metric-top"><span>{metric.label}</span><span className={`metric-icon ${metric.color}`}><Icon name={metric.icon} /></span></div>
      <strong className="metric-value">{metric.value}</strong><p>{metric.detail}</p>
    </section>)}</div>
    <section className="panel"><div className="panel-heading"><div><h2>Recent Tickets</h2><p>The latest requests across your service desk.</p></div><a className="text-link" href="#/tickets">View all tickets <span aria-hidden="true">→</span></a></div>
      {tickets.length ? <TicketTable tickets={tickets.slice(0, 5)} caption="Five most recently created tickets" /> : <EmptyState title="Your service desk is clear" message="Create the first ticket to get started." action={<button className="button primary" onClick={onNew}>New Ticket</button>} />}
      <div className="panel-footer">{tickets.length} total tickets <span>Ordered by creation date</span></div>
    </section>
  </>;
}
