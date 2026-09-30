import { Router } from 'express';
import { validateId } from '../tickets/validation.js';
import { createNote, listNotes } from './repository.js';
import { validateNote } from './validation.js';

export const noteRouter = Router({ mergeParams: true });
noteRouter.get<{ id: string }>('/', (request, response) => {
  response.json({ notes: listNotes(validateId(request.params.id)) });
});
noteRouter.post<{ id: string }>('/', (request, response) => {
  const id = validateId(request.params.id);
  response.status(201).json({ note: createNote(id, validateNote(request.body)) });
});
