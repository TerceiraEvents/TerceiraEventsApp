import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import en from '../i18n/strings.en.js';
import pt from '../i18n/strings.pt.js';
import { blogRoutes, rootRoutes } from '../utils/navigation.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
for (const [catalog, label] of [[en, 'Back'], [pt, 'Voltar']]) test(`actual Blog index has a visible ${label} route-aware return action`, () => {
  const t = (key) => key.split('.').reduce((value, part) => value?.[part], catalog);
  const imports = { react: React, 'react-native': { TouchableOpacity: 'Button', Text: 'Text' }, '@react-navigation/native-stack': { createNativeStackNavigator: () => ({ Navigator: 'Navigator', Screen: 'Screen' }) }, '../screens/BlogScreen': 'Blog', '../screens/PostScreen': 'Post', './headerTheme': { headerOptions: () => ({}) }, '../utils/navigation': { blogRoutes, rootRoutes }, '../i18n': { useLocale: () => ({ t, locale: catalog === en ? 'en' : 'pt' }) }, '../utils/i18nFields': { localizedField: (record, key) => record[key] }, '../utils/theme': { colors: {} } };
  const code = transformSync(readFileSync(new URL('./BlogStack.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => { assert.ok(name in imports, name); return imports[name]; }, module, module.exports);
  for (const canBack of [true, false]) {
    const calls = [];
    const navigation = { canGoBack: () => canBack, goBack: () => calls.push('back'), navigate: (route) => calls.push(route) };
    const tree = module.exports.default({ navigation });
    const screens = React.Children.toArray(tree.props.children);
    const index = screens.find((screen) => screen.props.name === blogRoutes.index);
    assert.equal(typeof index.props.options.headerLeft, 'function', 'discoverable index Back control');
    const button = index.props.options.headerLeft();
    assert.equal(button.props.accessibilityRole, 'button');
    assert.equal(button.props.accessibilityLabel, label);
    assert.equal(button.props.children.props.children, label);
    assert.ok(button.props.style.minWidth >= 44 && button.props.style.minHeight >= 44);
    button.props.onPress();
    assert.deepEqual(calls, [canBack ? 'back' : rootRoutes.main]);
    const post = screens.find((screen) => screen.props.name === blogRoutes.post).props.options({ route: { params: { post: { title: 'Article' } } } });
    assert.equal(post.headerLeft, undefined, 'Post keeps its native return to Blog index');
    assert.equal(post.headerBackTitle, t('tabs.blog'));
  }
});
