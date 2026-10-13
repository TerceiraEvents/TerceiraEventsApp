import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import en from '../../i18n/strings.en.js';
import pt from '../../i18n/strings.pt.js';
import { primaryRoutes } from '../../utils/navigation.js';
import { tabBarHeight } from '../../utils/tabLayout.js';
const require = createRequire(import.meta.url);
const { parseSync, transformSync } = require('@babel/core');
const source = readFileSync(new URL('../../../App.js', import.meta.url), 'utf8');
const ast = parseSync(source, { babelrc: false, configFile: false, parserOpts: { plugins: ['jsx'] } });
const definition = ast.program.body.find((node) => node.type === 'FunctionDeclaration' && node.id.name === 'PrimaryTabs');
const code = transformSync(source.slice(definition.start, definition.end), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
for (const catalog of [en, pt]) test(`actual primary tabs have explicit localized spoken labels (${catalog === en ? 'EN' : 'PT'})`, () => {
  const t = (key) => key.split('.').reduce((value, part) => value[part], catalog);
  const names = ['React', 'useLocale', 'useWindowDimensions', 'useSafeAreaInsets', 'primaryRoutes', 'Tab', 'HomeScreen', 'SpecialEventsScreen', 'WeeklyScreen', 'VenuesScreen', 'MoreScreen'];
  const tree = new Function(...names, code + '\nreturn PrimaryTabs();')(React, () => ({ t }), () => ({ fontScale: 1 }), () => ({ bottom: 0 }), primaryRoutes, { Navigator: 'Navigator', Screen: 'Screen' }, 'Home', 'Events', 'Weekly', 'Venues', 'More');
  const screens = React.Children.toArray(tree.props.children);
  assert.equal(screens.length, 5);
  for (const [index, key] of ['tabs.home', 'discovery.explore', 'tabs.weekly', 'tabs.venues', 'discovery.more'].entries()) {
    const literal = catalog === en ? ['Home', 'Events', 'Weekly', 'Places', 'More'] : ['Início', 'Eventos', 'Semanais', 'Locais', 'Mais'];
    assert.equal(screens[index].props.options.title, literal[index]);
    assert.equal(screens[index].props.options.tabBarAccessibilityLabel, t(key));
    assert.equal(screens[index].props.options.tabBarAccessibilityLabel, screens[index].props.options.title);
  }
});

test('actual tab glyphs keep their fixed icon budget while labels retain uncapped scaling', () => {
  const names = ['React', 'useLocale', 'useWindowDimensions', 'useSafeAreaInsets', 'primaryRoutes', 'Tab', 'HomeScreen', 'SpecialEventsScreen', 'WeeklyScreen', 'VenuesScreen', 'SavedScreen', 'MoreScreen', 'Text', 'headerOptions', 'colors', 'tabBarHeight'];
  for (const fontScale of [1, 2.353, 3]) for (const bottom of [0, 34]) {
    const tree = new Function(...names, code + '\nreturn PrimaryTabs();')(React, () => ({ t: (key) => key }), () => ({ fontScale }), () => ({ bottom }), primaryRoutes, { Navigator: 'Navigator', Screen: 'Screen' }, 'Home', 'Events', 'Weekly', 'Venues', 'Saved', 'More', 'Text', () => ({}), {}, tabBarHeight);
    for (const route of Object.values(primaryRoutes)) {
      const options = tree.props.screenOptions({ route: { name: route } });
      const icon = options.tabBarIcon({ color: 'black', size: 24 });
      const label = options.tabBarLabel({ children: 'Label', color: 'black' });
      assert.equal(icon.props.allowFontScaling, false, 'decorative glyph cannot outgrow its reserved icon area');
      assert.equal(icon.props.accessibilityElementsHidden, true);
      assert.notEqual(label.props.allowFontScaling, false, 'readable label respects user text size');
      assert.equal(label.props.maxFontSizeMultiplier, undefined);
      assert.equal(label.props.numberOfLines, undefined);
      assert.ok(options.tabBarStyle.height >= icon.props.style.fontSize + 2 * label.props.style.lineHeight * fontScale + 10 + bottom);
    }
  }
});
