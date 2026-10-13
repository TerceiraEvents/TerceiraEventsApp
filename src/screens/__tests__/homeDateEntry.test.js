import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import en from '../../i18n/strings.en.js';
import pt from '../../i18n/strings.pt.js';
import * as data from '../../utils/data.js';
import * as discovery from '../../utils/discovery.js';
import * as identity from '../../utils/eventIdentity.js';
import * as eventRoute from '../../utils/eventRoute.js';
import * as theme from '../../utils/theme.js';
import * as tags from '../../utils/tags.js';
import { homeFeedback } from '../../utils/navigation.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
const today = '2026-10-13';
const dated = [...Array.from({ length: 6 }, (_, index) => ({ id: `today-${index}`, date: today })), { id: 'tomorrow-0', date: '2026-10-14' }, { id: 'tomorrow-1', date: '2026-10-14' }, { id: 'weekend-0', date: '2026-10-17' }, { id: 'weekend-1', date: '2026-10-18' }, { id: 'future', date: '2099-01-01' }].map(event => ({ ...event, kind: 'event', name: event.id, locality: event.id === 'future' ? 'praia' : 'angra', tags: event.id.endsWith('-0') ? ['free', 'kid-friendly', 'music'] : [] }));
const events = [...dated, ...['exhibition-0', 'exhibition-1'].map(id => ({ id, name: id, kind: 'exhibition', date: today, end_date: '2026-11-13', locality: 'angra', tags: id.endsWith('-0') ? ['free', 'music', 'kid-friendly'] : [] }))];
function nodes(element) { return [element, ...React.Children.toArray(element?.props?.children).flatMap(nodes), ...(element?.props?.ListHeaderComponent ? nodes(element.props.ListHeaderComponent) : [])]; }
const text = element => nodes(element).filter(node => node?.type === 'Text').map(node => React.Children.toArray(node.props.children).join('')).join(' ');
const button = (tree, label) => nodes(tree).find(node => node?.type === 'TouchableOpacity' && (node.props.accessibilityLabel === label || text(node).includes(label)));
const list = tree => nodes(tree).find(node => node?.type === 'FlatList');
function screen(file, catalog, props) {
  const slots = [], deps = [], pending = []; let cursor = 0, focus, offset = 0; const scrollCalls = []; let committedIDs = [];
  const same = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
  const memo = (compute, dependencies) => { const index = cursor++; if (!same(deps[index], dependencies)) { slots[index] = compute(); deps[index] = dependencies; } return slots[index]; };
  const react = { ...React, useRef: value => memo(() => ({ current: value }), []), useState: value => { const index = cursor++; if (!(index in slots)) slots[index] = typeof value === 'function' ? value() : value; return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; }, useEffect: (effect, dependencies) => { const index = cursor++; if (!same(deps[index], dependencies)) { pending.push(effect); deps[index] = dependencies; } }, useCallback: (callback, dependencies) => memo(() => callback, dependencies), useMemo: memo };
  const native = Object.fromEntries(['ScrollView', 'View', 'Text', 'TouchableOpacity', 'FlatList', 'RefreshControl', 'TextInput', 'Modal', 'Pressable'].map(name => [name, name])); native.StyleSheet = { create: styles => styles };
  const t = key => key.split('.').reduce((value, part) => value?.[part], catalog) || key;
  const imports = { react, 'react-native': native, '@react-navigation/native': { useFocusEffect: callback => { if (focus !== callback) { pending.push(callback); focus = callback; } } }, '../hooks/useSpecialFeed': () => {}, '../utils/eventIdentity': identity, '../utils/eventRoute': eventRoute, '../utils/theme': theme, '../utils/discovery': discovery, '../utils/tags': tags, '../utils/navigation': { homeFeedback }, '../utils/storage': { getSavedEvents: async () => [{ id: events[0].id, event: events[0] }] }, '../utils/notifications': {}, '../utils/data': { ...data, todayAzores: () => today, isActive: event => data.isInRange(event, 'all', today), isInRange: (event, range) => data.isInRange(event, range, today), fetchSpecialEvents: async () => events, getSpecialFeedState: () => ({ status: 'current' }) }, '../i18n': { useLocale: () => ({ t }) }, '../components/EventCard': 'EventCard', '../components/LoadingView': 'Loading' };
  const code = transformSync(readFileSync(new URL(file, import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} }; new Function('require', 'module', 'exports', code)(name => { assert.ok(name in imports, name); return imports[name]; }, module, module.exports);
  const render = () => { cursor = 0; const tree = module.exports.default(props); const currentList = list(tree); if (currentList) { committedIDs = currentList.props.data.map(event => event.id); if (currentList.props.ref) currentList.props.ref.current = { scrollToOffset: options => { offset = options.offset; scrollCalls.push({ ...options, ids: committedIDs }); } }; } return tree; };
  const settle = async () => { for (let index = 0; index < 4; index++) { render(); pending.splice(0).forEach(effect => effect()); await new Promise(setImmediate); } return render(); };
  return { render, settle, t, setOffset: value => { offset = value; }, getOffset: () => offset, scrollCalls, focus: () => pending.push(focus) };
}
function dateAction(tree) { return React.Children.toArray(tree.props.children).filter(node => node.type === 'TouchableOpacity')[1]; }

for (const [catalog, labels] of [[en, ['All events today', 'All events tomorrow', 'All events this weekend']], [pt, ['Todos os eventos de hoje', 'Todos os eventos de amanhã', 'Todos os eventos deste fim de semana']]]) test(`Home date actions retain the selected range and show literal labels (${catalog === en ? 'EN' : 'PT'})`, async () => {
  const calls = []; const home = screen('../HomeScreen.js', catalog, { navigation: { navigate: (...args) => calls.push(args) } });
  let tree = await home.settle();
  assert.equal(nodes(tree).filter(node => node.type === 'EventCard' && node.props.event.kind === 'event').length, 5, 'six published Today events have five previews');
  for (const [index, selection] of ['today', 'tomorrow', 'weekend'].entries()) {
    button(tree, home.t(`discovery.${selection}`)).props.onPress(); tree = home.render();
    dateAction(tree).props.onPress();
    assert.deepEqual(calls.pop(), ['Events', { kind: 'event', range: selection, resetFilters: true }]);
    assert.equal(text(dateAction(tree)), labels[index]);
    const content = React.Children.toArray(tree.props.children);
    const actionIndex = content.findIndex(node => node.type === 'TouchableOpacity' && text(node) === labels[index]);
    assert.ok(actionIndex < content.findIndex(node => node.type === 'EventCard'), 'full date entry precedes previews');
    assert.ok(actionIndex < content.findIndex(node => node.type === 'View' && text(node).includes(home.t('tabs.weekly'))), 'full date entry precedes secondary destinations');
  }
  button(tree, home.t('discovery.search')).props.onPress();
  assert.deepEqual(calls.pop(), ['Events', { kind: 'event', range: 'all', resetFilters: true }]);
});

for (const selection of ['today', 'tomorrow', 'weekend', 'all', 'exhibition']) test(`Home ${selection} clears Saved and all facets once; detail Back preserves new context`, async () => {
    const route = { params: {} }; const calls = [];
    const navigation = { setParams: params => Object.assign(route.params, params), navigate: (...args) => calls.push(args) };
    const explore = screen('../SpecialEventsScreen.js', en, { route, navigation }); let tree = await explore.settle();
    for (const key of ['saved', 'free', 'family', 'praia']) { button(tree, explore.t(`discovery.${key}`)).props.onPress(); tree = explore.render(); }
    nodes(tree).find(node => node.type === 'TextInput').props.onChangeText('nothing matches'); tree = explore.render();
    button(tree, en.specialEvents.allTags).props.onPress(); tree = explore.render();
    button(tree, 'Music').props.onPress(); tree = explore.render();
    assert.equal(list(tree).props.data.length, 0, 'prior Saved/locality/search/facets hide catalog rows');
    explore.setOffset(333);
    const home = screen('../HomeScreen.js', en, { navigation: { navigate: (name, params) => { assert.equal(name, 'Events'); Object.assign(route.params, params); } } }); let homeTree = await home.settle();
    if (selection === 'all') button(homeTree, home.t('discovery.search')).props.onPress();
    else if (selection === 'exhibition') button(homeTree, home.t('discovery.onView')).props.onPress();
    else { button(homeTree, home.t(`discovery.${selection}`)).props.onPress(); homeTree = home.render(); dateAction(homeTree).props.onPress(); }
    tree = await explore.settle();
    const expected = events.filter(event => selection === 'exhibition' ? event.kind === 'exhibition' : event.kind === 'event' && (selection === 'all' || (selection === 'today' ? event.id.startsWith('today-') : selection === 'tomorrow' ? event.id.startsWith('tomorrow-') : event.id.startsWith('weekend-')))).map(event => event.id).sort();
    assert.deepEqual(list(tree).props.data.map(event => event.id).sort(), expected, selection);
    assert.equal(explore.getOffset(), 0, 'explicit Home entry reaches list top');
    assert.equal(explore.scrollCalls.length, 1);
    assert.deepEqual(explore.scrollCalls[0].ids.slice().sort(), expected, 'scroll occurs after new filtered data commits');
    assert.equal(explore.scrollCalls[0].animated, false);
    assert.equal(button(tree, explore.t('discovery.saved')).props.accessibilityState.checked, false);
    assert.equal(nodes(tree).find(node => node.type === 'TextInput').props.value, '');
    assert.ok(button(tree, en.specialEvents.allTags));
    for (const key of ['free', 'family']) assert.equal(button(tree, explore.t(`discovery.${key}`)).props.accessibilityState.selected, false);
    assert.equal(button(tree, explore.t('discovery.allPlaces')).props.accessibilityState.selected, true);
    const rangeLabel = selection === 'exhibition' || selection === 'all' ? en.specialEvents.ranges.allUpcoming : en.specialEvents.ranges[selection];
    assert.ok(text(button(tree, en.specialEvents.selectDateRange)).includes(rangeLabel), 'visible date selector matches Home entry');
    assert.equal(route.params.resetFilters, undefined, 'fresh flag consumed before Back');
    button(tree, explore.t('discovery.free')).props.onPress(); tree = explore.render();
    const before = list(tree).props.data.map(event => event.id);
    assert.ok(before.length);
    nodes(list(tree).props.renderItem({ item: list(tree).props.data[0] })).find(node => node.type === 'EventCard').props.onOpen();
    assert.equal(calls.at(-1)[0], 'EventDetail');
    explore.setOffset(222); explore.focus(); tree = await explore.settle();
    assert.deepEqual(list(tree).props.data.map(event => event.id), before);
    assert.equal(explore.getOffset(), 222, 'Back retains native scroll position');
    assert.equal(explore.scrollCalls.length, 1, 'Back does not repeat fresh-entry reset');
    assert.equal(button(tree, explore.t('discovery.free')).props.accessibilityState.selected, true);
});
