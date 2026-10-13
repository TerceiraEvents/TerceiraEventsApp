import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { getStateFromPath, getPathFromState } from '@react-navigation/core';
import { createLinking } from './linking.js';
import * as routes from '../utils/navigation.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
const exact = 'terceiraevents://events?id=c0165462-a730-4823-999d-aeb71d9f1a69';

function appLinking(nativeLinking) {
  const imports = { './fontHeader': { fontHeaderOptions: (options) => options }, './src/navigation/fontHeader': { fontHeaderOptions: (options) => options }, '../components/TextInput': 'TextInput', './TextInput': 'TextInput', '../utils/nativeFontMetrics': { hasNativeFontMetrics: false }, '../components/markdownRules': { markdownRules: {} }, '../components/Text': 'Text', './Text': 'Text', './src/components/Text': { __esModule: true, default: 'Text', TextProvider: 'TextProvider' },
    react: { ...React, useRef: () => ({ current: null }), useState: (value) => [value, () => {}], useEffect() {} },
    '@react-navigation/native': { NavigationContainer: 'NavigationContainer', getStateFromPath, getPathFromState },
    '@react-navigation/native-stack': { createNativeStackNavigator: () => ({ Navigator: 'Stack', Screen: 'Screen' }) },
    '@react-navigation/bottom-tabs': { createBottomTabNavigator: () => ({ Navigator: 'Tabs', Screen: 'Screen' }) },
    'expo-linking': { ...nativeLinking, createURL: () => 'terceiraevents://' },
    './src/navigation/linking': { createLinking },
    './src/utils/navigation': routes,
    './src/navigation/headerTheme': { statusBarStyleForRoute: () => 'light', headerOptions: () => ({}) },
    './src/i18n': { useLocale() {}, t: (key) => key },
    './src/i18n/core': { t: (key) => key },
  };
  const code = transformSync(readFileSync(new URL('../../App.js', import.meta.url), 'utf8') + '\nexport { AppShell };', { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => imports[name] || {}, module, module.exports);
  return module.exports.AppShell().props.linking;
}

for (const scenario of ['URL delivered while plain startup initializes', 'proper URL cold launch', 'no incoming URL']) {
  test(`actual App linking resolves ${scenario}`, async () => {
    let retained = null; let asynchronousReads = 0;
    const initial = scenario === 'proper URL cold launch' ? exact : null;
    const nativeLinking = { getLinkingURL: () => retained, getInitialURL: async () => { asynchronousReads++; return initial; } };
    const linking = appLinking(nativeLinking);
    if (scenario === 'URL delivered while plain startup initializes') retained = exact;
    const url = linking.getInitialURL ? await linking.getInitialURL() : await nativeLinking.getInitialURL();
    assert.equal(url, scenario === 'no incoming URL' ? null : exact);
    assert.equal(asynchronousReads, retained ? 0 : 1);
    assert.equal(linking.subscribe, undefined, 'ready URL event subscription uses React Navigation');
    if (url) {
      const state = linking.getStateFromPath(url.replace('terceiraevents://', ''), linking.config);
      assert.equal(state.routes[1].params.id, 'c0165462-a730-4823-999d-aeb71d9f1a69');
      assert.equal(state.routes[0].name, 'Main');
    }
  });
}
