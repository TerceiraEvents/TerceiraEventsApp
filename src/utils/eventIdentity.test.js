import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventId, eventUrl, reconcileSaved } from './eventIdentity.js';

test('stable IDs preserve links through corrections and distinguish occurrences', () => {
  const event = { id: 'one', name: 'Music', date: '2026-01-01' };
  assert.equal(eventUrl(event), eventUrl({ ...event, name: 'Corrected', date: '2027-01-01' }));
  assert.notEqual(eventUrl(event), eventUrl({ ...event, id: 'two' }));
  assert.equal(eventId({ name: 'Music' }), null);
  assert.equal(eventUrl({ id: '../other' }), null);
});

test('saved snapshots reconcile current records and explicitly retain missing records', () => {
  const saved = [{ id: 'one', event: { id: 'one', name: 'Old' } }, { id: 'two', event: { id: 'two', name: 'Missing' } }];
  const result = reconcileSaved(saved, [{ id: 'one', name: 'Corrected' }]);
  assert.equal(result[0].event.name, 'Corrected');
  assert.equal(result[0].unavailable, false);
  assert.equal(result[1].event.name, 'Missing');
  assert.equal(result[1].unavailable, true);
});
