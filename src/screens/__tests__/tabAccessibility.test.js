import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import en from '../../i18n/strings.en.js';
import pt from '../../i18n/strings.pt.js';
import { primaryRoutes } from '../../utils/navigation.js';
const require = createRequire(import.meta.url);
const { parseSync, transformSync } = require('@babel/core');
const source = readFileSync(new URL('../../../App.js', import.meta.url), 'utf8');
const ast = parseSync(source, { babelrc: false, configFile: false, parserOpts: { plugins: ['jsx'] } });
const definition = ast.program.body.find((node) => node.type === 'FunctionDeclaration' && node.id.name === 'PrimaryTabs');
const code = transformSync(source.slice(definition.start, definition.end), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
for (const catalog of [en, pt]) test(`actual primary tabs have explicit localized spoken labels (${catalog === en ? 'EN' : 'PT'})`, () => {
  const t = (key) => key.split('.').reduce((value, part) => value[part], catalog);
  const names = ['React', 'useLocale', 'useWindowDimensions', 'useSafeAreaInsets', 'primaryRoutes', 'Tab', 'HomeScreen', 'SpecialEventsScreen', 'VenuesScreen', 'SavedScreen', 'MoreScreen'];
  const tree = new Function(...names, code + '\nreturn PrimaryTabs();')(React, () => ({ t }), () => ({ fontScale: 1 }), () => ({ bottom: 0 }), primaryRoutes, { Navigator: 'Navigator', Screen: 'Screen' }, 'Home', 'Events', 'Venues', 'Saved', 'More');
  const screens = React.Children.toArray(tree.props.children);
  assert.equal(screens.length, 5);
  for (const [index, key] of ['tabs.home', 'discovery.explore', 'tabs.venues', 'discovery.saved', 'discovery.more'].entries()) {
    assert.equal(screens[index].props.options.tabBarAccessibilityLabel, t(key));
    assert.equal(screens[index].props.options.tabBarAccessibilityLabel, screens[index].props.options.title);
  }
});
