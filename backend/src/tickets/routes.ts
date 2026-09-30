import { Router } from 'express';
import { createTicket, deleteTicket, getTicket, listTickets, updateTicket } from './repository.js';
import { validateId, validateTicket } from './validation.js';
import { noteRouter } from '../notes/routes.js';

export const ticketRouter = Router();
ticketRouter.use('/:id/notes', noteRouter);
ticketRouter.get('/', (_request, response) => response.json({ tickets: listTickets() }));
ticketRouter.get('/:id', (request, response) => {
  response.json({ ticket: getTicket(validateId(request.params.id)) });
});
ticketRouter.post('/', (request, response) => {
  const ticket = createTicket(validateTicket(request.body, false));
  response.status(201).location(`/api/tickets/${ticket.id}`).json({ ticket });
});
ticketRouter.patch('/:id', (request, response) => {
  const id = validateId(request.params.id);
  response.json({ ticket: updateTicket(id, validateTicket(request.body, true)) });
});
ticketRouter.delete('/:id', (request, response) => {
  deleteTicket(validateId(request.params.id));
  response.status(204).end();
});
