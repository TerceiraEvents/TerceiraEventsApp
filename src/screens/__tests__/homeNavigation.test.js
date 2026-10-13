import * as identity from '../../utils/eventIdentity.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import en from '../../i18n/strings.en.js';
import pt from '../../i18n/strings.pt.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
function nodes(element) { return [element, ...React.Children.toArray(element?.props?.children).flatMap(nodes)]; }
for (const catalog of [en, pt]) {
  test(`Home exposes every secondary destination before any interaction (${catalog === en ? 'EN' : 'PT'})`, () => {
    const react = { ...React, useRef: value => ({ current: value }), useState: (value) => [value, () => {}], useEffect: () => {}, useCallback: (value) => value };
    const native = Object.fromEntries(['ScrollView', 'Text', 'TouchableOpacity', 'View'].map((name) => [name, name]));
    const t = (key) => key.split('.').reduce((value, part) => value[part], catalog);
    const imports = { '../components/Text': 'Text', './Text': 'Text', './src/components/Text': { __esModule: true, default: 'Text', TextProvider: 'TextProvider' }, '../hooks/useAzoresDay': () => '2026-10-13', '../hooks/useSpecialFeed': () => {}, '../utils/eventIdentity': identity, '@react-navigation/native': { useFocusEffect: () => {} }, '../utils/storage': { getSavedEvents: async () => [] }, react, 'react-native': native, '../i18n': { useLocale: () => ({ t }) }, '../utils/eventRoute': {}, '../utils/theme': { colors: {} }, '../utils/navigation': { homeFeedback: () => 'loading' }, '../utils/discovery': { shortcutWindow: () => ({ start: '2026-10-13', end: '2026-10-13' }) }, '../utils/data': { todayAzores: () => '2026-10-13', sortDatedEvents: (events) => events, sortExhibitions: (events) => events }, '../components/EventCard': () => null };
    const code = transformSync(readFileSync(new URL('../HomeScreen.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)((name) => { assert.ok(name in imports, name); return imports[name]; }, module, module.exports);
    const calls = [];
    const tree = module.exports.default({ navigation: { navigate: (...args) => calls.push(args) } });
    const buttons = nodes(tree).filter((node) => node?.type === 'TouchableOpacity');
    for (const [label, route, params] of [['discovery.search', 'Events', { kind: 'event', range: 'all', resetFilters: true }], ['home.links.today', 'Events', { kind: 'event', range: 'today', resetFilters: true }], ['tabs.weekly', 'Weekly'], ['discovery.onView', 'Events', { kind: 'exhibition', range: 'all', resetFilters: true }], ['tabs.blog', 'Blog'], ['discovery.resources', 'Resources'], ['tabs.settings', 'Settings'], ['tabs.suggestEvent', 'SuggestEvent']]) {
      const button = buttons.find((node) => nodes(node).some((child) => child?.type === 'Text' && child.props.children === t(label)));
      assert.ok(button, `visible ${t(label)}`);
      assert.equal(button.props.accessibilityRole, 'button');
      assert.ok(button.props.style.minHeight >= 44 && button.props.style.minWidth >= 44);
      button.props.onPress();
      assert.deepEqual(calls.pop(), params ? [route, params] : [route]);
    }
    for (const key of ['today', 'tomorrow', 'weekend']) assert.ok(buttons.some((node) => nodes(node).some((child) => child?.props?.children === t(`discovery.${key}`))));
  });
}

test('Exhibitions is consumed once, preserves ordinary Back, and reapplies the same repeated shortcut', () => {
  const state = [], setters = new Map();
  let cursor = 0, previous, pending;
  const react = { ...React, useRef: value => ({ current: value }), useState: (value) => {
    const index = cursor++;
    if (!(index in state)) state[index] = value;
    const setter = (next) => { state[index] = next; };
    setters.set(value, setter);
    return [state[index], setter];
  }, useEffect: (effect, deps) => {
    if (!deps.includes(navigation)) return;
    if (!previous || deps.some((value, index) => !Object.is(value, previous[index]))) pending = effect;
    previous = deps;
  }, useCallback: (value) => value, useMemo: (compute) => compute() };
  const native = { StyleSheet: { create: (styles) => styles } };
  const imports = { '../components/Text': 'Text', './Text': 'Text', './src/components/Text': { __esModule: true, default: 'Text', TextProvider: 'TextProvider' }, '../hooks/useAzoresDay': () => '2026-10-13', '../hooks/useSpecialFeed': () => {}, '../utils/eventIdentity': identity, '@react-navigation/native': { useFocusEffect: () => {} }, '../utils/storage': { getSavedEvents: async () => [] }, react, 'react-native': native, '../utils/eventRoute': {}, '../utils/theme': { colors: {}, fonts: {} }, '../utils/data': { sortEventsByDate: (events) => events, sortExhibitions: (events) => events, applyEventFilters: (events) => events }, '../utils/discovery': {}, '../utils/tags': {}, '../utils/notifications': {}, '../components/EventCard': () => null, '../components/LoadingView': () => null, '../i18n': { useLocale: () => ({ t: (key) => key }) } };
  const code = transformSync(readFileSync(new URL('../SpecialEventsScreen.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => { assert.ok(name in imports, name); return imports[name]; }, module, module.exports);
  const route = { params: { kind: 'exhibition', range: 'all' } };
  const navigation = { setParams: (params) => { Object.assign(route.params, params); } };
  const render = () => { cursor = 0; pending = null; module.exports.default({ navigation, route }); if (pending) pending(); };
  render();
  render();
  setters.get('event')('event');
  setters.get('week')('month');
  render();
  assert.ok(state.includes('event') && state.includes('month'), 'ordinary tab Back preserves user filters');
  Object.assign(route.params, { kind: 'exhibition', range: 'all' });
  render();
  assert.ok(state.includes('exhibition') && state.includes('all'), 'same repeated shortcut reselects filters');
  assert.equal(route.params.kind, undefined);
  assert.equal(route.params.range, undefined);
  const homeReact = { ...React, useState: (value) => [value, () => {}], useEffect: () => {}, useCallback: (value) => value };
  const homeImports = { ...imports, react: homeReact, 'react-native': { ...native, ...Object.fromEntries(['ScrollView', 'Text', 'TouchableOpacity', 'View'].map((name) => [name, name])) }, '../utils/navigation': { homeFeedback: () => 'loading' }, '../utils/discovery': { shortcutWindow: () => ({ start: '2026-10-13', end: '2026-10-13' }) }, '../utils/data': { todayAzores: () => '2026-10-13', sortDatedEvents: (events) => events, sortExhibitions: (events) => events } };
  const homeCode = transformSync(readFileSync(new URL('../HomeScreen.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const homeModule = { exports: {} };
  new Function('require', 'module', 'exports', homeCode)((name) => homeImports[name], homeModule, homeModule.exports);
  const home = homeModule.exports.default({ navigation: { navigate: (name, params) => { assert.equal(name, 'Events'); route.params = { ...params }; } } });
  for (const [label, expectedRange] of [['home.links.today', 'today'], ['discovery.search', 'all']]) {
    Object.assign(route.params, { kind: 'exhibition', range: 'all' });
    render(); render();
    const button = nodes(home).find((node) => node?.type === 'TouchableOpacity' && nodes(node).some((child) => child?.props?.children === label));
    button.props.onPress(); render();
    assert.ok(state.includes('event') && state.includes(expectedRange), `${label} after Exhibitions opens dated upcoming events`);
    render();
  }
});
