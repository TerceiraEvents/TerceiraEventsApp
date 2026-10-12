import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tabBarHeight } from './tabLayout.js';

test('tab height accommodates two scaled text lines plus icons and safe area', () => {
  for (const scale of [1, 1.5, 2, 3]) {
    for (const inset of [0, 24, 34]) {
      assert.ok(tabBarHeight(scale, inset) >= 34 + 36 * scale + inset);
    }
  }
});
