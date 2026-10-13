import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');

test('the mounted feed hook delivers updates to the current callback and unsubscribes', () => {
  const ref = {}; let effect, update, unsubscribed = false, subscriptions = 0;
  const imports = {
    react: { useRef: () => ref, useEffect: (callback) => { effect ||= callback; } },
    '../utils/data': { subscribeSpecialEvents: (callback) => { subscriptions++; update = callback; return () => { unsubscribed = true; }; } },
  };
  const code = transformSync(readFileSync(new URL('./useSpecialFeed.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => imports[name], module, module.exports);
  const calls = [];
  module.exports.default((events, state) => calls.push(['initial', events, state]));
  const cleanup = effect();
  update([{ name: 'Stored' }], { status: 'stored', refreshing: true });
  module.exports.default((events, state) => calls.push(['updated', events, state]));
  update([{ name: 'Published' }], { status: 'current', refreshing: false });
  assert.equal(subscriptions, 1);
  assert.equal(calls[0][0], 'initial');
  assert.equal(calls[1][0], 'updated');
  assert.equal(calls[1][1][0].name, 'Published');
  cleanup(); assert.equal(unsubscribed, true);
});
