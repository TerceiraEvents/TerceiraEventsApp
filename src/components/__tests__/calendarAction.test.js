import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import * as data from '../../utils/data.js';
import * as tags from '../../utils/tags.js';
import * as theme from '../../utils/theme.js';
import * as fields from '../../utils/i18nFields.js';
import * as identity from '../../utils/eventIdentity.js';
import * as eventTime from '../../utils/eventTime.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
function nodes(element) { return [element, ...React.Children.toArray(element?.props?.children).flatMap(nodes)]; }

async function calendarPress(event, options = {}) {
  let payload;
  const alerts = [];
  const react = { ...React, useState: (value) => [value, () => {}] };
  const native = { Platform: { OS: 'ios', Version: '26.5' }, StyleSheet: { create: (value) => value }, View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', Image: 'Image', Alert: { alert: (title, body, buttons) => { alerts.push({ title, body }); if (!options.cancelReview) buttons?.at(-1)?.onPress?.(); } } };
  const calendar = { requestCalendarPermissionsAsync: async () => ({ status: 'granted' }), getCalendarsAsync: async () => [{ id: 'test' }], getDefaultCalendarAsync: async () => ({ id: 'test' }), EntityTypes: { EVENT: 'event' }, createEventAsync: async (_, value) => { payload = value; }, createEventInCalendarAsync: async (value) => { payload = value; return { action: options.action || 'canceled' }; } };
  const imports = { '../components/Text': 'Text', './Text': 'Text', './src/components/Text': { __esModule: true, default: 'Text', TextProvider: 'TextProvider' }, react, 'react-native': native, 'expo-calendar': calendar, '../utils/data': data, '../utils/tags': tags, '../utils/theme': theme, '../utils/i18nFields': fields, '../utils/eventIdentity': identity, '../utils/eventTime': eventTime, '../i18n': { useLocale: () => ({ t: (key) => key, locale: 'en' }) } };
  const code = transformSync(readFileSync(new URL('../EventCard.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => imports[name] || 'Modal', module, module.exports);
  const tree = module.exports.default({ event, calendarEnabled: true });
  await nodes(tree).find((node) => node.props?.accessibilityLabel === 'discovery.calendar').props.onPress();
  await new Promise(setImmediate);
  return { payload, alerts };
}

for (const zone of ['Europe/Oslo', 'UTC', 'Pacific/Kiritimati']) {
  test(`production Calendar action preserves the Azores instant in ${zone}`, async () => {
    const original = process.env.TZ; process.env.TZ = zone;
    try {
      const { payload } = await calendarPress({ id: 'known', name: 'Published', date: '2026-10-17', time: '17:30' });
      assert.equal(payload.startDate.toISOString(), '2026-10-17T17:30:00.000Z');
      assert.equal(payload.timeZone, 'Atlantic/Azores');
    } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
  });
}


test('calendar action exposes source-complete times and keeps cancellation truthful', async () => {
  const { payload, alerts } = await calendarPress({ name: 'Published', date: '2026-10-17', time: '16:00 – 17:30' });
  assert.equal(payload.endDate.toISOString(), '2026-10-17T17:30:00.000Z');
  assert.ok(!alerts.some((alert) => alert.title === 'eventCard.calendarAddedTitle'));
});

test('unknown duration is explicitly reviewed and draft cancellation makes no calendar call', async () => {
  const event = { name: 'Published', date: '2026-10-17', time: '17:30' };
  const accepted = await calendarPress(event);
  assert.equal(accepted.alerts[0].body, 'eventCard.calendarDurationDraft');
  assert.match(accepted.payload.notes, /calendarDurationDraft/);
  const canceled = await calendarPress(event, { cancelReview: true });
  assert.equal(canceled.payload, undefined);
});

test('missing-time multi-day programme exposes reviewed all-day dates including final day', async () => {
  const { payload, alerts } = await calendarPress({ name: 'Programme', date: '2026-10-17', end_date: '2026-10-19' });
  assert.equal(payload.allDay, true);
  assert.equal(payload.startDate.getDate(), 17);
  assert.equal(payload.endDate.getDate(), 20);
  assert.equal(alerts[0].body, 'eventCard.calendarAllDayDraft');
});
