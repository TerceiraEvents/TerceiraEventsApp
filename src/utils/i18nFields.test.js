import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localizedField } from './i18nFields.js';

test('published descriptions remain available when only another language exists', () => {
  assert.equal(localizedField({ description_pt: 'Descrição publicada' }, 'description', 'en'), 'Descrição publicada');
  assert.equal(localizedField({ description_en: 'Published description' }, 'description', 'pt'), 'Published description');
});

test('requested price translation takes priority over original and other-language values', () => {
  const event = { price: 'Original', price_pt: '5 euros', price_en: '€5' };
  assert.equal(localizedField(event, 'price', 'pt'), '5 euros');
  assert.equal(localizedField(event, 'price', 'en'), '€5');
  assert.equal(localizedField({ price: 'Original', price_pt: 'Outro' }, 'price', 'en'), 'Original');
});
