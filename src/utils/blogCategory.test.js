// Unit tests for the blog category pill resolver. Exercises
// localized labels, unknown-category fallback, and the null-input
// short-circuit. Run with: node --test "src/**/*.test.js"
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { categoryPillMeta, CATEGORY_COLORS } from './blogCategory.js';
import { setLocale, t } from '../i18n/core.js';

test('categoryPillMeta: returns null for falsy categories', () => {
  assert.equal(categoryPillMeta(null, t), null);
  assert.equal(categoryPillMeta(undefined, t), null);
  assert.equal(categoryPillMeta('', t), null);
});

test('categoryPillMeta: known category resolves EN label and palette', () => {
  setLocale('en');
  const meta = categoryPillMeta('news', t);
  assert.equal(meta.label, 'NEWS');
  assert.equal(meta.bg, CATEGORY_COLORS.news.bg);
  assert.equal(meta.text, CATEGORY_COLORS.news.text);
});

test('categoryPillMeta: known category resolves PT label', () => {
  setLocale('pt');
  assert.equal(categoryPillMeta('news', t).label, 'NOTÍCIAS');
  assert.equal(categoryPillMeta('guide', t).label, 'GUIA');
  assert.equal(categoryPillMeta('advice', t).label, 'CONSELHOS');
  setLocale('en');
});

test('categoryPillMeta: every known category has both EN and PT translations', () => {
  for (const key of Object.keys(CATEGORY_COLORS)) {
    setLocale('en');
    const en = categoryPillMeta(key, t).label;
    setLocale('pt');
    const pt = categoryPillMeta(key, t).label;
    // i18n-js uses "[missing ...]" for unresolved keys — make sure
    // both locales actually resolve the category to something usable.
    assert.ok(en && !en.startsWith('['), `EN label unresolved for "${key}": ${en}`);
    assert.ok(pt && !pt.startsWith('['), `PT label unresolved for "${key}": ${pt}`);
    assert.notEqual(en, pt, `EN and PT label collide for "${key}"`);
  }
  setLocale('en');
});

test('categoryPillMeta: unknown category falls back to upper-cased raw key', () => {
  setLocale('en');
  const meta = categoryPillMeta('opinion', t);
  assert.equal(meta.label, 'OPINION');
  assert.ok(meta.bg, 'fallback palette has bg');
  assert.ok(meta.text, 'fallback palette has text');
});

test('categoryPillMeta: works without a t function', () => {
  const meta = categoryPillMeta('news', null);
  assert.equal(meta.label, 'NEWS');
});
