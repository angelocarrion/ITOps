import type { NoteInput, TicketNote, Ticket, TicketInput, TicketUpdate } from './types';
export class ApiError extends Error {
  constructor(message: string, public fields: Record<string, string> = {}) { super(message); }
}
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the API. Check your connection and try again.');
  }
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new ApiError('The API returned an unreadable response. Check that the backend is running and try again.'); }
  if (!response.ok) {
    let message = 'The request could not be completed.';
    const fields: Record<string, string> = {};
    if (data && typeof data === 'object' && 'error' in data && data.error && typeof data.error === 'object') {
      if ('message' in data.error && typeof data.error.message === 'string') message = data.error.message;
      if ('fields' in data.error && data.error.fields && typeof data.error.fields === 'object') {
        for (const [key, value] of Object.entries(data.error.fields)) if (typeof value === 'string') fields[key] = value;
      }
    }
    throw new ApiError(message, fields);
  }
  return data as T;
}
export const api = {
  list: (signal?: AbortSignal) => request<{ tickets: Ticket[] }>('/tickets', { signal }),
  get: (id: number, signal?: AbortSignal) => request<{ ticket: Ticket }>(`/tickets/${id}`, { signal }),
  create: (ticket: TicketInput) => request<{ ticket: Ticket }>('/tickets', { method: 'POST', body: JSON.stringify(ticket) }),
  update: (id: number, patch: TicketUpdate) => request<{ ticket: Ticket }>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  notes: (id: number, signal?: AbortSignal) => request<{ notes: TicketNote[] }>(`/tickets/${id}/notes`, { signal }),
  addNote: (id: number, note: NoteInput) => request<{ note: TicketNote }>(`/tickets/${id}/notes`, { method: 'POST', body: JSON.stringify(note) }),
};
export function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
