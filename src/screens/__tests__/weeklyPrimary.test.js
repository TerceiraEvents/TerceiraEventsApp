import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
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
function render(catalog, fontScale = 1, bottom = 0) {
  const t = key => key.split('.').reduce((value, part) => value[part], catalog);
  const names = ['React', 'useLocale', 'useWindowDimensions', 'useSafeAreaInsets', 'primaryRoutes', 'Tab', 'HomeScreen', 'SpecialEventsScreen', 'WeeklyScreen', 'VenuesScreen', 'MoreScreen', 'Text', 'headerOptions', 'colors', 'tabBarHeight'];
  return new Function(...names, code + '\nreturn PrimaryTabs();')(React, () => ({ t }), () => ({ fontScale }), () => ({ bottom }), primaryRoutes, { Navigator: 'Navigator', Screen: 'Screen' }, 'Home', 'Events', 'WeeklyContent', 'Places', 'More', 'Text', () => ({}), {}, tabBarHeight);
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

test('root Weekly entry returns to existing primary navigation without duplicate Main history', () => {
  const matches = source.match(/name=\{rootRoutes.weekly\} component=\{([^}]+)\}/);
  assert.equal(matches?.[1], 'WeeklyRouteAlias');
  const moduleSource = readFileSync(new URL('../../navigation/WeeklyRouteAlias.js', import.meta.url), 'utf8');
  const transformed = transformSync(moduleSource, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const effects = []; const module = { exports: {} };
  new Function('require', 'module', 'exports', transformed)(name => name === 'react' ? { useEffect: effect => effects.push(effect) } : { primaryRoutes, rootRoutes }, module, module.exports);
  const router = StackRouter({});
  const options = { routeNames: Object.values(rootRoutes), routeParamList: {}, routeGetIdList: {} };
  let state = router.getInitialState(options);
  const originalMain = state.routes[0].key;
  state = router.getStateForAction(state, CommonActions.navigate(rootRoutes.weekly), options);
  module.exports.default({ navigation: { popTo: (name, params) => { state = router.getStateForAction(state, StackActions.popTo(name, params), options); } } });
  effects[0]();
  assert.equal(state.routes.length, 1);
  assert.equal(state.routes[0].key, originalMain);
  assert.deepEqual(state.routes[0].params, { screen: 'Weekly' });
});

test('actual five-tab labels keep uncapped wrapping and reserve measured two-line height', () => {
  for (const catalog of [en, pt]) {
    const tree = render(catalog, 2.143, 34);
    const screens = React.Children.toArray(tree.props.children);
    assert.equal(screens[2].props.options.title, catalog === en ? 'Weekly' : 'Semanais');
    for (const screen of screens) {
      const options = tree.props.screenOptions({ route: { name: screen.props.name } });
      const label = options.tabBarLabel({ children: screen.props.options.title, color: 'black' });
      assert.equal(label.props.style.width, '100%');
      assert.equal(label.props.numberOfLines, undefined);
      assert.equal(label.props.maxFontSizeMultiplier, undefined);
      assert.notEqual(label.props.allowFontScaling, false);
      assert.ok(402 / screens.length - 10 >= 44, 'five label cells preserve a usable minimum width');
      assert.ok(options.tabBarStyle.height - 34 - 34 - 8 >= 2 * 38.57399797439575, 'measured iOS large-text line height fits twice above safe area');
    }
  }
});
