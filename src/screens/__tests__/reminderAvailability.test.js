import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import * as detailData from '../../utils/detailData.js';
import * as identity from '../../utils/eventIdentity.js';
import * as eventTime from '../../utils/eventTime.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
function nodes(element) { return [element, ...React.Children.toArray(element?.props?.children).flatMap(nodes)]; }

test('unresolved reminder attempts explain failure without permissions, writes or scheduling', async () => {
  for (const { time, stored, ended } of [undefined, 'See details', '00:30'].flatMap(time => [{ stored: false, ended: false }, { stored: true, ended: false }, { stored: true, ended: true }].map(state => ({ time, ...state })))) {
    const event = { id: 'known', name: 'Published', date: time === '00:30' ? '2026-10-25' : '2026-10-17', time };
    const state = []; let cursor = 0; const effects = []; const actions = []; const alerts = [];
    const react = { ...React, useState: (value) => { const index = cursor++; if (!(index in state)) state[index] = value; return [state[index], (next) => { state[index] = next; }]; }, useCallback: (fn) => fn, useEffect: (fn) => effects.push(fn) };
    const native = { ScrollView: 'ScrollView', Text: 'Text', TouchableOpacity: 'TouchableOpacity', Alert: { alert: (message) => alerts.push(message) }, StyleSheet: { create: (value) => value } };
    const imports = { '../components/Text': 'Text', './Text': 'Text', './src/components/Text': { __esModule: true, default: 'Text', TextProvider: 'TextProvider' }, '../hooks/useSpecialFeed': () => {}, react, 'react-native': native, '../i18n': { useLocale: () => ({ t: (key) => key }) }, '../utils/data': { fetchSpecialEvents: async () => [event], fetchWeeklyEvents: async () => [], getSpecialFeedState: () => ({ status: 'current' }), isEnded: () => ended }, '../utils/storage': { getSettings: async () => ({ reminderLeadMinutes: 60 }), getSavedEvents: async () => [], getRemindedEventsStrict: async () => new Set(stored ? ['known'] : []), makeEventKey: () => 'known', setEventReminder: async () => actions.push('write'), removeEventReminder: async () => actions.push('remove') }, '../utils/notifications': { requestPermissions: async () => { actions.push('permission'); return true; }, scheduleOneReminder: async () => actions.push('schedule'), rescheduleAllNotifications: async () => actions.push('reschedule') }, '../utils/detailData': detailData, '../utils/eventIdentity': identity, '../utils/eventTime': eventTime, '../components/EventCard': 'EventCard', '../components/LoadingView': 'LoadingView' };
    const code = transformSync(readFileSync(new URL('../EventDetailScreen.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)((name) => imports[name], module, module.exports);
    const render = () => { cursor = 0; return module.exports.default({ route: { params: { id: 'known', event } } }); };
    render(); effects[0](); await new Promise(setImmediate);
    const tree = nodes(render());
    const card = tree.find((node) => node.type === 'EventCard');
    if (stored) {
      assert.equal(card.props.reminderUnavailable, true);
      assert.ok(tree.some(node => node.props?.children === 'discovery.reminderStoredUnavailable'));
      assert.deepEqual(actions, []);
      await card.props.onToggleReminder();
      assert.deepEqual(actions, ['remove', 'reschedule']);
      assert.equal(nodes(render()).find(node => node.type === 'EventCard').props.reminded, false);
      continue;
    }
    await card.props.onToggleReminder();
    assert.deepEqual(actions, []);
    assert.ok(alerts.includes('discovery.reminderTimeUnknown'));
  }
});
