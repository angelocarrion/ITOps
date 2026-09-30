import { useState } from 'react';
import { useTickets } from './hooks/useTickets';
import { openTicket, useNavigation } from './hooks/useNavigation';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TicketsPage } from './components/TicketsPage';
import { TicketDetail } from './components/TicketDetail';
import { TicketForm } from './components/TicketForm';
import { EmptyState, ErrorState, Loading } from './components/Feedback';
import { Icon } from './components/Icon';
import type { Ticket } from './types';

export default function App() {
  const route = useNavigation();
  const { tickets, loading, error, reload, upsert } = useTickets();
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  const titles = {
    dashboard: ['Dashboard', 'A clear view of your IT service desk.'],
    tickets: ['Tickets', 'Your active IT work queue.'],
    resolved: ['Resolved Tickets', 'Completed incidents and previous solutions.'],
    assets: ['Assets', 'Device management is planned for a future phase.'],
    detail: ['Ticket details', 'Review the request and keep work moving.'],
  };
  function created(ticket: Ticket) { upsert(ticket); setCreating(false); setNotice(`${ticket.ticket_number} created successfully.`); openTicket(ticket.id); }
  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a>
    <Sidebar route={route} ticketStatus={route.page === 'detail' ? tickets.find(ticket => ticket.id === route.id)?.status : undefined} />
    <div className="workspace">
      <header className="topbar"><span>IT Operations <span className="breadcrumb-separator">/</span> <strong>{titles[route.page][0]}</strong></span><span className="workspace-label">Internal workspace</span></header>
      <main className="content" id="main-content" tabIndex={-1}>
        <div className="page-heading"><div><span className="eyebrow">ITOPS / SERVICE DESK</span><h1>{titles[route.page][0]}</h1><p>{titles[route.page][1]}</p></div>{route.page !== 'assets' && <button className="button primary" onClick={() => setCreating(true)}><Icon name="plus" />New Ticket</button>}</div>
        {notice && <div className="success-panel notice" role="status"><span><Icon name="check" />{notice}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}><Icon name="close" /></button></div>}
        {route.page === 'assets' ? <section className="panel"><EmptyState title="Asset management is coming later" message="This phase focuses on tickets. Device tracking will be added in a future phase." action={<a className="button secondary" href="#/tickets">Go to tickets</a>} /></section>
          : route.page === 'detail' ? <TicketDetail key={route.id} id={route.id} onUpdated={upsert} />
          : loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} />
          : route.page === 'dashboard' ? <Dashboard tickets={tickets} onNew={() => setCreating(true)} />
          : <TicketsPage key={route.page} queue={route.page === 'resolved' ? 'resolved' : 'active'} tickets={tickets} onNew={() => setCreating(true)} />}
        <footer className="content-footer">ITOps <span>Internal IT operations · Phase 1</span></footer>
      </main>
    </div>
    {creating && <TicketForm onClose={() => setCreating(false)} onCreated={created} />}
  </div>;
}
