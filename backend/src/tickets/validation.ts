import { HttpError } from '../errors.js';
import { categories, priorities, statuses, type TicketInput } from './types.js';

const stringLimits = {
  title: 160, description: 5000, requester_name: 100,
  requester_email: 254, department: 100, assigned_to: 100,
} as const;
const enums = { category: categories, priority: priorities, status: statuses };
const editableFields = [...Object.keys(stringLimits), ...Object.keys(enums)];

export function validateTicket(body: unknown, partial: false): TicketInput;
export function validateTicket(body: unknown, partial: true): Partial<TicketInput>;
export function validateTicket(body: unknown, partial: boolean): Partial<TicketInput> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }
  const input = body as Record<string, unknown>;
  const fields: Record<string, string> = {};
  const cleaned: Record<string, string> = {};
  for (const key of Object.keys(input)) {
    if (!editableFields.includes(key)) fields[key] = 'Unknown or read-only field.';
  }
  for (const [key, limit] of Object.entries(stringLimits)) {
    if (partial && !(key in input)) continue;
    if (!partial && key === 'assigned_to' && !(key in input)) {
      cleaned[key] = '';
      continue;
    }
    const value = input[key];
    if (typeof value !== 'string') {
      fields[key] = 'Must be a string.';
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed && key !== 'assigned_to') fields[key] = 'This field is required.';
    else if (trimmed.length > limit) fields[key] = `Must be ${limit} characters or fewer.`;
    else if (key === 'requester_email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      fields[key] = 'Enter a valid email address.';
    } else cleaned[key] = trimmed;
  }
  for (const [key, allowed] of Object.entries(enums)) {
    if (partial && !(key in input)) continue;
    const value = key in input ? input[key] : (!partial ? (key === 'priority' ? 'Medium' : key === 'status' ? 'Open' : undefined) : undefined);
    if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
      fields[key] = `Must be one of: ${allowed.join(', ')}.`;
    } else cleaned[key] = value;
  }
  if (Object.keys(fields).length) throw new HttpError(400, 'Please correct the ticket fields.', fields);
  if (partial && !Object.keys(cleaned).length) throw new HttpError(400, 'Provide at least one editable ticket field.');
  return cleaned as Partial<TicketInput>;
}

export function validateId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
    throw new HttpError(400, 'Ticket ID must be a positive integer.');
  }
  return id;
}
