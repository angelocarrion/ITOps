import { HttpError } from '../errors.js';
import type { NoteInput } from './types.js';

export function validateNote(body: unknown): NoteInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }
  const input = body as Record<string, unknown>;
  const fields: Record<string, string> = {};
  const output: NoteInput = { author: '', content: '' };
  for (const key of Object.keys(input)) {
    if (key !== 'author' && key !== 'content') fields[key] = 'Unknown or read-only field.';
  }
  for (const key of ['author', 'content'] as const) {
    const value = input[key];
    const limit = key === 'author' ? 100 : 5000;
    if (typeof value !== 'string') fields[key] = 'Must be a string.';
    else if (!value.trim()) fields[key] = 'This field is required.';
    else if (value.trim().length > limit) fields[key] = `Must be ${limit} characters or fewer.`;
    else output[key] = value.trim();
  }
  if (Object.keys(fields).length) throw new HttpError(400, 'Please correct the note fields.', fields);
  return output;
}
