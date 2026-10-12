import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rootRoutes, primaryRoutes, blogRoutes } from '../utils/navigation.js';
import { headerOptions, statusBarStyleForRoute } from './headerTheme.js';

function luminance(hex) {
  const values = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

test('status text contrasts with actual registered header themes, including Blog routes', () => {
  for (const route of [...Object.values(primaryRoutes), ...Object.values(rootRoutes), ...Object.values(blogRoutes)]) {
    const background = luminance(headerOptions(route).headerStyle.backgroundColor);
    const foreground = statusBarStyleForRoute(route) === 'light' ? 1 : 0;
    const contrast = (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
    assert.ok(contrast >= 4.5, `${route} has insufficient status-text contrast: ${contrast}`);
  }
});
