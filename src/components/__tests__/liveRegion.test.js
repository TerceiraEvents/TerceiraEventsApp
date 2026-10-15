import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import * as discovery from '../../utils/discovery.js';
import * as identity from '../../utils/eventIdentity.js';
import * as data from '../../utils/data.js';
import * as tags from '../../utils/tags.js';
import * as theme from '../../utils/theme.js';
import en from '../../i18n/strings.en.js';
import pt from '../../i18n/strings.pt.js';

const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');

function load(path, imports) {
  const code = transformSync(readFileSync(new URL(path, import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => { assert.ok(name in imports, name); return imports[name]; }, module, module.exports);
  return module.exports;
}

// Emulates enough of React's hook contract to drive the real Text wrapper
// outside a renderer: effects run on deps change, their cleanups run before
// re-run and on unmount, and each mounted node owns its hook state.
function textHost({ os = 'ios' } = {}) {
  const announced = [];
  let active = null;
  const sameDeps = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
  const react = Object.assign(Object.create(React), {
    createElement: React.createElement,
    Children: React.Children,
    createContext: (value) => ({ Provider: 'Provider', value }),
    forwardRef: (render) => render,
    useContext: (context) => context.value,
    useRef: (value) => { const slot = (active.hooks[active.cursor] ??= { current: value }); active.cursor++; return slot; },
    useState: (value) => { const slot = (active.hooks[active.cursor] ??= { value: typeof value === 'function' ? value() : value }); active.cursor++; return [slot.value, (next) => { slot.value = typeof next === 'function' ? next(slot.value) : next; }]; },
    useEffect: (fn, deps) => {
      const slot = (active.hooks[active.cursor] ??= {});
      active.cursor++;
      if (!slot.ran || !sameDeps(slot.deps, deps)) {
        slot.cleanup?.();
        slot.cleanup = fn();
      }
      slot.ran = true;
      slot.deps = deps;
    },
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
  });
  const native = {
    Text: 'NativeText',
    StyleSheet: { create: (styles) => styles, flatten: (style) => (Array.isArray(style) ? Object.assign({}, ...style) : style) },
    useWindowDimensions: () => ({ fontScale: 1, width: 400, height: 800 }),
    AccessibilityInfo: {
      announceForAccessibility: (message) => announced.push({ message, options: undefined }),
      announceForAccessibilityWithOptions: (message, options) => announced.push({ message, options }),
    },
    Platform: { OS: os },
  };
  const Text = load('../Text.js', {
    react,
    'react-native': native,
    '../utils/fontMetrics': { fontStyles: () => ({ scaled: null }) },
    '../utils/nativeFontMetrics': { hasNativeFontMetrics: false, scaledFontSize: (size) => size },
  }).default;
  const instance = () => {
    const mounted = { hooks: [], cursor: 0 };
    return {
      render: (props) => { active = mounted; mounted.cursor = 0; try { return Text(props, null); } finally { active = null; } },
      unmount: () => mounted.hooks.forEach((slot) => slot?.cleanup?.()),
    };
  };
  const primary = instance();
  return { Text, announced, instance, render: primary.render, unmount: primary.unmount };
}

function withTimers(fn) {
  return () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    try { fn(); } finally { mock.timers.reset(); }
  };
}

test('iOS announces live-region text through the queued public accessibility API', withTimers(() => {
  const host = textHost();
  host.render({ accessibilityLiveRegion: 'polite', children: '5 results' });
  mock.timers.tick(1000);
  assert.deepEqual(host.announced, [{ message: '5 results', options: { queue: true } }]);
}));

test('iOS announces result-count changes including nonzero to zero', withTimers(() => {
  const host = textHost();
  host.render({ accessibilityLiveRegion: 'polite', children: '5 results' });
  mock.timers.tick(1000);
  host.render({ accessibilityLiveRegion: 'polite', children: '0 results' });
  mock.timers.tick(1000);
  assert.deepEqual(host.announced.map((entry) => entry.message), ['5 results', '0 results']);
}));

test('rapid status changes coalesce to the latest text and stable repeats are suppressed', withTimers(() => {
  const host = textHost();
  host.render({ accessibilityLiveRegion: 'polite', children: 'loading' });
  host.render({ accessibilityLiveRegion: 'polite', children: 'cached · retry' });
  host.render({ accessibilityLiveRegion: 'polite', children: 'error · retry' });
  mock.timers.tick(1000);
  assert.deepEqual(host.announced.map((entry) => entry.message), ['error · retry']);
  host.render({ accessibilityLiveRegion: 'polite', children: 'error · retry' });
  mock.timers.tick(1000);
  assert.equal(host.announced.length, 1, 'unchanged text must not announce again');
}));

test('a pending announcement is cancelled when the node unmounts', withTimers(() => {
  const host = textHost();
  host.render({ accessibilityLiveRegion: 'polite', children: 'refreshing' });
  host.unmount();
  mock.timers.tick(1000);
  assert.deepEqual(host.announced, []);
}));

test('text without a live region and Android live regions never call the JS announce API', withTimers(() => {
  const plain = textHost();
  plain.render({ children: 'results only' });
  plain.render({ accessibilityLiveRegion: 'polite', children: '' });
  mock.timers.tick(1000);
  assert.deepEqual(plain.announced, []);
  const android = textHost({ os: 'android' });
  android.render({ accessibilityLiveRegion: 'polite', children: '5 results' });
  android.render({ accessibilityLiveRegion: 'polite', children: 'error · retry' });
  mock.timers.tick(1000);
  assert.deepEqual(android.announced, [], 'Android announces through its native live region — no JS duplicate');
}));

test('published EN and PT status strings announce verbatim', withTimers(() => {
  const host = textHost();
  host.render({ accessibilityLiveRegion: 'polite', children: en.discovery.refreshing });
  host.render({ accessibilityLiveRegion: 'polite', children: pt.discovery.refreshing });
  mock.timers.tick(1000);
  assert.equal(host.announced.length, 1);
  assert.equal(host.announced[0].message, pt.discovery.refreshing);
  assert.notEqual(en.discovery.refreshing, pt.discovery.refreshing);
}));

// The Events screen renders its status notices through the shared Text
// wrapper; this drives the actual rendered nodes through the real component.
function renderScreen(feedState, extra = {}) {
  let stateIndex = 0;
  const overrides = { 1: feedState, ...extra };
  const react = { ...React, useRef: (value) => ({ current: value }), useState: (value) => { const index = stateIndex++; return [Object.hasOwn(overrides, index) ? overrides[index] : index === 2 ? false : value, (next) => { overrides[index] = next; }]; }, useEffect: () => {}, useCallback: (fn) => fn, useMemo: (fn) => fn() };
  const native = Object.fromEntries(['View', 'Text', 'FlatList', 'TouchableOpacity', 'RefreshControl', 'TextInput', 'Modal', 'Pressable', 'ScrollView', 'Image', 'TouchableHighlight'].map((name) => [name, name]));
  native.StyleSheet = { create: (styles) => styles };
  const realText = textHost();
  const imports = {
    '../components/InlineEventCard': 'InlineEventCard',
    '../components/TextInput': 'TextInput',
    '../components/Text': realText.Text,
    '../components/LoadingView': 'LoadingView',
    '../hooks/useAzoresDay': () => '2026-10-15',
    '../hooks/useSpecialFeed': () => {},
    '@react-navigation/native': { useFocusEffect: () => {} },
    '../utils/eventIdentity': identity,
    '../utils/storage': { getSavedEvents: async () => [] },
    '../utils/eventRoute': { eventDetailParams: () => ({}) },
    '../utils/theme': theme,
    '../utils/data': data,
    '../utils/discovery': discovery,
    '../utils/tags': tags,
    '../utils/notifications': { rescheduleAllNotifications: async () => {} },
    '../i18n': { useLocale: () => ({ t: (key, options) => (options ? `${key}:${JSON.stringify(options)}` : key) }) },
    react,
    'react-native': native,
  };
  const screen = load('../../screens/SpecialEventsScreen.js', imports).default;
  return { tree: screen({ navigation: { navigate: () => {} } }), realText };
}

function flatten(node) {
  const nested = React.Children.toArray(node?.props?.children);
  const header = node?.props?.ListHeaderComponent;
  return [node, ...nested.flatMap(flatten), ...(React.isValidElement(header) ? flatten(header) : [])];
}

function liveNodes(tree, Text) {
  return flatten(tree).filter((node) => node?.type === Text && node.props?.accessibilityLiveRegion === 'polite');
}

test('Events screen status nodes mount through the shared wrapper and announce their transitions', withTimers(() => {
  const first = renderScreen({ status: 'cached', refreshing: false });
  const live = liveNodes(first.tree, first.realText.Text);
  assert.ok(live.length >= 2, `expected status + count nodes, found ${live.length}`);
  for (const node of live) first.realText.instance().render(node.props);
  mock.timers.tick(1000);
  const messages = first.realText.announced.map((entry) => entry.message);
  assert.ok(messages.includes('discovery.cached · discovery.retry'), messages.join('|'));
  assert.ok(messages.some((message) => message.endsWith('discovery.results')), messages.join('|'));

  const second = renderScreen({ status: 'error', refreshing: true, cacheTimeUnknown: true, rejectedRecords: 3 });
  for (const node of liveNodes(second.tree, second.realText.Text)) second.realText.instance().render(node.props);
  mock.timers.tick(1000);
  const next = second.realText.announced.map((entry) => entry.message);
  for (const expected of ['discovery.error · discovery.retry', 'discovery.refreshing', 'discovery.cacheTimeUnknown', 'discovery.partial:{"count":3}']) {
    assert.ok(next.includes(expected), `${expected} missing from ${next.join('|')}`);
  }
}));
