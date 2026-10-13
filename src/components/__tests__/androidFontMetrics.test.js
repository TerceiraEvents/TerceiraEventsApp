import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import * as fontMetrics from '../../utils/fontMetrics.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
function load(path, imports) {
  const module = { exports: {} };
  const code = transformSync(readFileSync(new URL(path, import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  new Function('require', 'module', 'exports', code)((name) => { assert.ok(name in imports, name); return imports[name]; }, module, module.exports);
  return module.exports;
}
function host(element) { return element.type === 'NativeText' ? element : host(element.props.children); }
function fixture(available = true) {
  let scale = 1; let inherited = { fontSize: 14 }; const calls = [];
  const curve = { 12: 24, 14: 26, 16: 28, 18: 30, 21: 34.5, 24: 36, 28: 37.33333206176758 };
  const scaledFontSize = (size) => { calls.push(size); return scale === 1 ? size : curve[size]; };
  const flatten = (style) => Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : style || {};
  const native = { Text: 'NativeText', TextInput: 'NativeInput', StyleSheet: { flatten }, useWindowDimensions: () => ({ fontScale: scale }) };
  const react = { ...React, createContext: (value) => ({ value, Provider: 'Provider' }), forwardRef: (render) => render, useContext: (context) => typeof context.value === 'number' ? scale : inherited };
  const metrics = { hasNativeFontMetrics: available, scaledFontSize };
  const text = load('../Text.js', { react, 'react-native': native, '../utils/fontMetrics': fontMetrics, '../utils/nativeFontMetrics': metrics });
  const input = load('../TextInput.js', { react, 'react-native': native, './Text': text, '../utils/fontMetrics': fontMetrics, '../utils/nativeFontMetrics': metrics }).default;
  return { text, input, native, calls, setScale: (value) => { scale = value; }, setInherited: (value) => { inherited = value; } };
}

test('Android text uses the nonlinear platform result once and retains unscaled inheritance', () => {
  const f = fixture(); const ref = {}; const style = { fontSize: 28, lineHeight: 24, color: 'green' };
  const props = { style, children: 'Published title', accessibilityRole: 'header' };
  const first = f.text.default(props, ref);
  f.setScale(2);
  const next = f.text.default(props, ref);
  const nextHost = host(next);
  assert.equal(f.native.StyleSheet.flatten(nextHost.props.style).fontSize, 37.33333206176758);
  assert.notEqual(nextHost.key, host(first).key);
  assert.equal(f.native.StyleSheet.flatten(nextHost.props.style).lineHeight, 36);
  assert.equal(nextHost.props.allowFontScaling, false);
  assert.equal(nextHost.props.ref, ref);
  assert.equal(nextHost.props.style[0], style);
  assert.equal(next.props.value.fontSize, 28);
  f.setInherited(next.props.value); f.calls.length = 0;
  const nested = host(f.text.default({ children: 'Nested emphasis', style: { fontWeight: '700' } }, null));
  assert.deepEqual(f.calls, [28, 24]);
  assert.equal(f.native.StyleSheet.flatten(nested.props.style).fontSize, 37.33333206176758);
});

test('fixed icons and runtimes without the native metric module preserve native props', () => {
  for (const available of [true, false]) {
    const f = fixture(available); const style = { fontSize: 24 }; const props = { children: 'Icon', style, allowFontScaling: false };
    const first = f.text.default(props, null).props.children;
    f.setScale(2);
    const next = f.text.default(props, null).props.children;
    assert.equal(next.key, first.key); assert.equal(next.props.style, style); assert.equal(next.props.allowFontScaling, false); assert.deepEqual(f.calls, []);
  }
  const f = fixture(false); f.setScale(2);
  const style = { fontSize: 28 };
  const nextHost = host(f.text.default({ children: 'Native fallback', style, allowFontScaling: true }, null));
  assert.equal(nextHost.props.style, style); assert.equal(nextHost.props.allowFontScaling, true);
});

test('editable host retains type/key/value/selection/ref while preferred metrics change', () => {
  const f = fixture(); const ref = {}; const selection = { start: 2, end: 4 }; const change = () => {};
  const props = { value: 'Font QA sample', selection, onChangeText: change, style: { fontSize: 16 }, testID: 'search' };
  const first = f.input(props, ref); f.setScale(2); const next = f.input(props, ref);
  assert.equal(next.type, first.type); assert.equal(next.key, first.key);
  for (const [key, value] of Object.entries(props).filter(([key]) => key !== 'style')) assert.equal(next.props[key], value);
  assert.equal(next.props.ref, ref); assert.equal(next.props.allowFontScaling, false);
  assert.equal(f.native.StyleSheet.flatten(next.props.style).fontSize, 28);
});

test('native capability lookup is Android-only and uses the declared Expo public API', () => {
  for (const platform of ['ios', 'web', 'android']) {
    const requests = []; const module = { scaledSize: (size) => size + 1 };
    const metrics = load('../../utils/nativeFontMetrics.js', { 'react-native': { Platform: { OS: platform } }, expo: { requireOptionalNativeModule: (name) => { requests.push(name); return module; } } });
    assert.equal(metrics.hasNativeFontMetrics, platform === 'android');
    assert.deepEqual(requests, platform === 'android' ? ['TerceiraFontMetrics'] : []);
    if (metrics.hasNativeFontMetrics) assert.equal(metrics.scaledFontSize(28), 29);
  }
});

test('public Markdown rules preserve nested mixed list markers and separate text/view spacing', () => {
  const flatten = (style) => Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : style || {};
  const rules = load('../markdownRules.js', { react: React, 'react-native': { View: 'View', Linking: {}, StyleSheet: { flatten } }, './Text': 'Text' }).markdownRules;
  const styles = { list_item: { padding: 12, marginBottom: 8, fontSize: 16, color: 'green' }, bullet_list_icon: { marginRight: 4 }, ordered_list_icon: { marginRight: 4 }, bullet_list_content: {}, ordered_list_content: {} };
  for (const [parents, expected] of [[[ { type: 'bullet_list' }, { type: 'ordered_list', attributes: { start: 5 } } ], '•'], [[ { type: 'ordered_list', attributes: { start: 5 } }, { type: 'bullet_list' } ], '6.']]) {
    const node = rules.list_item({ key: 'item', index: 1, markup: '.' }, 'Published content', parents, styles, { fontSize: 14 });
    const marker = React.Children.toArray(node.props.children).find((child) => child.type === 'Text');
    assert.equal(marker.props.children, expected);
    assert.equal(flatten(marker.props.style).padding, undefined); assert.equal(flatten(marker.props.style).marginBottom, undefined); assert.equal(flatten(marker.props.style).fontSize, 16);
    assert.equal(flatten(node.props.style).padding, 12); assert.equal(flatten(node.props.style).fontSize, undefined);
  }
});

test('Markdown text/code/break/link rules retain content, style and link cancellation', () => {
  const opened = []; const rules = load('../markdownRules.js', { react: React, 'react-native': { View: 'View', Linking: { openURL: (url) => opened.push(url) }, StyleSheet: { flatten: (style) => style } }, './Text': 'Text' }).markdownRules;
  for (const name of ['text', 'code_inline', 'code_block', 'fence', 'strong', 'em', 's', 'textgroup', 'inline', 'span', 'hardbreak', 'softbreak']) {
    const node = rules[name]({ key: 'one', content: 'Published\n' }, 'Children', [], { [name]: { color: 'green' } }, {});
    assert.equal(node.type, 'Text');
    assert.equal(node.props.children, ['code_block', 'fence'].includes(name) ? 'Published' : ['text', 'code_inline'].includes(name) ? 'Published\n' : ['hardbreak', 'softbreak'].includes(name) ? '\n' : 'Children');
  }
  const args = [{ key: 'link', attributes: { href: 'https://example.test' } }, 'Published link', [], { link: { color: 'green' } }];
  rules.link(...args, () => false).props.onPress(); assert.deepEqual(opened, []);
  rules.link(...args).props.onPress(); assert.deepEqual(opened, ['https://example.test']);
});

test('Android public headers scale their title host without changing back/options and retain single-line behavior', () => {
  for (const available of [true, false]) {
    const module = load('../../navigation/fontHeader.js', { react: React, '../components/Text': 'Text', '../utils/nativeFontMetrics': { hasNativeFontMetrics: available } });
    const options = { headerTintColor: 'green', headerTitleStyle: { fontSize: 21 }, headerBackTitle: 'Blog', headerShown: true };
    const result = module.fontHeaderOptions(options);
    if (!available) assert.equal(result, options);
    else {
      const title = result.headerTitle({ children: 'Long published article title', tintColor: 'white' });
      assert.equal(title.type, 'Text'); assert.equal(title.props.numberOfLines, 1); assert.equal(title.props.ellipsizeMode, 'tail'); assert.equal(title.props.children, 'Long published article title'); assert.equal(result.headerBackTitle, 'Blog'); assert.equal(result.headerShown, true);
    }
  }
});
