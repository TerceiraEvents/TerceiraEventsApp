import * as changeReminder from '../../utils/changeReminder.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import * as detailData from '../../utils/detailData.js';
import * as identity from '../../utils/eventIdentity.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
function nodes(element) { return [element, ...React.Children.toArray(element?.props?.children).flatMap(nodes)]; }

test('detail retains event and calendar while failed Saved read exposes Retry and disables toggle', async () => {
  const state = [];
  let cursor = 0;
  const effects = [];
  const react = { ...React, useState: (initial) => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], (value) => { state[index] = value; }]; }, useCallback: (fn) => fn, useEffect: (fn) => { effects.push(fn); } };
  const native = { ScrollView: 'ScrollView', Text: 'Text', TouchableOpacity: 'TouchableOpacity', Alert: { alert: () => {} }, StyleSheet: { create: (value) => value } };
  const event = { id: 'known', name: 'Published event', date: '2026-10-17' };
  let failing = true;
  const imports = { '../utils/changeReminder': changeReminder, './fontHeader': { fontHeaderOptions: (options) => options }, './src/navigation/fontHeader': { fontHeaderOptions: (options) => options }, '../components/TextInput': 'TextInput', './TextInput': 'TextInput', '../utils/nativeFontMetrics': { hasNativeFontMetrics: false }, '../components/markdownRules': { markdownRules: {} }, '../components/Text': 'Text', './Text': 'Text', './src/components/Text': { __esModule: true, default: 'Text', TextProvider: 'TextProvider' }, '../hooks/useSpecialFeed': () => {},
    react, 'react-native': native,
    '../i18n': { useLocale: () => ({ t: (key) => key }) },
    '../utils/data': { fetchSpecialEvents: async () => [event], getSpecialFeedState: () => ({ status: 'current' }), isEnded: () => false },
    '../utils/storage': { getSavedEvents: async () => { if (failing) throw new Error('Unavailable'); return [{ id: 'known', event }]; }, getRemindedEventsStrict: async () => new Set(), makeEventKey: () => 'known', toggleSavedEvent: () => { throw new Error('Must not toggle unknown state'); } },
    '../utils/detailData': detailData, '../utils/eventIdentity': identity, '../components/EventCard': 'EventCard', '../components/LoadingView': 'LoadingView', '../utils/notifications': {},
  };
  const code = transformSync(readFileSync(new URL('../EventDetailScreen.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => imports[name], module, module.exports);
  const render = () => { cursor = 0; return module.exports.default({ route: { params: { id: 'known', event } } }); };
  render(); effects[0]();
  await new Promise(setImmediate);
  const tree = render();
  const toggle = nodes(tree).find((node) => node.type === 'TouchableOpacity' && node.props.accessibilityState);
  assert.equal(toggle.props.disabled, true);
  assert.equal(toggle.props.accessibilityState.selected, false);
  assert.ok(nodes(toggle).some((node) => node.props?.children === 'discovery.savedUnknown'));
  const card = nodes(tree).find((node) => node.type === 'EventCard');
  assert.equal(card.props.event, event);
  assert.equal(card.props.calendarEnabled, true);
  assert.equal(typeof card.props.onToggleReminder, 'function');
  const retry = nodes(tree).find((node) => node.type === 'TouchableOpacity' && nodes(node).some((child) => React.Children.toArray(child.props?.children).includes('discovery.retry')));
  assert.ok(retry);
  failing = false;
  await retry.props.onPress();
  const retriedToggle = nodes(render()).find((node) => node.type === 'TouchableOpacity' && node.props.accessibilityState);
  assert.equal(retriedToggle.props.disabled, false);
  assert.equal(retriedToggle.props.accessibilityState.selected, true);
});
