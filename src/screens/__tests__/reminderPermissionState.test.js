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

test('denied local notification permission leaves Save usable and does not create a reminder', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-12T10:00:00Z') });
  const event = { id: 'known', name: 'Published', date: '2026-10-17', time: '17:30' };
  const state = []; let cursor = 0; const effects = []; const actions = []; const alerts = [];
  const react = { ...React, useState: (value) => { const index = cursor++; if (!(index in state)) state[index] = value; return [state[index], (next) => { state[index] = next; }]; }, useCallback: (fn) => fn, useEffect: (fn) => effects.push(fn) };
  const native = { ScrollView: 'ScrollView', Text: 'Text', TouchableOpacity: 'TouchableOpacity', Alert: { alert: (message) => alerts.push(message) }, StyleSheet: { create: (value) => value } };
  const imports = { './fontHeader': { fontHeaderOptions: (options) => options }, './src/navigation/fontHeader': { fontHeaderOptions: (options) => options }, '../components/TextInput': 'TextInput', './TextInput': 'TextInput', '../utils/nativeFontMetrics': { hasNativeFontMetrics: false }, '../components/markdownRules': { markdownRules: {} }, '../components/Text': 'Text', './Text': 'Text', './src/components/Text': { __esModule: true, default: 'Text', TextProvider: 'TextProvider' }, '../hooks/useSpecialFeed': () => {}, react, 'react-native': native, '../i18n': { useLocale: () => ({ t: (key) => key }) }, '../utils/data': { fetchSpecialEvents: async () => [event], getSpecialFeedState: () => ({ status: 'current' }), isEnded: () => false }, '../utils/storage': { getSettings: async () => ({ reminderLeadMinutes: 60 }), getSavedEvents: async () => [], getRemindedEventsStrict: async () => new Set(), makeEventKey: () => 'known', setEventReminder: async () => actions.push('reminder-write'), toggleSavedEvent: async () => { actions.push('save'); return true; } }, '../utils/notifications': { requestPermissions: async () => false, scheduleOneReminder: async () => actions.push('schedule') }, '../utils/detailData': detailData, '../utils/eventIdentity': identity, '../utils/eventTime': eventTime, '../components/EventCard': 'EventCard', '../components/LoadingView': 'LoadingView' };
  const code = transformSync(readFileSync(new URL('../EventDetailScreen.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => imports[name], module, module.exports);
  const render = () => { cursor = 0; return module.exports.default({ route: { params: { id: 'known', event } } }); };
  render(); effects[0](); await new Promise(setImmediate);
  await nodes(render()).find((node) => node.type === 'EventCard').props.onToggleReminder();
  assert.deepEqual(actions, []);
  assert.ok(alerts.includes('discovery.reminderPermissionDenied'));
  const save = nodes(render()).find((node) => node.type === 'TouchableOpacity' && node.props.accessibilityState);
  assert.equal(save.props.disabled, false);
  await save.props.onPress();
  assert.deepEqual(actions, ['save']);
  assert.equal(nodes(render()).find((node) => node.type === 'TouchableOpacity' && node.props.accessibilityState).props.accessibilityState.selected, true);
});
