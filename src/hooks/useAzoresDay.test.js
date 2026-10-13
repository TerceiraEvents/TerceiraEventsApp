import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { todayAzores } from '../utils/data.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
const source = readFileSync(new URL('./useAzoresDay.js', import.meta.url), 'utf8');
const code = transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;

for (const [name, start, next, initialDay, nextDay] of [
  ['summer', '2026-10-13T23:59:30Z', '2026-10-14T00:00:30Z', '2026-10-13', '2026-10-14'],
  ['winter', '2026-01-14T00:59:30Z', '2026-01-14T01:00:30Z', '2026-01-13', '2026-01-14'],
  ['spring DST', '2026-03-29T00:59:30Z', '2026-03-29T01:00:30Z', '2026-03-28', '2026-03-29'],
  ['autumn DST', '2026-10-25T00:59:30Z', '2026-10-25T01:00:30Z', '2026-10-25', '2026-10-25'],
]) test(`production focused day clock handles minute, foreground, refocus and cleanup (${name})`, () => {
  let now = new Date(start), day, focus, sequence = 0;
  const timers = new Map(), listeners = new Set();
  const imports = {
    react: { useState: initial => { if (day === undefined) day = initial(); return [day, value => { day = value; }]; }, useCallback: callback => callback },
    'react-native': { AppState: { addEventListener: (event, listener) => { assert.equal(event, 'change'); listeners.add(listener); return { remove: () => listeners.delete(listener) }; } } },
    '@react-navigation/native': { useFocusEffect: callback => { focus = callback; } },
    '../utils/data': { todayAzores: () => todayAzores(now) },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'setInterval', 'clearInterval', code)(name => { assert.ok(name in imports, name); return imports[name]; }, module, module.exports, (callback, period) => { assert.equal(period, 60000); timers.set(++sequence, callback); return sequence; }, id => timers.delete(id));
  const render = () => module.exports.default();
  assert.equal(render(), initialDay);
  let cleanup = focus(); assert.equal(timers.size, 1); assert.equal(listeners.size, 1);
  now = new Date(next); [...timers.values()][0](); assert.equal(render(), nextDay);
  now = new Date(start); [...listeners][0]('background'); assert.equal(render(), nextDay);
  [...listeners][0]('active'); assert.equal(render(), initialDay);
  cleanup(); assert.equal(timers.size, 0); assert.equal(listeners.size, 0);
  now = new Date(next); assert.equal(render(), initialDay, 'blurred screen has no active clock callbacks');
  cleanup = focus(); assert.equal(render(), nextDay, 'refocus catches a day change');
  cleanup(); assert.equal(timers.size, 0); assert.equal(listeners.size, 0);
});
