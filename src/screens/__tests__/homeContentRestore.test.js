import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import pt from '../../i18n/strings.pt.js';
import en from '../../i18n/strings.en.js';
import * as data from '../../utils/data.js';
import * as discovery from '../../utils/discovery.js';
import * as eventRoute from '../../utils/eventRoute.js';
import * as theme from '../../utils/theme.js';
import { homeFeedback } from '../../utils/navigation.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
const posts = Array.from({ length: 4 }, (_, i) => ({ slug: `post-${i}`, title: `Post ${i}`, date: '2026-10-12', category: 'guide' }));
const today = '2026-10-13';
const dated = [...Array.from({ length: 6 }, (_, index) => ({ id: `today-${index}`, date: today })), { id: 'tomorrow-0', date: '2026-10-14' }, { id: 'tomorrow-1', date: '2026-10-14' }, { id: 'weekend-0', date: '2026-10-17' }, { id: 'weekend-1', date: '2026-10-18' }, { id: 'future', date: '2099-01-01' }].map(event => ({ ...event, kind: 'event', name: event.id, locality: event.id === 'future' ? 'praia' : 'angra', tags: event.id.endsWith('-0') ? ['free', 'kid-friendly', 'music'] : [] }));
const events = [...dated, { id: 'future-exhibition', name: 'Future exhibition', kind: 'exhibition', date: '2026-10-14', end_date: '2026-11-13' }, ...['exhibition-0', 'exhibition-1'].map(id => ({ id, name: id, kind: 'exhibition', date: today, end_date: '2026-11-13', locality: 'angra', tags: id.endsWith('-0') ? ['free', 'music', 'kid-friendly'] : [] }))];
function nodes(element) { return [element, ...React.Children.toArray(element?.props?.children).flatMap(nodes), ...(element?.props?.ListHeaderComponent ? nodes(element.props.ListHeaderComponent) : [])]; }
const text = element => nodes(element).filter(node => node?.type === 'Text').map(node => React.Children.toArray(node.props.children).join('')).join(' ');
const button = (tree, label) => nodes(tree).find(node => node?.type === 'TouchableOpacity' && (node.props.accessibilityLabel === label || text(node).includes(label)));
function screen(file, catalog, props) {
  const state = [], effects = [], dependencies = []; let cursor = 0;
  const react = { ...React,
    useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = value; }]; },
    useCallback: callback => callback,
    useEffect: (effect, deps) => { const index = cursor++; if (!(index in dependencies)) { dependencies[index] = deps; effects.push(effect); } },
  };
  const t = key => key.split('.').reduce((value, part) => value?.[part], catalog) || key;
  const imports = {
    react, 'react-native': { ScrollView: 'ScrollView', View: 'View', TouchableOpacity: 'TouchableOpacity' },
    '../components/Text': 'Text', '../components/EventCard': 'EventCard', '../components/CategoryPill': 'CategoryPill',
    '../i18n': { useLocale: () => ({ t, locale: 'en' }) }, '../hooks/useAzoresDay': () => today, '../hooks/useSpecialFeed': () => {},
    '../utils/data': { ...data, fetchSpecialEvents: async () => events, getSpecialFeedState: () => ({ status: 'current' }) },
    '../utils/posts': { fetchPosts: async () => posts }, '../utils/i18nFields': { localizedField: (item, field) => item[field] },
    '../utils/theme': theme, '../utils/discovery': discovery, '../utils/eventRoute': eventRoute, '../utils/navigation': { homeFeedback },
  };
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const code = transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => { assert.ok(name in imports, name); return imports[name]; }, module, module.exports);
  const render = () => { cursor = 0; return module.exports.default(props); };
  return { t, settle: async () => { render(); effects.splice(0).forEach(effect => effect()); await new Promise(setImmediate); return render(); } };
}
test('Home retains descriptive destinations and three exact blog previews after Today and exhibitions', async () => {
  const calls = []; const home = screen('../HomeScreen.js', en, { navigation: { navigate: (...args) => calls.push(args) } });
  const tree = await home.settle(); const content = nodes(tree); const rendered = text(tree);
  for (const key of ['home.subtitle', 'home.intro.p1', 'home.intro.p2', 'home.links.allPosts']) assert.ok(rendered.includes(home.t(key)), key);
  const cards = content.filter(node => node.type === 'EventCard'); assert.equal(cards.filter(node => node.props.event.kind === 'event').length, 5);
  const lastEvent = content.indexOf(cards.filter(node => node.props.event.kind === 'event').at(-1));
  const firstExhibition = content.indexOf(cards.find(node => node.props.event.kind === 'exhibition'));
  assert.ok(lastEvent < firstExhibition);
  assert.deepEqual(cards.filter(node => node.props.event.kind === 'exhibition').map(node => node.props.event.id), ['exhibition-0', 'exhibition-1']);
  for (const key of ['weekly', 'specialEvents', 'venues', 'blog', 'resources', 'suggest']) {
    const tile = content.find(node => node.type === 'TouchableOpacity' && text(node).includes(home.t(`home.buttons.${key}Subtitle`))); assert.ok(tile, key); assert.ok(content.indexOf(tile) > firstExhibition, key);
  }
  assert.equal(content.filter(node => node.type === 'CategoryPill').length, 3);
  for (const post of posts.slice(0, 3)) { const preview = button(tree, post.title); assert.ok(text(preview).includes(data.formatPostDate(post.date, 'en'))); preview.props.onPress(); assert.deepEqual(calls.pop(), ['Blog', { screen: 'Post', params: { slug: post.slug, post } }]); }
  assert.ok(!rendered.includes(posts[3].title)); button(tree, home.t('home.links.allPosts')).props.onPress(); assert.deepEqual(calls.pop(), ['Blog']);
  const weekly = content.find(node => node.type === 'TouchableOpacity' && text(node) === home.t('tabs.weekly')); assert.ok(content.indexOf(weekly) < content.indexOf(cards[0])); weekly.props.onPress(); assert.deepEqual(calls.pop(), ['Weekly']);
});

for (const catalog of [en, pt]) test(`Home event tile uses the literal ${catalog === en ? 'Events' : 'Eventos'} label`, async () => {
  const calls = []; const home = screen('../HomeScreen.js', catalog, { navigation: { navigate: (...args) => calls.push(args) } });
  const content = nodes(await home.settle());
  const tile = content.find(node => node.type === 'TouchableOpacity' && text(node).includes(home.t('home.buttons.specialEventsSubtitle')));
  assert.ok(nodes(tile).some(node => node.type === 'Text' && node.props.children === (catalog === en ? 'Events' : 'Eventos')));
  tile.props.onPress(); assert.deepEqual(calls, [['Events', { kind: 'event', range: 'all', resetFilters: true }]]);
});
