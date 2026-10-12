import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDetailData } from './detailData.js';
import { resolveEventDetail } from './eventIdentity.js';

test('production detail loading preserves the exact event and saved collection when reminder reading rejects', async () => {
  const event = { id: 'known', name: 'Current event' };
  const saved = [{ id: 'known', event }];
  const result = await loadDetailData({ fetchEvents: async () => [event], readSaved: async () => saved, readReminders: async () => { throw new Error('Reminder storage unavailable'); } });
  assert.equal(resolveEventDetail({ id: 'known', events: result.events, feedState: { status: 'current' } }).event, event);
  assert.deepEqual(result.saved, saved);
  assert.equal(result.reminders, null);
  assert.match(result.reminderError.message, /Reminder storage unavailable/);
});

test('strict reminder reading exposes failures while an empty stored collection is known', async () => {
  const { default: storage } = await import('@react-native-async-storage/async-storage');
  const { getRemindedEventsStrict } = await import('./storage.js');
  const original = storage.getItem;
  try {
    storage.getItem = async () => { throw new Error('Unavailable'); };
    await assert.rejects(getRemindedEventsStrict(), /Unavailable/);
    storage.getItem = async () => '{';
    await assert.rejects(getRemindedEventsStrict());
    storage.getItem = async () => '[]';
    assert.deepEqual([...await getRemindedEventsStrict()], []);
  } finally { storage.getItem = original; }
});
