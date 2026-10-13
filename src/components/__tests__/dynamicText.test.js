import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import * as discovery from '../../utils/discovery.js';
import * as navigation from '../../utils/navigation.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
function load(path, imports) {
  const code = transformSync(readFileSync(new URL(path, import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => { assert.ok(name in imports, name); return imports[name]; }, module, module.exports);
  return module.exports;
}
function fixture() {
  let scale = 1; let subscriptions = 0;
  const react = { ...React, createContext: () => ({ Provider: 'FontScaleProvider' }), forwardRef: (render) => render, useContext: () => scale };
  const native = { Text: 'NativeText', useWindowDimensions: () => { subscriptions++; return { fontScale: scale }; } };
  const text = load('../Text.js', { react, 'react-native': native });
  return { text, setScale: (value) => { scale = value; }, subscriptions: () => subscriptions };
}

test('text hosts refresh only on font-scale changes and preserve props/ref without manual scaling', () => {
  const { text, setScale } = fixture();
  const ref = {}; const style = { fontSize: 28 }; const onLayout = () => {};
  const props = { style, children: 'Published title', accessibilityRole: 'header', onLayout, allowFontScaling: true };
  const first = text.default(props, ref);
  assert.equal(first.key, text.default(props, ref).key);
  setScale(2.143);
  const enlarged = text.default(props, ref);
  assert.notEqual(enlarged.key, first.key);
  for (const [name, value] of Object.entries(props)) assert.equal(enlarged.props[name], value);
  assert.equal(enlarged.props.ref, ref);
  assert.equal(enlarged.props.style.fontSize, 28);
  const fixed = text.default({ ...props, allowFontScaling: false }, ref);
  setScale(1);
  assert.equal(text.default({ ...props, allowFontScaling: false }, ref).key, fixed.key);
});

test('one provider subscription updates text without replacing its screen or navigation children', () => {
  const { text, setScale, subscriptions } = fixture();
  const screenState = { filters: ['free'], offset: 312 };
  const navigator = React.createElement('Navigator', { key: 'main', screenState });
  const first = text.TextProvider({ children: navigator });
  setScale(2.143);
  const second = text.TextProvider({ children: navigator });
  assert.equal(second.type, first.type);
  assert.equal(second.key, first.key);
  assert.equal(second.props.children, navigator);
  assert.equal(second.props.children.props.screenState, screenState);
  assert.equal(second.props.value, 2.143);
  const before = subscriptions();
  for (let i = 0; i < 100; i++) text.default({ children: 'Published content' }, null);
  assert.equal(subscriptions(), before);
});

test('actual mounted Home title uses refreshed text while retaining the selected date action', () => {
  const { text, setScale } = fixture(); let selected = 'today';
  const react = { ...React, useCallback: (fn) => fn, useEffect() {}, useState: (value) => typeof value === 'string' ? [selected, (next) => { selected = next; }] : [value, () => {}] };
  const nativeText = (props) => React.createElement('NativeText', props);
  const imports = { '../components/Text': text.default, '../utils/theme': { colors: {} }, react, 'react-native': { ScrollView: 'ScrollView', Text: nativeText, TouchableOpacity: 'Button', View: 'View' }, '../hooks/useAzoresDay': () => '2026-10-13', '../hooks/useSpecialFeed': () => {}, '../i18n': { useLocale: () => ({ t: (key) => key }) }, '../utils/discovery': discovery, '../utils/navigation': navigation, '../utils/data': { sortDatedEvents: (events) => events, sortExhibitions: (events) => events, isActive: () => true }, '../utils/eventIdentity': { eventId: () => 'id' }, '../utils/eventRoute': { eventDetailParams: () => ({}) }, '../components/EventCard': 'EventCard' };
  const home = load('../../screens/HomeScreen.js', imports).default;
  const nodes = (element) => [element, ...React.Children.toArray(element?.props?.children).flatMap(nodes)];
  const calls = []; const render = () => home({ navigation: { navigate: (...args) => calls.push(args) } });
  const titleHost = () => { const title = nodes(render()).find((node) => node.props?.children === 'home.title'); return title.type(title.props, null); };
  const first = titleHost();
  nodes(render()).find((node) => node.type === 'Button' && node.props.children.props.children === 'discovery.tomorrow').props.onPress();
  setScale(2.143);
  assert.notEqual(titleHost().key, first.key);
  const action = nodes(render()).find((node) => node.type === 'Button' && node.props.children.props.children === 'home.links.tomorrow');
  assert.ok(action, 'selected date remains Tomorrow');
  action.props.onPress();
  assert.equal(calls[0][1].range, 'tomorrow');
});


test('actual Post refreshes Markdown content while retaining its ScrollView and published record', () => {
  const { text, setScale } = fixture();
  const imports = { react: React, '../components/Text': { __esModule: true, default: text.default, useFontScale: text.useFontScale }, 'react-native': { ScrollView: 'ScrollView', View: 'View', TouchableOpacity: 'Button', StyleSheet: { create: (styles) => styles }, Linking: {} }, 'react-native-markdown-display': 'Markdown', '../utils/data': { formatPostDate: () => 'Published day' }, '../utils/theme': { colors: {}, fonts: {} }, '../i18n': { useLocale: () => ({ t: (key) => key, locale: 'en' }) }, '../utils/i18nFields': { localizedField: (record, key) => record[key] }, '../components/CategoryPill': 'CategoryPill' };
  const post = load('../../screens/PostScreen.js', imports).default;
  const route = { params: { post: { title: 'Published title', body: 'Published **Markdown** body', date: '2026-10-13' } } };
  const first = post({ route });
  setScale(2.143);
  const second = post({ route });
  const markdown = (tree) => React.Children.toArray(tree.props.children).find((node) => node.type === 'Markdown');
  assert.equal(first.type, 'ScrollView');
  assert.equal(second.type, first.type);
  assert.equal(second.key, first.key);
  assert.equal(second.props.style, first.props.style);
  assert.equal(second.props.contentContainerStyle, first.props.contentContainerStyle);
  assert.notEqual(markdown(second).key, markdown(first).key);
  assert.equal(markdown(second).props.children, markdown(first).props.children);
  assert.equal(markdown(second).props.style, markdown(first).props.style);
});
