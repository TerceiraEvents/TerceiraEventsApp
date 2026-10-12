import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEventDataset } from './feedState.js';
test('empty published dataset is valid; malformed and error documents cannot overwrite cache', () => {
  assert.deepEqual(validateEventDataset([]), []);
  assert.deepEqual(validateEventDataset([{ name: 'Event' }]), [{ name: 'Event' }]);
  for (const invalid of [null, 'gateway error', {}]) assert.throws(() => validateEventDataset(invalid), /Invalid event dataset/);
});

test('weekly datasets preserve day groups with nested named events', async () => {
  const { validateWeeklyDataset } = await import('./feedState.js');
  const weekly = [{ day: 'Monday', events: [{ name: 'Reading club' }] }, { day: 'Tuesday', events: [] }];
  assert.deepEqual(validateWeeklyDataset(weekly), weekly);
  assert.deepEqual(validateWeeklyDataset([]), []);
  for (const invalid of [{}, [{ name: 'Missing group' }]]) assert.throws(() => validateWeeklyDataset(invalid));
});

test('one invalid record cannot discard valid event records', () => {
  const valid = [{ id: 'one', name: 'Published' }, { id: 'two', name: 'Other' }];
  assert.deepEqual(validateEventDataset([valid[0], { name: 1984 }, valid[1]]), valid);
});


test('skipped records are counted for visible feed warnings', async () => {
  const { inspectEventDataset } = await import('./feedState.js');
  assert.deepEqual(inspectEventDataset([{ name: 'Published' }, null, { name: 1984 }]), { events: [{ name: 'Published' }], rejectedRecords: 2 });
  assert.deepEqual(inspectEventDataset([null]), { events: [], rejectedRecords: 1 });
});
