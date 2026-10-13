import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import en from '../../i18n/strings.en.js';
import pt from '../../i18n/strings.pt.js';
import * as data from '../../utils/data.js';
import * as theme from '../../utils/theme.js';
import * as tags from '../../utils/tags.js';
import * as discovery from '../../utils/discovery.js';
import * as navigation from '../../utils/navigation.js';
import * as identity from '../../utils/eventIdentity.js';
const { transformSync } = createRequire(import.meta.url)('@babel/core');
function nodes(element) { return [element, ...React.Children.toArray(element?.props?.children).flatMap(nodes), ...(element?.props?.ListHeaderComponent ? nodes(element.props.ListHeaderComponent) : [])]; }
function render(screen, catalog) {
  const native = Object.fromEntries(['View', 'Text', 'ScrollView', 'FlatList', 'TouchableOpacity', 'TextInput', 'Modal', 'Pressable', 'RefreshControl', 'Switch', 'ActivityIndicator', 'KeyboardAvoidingView'].map(name => [name, name]));
  native.StyleSheet = { create: value => value }; native.Platform = { OS: 'ios' };
  const imports = { './fontHeader': { fontHeaderOptions: (options) => options }, './src/navigation/fontHeader': { fontHeaderOptions: (options) => options }, '../components/TextInput': 'TextInput', './TextInput': 'TextInput', '../utils/nativeFontMetrics': { hasNativeFontMetrics: false }, '../components/markdownRules': { markdownRules: {} }, '../components/Text': 'Text', './Text': 'Text', './src/components/Text': { __esModule: true, default: 'Text', TextProvider: 'TextProvider' },
    react: { ...React, useRef: value => ({ current: value }), useState: value => [value === true ? false : value === null && screen === 'SettingsScreen' ? {} : value, () => {}], useEffect: () => {}, useCallback: value => value, useMemo: compute => compute() },
    'react-native': native, '@react-navigation/native': { useFocusEffect: () => {} },
    '../i18n': { useLocale: () => ({ locale: catalog === en ? 'en' : 'pt', t: key => key.split('.').reduce((value, part) => value?.[part], catalog) || key }), LOCALE_CHOICES: [] },
    '../utils/data': { ...data, venues: [], resources: [], instagramAccounts: [], facebookPages: [] }, '../utils/theme': theme, '../utils/tags': tags, '../utils/discovery': discovery, '../utils/navigation': navigation, '../utils/eventIdentity': identity,
    '../hooks/useAzoresDay': () => '2026-10-13', '../hooks/useSpecialFeed': () => {}, '../utils/storage': {}, '../utils/notifications': {}, '../utils/posts': {}, '../utils/eventRoute': {}, '../utils/i18nFields': {},
  };
  const code = transformSync(readFileSync(new URL(`../${screen}.js`, import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} }; new Function('require', 'module', 'exports', code)(name => imports[name] || 'Component', module, module.exports);
  return nodes(module.exports.default({ navigation: {}, route: {} }));
}
for (const catalog of [en, pt]) test(`rendered Places heading matches its ${catalog === en ? 'EN' : 'PT'} tab label`, () => {
  assert.ok(render('VenuesScreen', catalog).some(node => node?.type === 'Text' && node.props.children === catalog.tabs.venues));
});

for (const catalog of [en, pt]) test(`rendered primary and shortcut destination heading inventory (${catalog === en ? 'EN' : 'PT'})`, () => {
  const entries = [
    ['HomeScreen', catalog.home.title],
    ['SpecialEventsScreen', catalog.discovery.explore],
    ['WeeklyScreen', catalog.weekly.title],
    ['BlogScreen', catalog.tabs.blog],
    ['ResourcesScreen', catalog.discovery.resources],
    ['SettingsScreen', catalog.tabs.settings],
    ['SuggestEventScreen', catalog.suggest.title],
  ];
  for (const [screen, heading] of entries) assert.ok(render(screen, catalog).some(node => node?.type === 'Text' && node.props.children === heading), `${screen}: ${heading}`);
  const home = render('HomeScreen', catalog);
  for (const label of [catalog.tabs.weekly, catalog.discovery.onView, catalog.tabs.blog, catalog.discovery.resources, catalog.tabs.settings, catalog.tabs.suggestEvent]) assert.ok(home.some(node => node?.type === 'Text' && node.props.children === label), `Home shortcut: ${label}`);
  assert.ok(render('SpecialEventsScreen', catalog).some(node => node?.type === 'Text' && node.props.children === catalog.discovery.onView), 'Exhibitions shortcut names the visible discovery kind control');
  assert.equal(catalog.weekly.title, catalog === en ? 'Weekly Events' : 'Eventos Semanais');
  assert.equal(catalog.suggest.title, catalog === en ? 'Suggest an Event' : 'Sugerir um Evento');
});
