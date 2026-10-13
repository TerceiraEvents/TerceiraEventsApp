import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { changeReminder } from '../../utils/changeReminder.js';
const { transformSync } = createRequire(import.meta.url)('@babel/core');
function nodes(node) { return [node, ...React.Children.toArray(node?.props?.children).flatMap(nodes)]; }
test('full inline card retains exact detail entry and unknown reminder Retry without enabling an unsafe action', async () => {
  let cursor = 0; const state = [], focus = []; let denied = true;
  const react = { ...React, useState: value => { const index = cursor++; if (!(index in state)) state[index] = value; return [state[index], next => { state[index] = next; }]; }, useCallback: value => value };
  const native = { View: 'View', TouchableOpacity: 'Button', Alert: { alert() {} } };
  const imports = { react, 'react-native': native, '@react-navigation/native': { useFocusEffect: value => focus.push(value) }, './Text': 'Text', './EventCard': 'Card', '../i18n': { useLocale: () => ({ t: key => key }) }, '../utils/data': { isEnded: () => false }, '../utils/storage': { getRemindedEventsStrict: async () => { if (denied) throw Error('malformed'); return new Set(['id']); }, makeEventKey: () => 'id' }, '../utils/eventTime': { publishedEventTime: () => ({ start: new Date() }) }, '../utils/notifications': {}, '../utils/changeReminder': { changeReminder } };
  const code = transformSync(readFileSync(new URL('../InlineEventCard.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} }; new Function('require', 'module', 'exports', code)(name => { assert.ok(name in imports, name); return imports[name]; }, module, module.exports);
  const event = { id: 'id' }, onOpen = () => {};
  const render = () => { cursor = 0; return nodes(module.exports.default({ event, onOpen })); };
  render(); focus[0](); await new Promise(setImmediate);
  let tree = render(), card = tree.find(node => node.type === 'Card');
  assert.equal(card.props.onOpen, onOpen); assert.equal(card.props.compact, undefined); assert.equal(card.props.calendarEnabled, true);
  assert.equal(card.props.onToggleReminder, undefined); assert.equal(card.props.reminded, null);
  const retry = tree.find(node => node.type === 'Button'); assert.ok(retry);
  denied = false; await retry.props.onPress(); tree = render(); card = tree.find(node => node.type === 'Card');
  assert.equal(card.props.reminded, true); assert.equal(typeof card.props.onToggleReminder, 'function'); assert.equal(tree.find(node => node.type === 'Button'), undefined);
});
