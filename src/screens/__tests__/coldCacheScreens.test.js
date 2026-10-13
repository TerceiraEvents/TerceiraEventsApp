import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import * as data from '../../utils/data.js';
import * as identity from '../../utils/eventIdentity.js';
import * as discovery from '../../utils/discovery.js';
import * as navigation from '../../utils/navigation.js';
import * as tags from '../../utils/tags.js';
import * as theme from '../../utils/theme.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
function nodes(element) { return [element, ...React.Children.toArray(element?.props?.children).flatMap(nodes)]; }

for (const screen of ['HomeScreen', 'SpecialEventsScreen', 'EventDetailScreen']) {
  test(`${screen} renders cache-ready records before a publication response`, () => {
    const state = []; const subscriptions = []; let cursor = 0;
    const react = { ...React, useRef: value => ({ current: value }), useState: (initial) => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], (value) => { state[index] = value; }]; }, useCallback: (callback) => callback, useEffect: () => {}, useMemo: (callback) => callback() };
    const native = Object.fromEntries(['View', 'Text', 'ScrollView', 'FlatList', 'TouchableOpacity', 'RefreshControl', 'TextInput', 'Modal', 'Pressable'].map((name) => [name, name]));
    native.StyleSheet = { create: (styles) => styles };
    const imports = { '@react-navigation/native': { useFocusEffect: () => {} }, '../utils/storage': { getSavedEvents: async () => [] }, react, 'react-native': native, '../hooks/useSpecialFeed': (callback) => subscriptions.push(callback), '../utils/data': data, '../utils/eventIdentity': identity, '../utils/discovery': discovery, '../utils/navigation': navigation, '../utils/tags': tags, '../utils/theme': theme, '../components/EventCard': 'EventCard', '../components/LoadingView': 'LoadingView', '../i18n': { useLocale: () => ({ t: (key) => key }) } };
    const code = transformSync(readFileSync(new URL(`../${screen}.js`, import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)((name) => imports[name] || {}, module, module.exports);
    const props = { route: { params: { id: 'one' } }, navigation: { navigate: () => {} } };
    const render = () => { cursor = 0; return module.exports.default(props); };
    render();
    assert.equal(subscriptions.length, 1);
    const event = { id: 'one', name: 'Cached published record', date: data.todayAzores() };
    subscriptions[0]([event], { status: 'stored', refreshing: true, cacheTimeUnknown: true });
    const tree = render(); const all = nodes(tree);
    assert.notEqual(tree.type, 'LoadingView');
    if (screen === 'SpecialEventsScreen') {
      const list = all.find((node) => node.type === 'FlatList');
      assert.equal(list.props.data[0].id, 'one');
      assert.ok(nodes(list.props.ListHeaderComponent).some((node) => node.props?.children === 'discovery.refreshing'));
      subscriptions[0]([], { status: 'stored', refreshing: true, cacheTimeUnknown: true });
      const empty = nodes(render()).find((node) => node.type === 'FlatList').props.ListEmptyComponent;
      assert.ok(nodes(empty).some((node) => node.props?.children === 'discovery.refreshing'));
      assert.equal(nodes(empty).some((node) => String(node.props?.children).startsWith('specialEvents.empty.')), false);
    } else {
      assert.equal(all.find((node) => node.type === 'EventCard').props.event.id, 'one');
      assert.ok(all.some((node) => node.props?.children === 'discovery.refreshing'));
    }
    assert.equal(all.some((node) => node.props?.children === 'discovery.emptyDate'), false);
  });
}
