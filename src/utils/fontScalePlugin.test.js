import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function configuredManifest() {
  const config = JSON.parse(readFileSync(new URL('../../app.json', import.meta.url), 'utf8'));
  const activity = { $: { 'android:name': '.MainActivity', 'android:configChanges': 'keyboard|orientation|locale', 'android:theme': 'ExistingTheme' } };
  const other = { $: { 'android:name': '.WidgetActivity' } };
  const result = { modResults: { manifest: { application: [{ activity: [activity, other] }] } } };
  if (config.expo.plugins.includes('./plugins/withFontScale')) {
    const module = { exports: {} }; let apply;
    new Function('require', 'module', 'exports', readFileSync(new URL('../../plugins/withFontScale.js', import.meta.url), 'utf8'))((name) => { assert.equal(name, 'expo/config-plugins'); return { withAndroidManifest: (input, callback) => { apply = callback; return input; } }; }, module, module.exports);
    module.exports(config); apply(result); apply(result);
  }
  return { activity, other };
}

test('actual app configuration preserves its Activity on fontScale changes without replacing other flags', () => {
  const { activity, other } = configuredManifest();
  const changes = activity.$['android:configChanges'].split('|');
  assert.ok(changes.includes('fontScale'));
  assert.equal(changes.filter((value) => value === 'fontScale').length, 1);
  for (const value of ['keyboard', 'orientation', 'locale']) assert.ok(changes.includes(value));
  assert.equal(activity.$['android:theme'], 'ExistingTheme');
  assert.deepEqual(other.$, { 'android:name': '.WidgetActivity' });
});
