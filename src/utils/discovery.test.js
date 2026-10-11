import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortcutWindow } from './discovery.js';
test('shortcuts use calendar days across year and DST changes', () => {
  assert.deepEqual(shortcutWindow('tomorrow', '2026-12-31'), { start: '2027-01-01', end: '2027-01-01' });
  assert.deepEqual(shortcutWindow('weekend', '2026-10-23'), { start: '2026-10-24', end: '2026-10-25' });
  assert.deepEqual(shortcutWindow('weekend', '2026-10-25'), { start: '2026-10-25', end: '2026-10-25' });
});

test('discovery combines locality, free and family with AND semantics', async () => {
  const { matchesDiscoveryOptions } = await import('./discovery.js');
  const options = { locality: 'angra', free: true, family: true };
  assert.equal(matchesDiscoveryOptions({ locality: 'angra', tags: ['free', 'kid-friendly'] }, options), true);
  assert.equal(matchesDiscoveryOptions({ locality: 'angra', tags: ['free'] }, options), false);
  assert.equal(matchesDiscoveryOptions({ locality: 'praia', tags: ['free', 'kid-friendly'] }, options), false);
  assert.equal(matchesDiscoveryOptions({ locality: 'angra', tags: ['free'], kid_friendly: true }, options), true);
  assert.equal(matchesDiscoveryOptions({}), true);
});
