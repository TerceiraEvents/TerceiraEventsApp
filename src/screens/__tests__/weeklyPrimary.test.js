import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { getActionFromState, getStateFromPath, getPathFromState } from '@react-navigation/core';
import { createLinking } from '../../navigation/linking.js';
import { CommonActions, StackActions, StackRouter, TabRouter } from '@react-navigation/routers';
import { primaryRoutes, rootRoutes } from '../../utils/navigation.js';
import { tabBarHeight } from '../../utils/tabLayout.js';
import en from '../../i18n/strings.en.js';
import pt from '../../i18n/strings.pt.js';
const require = createRequire(import.meta.url);
const { parseSync, transformSync } = require('@babel/core');
const source = readFileSync(new URL('../../../App.js', import.meta.url), 'utf8');
const ast = parseSync(source, { babelrc: false, configFile: false, parserOpts: { plugins: ['jsx'] } });
const definition = ast.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'PrimaryTabs');
const code = transformSync(source.slice(definition.start, definition.end), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
function render(catalog, fontScale = 1, bottom = 0, width = 402, left = 0, right = 0) {
  const t = key => key.split('.').reduce((value, part) => value[part], catalog);
  const names = ['React', 'useLocale', 'useWindowDimensions', 'useSafeAreaInsets', 'primaryRoutes', 'Tab', 'HomeScreen', 'SpecialEventsScreen', 'WeeklyScreen', 'VenuesScreen', 'MoreScreen', 'Text', 'headerOptions', 'colors', 'tabBarHeight'];
  return new Function(...names, code + '\nreturn PrimaryTabs();')(React, () => ({ t }), () => ({ fontScale, width }), () => ({ bottom, left, right }), primaryRoutes, { Navigator: 'Navigator', Screen: 'Screen' }, 'Home', 'Events', 'WeeklyContent', 'Places', 'More', 'Text', () => ({}), {}, tabBarHeight);
}

test('actual primary navigator reaches Weekly directly from every primary destination', () => {
  const screens = React.Children.toArray(render(en).props.children);
  assert.deepEqual(screens.map(screen => screen.props.name), ['Home', 'Events', 'Weekly', 'Venues', 'More']);
  assert.equal(screens[2].props.component, 'WeeklyContent');
  const options = { routeNames: screens.map(screen => screen.props.name), routeParamList: {}, routeGetIdList: {} };
  const router = TabRouter({ backBehavior: 'history' });
  for (const from of options.routeNames) {
    let state = router.getInitialState(options);
    state = router.getStateForAction(state, CommonActions.navigate(from), options);
    state.routes.find(route => route.name === 'Events').params = { locality: 'angra', free: true };
    state = router.getStateForAction(state, CommonActions.navigate('Weekly'), options);
    assert.equal(state.routes[state.index].name, 'Weekly', from);
    assert.equal(state.routes.length, 5);
    assert.deepEqual(state.routes.find(route => route.name === 'Events').params, { locality: 'angra', free: true });
  }
});

test('nested Weekly aliases and repeated links preserve Main identity and Events context', () => {
  const matches = source.match(/name=\{rootRoutes.weekly\} component=\{([^}]+)\}/);
  assert.equal(matches?.[1], 'WeeklyRouteAlias');
  const moduleSource = readFileSync(new URL('../../navigation/WeeklyRouteAlias.js', import.meta.url), 'utf8');
  const transformed = transformSync(moduleSource, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const effects = []; const module = { exports: {} };
  new Function('require', 'module', 'exports', transformed)(name => name === 'react' ? { useEffect: effect => effects.push(effect) } : { primaryRoutes, rootRoutes }, module, module.exports);
  const primaryNames = React.Children.toArray(render(en).props.children).map(screen => screen.props.name);
  const tabOptions = { routeNames: primaryNames, routeParamList: {}, routeGetIdList: {} };
  const stackOptions = { routeNames: Object.values(rootRoutes), routeParamList: {}, routeGetIdList: {} };
  const tabs = TabRouter({ backBehavior: 'history' }); const stack = StackRouter({});
  let state = stack.getInitialState(stackOptions);
  state.routes[0].state = tabs.getInitialState(tabOptions);
  const mainKey = state.routes[0].key;
  const events = state.routes[0].state.routes.find(route => route.name === 'Events');
  const eventsKey = events.key;
  events.params = { range: 'month', locality: 'angra', free: true, saved: true, search: 'story' };
  const context = { ...events.params };
  const dispatch = action => {
    state = stack.getStateForAction(state, action, stackOptions);
    const main = state.routes.find(route => route.name === 'Main');
    if (main?.params?.screen) main.state = tabs.getStateForAction(main.state, CommonActions.navigate(main.params.screen), tabOptions);
  };
  const check = () => {
    assert.equal(state.routes.length, 1);
    assert.equal(state.routes[0].key, mainKey);
    const nested = state.routes[0].state;
    assert.equal(nested.routes[nested.index].name, 'Weekly');
    assert.equal(nested.routes.filter(route => route.name === 'Weekly').length, 1);
    const retained = nested.routes.find(route => route.name === 'Events');
    assert.equal(retained.key, eventsKey);
    assert.deepEqual(retained.params, context);
  };
  for (let index = 0; index < 2; index++) {
    dispatch(CommonActions.navigate('EventDetail', { id: 'known' }));
    dispatch(CommonActions.navigate('Weekly'));
    module.exports.default({ navigation: { popTo: (name, params) => dispatch(StackActions.popTo(name, params)) } });
    effects.shift()(); check();
  }
  const linking = createLinking({ prefixes: [], parsePath: getStateFromPath, serializeState: getPathFromState });
  for (const path of ['weekly/', 'pt/Weekly', 'weekly/']) {
    dispatch(CommonActions.navigate('EventDetail', { id: 'known' }));
    const linked = linking.getStateFromPath(path, linking.config);
    dispatch(getActionFromState(linked, linking.config)); check();
  }
});

test('actual five-tab labels expose localized names and uncapped wrapping', () => {
  for (const catalog of [en, pt]) {
    const tree = render(catalog, 2.143, 34);
    const screens = React.Children.toArray(tree.props.children);
    assert.equal(screens[2].props.options.title, catalog === en ? 'Weekly' : 'Semanais');
    for (const screen of screens) {
      const options = tree.props.screenOptions({ route: { name: screen.props.name } });
      const label = options.tabBarLabel({ children: screen.props.options.title, color: 'black' });
      assert.ok(Number.isFinite(label.props.style.width));
      assert.equal(label.props.numberOfLines, undefined);
      assert.equal(label.props.maxFontSizeMultiplier, undefined);
      assert.notEqual(label.props.allowFontScaling, false);
    }
  }
});


test('actual weighted tab cells give Events and Weekly extra width without shrinking labels', () => {
  for (const [width, left, right, barLeft, barRight] of [[320, 0, 0, 0, 320], [402, 0, 0, 0, 402], [411.4286, 0, 0, 0, 411.4286], [402, 16, 16, 16, 386], [914, 48, 0, 48, 866], [914, 0, 48, 48, 866]]) {
    const tree = render(pt, 2.143, 34, width, left, right);
    const screens = React.Children.toArray(tree.props.children);
    const options = screens.map(screen => tree.props.screenOptions({ route: { name: screen.props.name } }));
    const weights = options.map(value => value.tabBarItemStyle?.flex ?? 1);
    assert.ok(weights[1] > weights[0] && weights[2] > weights[0], 'longer Events and Weekly labels need larger cells');
    assert.ok(weights[1] > weights[4] && weights[2] > weights[4]);
    assert.ok(weights[2] > weights[1], 'Semanais requires the largest measured label budget');
    const total = weights.reduce((sum, value) => sum + value, 0);
    const labels = options.map((value, index) => value.tabBarLabel({ children: screens[index].props.options.title, color: 'black' }));
    assert.ok(labels.reduce((sum, label) => sum + label.props.style.width, 0) <= barRight - barLeft + Number.EPSILON * width, 'combined label widths stay inside observed bar bounds');
    let edge = barLeft;
    for (const [index, screen] of screens.entries()) {
      const label = options[index].tabBarLabel({ children: screen.props.options.title, color: 'black' });
      const cellWidth = (barRight - barLeft) * weights[index] / total;
      assert.equal(label.props.style.width, cellWidth, 'text uses the same share as its public item flex');
      assert.ok(cellWidth >= 44);
      assert.ok(edge >= barLeft && edge + cellWidth <= barRight + Number.EPSILON * width);
      assert.equal(label.props.numberOfLines, undefined);
      assert.notEqual(label.props.allowFontScaling, false);
      edge += cellWidth;
    }
  }
});
