import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api, errorMessage } from '../api';
import type { NoteInput, TicketNote } from '../types';
import { ErrorState, Loading } from './Feedback';
import { formatDate } from './TicketTable';
import { Icon } from './Icon';

export function InternalNotes({ ticketId }: { ticketId: number }) {
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [values, setValues] = useState<NoteInput>({ author: '', content: '' });
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    api.notes(ticketId, controller.signal)
      .then(({ notes }) => { if (!controller.signal.aborted) setNotes(notes); })
      .catch(error => { if (!controller.signal.aborted) setLoadError(errorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [ticketId, revision]);

  function change(key: keyof NoteInput, value: string) {
    setValues(current => ({ ...current, [key]: value }));
    setFields(current => ({ ...current, [key]: '' }));
    setSuccess('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setSaveError(''); setFields({}); setSuccess('');
    try {
      await api.addNote(ticketId, values);
      setValues(current => ({ author: current.author.trim(), content: '' }));
      setSuccess('Internal note added. Previous notes are preserved.');
      // Refetch the complete authoritative history, including other technicians' notes.
      setRevision(value => value + 1);
    } catch (error) {
      setSaveError(errorMessage(error));
      if (error instanceof ApiError) setFields(error.fields);
    } finally { setBusy(false); }
  }

  return <section className="detail-section internal-notes" aria-labelledby="notes-heading">
    <div className="notes-heading"><div><h3 id="notes-heading">Internal Notes</h3><p>Troubleshooting context and solutions for the IT team.</p></div><span className="internal-label">Internal only</span></div>
    {loading ? <Loading message="Loading internal notes…" /> : loadError
      ? <ErrorState message={loadError} retry={() => setRevision(value => value + 1)} />
      : notes.length ? <ol className="notes-list" aria-label="Internal notes, oldest first">{notes.map(note => <li key={note.id} className="note-entry">
        <div className="note-author-mark" aria-hidden="true">{note.author.charAt(0).toUpperCase()}</div>
        <article className="note-body"><header><strong>{note.author}</strong><time dateTime={note.created_at}>{formatDate(note.created_at, true)}</time></header><p>{note.content}</p></article>
      </li>)}</ol>
      : <div className="notes-empty"><Icon name="tickets" /><div><strong>No internal notes yet</strong><p>Record your first troubleshooting step below.</p></div></div>}
    <form onSubmit={submit} className="note-composer">
      <h4>Add an internal note</h4><p className="form-hint">Notes are appended to this ticket’s history and cannot be edited here.</p>
      {saveError && <ErrorState message={saveError} />}
      {success && <div className="success-panel" role="status">{success}</div>}
      <fieldset disabled={busy} className="stacked-fields">
        <label>Your name<input required maxLength={100} value={values.author} onChange={event => change('author', event.target.value)} placeholder="Technician name" aria-invalid={Boolean(fields.author)} aria-describedby={fields.author ? 'note-author-error' : undefined} />{fields.author && <span className="field-error" id="note-author-error">{fields.author}</span>}</label>
        <label>Note<textarea required maxLength={5000} rows={4} value={values.content} onChange={event => change('content', event.target.value)} placeholder="Document checks performed, findings, or the solution…" aria-invalid={Boolean(fields.content)} aria-describedby={fields.content ? 'note-content-error' : undefined} />{fields.content && <span className="field-error" id="note-content-error">{fields.content}</span>}</label>
      </fieldset>
      <div className="note-composer-footer"><span>Oldest notes first · retained when resolved</span><button className="button primary" type="submit" disabled={busy}>{busy ? 'Adding note…' : 'Add note'}</button></div>
    </form>
  </section>;
}
