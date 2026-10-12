import { test } from 'node:test';
import assert from 'node:assert/strict';
import en from '../i18n/strings.en.js';
import pt from '../i18n/strings.pt.js';
import { moreRoutes } from './moreRoutes.js';

test('More provides an unambiguous Resources label in both languages', () => {
  const [, key] = moreRoutes.find(([route]) => route === 'Resources');
  const label = (catalog) => key.split('.').reduce((value, part) => value[part], catalog);
  assert.equal(label(en), 'Resources');
  assert.equal(label(pt), 'Recursos');
  assert.deepEqual(new Set(moreRoutes.map(([route]) => route)), new Set(['Blog', 'Resources', 'Settings', 'SuggestEvent']));
});
