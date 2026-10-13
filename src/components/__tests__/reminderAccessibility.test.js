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

test('rendered reminder controls expose literal actions and active state in both languages', () => {
  for (const [locale, strings, labels] of [['en', en, ['Set reminder', 'Cancel reminder', 'Remove unavailable reminder request']], ['pt', pt, ['Definir lembrete', 'Cancelar lembrete', 'Remover pedido de lembrete indisponível']]]) {
    const react = { ...React, useState: value => [value, () => {}] };
    const native = { Platform: { OS: 'android' }, StyleSheet: { create: value => value }, View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', Image: 'Image' };
    const imports = { react, 'react-native': native, 'expo-calendar': {}, '../utils/data': data, '../utils/tags': tags, '../utils/theme': theme, '../utils/i18nFields': fields, '../utils/eventIdentity': identity, '../utils/eventTime': eventTime, '../i18n': { useLocale: () => ({ locale, t: key => key.split('.').reduce((value, part) => value?.[part], strings) || key }) } };
    const code = transformSync(readFileSync(new URL('../EventCard.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)(name => imports[name] || 'Modal', module, module.exports);
    for (const [reminded, reminderUnavailable, label, selected] of [[false, false, labels[0], false], [true, false, labels[1], true], [true, true, labels[2], false]]) {
      const toggle = () => {};
      const tree = module.exports.default({ event: { name: 'Published', date: '2026-10-17', time: '17:30' }, reminded, reminderUnavailable, onToggleReminder: toggle });
      const button = nodes(tree).find(node => node.props?.accessibilityLabel === label);
      assert.ok(button, `${locale}: ${label}`);
      assert.deepEqual(button.props.accessibilityState, { selected });
    }
  }
});
