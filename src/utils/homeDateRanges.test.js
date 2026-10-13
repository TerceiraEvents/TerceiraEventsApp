import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isInRange } from './data.js';

test('date shortcuts include only overlapping Today, Tomorrow and remaining weekend dates', () => {
  const events = [{ name: 'Today', date: '2026-10-13' }, { name: 'Tomorrow', date: '2026-10-14' }, { name: 'Spanning', date: '2026-10-12', end_date: '2026-10-14' }, { name: 'Saturday', date: '2026-10-17' }, { name: 'Sunday', date: '2026-10-18' }, { name: 'Monday', date: '2026-10-19' }];
  for (const [range, today, names] of [['today', '2026-10-13', ['Today', 'Spanning']], ['tomorrow', '2026-10-13', ['Tomorrow', 'Spanning']], ['weekend', '2026-10-13', ['Saturday', 'Sunday']], ['weekend', '2026-10-18', ['Sunday']]]) assert.deepEqual(events.filter(event => isInRange(event, range, today)).map(event => event.name), names);
});
