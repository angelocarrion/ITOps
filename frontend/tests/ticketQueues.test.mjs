import test from 'node:test';
import assert from 'node:assert/strict';
import { selectQueue } from '../src/ticketQueues.ts';

test('active and resolved queues partition the same records by status', () => {
  const tickets = ['Open', 'In Progress', 'Pending', 'Resolved'].map((status, index) => ({ id: index + 1, status }));
  assert.deepEqual(selectQueue(tickets, 'active').map(ticket => ticket.id), [1, 2, 3]);
  assert.deepEqual(selectQueue(tickets, 'resolved').map(ticket => ticket.id), [4]);
  assert.equal(tickets.length, 4);
});

test('resolving removes a ticket from active and reopening restores it for every active status', () => {
  const ticket = { id: 1, status: 'Open' };
  assert.equal(selectQueue([ticket], 'active').length, 1);
  ticket.status = 'Resolved';
  assert.equal(selectQueue([ticket], 'active').length, 0);
  assert.equal(selectQueue([ticket], 'resolved').length, 1);
  for (const status of ['Open', 'In Progress', 'Pending']) {
    ticket.status = status;
    assert.equal(selectQueue([ticket], 'resolved').length, 0);
    assert.equal(selectQueue([ticket], 'active').length, 1);
  }
});

test('empty queues remain empty', () => {
  assert.deepEqual(selectQueue([], 'active'), []);
  assert.deepEqual(selectQueue([], 'resolved'), []);
});
