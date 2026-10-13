import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as data from './data.js';
import * as eventTime from './eventTime.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
function scheduler(event) {
  const scheduled = [];
  const notifications = { setNotificationHandler: () => {}, cancelAllScheduledNotificationsAsync: async () => {}, scheduleNotificationAsync: async (payload) => { scheduled.push(payload); } };
  const key = `${event.date}|${event.name}`;
  const imports = { 'expo-notifications': notifications, 'expo-device': { isDevice: true }, 'react-native': { Platform: { OS: 'ios' } }, './storage': { getSettings: async () => ({ reminderLeadMinutes: 60, dailySummaryEnabled: false }), getRemindedEvents: async () => new Set([key]), cleanupPastReminders: async () => {}, makeEventKey: () => key }, './data': data, './eventTime': eventTime, '../i18n/core.js': { getLocale: () => 'en', t: (key) => key } };
  const code = transformSync(readFileSync(new URL('./notifications.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => imports[name], module, module.exports);
  return { ...module.exports, scheduled };
}
for (const zone of ['Europe/Oslo', 'UTC', 'Pacific/Kiritimati']) {
  for (const mode of ['single', 'batch']) {
    test(`production ${mode} reminder uses island instant in ${zone}`, async (t) => {
      const original = process.env.TZ; process.env.TZ = zone;
      t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-12T10:00:00Z') });
      try {
        const event = { date: '2026-10-17', name: 'Published', time: '17:30' };
        const api = scheduler(event);
        if (mode === 'single') await api.scheduleOneReminder(event); else await api.rescheduleAllNotifications([event], []);
        assert.equal(api.scheduled.length, 1);
        assert.equal(api.scheduled[0].trigger.date.toISOString(), '2026-10-17T16:30:00.000Z');
      } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
    });
  }
}
