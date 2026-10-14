import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getStateFromPath, getPathFromState } from '@react-navigation/core';
import { createLinking } from './linking.js';
import { eventIdFromUrl } from '../utils/eventLinks.js';

const expo = JSON.parse(readFileSync(new URL('../../app.json', import.meta.url), 'utf8')).expo;
const linking = createLinking({ prefixes: [], parsePath: getStateFromPath, serializeState: getPathFromState });

// The public hosts the website actually serves, and the site paths the
// linking config resolves to real screens. Anything else must keep opening
// in the browser.
const PUBLIC_HOSTS = ['eventosterceira.pt', 'www.eventosterceira.pt'];
const LINKED_PREFIXES = ['/events', '/weekly', '/special', '/saved', '/pt/events', '/pt/weekly', '/pt/special', '/pt/saved'];

function appLinkFilter() {
  const matches = (expo.android.intentFilters || []).filter((filter) =>
    filter.action === 'VIEW' && filter.autoVerify === true && (filter.data || []).some((entry) => entry.scheme === 'https'));
  assert.equal(matches.length, 1, 'exactly one auto-verifying HTTPS app-link filter');
  return matches[0];
}

test('iOS declares applinks associated domains for exactly the production hosts', () => {
  assert.deepEqual(expo.ios.associatedDomains, PUBLIC_HOSTS.map((host) => `applinks:${host}`));
});

test('Android declares auto-verifying HTTPS app links for exactly the handled public paths', () => {
  const filter = appLinkFilter();
  for (const category of ['BROWSABLE', 'DEFAULT']) assert.ok(filter.category.includes(category), `${category} category`);
  const expected = PUBLIC_HOSTS.flatMap((host) => LINKED_PREFIXES.map((pathPrefix) => ({ scheme: 'https', host, pathPrefix })));
  assert.deepEqual([...filter.data].sort((a, b) => `${a.host}${a.pathPrefix}`.localeCompare(`${b.host}${b.pathPrefix}`)), expected.sort((a, b) => `${a.host}${a.pathPrefix}`.localeCompare(`${b.host}${b.pathPrefix}`)));
});

test('every declared app-link path resolves inside the app; other site paths stay in the browser', () => {
  for (const prefix of LINKED_PREFIXES) {
    const needsId = prefix.endsWith('/events');
    const state = linking.getStateFromPath(`${prefix.slice(1)}/${needsId ? '?id=one' : ''}`, linking.config);
    assert.ok(state?.routes?.length, `${prefix}/ resolves to an app route`);
    if (needsId) {
      const detail = state.routes.find((route) => route.name === 'EventDetail');
      assert.equal(detail?.params?.id, 'one');
    }
  }
  for (const unhandled of ['venues/', 'blog/', 'contribute/', 'resources/']) {
    assert.equal(linking.getStateFromPath(unhandled, linking.config), undefined, `${unhandled} has no app route`);
  }
});

test('declared hosts are exactly the origins the shared URL parser accepts, and the custom scheme stays registered', () => {
  const declaredHosts = [...new Set(appLinkFilter().data.map((entry) => entry.host))].sort();
  assert.deepEqual(declaredHosts, [...PUBLIC_HOSTS].sort());
  for (const host of declaredHosts) assert.equal(eventIdFromUrl(`https://${host}/events/?id=one`), 'one');
  assert.equal(expo.scheme, 'terceiraevents');
});
