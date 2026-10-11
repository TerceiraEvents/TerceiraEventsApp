import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleNotificationNavigation, homeFeedback } from './navigation.js';

test('notification responses target Explore inside the primary navigation', () => {
  const calls = [];
  const navigation = { navigate: (...args) => { assert.ok(['Main', 'EventDetail', 'Weekly', 'Blog', 'Resources', 'Settings', 'SuggestEvent'].includes(args[0]), 'Destination must be a root route'); calls.push(args); } };
  for (const type of ['daily_summary', 'event_reminder']) handleNotificationNavigation(navigation, { type });
  assert.deepEqual(calls, [['Main', { screen: 'Events' }], ['Main', { screen: 'Events' }]]);
  handleNotificationNavigation(navigation, { type: 'unknown' });
  assert.equal(calls.length, 2);
});

test('home distinguishes load failure from an empty published date', () => {
  assert.equal(homeFeedback('error', 0, false), 'error');
  assert.equal(homeFeedback('current', 0, false), 'emptyDate');
  assert.equal(homeFeedback('cached', 3, false), 'cached');
  assert.equal(homeFeedback('current', 3, false), null);
  assert.equal(homeFeedback('loading', 0, true), 'loading');
});
