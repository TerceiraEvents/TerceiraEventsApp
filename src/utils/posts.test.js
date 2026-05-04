// Pure-helper tests for utils/posts. Network-fetching is not exercised here.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePostFile,
  slugFromFilename,
  postFromFile,
  sortPostsNewestFirst,
} from './posts.js';

const VALID = [
  '---',
  'title: "Hello world"',
  'date: 2026-05-04',
  'category: news',
  'source_url: "https://example.com/x"',
  'source_name: "Example"',
  'excerpt: "A short preview."',
  '---',
  '',
  'This is the **body**.',
  '',
  '- item 1',
  '- item 2',
].join('\n');

test('parsePostFile: extracts meta and body from a valid post', () => {
  const out = parsePostFile(VALID);
  assert.ok(out, 'should parse');
  assert.equal(out.meta.title, 'Hello world');
  assert.equal(out.meta.category, 'news');
  assert.equal(out.meta.source_url, 'https://example.com/x');
  assert.match(out.body, /This is the \*\*body\*\*/);
  assert.match(out.body, /- item 1/);
});

test('parsePostFile: handles \\r\\n line endings', () => {
  const crlf = VALID.replace(/\n/g, '\r\n');
  const out = parsePostFile(crlf);
  assert.ok(out);
  assert.equal(out.meta.title, 'Hello world');
});

test('parsePostFile: returns null for missing front matter', () => {
  assert.equal(parsePostFile('Just body, no front matter.'), null);
});

test('parsePostFile: returns null for invalid YAML in front matter', () => {
  const bad = '---\ntitle: "unterminated\n---\nbody';
  assert.equal(parsePostFile(bad), null);
});

test('parsePostFile: returns null for non-string input', () => {
  assert.equal(parsePostFile(null), null);
  assert.equal(parsePostFile(undefined), null);
  assert.equal(parsePostFile(42), null);
});

test('slugFromFilename: parses Jekyll-style filename', () => {
  assert.equal(
    slugFromFilename('2026-03-21-algar-do-carvao-reopening.md'),
    'algar-do-carvao-reopening',
  );
});

test('slugFromFilename: returns null for non-conforming names', () => {
  assert.equal(slugFromFilename('not-a-post.md'), null);
  assert.equal(slugFromFilename('2026-03-21.md'), null);
  assert.equal(slugFromFilename(''), null);
  assert.equal(slugFromFilename(null), null);
});

test('postFromFile: assembles a post object', () => {
  const post = postFromFile('2026-05-04-hello-world.md', VALID);
  assert.equal(post.slug, 'hello-world');
  assert.equal(post.title, 'Hello world');
  assert.equal(post.date, '2026-05-04');
  assert.equal(post.category, 'news');
  assert.equal(post.source_url, 'https://example.com/x');
  assert.equal(post.source_name, 'Example');
  assert.equal(post.excerpt, 'A short preview.');
  assert.match(post.body, /This is the \*\*body\*\*/);
});

test('postFromFile: missing optional fields default to null/empty', () => {
  const minimal = '---\ntitle: "T"\ndate: 2026-01-02\n---\nbody';
  const post = postFromFile('2026-01-02-t.md', minimal);
  assert.equal(post.title, 'T');
  assert.equal(post.subtitle, null);
  assert.equal(post.category, null);
  assert.equal(post.excerpt, null);
  assert.equal(post.source_url, null);
  assert.equal(post.source_name, null);
});

test('postFromFile: returns null for unparseable input', () => {
  assert.equal(postFromFile('foo.md', 'no front matter here'), null);
});

test('sortPostsNewestFirst: orders by ISO date descending', () => {
  const result = sortPostsNewestFirst([
    { date: '2026-01-01', slug: 'a' },
    { date: '2026-05-01', slug: 'b' },
    { date: '2026-03-15', slug: 'c' },
  ]);
  assert.deepEqual(result.map((p) => p.slug), ['b', 'c', 'a']);
});

test('sortPostsNewestFirst: posts with no date sink to end', () => {
  const result = sortPostsNewestFirst([
    { slug: 'no-date' },
    { date: '2026-05-01', slug: 'dated' },
  ]);
  assert.equal(result[0].slug, 'dated');
  assert.equal(result[1].slug, 'no-date');
});

test('sortPostsNewestFirst: does not mutate input', () => {
  const input = [{ date: '2026-01-01' }, { date: '2026-05-01' }];
  const before = input.map((p) => p.date);
  sortPostsNewestFirst(input);
  const after = input.map((p) => p.date);
  assert.deepEqual(after, before);
});
