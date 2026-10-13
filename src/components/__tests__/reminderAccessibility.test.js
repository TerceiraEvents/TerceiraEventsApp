import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import * as data from '../../utils/data.js';
import * as tags from '../../utils/tags.js';
import * as theme from '../../utils/theme.js';
import * as fields from '../../utils/i18nFields.js';
import * as identity from '../../utils/eventIdentity.js';
import * as eventTime from '../../utils/eventTime.js';
import en from '../../i18n/strings.en.js';
import pt from '../../i18n/strings.pt.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
function nodes(element) { return [element, ...React.Children.toArray(element?.props?.children).flatMap(nodes)]; }

for (const [locale, strings, labels] of [['en', en, ['Set reminder', 'Cancel reminder', 'Remove unavailable reminder request']], ['pt', pt, ['Definir lembrete', 'Cancelar lembrete', 'Remover pedido de lembrete indisponível']]]) test(`rendered ${locale} reminder controls and Settings hint name the bell and future-time requirement`, () => {
    const react = { ...React, useState: value => [value, () => {}] };
    const native = { Platform: { OS: 'android' }, StyleSheet: { create: value => value }, View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', Image: 'Image' };
    const imports = { react, 'react-native': native, 'expo-calendar': {}, '../utils/data': data, '../utils/tags': tags, '../utils/theme': theme, '../utils/i18nFields': fields, '../utils/eventIdentity': identity, '../utils/eventTime': eventTime, '../i18n': { useLocale: () => ({ locale, t: key => key.split('.').reduce((value, part) => value?.[part], strings) || key }) } };
    const code = transformSync(readFileSync(new URL('../EventCard.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)(name => imports[name] || 'Modal', module, module.exports);
    const settingsImports = {
      react: { ...React, useState: () => [{}, () => {}], useEffect: () => {}, useCallback: value => value },
      'react-native': { ...native, ScrollView: 'ScrollView', Switch: 'Switch', Alert: {} },
      '../utils/theme': theme, '../utils/storage': {}, '../utils/notifications': {}, '../utils/data': data,
      '../i18n': { ...imports['../i18n'], LOCALE_CHOICES: [] },
    };
    const settingsCode = transformSync(readFileSync(new URL('../../screens/SettingsScreen.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
    const settingsModule = { exports: {} };
    new Function('require', 'module', 'exports', settingsCode)(name => settingsImports[name], settingsModule, settingsModule.exports);
    const hint = locale === 'en' ? 'Tap the bell to set a reminder. The event must have a future start time.' : 'Toca no sino para definires um lembrete. O evento tem de ter uma hora de início futura.';
    assert.ok(nodes(settingsModule.exports.default()).some(node => node.props?.children === hint), `${locale}: Settings names the bell control and future-time requirement`);
    for (const [reminded, reminderUnavailable, label, selected] of [[false, false, labels[0], false], [true, false, labels[1], true], [true, true, labels[2], false]]) {
      const toggle = () => {};
      const tree = module.exports.default({ event: { name: 'Published', date: '2026-10-17', time: '17:30' }, reminded, reminderUnavailable, onToggleReminder: toggle });
      const button = nodes(tree).find(node => node.props?.accessibilityLabel === label);
      assert.ok(button, `${locale}: ${label}`);
      assert.deepEqual(button.props.accessibilityState, { selected });
      assert.ok(nodes(button).some(node => ['🔔', '🔕'].includes(node.props?.children)), 'hint refers to the rendered bell control');
    }
});
