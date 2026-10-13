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
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
function nodes(element) { return [element, ...React.Children.toArray(element?.props?.children).flatMap(nodes)]; }

test('detail title has full card width independently of all four actions', () => {
  const react = { ...React, useState: (value) => [value, () => {}] };
  const native = Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'Image'].map((name) => [name, name]));
  native.StyleSheet = { create: (styles) => styles };
  const imports = { '../components/Text': 'Text', './Text': 'Text', './src/components/Text': { __esModule: true, default: 'Text', TextProvider: 'TextProvider' }, react, 'react-native': native, '../utils/data': data, '../utils/tags': tags, '../utils/theme': theme, '../utils/i18nFields': fields, '../utils/eventIdentity': identity, '../i18n': { useLocale: () => ({ t: (key) => key, locale: 'en' }) } };
  const code = transformSync(readFileSync(new URL('../../components/EventCard.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => imports[name] || 'Modal', module, module.exports);
  const title = 'Milestones of Autonomy: from the Administrative Board to the First Regional Government';
  const tree = module.exports.default({ event: { name: title, date: '2026-06-12' }, calendarEnabled: true, onToggleReminder: () => {} });
  const parent = nodes(tree).find((element) => React.Children.toArray(element?.props?.children).some((child) => child.props?.children === title));
  assert.equal(React.Children.toArray(parent.props.children).filter((child) => child.type === 'TouchableOpacity').length, 0);
  const actions = nodes(tree).filter((node) => ['discovery.share', 'discovery.calendar', 'discovery.report', 'discovery.setReminder'].includes(node.props?.accessibilityLabel));
  assert.equal(actions.length, 4);
  assert.ok(actions.every((node) => typeof node.props.onPress === 'function'));
  const badge = nodes(tree).find((node) => node.props?.style?.backgroundColor === theme.colors.primary);
  assert.equal(badge.props.style.height, undefined);
  assert.equal(badge.props.style.width, undefined);
  assert.notEqual(tree.props.style.flexDirection, 'row');
});
