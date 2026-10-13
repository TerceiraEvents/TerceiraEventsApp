import * as identity from '../../utils/eventIdentity.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import * as data from '../../utils/data.js';
import * as discovery from '../../utils/discovery.js';
import * as tags from '../../utils/tags.js';
import * as theme from '../../utils/theme.js';

const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
function renderDiscovery() {
  let stateIndex = 0;
  const react = { ...React, useRef: value => ({ current: value }), useState: (value) => [stateIndex++ === 2 ? false : value, () => {}], useEffect: () => {}, useCallback: (fn) => fn, useMemo: (fn) => fn() };
  const native = Object.fromEntries(['View', 'Text', 'FlatList', 'TouchableOpacity', 'RefreshControl', 'TextInput', 'Modal', 'Pressable', 'ScrollView'].map((name) => [name, name]));
  native.StyleSheet = { create: (styles) => styles };
  const imports = { '../hooks/useSpecialFeed': () => {}, '../utils/eventIdentity': identity, '@react-navigation/native': { useFocusEffect: () => {} }, '../utils/storage': { getSavedEvents: async () => [] }, react, 'react-native': native, '../utils/data': data, '../utils/discovery': discovery, '../utils/tags': tags, '../utils/theme': theme, '../i18n': { useLocale: () => ({ t: (key) => key }) } };
  const code = transformSync(readFileSync(new URL('../SpecialEventsScreen.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => imports[name] || {}, module, module.exports);
  return module.exports.default({ navigation: { navigate: () => {} } });
}
function children(element) { return [element, ...React.Children.toArray(element?.props?.children).flatMap(children)]; }

test('discovery filters and search belong to the results scroll surface', () => {
  const tree = renderDiscovery();
  const list = children(tree).find((node) => node.type === 'FlatList');
  assert.ok(React.isValidElement(list.props.ListHeaderComponent), 'filters must scroll with results as an element, without a remounting component factory');
  assert.ok(children(list.props.ListHeaderComponent).some((node) => node.type === 'TextInput'));
  assert.equal(list.props.keyboardShouldPersistTaps, 'handled');
  assert.ok(!React.Children.toArray(tree.props.children).some((node) => children(node).some((child) => child.type === 'TextInput')), 'search must not occupy a fixed sibling above the list');
});

test('actual primary tab options reserve large-label space without disabling scaling', async () => {
  const navigation = await import('../../utils/navigation.js');
  const header = await import('../../navigation/headerTheme.js');
  const layout = await import('../../utils/tabLayout.js');
  for (const fontScale of [1, 2, 3]) {
    const imports = { '../hooks/useSpecialFeed': () => {},
      react: React,
      'react-native': { Text: 'Text', useWindowDimensions: () => ({ fontScale }) },
      'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 24 }) },
      '@react-navigation/native-stack': { createNativeStackNavigator: () => ({ Navigator: 'Stack', Screen: 'Screen' }) },
      '@react-navigation/bottom-tabs': { createBottomTabNavigator: () => ({ Navigator: 'Tabs', Screen: 'Screen' }) },
      './src/utils/navigation': navigation,
      './src/navigation/headerTheme': header,
      './src/utils/tabLayout': layout,
      './src/utils/theme': theme,
      './src/i18n': { useLocale: () => ({ t: (key) => key }) },
    };
    const source = readFileSync(new URL('../../../App.js', import.meta.url), 'utf8') + '\nmodule.exports.PrimaryTabs = PrimaryTabs;';
    const code = transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)((name) => imports[name] || {}, module, module.exports);
    const tree = module.exports.PrimaryTabs();
    const options = tree.props.screenOptions({ route: { name: navigation.primaryRoutes.home } });
    assert.ok(options.tabBarStyle?.height >= 34 + 36 * fontScale + 24);
    assert.equal(options.tabBarLabelPosition, 'below-icon');
    assert.notEqual(options.tabBarAllowFontScaling, false);
    const inactive = options.tabBarInactiveTintColor || '#8e8e8f';
    const channels = inactive.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    assert.ok(1.05 / (luminance + 0.05) >= 4.5, 'inactive normal-size tab labels need 4.5:1 contrast on white');
    const label = options.tabBarLabel({ children: 'Events', color: 'green' });
    assert.equal(label.props.children, 'Events');
    assert.equal(label.props.numberOfLines, undefined);
    assert.notEqual(label.props.allowFontScaling, false);
  }
});
