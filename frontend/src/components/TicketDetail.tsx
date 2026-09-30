import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api, errorMessage } from '../api';
import { priorities, statuses, type Ticket, type TicketUpdate } from '../types';
import { Badge } from './Badge';
import { ErrorState, Loading } from './Feedback';
import { formatDate } from './TicketTable';
import { Icon } from './Icon';
import { InternalNotes } from './InternalNotes';
export function TicketDetail({ id, onUpdated }: { id: number; onUpdated: (ticket: Ticket) => void }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [values, setValues] = useState<TicketUpdate>({ status: 'Open', priority: 'Medium', assigned_to: '' });
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [saveError, setSaveError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({}); const [success, setSuccess] = useState(''); const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    api.get(id, controller.signal).then(({ ticket }) => {
      if (controller.signal.aborted) return;
      setTicket(ticket); setValues({ status: ticket.status, priority: ticket.priority, assigned_to: ticket.assigned_to });
    }).catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, revision]);
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setSaveError(''); setSuccess(''); setFields({});
    try {
      const { ticket } = await api.update(id, values);
      setTicket(ticket); setValues({ status: ticket.status, priority: ticket.priority, assigned_to: ticket.assigned_to });
      onUpdated(ticket); setSuccess('Ticket changes saved.');
    } catch (error) { setSaveError(errorMessage(error)); if (error instanceof ApiError) setFields(error.fields); }
    finally { setBusy(false); }
  }
  const dirty = ticket && (values.status !== ticket.status || values.priority !== ticket.priority || values.assigned_to.trim() !== ticket.assigned_to);
  function change<K extends keyof TicketUpdate>(key: K, value: TicketUpdate[K]) { setValues(current => ({ ...current, [key]: value })); setSuccess(''); setFields(current => ({ ...current, [key]: '' })); }
  if (loading) return <Loading message="Loading ticket details…" />;
  if (error) return <ErrorState message={error} retry={() => setRevision(value => value + 1)} />;
  if (!ticket) return null;
  return <><a className="back-link" href={ticket.status === 'Resolved' ? '#/resolved-tickets' : '#/tickets'}><Icon name="arrow" />{ticket.status === 'Resolved' ? 'Back to resolved tickets' : 'Back to tickets'}</a><div className="detail-layout">
    <section className="panel detail-main">
      <div className="detail-heading"><span className="ticket-number">{ticket.ticket_number}</span><div className="badge-group"><Badge value={ticket.priority} kind="priority" /><Badge value={ticket.status} kind="status" /></div></div>
      <h2 className="detail-title">{ticket.title}</h2>
      <div className="detail-section"><h3>Description</h3><p className="description">{ticket.description}</p></div>
      <div className="detail-section"><h3>Request details</h3><dl className="info-grid">
        <div><dt>Requester</dt><dd>{ticket.requester_name}</dd></div><div><dt>Email</dt><dd><a href={`mailto:${ticket.requester_email}`}>{ticket.requester_email}</a></dd></div>
        <div><dt>Department</dt><dd>{ticket.department}</dd></div><div><dt>Category</dt><dd>{ticket.category}</dd></div>
        <div><dt>Assigned technician</dt><dd>{ticket.assigned_to || 'Unassigned'}</dd></div><div><dt>Ticket ID</dt><dd>{ticket.id}</dd></div>
      </dl></div>
      <div className="detail-section"><h3>Timestamps</h3><dl className="info-grid">
        <div><dt>Created</dt><dd><time dateTime={ticket.created_at}>{formatDate(ticket.created_at, true)}</time></dd></div>
        <div><dt>Last updated</dt><dd><time dateTime={ticket.updated_at}>{formatDate(ticket.updated_at, true)}</time></dd></div>
        <div><dt>Resolved</dt><dd>{ticket.resolved_at ? <time dateTime={ticket.resolved_at}>{formatDate(ticket.resolved_at, true)}</time> : 'Not resolved'}</dd></div>
      </dl></div>
      <InternalNotes ticketId={ticket.id} />
    </section>
    <section className="panel update-panel"><h2>Manage ticket</h2><p className="muted">Update triage and ownership.</p><form onSubmit={save}>
      {saveError && <ErrorState message={saveError} />}{success && <div className="success-panel" role="status">{success}</div>}
      <fieldset disabled={busy} className="stacked-fields">
        <label>Status<select value={values.status} onChange={event => change('status', event.target.value as TicketUpdate['status'])}>{statuses.map(value => <option key={value}>{value}</option>)}</select>{fields.status && <span className="field-error">{fields.status}</span>}</label>
        <label>Priority<select value={values.priority} onChange={event => change('priority', event.target.value as TicketUpdate['priority'])}>{priorities.map(value => <option key={value}>{value}</option>)}</select>{fields.priority && <span className="field-error">{fields.priority}</span>}</label>
        <label>Assigned technician<input maxLength={100} value={values.assigned_to} onChange={event => change('assigned_to', event.target.value)} placeholder="Unassigned" aria-invalid={Boolean(fields.assigned_to)} />{fields.assigned_to && <span className="field-error">{fields.assigned_to}</span>}</label>
      </fieldset>
      <p className="form-hint">Leave the technician blank to unassign. Resolving records a timestamp; reopening clears it.</p>
      <button className="button primary full-button" type="submit" disabled={busy || !dirty}>{busy ? 'Saving changes…' : 'Save changes'}</button>
    </form></section>
  </div></>;
}
