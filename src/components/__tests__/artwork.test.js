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
import en from '../../i18n/strings.en.js';
import pt from '../../i18n/strings.pt.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
function nodes(element) { return [element, ...React.Children.toArray(element?.props?.children).flatMap(nodes)]; }
function render(event, locale = 'en', platform = 'android') {
  const state = []; let cursor = 0;
  const react = { ...React, useState: (initial) => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], (value) => { state[index] = value; }]; } };
  const native = Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'Image'].map((name) => [name, name]));
  native.StyleSheet = { create: (styles) => styles };
  const announced = []; native.Platform = { OS: platform };
  native.AccessibilityInfo = { announceForAccessibility: (message) => announced.push(message) };
  const opened = []; native.Linking = { openURL: (url) => opened.push(url) };
  const t = (key) => key.split('.').reduce((value, part) => value?.[part], locale === 'pt' ? pt : en);
  const imports = { react, 'react-native': native, '../utils/data': data, '../utils/tags': tags, '../utils/theme': theme, '../utils/i18nFields': fields, '../utils/eventIdentity': identity, '../i18n': { useLocale: () => ({ t, locale }) } };
  const code = transformSync(readFileSync(new URL('../EventCard.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => imports[name] || 'Modal', module, module.exports);
  const rerender = () => { cursor = 0; return module.exports.default({ event, calendarEnabled: true, onToggleReminder: () => {} }); };
  return { tree: rerender(), rerender, opened, announced, t };
}

test('broken artwork retains event information and announces failure in EN/PT', () => {
  for (const locale of ['en', 'pt']) {
    const result = render({ name: 'Published event', date: '2026-10-17', image: 'https://example.org/poster.jpg' }, locale);
    const image = nodes(result.tree).find((node) => node.type === 'Image');
    assert.equal(typeof image.props.onError, 'function');
    image.props.onError();
    const tree = result.rerender();
    assert.ok(nodes(tree).some((node) => node.props?.children === 'Published event'));
    assert.equal(nodes(tree).some((node) => node.type === 'Image'), false);
    const failure = nodes(tree).find((node) => node.props?.children === result.t('discovery.artworkUnavailable'));
    assert.equal(failure.props.accessibilityLiveRegion, 'polite');
    assert.deepEqual(result.announced, []);
    for (const key of ['share', 'calendar', 'report', 'reminder', 'poster']) {
      const action = nodes(tree).find((node) => node.props?.accessibilityLabel === result.t(`discovery.${key}`));
      assert.equal(typeof action?.props.onPress, 'function', `retains ${key}`);
    }
  }
});

test('published artwork accessibility and provenance remain readable without unsafe links', () => {
  for (const locale of ['en', 'pt']) {
    const event = { name: 'Published event', image: '/assets/images/events/poster.jpg', image_alt_en: 'Complete programme', image_alt_pt: 'Programa completo', image_credit: 'Organizer', image_rights: 'CC BY 4.0', image_source: 'https://example.org/source' };
    const result = render(event, locale);
    const all = nodes(result.tree);
    assert.equal(all.find((node) => node.type === 'Image').props.accessibilityLabel, locale === 'pt' ? 'Programa completo' : 'Complete programme');
    for (const value of ['Organizer', 'CC BY 4.0']) assert.ok(all.some((node) => String(node.props?.children).includes(value)));
    const source = all.find((node) => node.props?.accessibilityLabel === result.t('discovery.artworkSource'));
    source.props.onPress(); assert.deepEqual(result.opened, ['https://example.org/source']);
    event.image_source = 'javascript:alert(1)';
    assert.equal(nodes(result.rerender()).some((node) => node.props?.accessibilityLabel === result.t('discovery.artworkSource')), false);
  }
});

test('missing or malformed artwork is absent; portrait, landscape and oversized posters use the same contained frame', () => {
  for (const image of [undefined, '', 42, 'javascript:alert(1)', '//example.org/poster.jpg', 'https://']) {
    assert.equal(nodes(render({ name: 'Published event', image }).tree).some((node) => node.type === 'Image'), false);
  }
  for (const shape of ['portrait', 'landscape', 'oversized']) {
    const image = nodes(render({ name: 'Published event', image: `https://example.org/${shape}.jpg` }).tree).find((node) => node.type === 'Image');
    assert.equal(image.props.resizeMode, 'contain');
    assert.equal(image.props.style.width, '100%');
    assert.equal(image.props.style.height, 360);
  }
});


test('iOS image failure announces the localized status through the public accessibility API', () => {
  for (const locale of ['en', 'pt']) {
    const result = render({ name: 'Published event', image: 'https://example.org/poster.jpg' }, locale, 'ios');
    nodes(result.tree).find((node) => node.type === 'Image').props.onError();
    assert.deepEqual(result.announced, [result.t('discovery.artworkUnavailable')]);
  }
});

test('present rejected artwork shows failure without a full-size unsafe link', () => {
  for (const locale of ['en', 'pt']) {
    for (const image of [42, 'javascript:alert(1)', '//example.org/poster.jpg', '/assets/images/../secret.jpg']) {
      const result = render({ name: 'Published event', image }, locale);
      const all = nodes(result.tree);
      assert.ok(all.some((node) => node.props?.children === result.t('discovery.artworkUnavailable')));
      assert.equal(all.some((node) => node.props?.accessibilityLabel === result.t('discovery.poster')), false);
    }
  }
});
