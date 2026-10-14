import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getStateFromPath, getPathFromState } from '@react-navigation/core';
import { createLinking } from './linking.js';
import { eventIdFromUrl } from '../utils/eventLinks.js';
import { eventUrl } from '../utils/eventIdentity.js';

const expo = JSON.parse(readFileSync(new URL('../../app.json', import.meta.url), 'utf8')).expo;
const linking = createLinking({ prefixes: [], parsePath: getStateFromPath, serializeState: getPathFromState });

// The OS declares only the canonical host used by shared event URLs.
// www.eventosterceira.pt serves no association files (it 301-redirects to the
// apex), and Android verification requires matching association data for
// every declared host, so claiming the alias would fail verification. The
// alias still parses in JS as a normal website URL.
const SHARE_HOST = new URL(eventUrl({ id: 'one' })).host;
const LINKED_PATHS = ['/events', '/events/', '/weekly', '/weekly/', '/special', '/special/', '/pt/events', '/pt/events/', '/pt/weekly', '/pt/weekly/', '/pt/special', '/pt/special/'];

function appLinkFilter() {
  const matches = (expo.android.intentFilters || []).filter((filter) =>
    filter.action === 'VIEW' && filter.autoVerify === true && (filter.data || []).some((entry) => entry.scheme === 'https'));
  assert.equal(matches.length, 1, 'exactly one auto-verifying HTTPS app-link filter');
  return matches[0];
}

// Mirrors the documented Android <data> match semantics: an entry matches when
// every declared attribute matches — path is an exact match, pathPrefix a
// leading match, pathSuffix a trailing match, and pathPattern a simple glob
// where "*" spans any character sequence.
function globRegex(pattern) {
  return new RegExp(`^${pattern.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
}
function entryMatchesPath(entry, path) {
  if (entry.path !== undefined && entry.path !== path) return false;
  if (entry.pathPrefix !== undefined && !path.startsWith(entry.pathPrefix)) return false;
  if (entry.pathSuffix !== undefined && !path.endsWith(entry.pathSuffix)) return false;
  if (entry.pathPattern !== undefined && !globRegex(entry.pathPattern).test(path)) return false;
  return Boolean(entry.path ?? entry.pathPrefix ?? entry.pathSuffix ?? entry.pathPattern);
}

test('iOS declares applinks associated domains for exactly the canonical shared-URL host', () => {
  assert.equal(SHARE_HOST, 'eventosterceira.pt', 'shared URLs use the canonical apex host');
  assert.deepEqual(expo.ios.associatedDomains, [`applinks:${SHARE_HOST}`]);
});

test('Android declares auto-verifying HTTPS app links as exact paths for both spellings of the public routes', () => {
  const filter = appLinkFilter();
  for (const category of ['BROWSABLE', 'DEFAULT']) assert.ok(filter.category.includes(category), `${category} category`);
  const expected = LINKED_PATHS.map((path) => ({ scheme: 'https', host: SHARE_HOST, path }));
  const order = (a, b) => `${a.host} ${a.path || a.pathPrefix || ''}`.localeCompare(`${b.host} ${b.path || b.pathPrefix || ''}`);
  assert.deepEqual([...filter.data].sort(order), expected.sort(order));
  assert.ok(filter.data.every((entry) => entry.path !== undefined), 'exact paths, not broad prefixes');
});

test('the declared Android surface matches exactly the supported routes under the native match contract', () => {
  const https = appLinkFilter().data.filter((entry) => entry.scheme === 'https' && entry.host === SHARE_HOST);
  for (const path of LINKED_PATHS) {
    assert.ok(https.some((entry) => entryMatchesPath(entry, path)), `${SHARE_HOST}${path} opens the app`);
  }
  for (const rejected of ['/saved', '/saved/', '/pt/saved', '/pt/saved/', '/events-other/', '/events-anything', '/weekly-old/', '/venues/', '/blog/x', '/pt/venues/']) {
    assert.ok(!https.some((entry) => entryMatchesPath(entry, rejected)), `${SHARE_HOST}${rejected} stays in the browser`);
  }
});

test('every declared app-link path resolves inside the app; the Saved route stays reachable but undeclared', () => {
  for (const path of LINKED_PATHS) {
    const needsId = path.endsWith('/events') || path.endsWith('/events/');
    const state = linking.getStateFromPath(`${path.slice(1)}${needsId ? '?id=one' : ''}`, linking.config);
    assert.ok(state?.routes?.length, `${path} resolves to an app route`);
    if (needsId) {
      const detail = state.routes.find((route) => route.name === 'EventDetail');
      assert.equal(detail?.params?.id, 'one');
    }
  }
  const saved = linking.getStateFromPath('saved/', linking.config);
  assert.equal(saved.routes[0].state.routes[0].params.saved, true, 'Saved still resolves for the custom scheme');
});

test('declared hosts are exactly the canonical host, while JS parsing still accepts the www alias and the custom scheme stays registered', () => {
  const declaredHosts = [...new Set(appLinkFilter().data.map((entry) => entry.host))].sort();
  assert.deepEqual(declaredHosts, [SHARE_HOST]);
  assert.equal(eventIdFromUrl(`https://${SHARE_HOST}/events/?id=one`), 'one');
  assert.equal(eventIdFromUrl('https://www.eventosterceira.pt/events/?id=one'), 'one');
  assert.equal(eventIdFromUrl('terceiraevents://events?id=one'), 'one');
  assert.equal(expo.scheme, 'terceiraevents');
});
