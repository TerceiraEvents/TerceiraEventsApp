import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventIdFromUrl } from './eventLinks.js';
import { eventUrl } from './eventIdentity.js';
test('shared website and PT links resolve exactly the same stable ID', () => {
  const event = { id: 'a-123' };
  assert.equal(eventIdFromUrl(eventUrl(event)), 'a-123');
  assert.equal(eventIdFromUrl('https://eventosterceira.pt/pt/events/?id=a-123'), 'a-123');
  assert.equal(eventIdFromUrl('terceiraevents://events?id=a-123'), 'a-123');
  assert.equal(eventIdFromUrl('https://other.example/events/?id=a-123'), null);
  assert.equal(eventIdFromUrl('https://eventosterceira.pt/events/'), null);
  assert.equal(eventIdFromUrl('https://eventosterceira.pt/events/?id=../other'), null);
});
