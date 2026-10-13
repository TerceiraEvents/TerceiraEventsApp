import { test } from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSpecialEvents, clearCache, getSpecialFeedState } from './data.js';

async function fixture(run) {
  const original = { fetch: global.fetch, get: AsyncStorage.getItem, set: AsyncStorage.setItem };
  const disk = new Map();
  const state = { text: '- name: Published\n  id: one\n', failure: null, deferred: null, requests: 0 };
  AsyncStorage.getItem = async (key) => disk.get(key) ?? null;
  AsyncStorage.setItem = async (key, text) => { disk.set(key, text); };
  global.fetch = async () => {
    state.requests++;
    if (state.deferred) await state.deferred;
    if (state.failure) throw state.failure;
    return { ok: true, status: 200, text: async () => state.text };
  };
  clearCache();
  try { await run(state, disk); }
  finally {
    global.fetch = original.fetch;
    AsyncStorage.getItem = original.get;
    AsyncStorage.setItem = original.set;
    clearCache();
  }
}

const cacheKey = 'terceiraevents_cache_special';

test('no cache failure differs from a valid empty published dataset', async () => fixture(async (state) => {
  state.failure = new Error('Offline');
  assert.deepEqual(await fetchSpecialEvents(), []);
  assert.equal(getSpecialFeedState().status, 'error');
  state.failure = null; state.text = '[]';
  assert.deepEqual(await fetchSpecialEvents(true), []);
  assert.equal(getSpecialFeedState().status, 'current');
}));

test('legacy disk cache remains usable with explicitly unknown fetch time', async () => fixture(async (state, disk) => {
  disk.set(cacheKey, '- name: Old published record\n  id: one\n  date: 2025-01-01\n');
  state.failure = new Error('Offline');
  assert.equal((await fetchSpecialEvents())[0].name, 'Old published record');
  await fetchSpecialEvents(true);
  assert.equal(getSpecialFeedState().status, 'cached');
  assert.equal(getSpecialFeedState().fetchedAt, null);
  assert.equal(getSpecialFeedState().cacheTimeUnknown, true);
}));

test('all-invalid disk cache is not presented as usable empty cached data', async () => fixture(async (state, disk) => {
  const stored = '- name: 1984\n';
  disk.set(cacheKey, stored); state.failure = new Error('Offline');
  assert.deepEqual(await fetchSpecialEvents(), []);
  assert.equal(getSpecialFeedState().status, 'error');
  assert.equal(disk.get(cacheKey), stored);
}));

test('failed refresh preserves known successful fetch time and reconnect replaces the cache', async () => fixture(async (state, disk) => {
  const initial = await fetchSpecialEvents();
  const timestamp = getSpecialFeedState().fetchedAt;
  assert.ok(timestamp && !Number.isNaN(Date.parse(timestamp)));
  state.failure = new Error('Offline');
  assert.deepEqual(await fetchSpecialEvents(true), initial);
  assert.equal(getSpecialFeedState().status, 'cached');
  assert.equal(getSpecialFeedState().fetchedAt, timestamp);
  assert.equal(getSpecialFeedState().cacheTimeUnknown, false);
  state.failure = null; state.text = '- name: Corrected\n  id: one\n';
  assert.equal((await fetchSpecialEvents(true))[0].name, 'Corrected');
  assert.equal(getSpecialFeedState().status, 'current');
  assert.equal(disk.get(cacheKey), state.text);
}));

test('malformed refresh does not overwrite usable disk or memory records', async () => fixture(async (state, disk) => {
  const initial = await fetchSpecialEvents(); const stored = disk.get(cacheKey);
  for (const invalid of ['not: an array', '- name: 1984\n', '[unterminated']) {
    state.text = invalid;
    assert.deepEqual(await fetchSpecialEvents(true), initial);
    assert.equal(getSpecialFeedState().status, 'cached');
    assert.equal(disk.get(cacheKey), stored);
  }
}));

test('a deferred refresh keeps usable memory events available until it completes', async () => fixture(async (state) => {
  const initial = await fetchSpecialEvents(); let release;
  state.deferred = new Promise((resolve) => { release = resolve; });
  state.text = '- name: Refreshed\n  id: one\n';
  const refreshing = fetchSpecialEvents(true);
  assert.deepEqual(await fetchSpecialEvents(), initial);
  assert.equal(getSpecialFeedState().status, 'current');
  release();
  assert.equal((await refreshing)[0].name, 'Refreshed');
  assert.equal(state.requests, 2);
}));

test('partial legacy cache retains valid records and reports rejection count', async () => fixture(async (state, disk) => {
  disk.set(cacheKey, '- name: Published\n  id: one\n- name: 1984\n');
  state.failure = new Error('Offline');
  assert.equal((await fetchSpecialEvents()).length, 1);
  await fetchSpecialEvents(true);
  assert.equal(getSpecialFeedState().rejectedRecords, 1);
  assert.equal(getSpecialFeedState().cacheTimeUnknown, true);
}));

test('empty disk cache is a valid cached dataset, while unreadable cache is an error', async () => fixture(async (state, disk) => {
  disk.set(cacheKey, '[]'); state.failure = new Error('Offline');
  assert.deepEqual(await fetchSpecialEvents(), []);
  await fetchSpecialEvents(true);
  assert.equal(getSpecialFeedState().status, 'cached');
  clearCache(); disk.set(cacheKey, '[unterminated');
  assert.deepEqual(await fetchSpecialEvents(), []);
  assert.equal(getSpecialFeedState().status, 'error');
}));
