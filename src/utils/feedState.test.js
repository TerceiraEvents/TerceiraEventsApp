import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEventDataset } from './feedState.js';
test('empty published dataset is valid; malformed and error documents cannot overwrite cache', () => {
  assert.deepEqual(validateEventDataset([]), []);
  assert.deepEqual(validateEventDataset([{ name: 'Event' }]), [{ name: 'Event' }]);
  for (const invalid of [null, 'gateway error', {}, [null], [{ error: 'unavailable' }]]) assert.throws(() => validateEventDataset(invalid), /Invalid event dataset/);
});
