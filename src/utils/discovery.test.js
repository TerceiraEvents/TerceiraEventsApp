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

test('discovery applies the shared normalized tags and strict legacy family boolean', async () => {
  const { matchesDiscoveryOptions } = await import('./discovery.js');
  assert.equal(matchesDiscoveryOptions({ tags: ['Free', 'Kid-Friendly'] }, { free: true, family: true }), true);
  assert.equal(matchesDiscoveryOptions({ tags: 'free', kid_friendly: true }, { free: true, family: true }), true);
  assert.equal(matchesDiscoveryOptions({ kid_friendly: 'false' }, { family: true }), false);
});

test('locality facets contain only populated validated values in a partial dataset', async () => {
  const { localityCoverage } = await import('./discovery.js');
  const events = [{ name: 'Halloween', locality: 'angra' }, { name: 'Unknown location' }, { name: 'Unsupported value', locality: 'unknown' }];
  assert.deepEqual(localityCoverage(events), { options: ['angra'], confirmed: 1, total: 3 });
  assert.deepEqual(localityCoverage([{ name: 'Unknown location' }]), { options: [], confirmed: 0, total: 1 });
});
