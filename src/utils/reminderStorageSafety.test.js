import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as storage from './storage.js';
import * as data from './data.js';
import * as eventTime from './eventTime.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');

function notificationModule(notifications) {
  const imports = { './eventTime': eventTime, 'expo-notifications': notifications, 'react-native': { Platform: { OS: 'ios' } }, './storage': storage, './data': data, '../i18n/core.js': { t: (key) => key, getLocale: () => 'en' } };
  const code = transformSync(readFileSync(new URL('./notifications.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => imports[name], module, module.exports);
  return module.exports;
}

for (const failure of ['malformed JSON', 'invalid collection', 'read denied', 'write denied']) {
  test(`rescheduling preserves stored reminder bytes and pending notifications when ${failure}`, async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-13T10:00:00Z') });
    const originalRead = AsyncStorage.getItem; const originalWrite = AsyncStorage.setItem;
    const bytes = failure === 'malformed JSON' ? '{INVALID' : failure === 'invalid collection' ? '{"not":"a reminder list"}' : '["2026-10-17|Published"]';
    let persisted = bytes; const actions = []; const pending = ['existing OS request'];
    AsyncStorage.getItem = async (key) => {
      if (key !== 'terceiraevents_reminders') return null;
      actions.push('read');
      if (failure === 'read denied') throw new Error('Read denied');
      return persisted;
    };
    AsyncStorage.setItem = async (key, value) => {
      actions.push('write');
      if (failure === 'write denied') throw new Error('Write denied');
      persisted = value;
    };
    const notifications = { setNotificationHandler() {}, cancelAllScheduledNotificationsAsync: async () => { actions.push('cancel'); pending.length = 0; }, scheduleNotificationAsync: async () => actions.push('schedule') };
    try {
      await assert.rejects(notificationModule(notifications).rescheduleAllNotifications([], []));
      assert.equal(persisted, bytes);
      assert.deepEqual(pending, ['existing OS request']);
      assert.ok(!actions.includes('cancel') && !actions.includes('schedule'));
      if (failure !== 'write denied') assert.ok(!actions.includes('write'));
    } finally { AsyncStorage.getItem = originalRead; AsyncStorage.setItem = originalWrite; }
  });
}

test('rescheduling validates and persists the island-day cleanup before replacing pending requests', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-13T10:00:00Z') });
  const originalRead = AsyncStorage.getItem; const originalWrite = AsyncStorage.setItem;
  let persisted = '["2026-10-12|Ended","2026-10-17|Published"]'; const actions = [];
  AsyncStorage.getItem = async (key) => { actions.push(`read:${key}`); return key === 'terceiraevents_reminders' ? persisted : null; };
  AsyncStorage.setItem = async (key, value) => { actions.push('write'); persisted = value; };
  const notifications = { setNotificationHandler() {}, cancelAllScheduledNotificationsAsync: async () => actions.push('cancel'), scheduleNotificationAsync: async () => actions.push('schedule') };
  try {
    await notificationModule(notifications).rescheduleAllNotifications([{ name: 'Published', date: '2026-10-17', time: '17:30', venue: 'Published venue' }], []);
    assert.deepEqual(JSON.parse(persisted), ['2026-10-17|Published']);
    assert.ok(actions.indexOf('read:terceiraevents_reminders') < actions.indexOf('write'));
    assert.ok(actions.indexOf('write') < actions.indexOf('cancel'));
    assert.ok(actions.indexOf('cancel') < actions.indexOf('schedule'));
  } finally { AsyncStorage.getItem = originalRead; AsyncStorage.setItem = originalWrite; }
});
