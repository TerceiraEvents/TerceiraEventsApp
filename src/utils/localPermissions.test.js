import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
function permissions({ existing = 'undetermined', answer = 'granted', os = 'ios' } = {}) {
  const calls = [];
  const notifications = { AndroidImportance: { DEFAULT: 3 }, setNotificationHandler: () => {}, setNotificationChannelAsync: async (id) => calls.push(`channel:${id}`), getPermissionsAsync: async () => { calls.push('read'); return { status: existing }; }, requestPermissionsAsync: async () => { calls.push('ask'); return { status: answer }; } };
  const imports = { 'expo-notifications': notifications, 'expo-device': { isDevice: false }, 'react-native': { Platform: { OS: os } }, './eventTime': {}, './storage': {}, './data': {}, '../i18n/core.js': { t: (key) => key } };
  const code = transformSync(readFileSync(new URL('./notifications.js', import.meta.url), 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => imports[name], module, module.exports);
  return { ...module.exports, calls };
}

test('local permission flow is available on a simulator without push-token registration', async () => {
  const api = permissions();
  assert.equal(await api.requestPermissions(), true);
  assert.deepEqual(api.calls, ['read', 'ask']);
});
test('granted local permission is read without another prompt; denial remains false', async () => {
  const granted = permissions({ existing: 'granted' });
  assert.equal(await granted.requestPermissions(), true);
  assert.deepEqual(granted.calls, ['read']);
  const denied = permissions({ answer: 'denied' });
  assert.equal(await denied.requestPermissions(), false);
  assert.deepEqual(denied.calls, ['read', 'ask']);
});
test('Android creates the local reminder channel before asking runtime permission', async () => {
  const api = permissions({ os: 'android' });
  assert.equal(await api.requestPermissions(), true);
  assert.deepEqual(api.calls, ['channel:event-reminders', 'read', 'ask']);
});
