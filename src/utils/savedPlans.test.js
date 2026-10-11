import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSavedPlans } from './savedPlans.js';

test('plans persist across instances and remove corrected records by stable ID', async () => {
  const values = new Map();
  const storage = { getItem: async (key) => values.get(key) || null, setItem: async (key, value) => values.set(key, value) };
  const plans = createSavedPlans(storage);
  assert.deepEqual(await plans.read(), []);
  assert.equal(await plans.toggle({ id: 'one', name: 'Music' }), true);
  assert.equal(await plans.toggle({ id: 'two', name: 'Music' }), true);
  const restarted = createSavedPlans(storage);
  assert.equal((await restarted.read()).length, 2);
  assert.equal(await restarted.toggle({ id: 'one', name: 'Corrected', date: '2027-01-01' }), false);
  assert.deepEqual((await restarted.read()).map((entry) => entry.id), ['two']);
});

test('plans expose storage and corruption failures without claiming success', async () => {
  const failing = createSavedPlans({ getItem: async () => null, setItem: async () => { throw new Error('Unavailable'); } });
  await assert.rejects(failing.toggle({ id: 'one' }), /Unavailable/);
  await assert.rejects(failing.toggle({ name: 'No identity' }), /stable identity/);
  for (const raw of ['{', '{}', '[{"id":"one"}]']) {
    await assert.rejects(createSavedPlans({ getItem: async () => raw }).read());
  }
});
