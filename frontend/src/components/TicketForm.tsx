import { useState, type FormEvent } from 'react';
import { ApiError, api, errorMessage } from '../api';
import { categories, priorities, type Ticket, type TicketInput } from '../types';
import { Modal } from './Modal';
export function TicketForm({ onClose, onCreated }: { onClose: () => void; onCreated: (ticket: Ticket) => void }) {
  const [values, setValues] = useState<TicketInput>({ title: '', description: '', requester_name: '', requester_email: '', department: '', category: 'Hardware', priority: 'Medium', status: 'Open', assigned_to: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [fields, setFields] = useState<Record<string, string>>({});
  function change<K extends keyof TicketInput>(key: K, value: TicketInput[K]) { setValues(current => ({ ...current, [key]: value })); setFields(current => ({ ...current, [key]: '' })); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(''); setFields({});
    try { const { ticket } = await api.create(values); onCreated(ticket); }
    catch (error) { setError(errorMessage(error)); if (error instanceof ApiError) setFields(error.fields); }
    finally { setBusy(false); }
  }
  function fieldError(key: string) { return fields[key] ? <span id={`${key}-error`} className="field-error">{fields[key]}</span> : null; }
  return <Modal title="Create a new ticket" busy={busy} onClose={onClose}><form onSubmit={submit} className="ticket-form">
    <p className="form-intro">Tell us what needs attention. New tickets start with an Open status.<br /><span>All fields are required unless marked optional.</span></p>
    {error && <div className="error-panel" role="alert">{error}</div>}
    <fieldset disabled={busy} className="form-grid">
      <label className="full-width">Title<input autoFocus required maxLength={160} value={values.title} onChange={event => change('title', event.target.value)} placeholder="Briefly describe the issue" aria-invalid={Boolean(fields.title)} aria-describedby={fields.title ? 'title-error' : undefined} />{fieldError('title')}</label>
      <label className="full-width">Description<textarea required maxLength={5000} rows={4} value={values.description} onChange={event => change('description', event.target.value)} placeholder="What happened? Include any details that could help IT." aria-invalid={Boolean(fields.description)} aria-describedby={fields.description ? 'description-error' : undefined} />{fieldError('description')}</label>
      <label>Requester name<input required maxLength={100} value={values.requester_name} onChange={event => change('requester_name', event.target.value)} aria-invalid={Boolean(fields.requester_name)} aria-describedby={fields.requester_name ? 'requester_name-error' : undefined} />{fieldError('requester_name')}</label>
      <label>Requester email<input type="email" required maxLength={254} value={values.requester_email} onChange={event => change('requester_email', event.target.value)} placeholder="name@example.com" aria-invalid={Boolean(fields.requester_email)} aria-describedby={fields.requester_email ? 'requester_email-error' : undefined} />{fieldError('requester_email')}</label>
      <label>Department<input required maxLength={100} value={values.department} onChange={event => change('department', event.target.value)} aria-invalid={Boolean(fields.department)} aria-describedby={fields.department ? 'department-error' : undefined} />{fieldError('department')}</label>
      <label>Category<select value={values.category} onChange={event => change('category', event.target.value as TicketInput['category'])}>{categories.map(value => <option key={value}>{value}</option>)}</select>{fieldError('category')}</label>
      <label>Priority<select value={values.priority} onChange={event => change('priority', event.target.value as TicketInput['priority'])}>{priorities.map(value => <option key={value}>{value}</option>)}</select>{fieldError('priority')}</label>
      <label><span>Assigned technician <span className="optional">(optional)</span></span><input maxLength={100} value={values.assigned_to} onChange={event => change('assigned_to', event.target.value)} placeholder="Leave blank for unassigned" aria-invalid={Boolean(fields.assigned_to)} aria-describedby={fields.assigned_to ? 'assigned_to-error' : undefined} />{fieldError('assigned_to')}</label>
    </fieldset>
    <div className="form-actions"><button className="button secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Creating ticket…' : 'Create ticket'}</button></div>
  </form></Modal>;
}
