import { test } from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSpecialEvents, clearCache, getSpecialFeedState } from './data.js';

test('refresh preserves valid events across partial and all-invalid responses', async () => {
  const originalFetch = global.fetch;
  const originalGet = AsyncStorage.getItem;
  const originalSet = AsyncStorage.setItem;
  let responseText = '- name: Published\n  id: one\n';
  global.fetch = async () => ({ ok: true, status: 200, text: async () => responseText });
  AsyncStorage.getItem = async () => null;
  AsyncStorage.setItem = async () => {};
  clearCache();
  try {
    const initial = await fetchSpecialEvents(true);
    assert.equal(initial.length, 1);
    responseText += '- name: 1984\n';
    assert.equal((await fetchSpecialEvents(true)).length, 1);
    assert.equal(getSpecialFeedState().status, 'current');
    assert.equal(getSpecialFeedState().rejectedRecords, 1);
    responseText = '- name: 1984\n';
    assert.deepEqual(await fetchSpecialEvents(true), initial);
    assert.equal(getSpecialFeedState().status, 'cached');
    clearCache();
    assert.deepEqual(await fetchSpecialEvents(true), []);
    assert.equal(getSpecialFeedState().status, 'error');
    responseText = '[]';
    assert.deepEqual(await fetchSpecialEvents(true), []);
    assert.equal(getSpecialFeedState().status, 'current');
    assert.equal(getSpecialFeedState().rejectedRecords, 0);
  } finally {
    global.fetch = originalFetch;
    AsyncStorage.getItem = originalGet;
    AsyncStorage.setItem = originalSet;
    clearCache();
  }
});
