import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import type { Ticket } from '../types';
export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    api.list(controller.signal)
      .then(data => { if (!controller.signal.aborted) setTickets(data.tickets); })
      .catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  function upsert(ticket: Ticket) {
    setTickets(current => [ticket, ...current.filter(item => item.id !== ticket.id)]
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id));
    setRevision(value => value + 1);
  }
  return { tickets, loading, error, reload: () => setRevision(value => value + 1), upsert };
}
