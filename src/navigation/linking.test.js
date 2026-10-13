import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStateFromPath, getPathFromState } from '@react-navigation/core';
import { createLinking } from './linking.js';

const linking = createLinking({ prefixes: [], parsePath: getStateFromPath, serializeState: getPathFromState });
test('all event entry paths provide a route back to the primary tabs', () => {
  for (const path of ['events/?id=one', 'pt/events/?id=one', 'events/?id=../other', 'events/?id=', 'events/']) {
    const state = linking.getStateFromPath(path, linking.config);
    assert.equal(state.routes[0].name, 'Main');
    assert.equal(state.routes[1].name, 'EventDetail');
  }
  assert.equal(linking.getStateFromPath('events/?id=../other', linking.config).routes[1].params.id, undefined);
});

test('detail URLs serialize only identity and never navigation snapshots', () => {
  const state = { index: 1, routes: [{ name: 'Main' }, { name: 'EventDetail', params: { id: 'one', event: { id: 'one', name: 'Snapshot' } } }] };
  const path = linking.getPathFromState(state, linking.config);
  assert.equal(path, '/events?id=one');
  assert.equal(path.includes('object'), false);
});

test('saved links select the visible Saved events filter rather than a removed tab', () => {
  for (const path of ['saved/', 'pt/saved/']) {
    const state = linking.getStateFromPath(path, linking.config);
    assert.deepEqual(state.routes[0].state.routes, [{ name: 'Events', params: { saved: true, range: 'all' } }]);
  }
});

test('EN/PT discovery URLs round-trip a visible Saved filter as a boolean', () => {
  for (const path of ['special/?saved=1&range=all&kind=exhibition', 'pt/special/?saved=1&range=all&kind=exhibition']) {
    const state = linking.getStateFromPath(path, linking.config);
    assert.ok(state, 'discovery path is recognized');
    const events = state.routes[0].state.routes.find((route) => route.name === 'Events');
    assert.equal(events.params.saved, true);
    assert.equal(events.params.range, 'all');
    assert.equal(events.params.kind, 'exhibition');
    const serialized = linking.getPathFromState(state, linking.config);
    assert.match(serialized, /saved=1/);
    const restored = linking.getStateFromPath(serialized, linking.config);
    assert.equal(restored.routes[0].state.routes.find((route) => route.name === 'Events').params.saved, true);
  }
});
