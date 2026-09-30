import express, { type ErrorRequestHandler } from 'express';
import { database } from './database.js';
import { HttpError } from './errors.js';
import { ticketRouter } from './tickets/routes.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (_request, response) => {
  try {
    database.prepare('SELECT 1').get();
    response.json({ status: 'ok', service: 'itops-api', database: 'ok' });
  } catch {
    response.status(503).json({ status: 'error', service: 'itops-api', database: 'unavailable' });
  }
});

app.use('/api/tickets', ticketRouter);
app.use((_request, response) => {
  response.status(404).json({ error: { message: 'API endpoint not found.' } });
});

const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: { message: error.message, fields: error.fields } });
  } else if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.parse.failed') {
    response.status(400).json({ error: { message: 'Request body contains invalid JSON.' } });
  } else if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large') {
    response.status(413).json({ error: { message: 'Request body is too large. Maximum size is 32 KB.' } });
  } else {
    console.error(error);
    response.status(500).json({ error: { message: 'An unexpected server error occurred. Please try again.' } });
  }
};
app.use(errorHandler);
