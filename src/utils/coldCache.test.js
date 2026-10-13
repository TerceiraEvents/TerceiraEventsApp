import { test } from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as data from './data.js';
import { homeFeedback } from './navigation.js';
import { resolveEventDetail, reconcileSaved } from './eventIdentity.js';

function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
async function flush() { for (let index = 0; index < 25; index++) await Promise.resolve(); }
async function fixture(run) {
  const original = { fetch: global.fetch, get: AsyncStorage.getItem, set: AsyncStorage.setItem };
  const gate = deferred();
  const state = { requests: 0, reads: 0, stored: '- name: Stored\n  id: one\n', text: '- name: Refreshed\n  id: one\n', failure: null };
  global.fetch = async () => { state.requests++; await gate.promise; if (state.failure) throw state.failure; return { ok: true, text: async () => state.text }; };
  AsyncStorage.getItem = async () => { state.reads++; return state.stored; };
  AsyncStorage.setItem = async (key, text) => { state.stored = text; };
  data.clearCache();
  try { await run(state, gate); }
  finally {
    gate.resolve(); await flush();
    global.fetch = original.fetch; AsyncStorage.getItem = original.get; AsyncStorage.setItem = original.set;
    data.clearCache();
  }
}

test('cold legacy disk cache becomes available before a deferred network request completes', async () => fixture(async (state, gate) => {
  let initial;
  const loading = data.fetchSpecialEvents().then((events) => { initial = events; });
  await flush();
  const beforeNetwork = initial;
  gate.resolve(); await loading;
  assert.equal(beforeNetwork?.[0]?.name, 'Stored');
  assert.equal(state.requests, 1);
}));

test('simultaneous force refreshes share one network request and await its completion', async () => fixture(async (state, gate) => {
  let completed = 0;
  const requests = [true, true, true].map((force) => data.fetchSpecialEvents(force).then((events) => { completed++; return events; }));
  await flush();
  const countBeforeRelease = state.requests;
  assert.equal(completed, 0);
  gate.resolve();
  const results = await Promise.all(requests);
  assert.equal(countBeforeRelease, 1);
  assert.ok(results.every((events) => events[0].name === 'Refreshed'));
}));

test('cache-ready and settled refresh updates have truthful state and unsubscribe stops notifications', async () => fixture(async (state, gate) => {
  assert.equal(typeof data.subscribeSpecialEvents, 'function');
  const updates = [];
  const unsubscribe = data.subscribeSpecialEvents((events, feedState) => updates.push({ events, feedState }));
  try {
    const initial = await data.fetchSpecialEvents();
    assert.equal(initial[0].name, 'Stored');
    assert.ok(updates.some((update) => update.events[0]?.name === 'Stored' && update.feedState.refreshing));
    assert.equal(data.getSpecialFeedState().status, 'stored');
    assert.equal(data.getSpecialFeedState().cacheTimeUnknown, true);
    gate.resolve(); await data.fetchSpecialEvents(true);
    const final = updates.at(-1);
    assert.equal(final.events[0].name, 'Refreshed');
    assert.equal(final.feedState.status, 'current');
    assert.equal(final.feedState.refreshing, false);
    assert.ok(final.feedState.fetchedAt);
    unsubscribe(); const count = updates.length;
    await data.fetchSpecialEvents(true);
    assert.equal(updates.length, count);
  } finally { unsubscribe(); }
}));

test('no usable cache waits for publication rather than inventing an empty cached result', async () => fixture(async (state, gate) => {
  state.stored = '- name: 1984\n'; let result;
  const pending = data.fetchSpecialEvents().then((events) => { result = events; });
  await flush(); assert.equal(result, undefined);
  gate.resolve(); await pending;
  assert.equal(result[0].name, 'Refreshed');
  assert.equal(data.getSpecialFeedState().status, 'current');
}));


test('checking cached publication does not establish empty dates or missing identities', () => {
  assert.equal(homeFeedback('stored', 0, false), null);
  const snapshot = { id: 'one', event: { id: 'one', name: 'Saved' } };
  const feedState = { status: 'current', refreshing: true };
  assert.equal(resolveEventDetail({ id: 'one', events: [], feedState }).unavailable, false);
  assert.equal(reconcileSaved([snapshot], [], feedState)[0].unavailable, false);
});

test('a failed background refresh keeps the promptly returned disk record and unknown age', async () => fixture(async (state, gate) => {
  state.failure = new Error('Offline'); let early;
  const initialRequest = data.fetchSpecialEvents().then((events) => { early = events; return events; });
  await flush(); const availableBeforeNetwork = early;
  const refresh = data.fetchSpecialEvents(true);
  gate.resolve(); const initial = await initialRequest; const final = await refresh;
  assert.equal(availableBeforeNetwork?.[0]?.name, 'Stored');
  assert.deepEqual(final, initial);
  assert.equal(data.getSpecialFeedState().status, 'cached');
  assert.equal(data.getSpecialFeedState().refreshing, false);
  assert.equal(data.getSpecialFeedState().cacheTimeUnknown, true);
  assert.equal(state.requests, 1);
}));

test('clearing cache isolates a newer publication from an older in-flight request', async () => fixture(async (state, gate) => {
  state.stored = null;
  const oldGate = deferred(); const newGate = deferred(); let count = 0;
  global.fetch = async () => {
    const index = count++;
    await (index ? newGate.promise : oldGate.promise);
    return { ok: true, text: async () => `- name: ${index ? 'New' : 'Old'}\n  id: one\n` };
  };
  const oldRequest = data.fetchSpecialEvents(true);
  await flush(); data.clearCache();
  const newRequest = data.fetchSpecialEvents(true);
  await flush(); newGate.resolve(); await newRequest;
  oldGate.resolve(); await oldRequest;
  assert.equal((await data.fetchSpecialEvents())[0].name, 'New');
  assert.ok(state.stored.includes('New'));
  assert.equal(count, 2);
  gate.resolve();
}));
