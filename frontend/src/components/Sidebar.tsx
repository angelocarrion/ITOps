import { Icon } from './Icon';
import type { Route } from '../hooks/useNavigation';
import type { Ticket } from '../types';
export function Sidebar({ route, ticketStatus }: { route: Route; ticketStatus?: Ticket['status'] }) {
  const active = route.page === 'detail' ? (ticketStatus === 'Resolved' ? 'resolved' : 'tickets') : route.page;
  return <aside className="sidebar">
    <a className="brand" href="#/dashboard"><span className="brand-mark">IT</span><span>ITOps<span className="brand-subtitle">SERVICE DESK</span></span></a>
    <div className="nav-label">WORKSPACE</div>
    <nav aria-label="Main navigation">
      <a href="#/dashboard" className={active === 'dashboard' ? 'active' : ''} aria-current={active === 'dashboard' ? 'page' : undefined}><Icon name="dashboard" />Dashboard</a>
      <a href="#/tickets" className={active === 'tickets' ? 'active' : ''} aria-current={active === 'tickets' ? 'page' : undefined}><Icon name="tickets" />Tickets</a>
      <a href="#/resolved-tickets" className={active === 'resolved' ? 'active' : ''} aria-current={active === 'resolved' ? 'page' : undefined}><Icon name="check" />Resolved Tickets</a>
      <a href="#/assets" className={active === 'assets' ? 'active' : ''} aria-current={active === 'assets' ? 'page' : undefined}><Icon name="assets" />Assets<span className="soon">Soon</span></a>
    </nav>
    <div className="sidebar-footer"><span className="workspace-dot" />IT Operations<span>Portfolio workspace · Phase 1</span></div>
  </aside>;
}
