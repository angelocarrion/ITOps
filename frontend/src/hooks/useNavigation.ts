import { useEffect, useState } from 'react';
export type Route = { page: 'dashboard' | 'tickets' | 'resolved' | 'assets' } | { page: 'detail'; id: number };
function readRoute(): Route {
  const hash = window.location.hash;
  const match = /^#\/tickets\/([1-9]\d*)$/.exec(hash);
  if (match && Number.isSafeInteger(Number(match[1]))) return { page: 'detail', id: Number(match[1]) };
  if (hash === '#/tickets') return { page: 'tickets' };
  if (hash === '#/resolved-tickets') return { page: 'resolved' };
  if (hash === '#/assets') return { page: 'assets' };
  return { page: 'dashboard' };
}
export function useNavigation() {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const changed = () => setRoute(readRoute());
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  return route;
}
export function openTicket(id: number) { window.location.hash = `/tickets/${id}`; }
