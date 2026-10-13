import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changeReminder } from './changeReminder.js';
for (const scenario of ['unknown', 'denied', 'schedule-failed', 'added', 'removed']) test(`shared reminder operation: ${scenario}`, async () => {
  const calls = [];
  const event = { id: 'published' };
  const api = {
    date: () => scenario !== 'unknown', settings: async () => ({ reminderLeadMinutes: 60 }),
    permission: async () => { calls.push('permission'); return scenario !== 'denied'; },
    store: async value => { assert.equal(value, event); calls.push('store'); },
    schedule: async () => { calls.push('schedule'); return scenario !== 'schedule-failed'; },
    remove: async () => { calls.push('remove'); }, reschedule: async () => { calls.push('reschedule'); },
    unresolved: () => calls.push('unknown'), denied: () => calls.push('denied'),
  };
  const result = await changeReminder(event, scenario === 'removed', api);
  const expected = { unknown: ['unknown'], denied: ['permission', 'denied'], 'schedule-failed': ['permission', 'store', 'schedule', 'remove', 'unknown'], added: ['permission', 'store', 'schedule'], removed: ['remove', 'reschedule'] };
  assert.deepEqual(calls, expected[scenario]);
  assert.equal(result, scenario === 'added');
});
