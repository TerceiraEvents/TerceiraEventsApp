// Pure-helper tests for utils/posts. Network-fetching is not exercised here.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePostFile,
  slugFromFilename,
  baseSlugFromFilename,
  postFromFile,
  sortPostsNewestFirst,
  groupPostsByLanguage,
} from './posts.js';
import { localizedField } from './i18nFields.js';

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

// ---------------------------------------------------------------------
// Issue #46: bilingual file-pair handling
// ---------------------------------------------------------------------

test('baseSlugFromFilename: strips a trailing -pt language suffix', () => {
  assert.equal(
    baseSlugFromFilename('2026-04-30-twins-temporarily-closed-pt.md'),
    'twins-temporarily-closed',
  );
});

test('baseSlugFromFilename: leaves non-PT slugs alone', () => {
  assert.equal(
    baseSlugFromFilename('2026-04-30-twins-temporarily-closed.md'),
    'twins-temporarily-closed',
  );
});

test('baseSlugFromFilename: returns null for non-conforming names', () => {
  assert.equal(baseSlugFromFilename('not-a-post.md'), null);
  assert.equal(baseSlugFromFilename(''), null);
  assert.equal(baseSlugFromFilename(null), null);
});

test('postFromFile: carries front-matter lang', () => {
  const en = '---\ntitle: T\ndate: 2026-04-30\nlang: en\n---\nbody';
  const pt = '---\ntitle: T\ndate: 2026-04-30\nlang: pt\n---\ncorpo';
  assert.equal(postFromFile('2026-04-30-t.md', en).lang, 'en');
  assert.equal(postFromFile('2026-04-30-t-pt.md', pt).lang, 'pt');
});

// Build a minimal raw post like postFromFile would emit, without
// touching parsePostFile (we want the grouping logic alone here).
function rawPost({ filename, lang, title, excerpt, body, date, category, source_url, source_name, subtitle }) {
  return {
    filename,
    slug: filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''),
    lang: lang ?? null,
    title: title ?? filename,
    subtitle: subtitle ?? null,
    date: date ?? null,
    category: category ?? null,
    excerpt: excerpt ?? null,
    source_url: source_url ?? null,
    source_name: source_name ?? null,
    body: body ?? '',
  };
}

test('groupPostsByLanguage: paired EN+PT files collapse to one post', () => {
  const en = rawPost({
    filename: '2026-04-30-twins-temporarily-closed.md',
    lang: 'en',
    title: 'Twins is temporarily closed',
    excerpt: 'EN excerpt',
    body: 'EN body',
    date: '2026-04-30',
    category: 'news',
  });
  const pt = rawPost({
    filename: '2026-04-30-twins-temporarily-closed-pt.md',
    lang: 'pt',
    title: 'O Twins está temporariamente fechado',
    excerpt: 'PT excerto',
    body: 'PT corpo',
    date: '2026-04-30',
    category: 'news',
  });
  const grouped = groupPostsByLanguage([en, pt]);
  assert.equal(grouped.length, 1, 'one logical post per story');
  const post = grouped[0];
  assert.equal(post.slug, 'twins-temporarily-closed');
  assert.equal(post.title, 'Twins is temporarily closed');
  assert.equal(post.title_pt, 'O Twins está temporariamente fechado');
  assert.equal(post.excerpt, 'EN excerpt');
  assert.equal(post.excerpt_pt, 'PT excerto');
  assert.equal(post.body, 'EN body');
  assert.equal(post.body_pt, 'PT corpo');
  // Shared fields come through.
  assert.equal(post.date, '2026-04-30');
  assert.equal(post.category, 'news');
});

test('groupPostsByLanguage: localizedField returns the right language', () => {
  const en = rawPost({
    filename: '2026-04-30-x.md',
    lang: 'en',
    title: 'EN title',
    excerpt: 'EN excerpt',
    body: 'EN body',
  });
  const pt = rawPost({
    filename: '2026-04-30-x-pt.md',
    lang: 'pt',
    title: 'PT título',
    excerpt: 'PT excerto',
    body: 'PT corpo',
  });
  const [post] = groupPostsByLanguage([en, pt]);
  assert.equal(localizedField(post, 'title', 'en'), 'EN title');
  assert.equal(localizedField(post, 'title', 'pt'), 'PT título');
  assert.equal(localizedField(post, 'excerpt', 'en'), 'EN excerpt');
  assert.equal(localizedField(post, 'excerpt', 'pt'), 'PT excerto');
  assert.equal(localizedField(post, 'body', 'en'), 'EN body');
  assert.equal(localizedField(post, 'body', 'pt'), 'PT corpo');
});

test('groupPostsByLanguage: EN-only post still appears (PT falls back to EN)', () => {
  const en = rawPost({
    filename: '2026-05-01-only-en.md',
    lang: 'en',
    title: 'Only EN',
    excerpt: 'Only EN excerpt',
    body: 'Only EN body',
  });
  const grouped = groupPostsByLanguage([en]);
  assert.equal(grouped.length, 1);
  const [post] = grouped;
  assert.equal(post.slug, 'only-en');
  assert.equal(localizedField(post, 'title', 'en'), 'Only EN');
  // PT viewer falls back to EN content rather than seeing nothing.
  assert.equal(localizedField(post, 'title', 'pt'), 'Only EN');
});

test('groupPostsByLanguage: PT-only post still appears (EN falls back to PT)', () => {
  const pt = rawPost({
    filename: '2026-05-02-so-pt-pt.md',
    lang: 'pt',
    title: 'Só PT',
    excerpt: 'Só excerto',
    body: 'Só corpo',
  });
  const grouped = groupPostsByLanguage([pt]);
  assert.equal(grouped.length, 1);
  const [post] = grouped;
  assert.equal(post.slug, 'so-pt');
  // EN viewer falls back to PT (something is better than an empty card).
  assert.equal(localizedField(post, 'title', 'en'), 'Só PT');
  assert.equal(localizedField(post, 'title', 'pt'), 'Só PT');
});

test('groupPostsByLanguage: detects PT via filename when lang front-matter is missing', () => {
  const en = rawPost({
    filename: '2026-05-03-foo.md',
    lang: null,
    title: 'EN',
  });
  const pt = rawPost({
    filename: '2026-05-03-foo-pt.md',
    lang: null,
    title: 'PT',
  });
  const grouped = groupPostsByLanguage([en, pt]);
  assert.equal(grouped.length, 1);
  const [post] = grouped;
  assert.equal(post.title, 'EN');
  assert.equal(post.title_pt, 'PT');
});

test('groupPostsByLanguage: front-matter lang wins over filename suffix', () => {
  // Pathological but defensible: if a curator wrote `lang: en` in a file
  // whose name happens to end in -pt, trust the explicit field.
  const en = rawPost({
    filename: '2026-05-03-quirky-pt.md',
    lang: 'en',
    title: 'EN despite -pt filename',
  });
  const grouped = groupPostsByLanguage([en]);
  assert.equal(grouped.length, 1);
  const [post] = grouped;
  // The filename-based base slug strips `-pt`, so this would still
  // group with a real `-pt.md` partner; that's fine. What matters is
  // that the EN content lands in the bare title slot.
  assert.equal(post.title, 'EN despite -pt filename');
});

test('groupPostsByLanguage: deterministic when two PT files share a base slug', () => {
  // Shouldn't happen in practice but make the behavior pinned.
  // Later input wins (last write wins, matching Object.assign order).
  const ptA = rawPost({
    filename: '2026-05-04-dup-pt.md',
    lang: 'pt',
    title: 'PT A',
  });
  const ptB = rawPost({
    filename: '2026-05-04-dup-pt.md',
    lang: 'pt',
    title: 'PT B',
  });
  const grouped = groupPostsByLanguage([ptA, ptB]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].title_pt, 'PT B');
});

test('groupPostsByLanguage: EN translatable field is preferred when both exist', () => {
  const en = rawPost({
    filename: '2026-05-05-z.md',
    lang: 'en',
    title: 'EN title',
    subtitle: 'EN subtitle',
    source_name: 'EN source',
  });
  const pt = rawPost({
    filename: '2026-05-05-z-pt.md',
    lang: 'pt',
    title: 'PT título',
    subtitle: 'PT subtítulo',
    source_name: 'PT fonte',
  });
  const [post] = groupPostsByLanguage([en, pt]);
  assert.equal(post.title, 'EN title');
  assert.equal(post.subtitle, 'EN subtitle');
  assert.equal(post.source_name, 'EN source');
  assert.equal(post.title_pt, 'PT título');
  assert.equal(post.subtitle_pt, 'PT subtítulo');
  assert.equal(post.source_name_pt, 'PT fonte');
});

test('groupPostsByLanguage: shared fields like date and category come from primary', () => {
  // PT-only post still gets its date/category — the "primary" picker
  // falls back to PT when EN is absent.
  const pt = rawPost({
    filename: '2026-06-15-q-pt.md',
    lang: 'pt',
    title: 'q',
    date: '2026-06-15',
    category: 'news',
    source_url: 'https://example.com/q',
  });
  const [post] = groupPostsByLanguage([pt]);
  assert.equal(post.date, '2026-06-15');
  assert.equal(post.category, 'news');
  assert.equal(post.source_url, 'https://example.com/q');
});

test('groupPostsByLanguage: empty/null inputs yield an empty list', () => {
  assert.deepEqual(groupPostsByLanguage([]), []);
  assert.deepEqual(groupPostsByLanguage(null), []);
  assert.deepEqual(groupPostsByLanguage(undefined), []);
  assert.deepEqual(groupPostsByLanguage([null, undefined]), []);
});

test('groupPostsByLanguage: skips records with no resolvable slug', () => {
  const junk = {
    filename: 'not-a-post.md',
    slug: null,
    lang: 'en',
    title: 't',
  };
  assert.deepEqual(groupPostsByLanguage([junk]), []);
});

test('sortPostsNewestFirst: still sorts correctly after grouping', () => {
  const en1 = rawPost({
    filename: '2026-01-01-old.md',
    lang: 'en',
    title: 'old EN',
    date: '2026-01-01',
  });
  const pt1 = rawPost({
    filename: '2026-01-01-old-pt.md',
    lang: 'pt',
    title: 'old PT',
    date: '2026-01-01',
  });
  const en2 = rawPost({
    filename: '2026-05-01-new.md',
    lang: 'en',
    title: 'new EN',
    date: '2026-05-01',
  });
  const pt2 = rawPost({
    filename: '2026-05-01-new-pt.md',
    lang: 'pt',
    title: 'new PT',
    date: '2026-05-01',
  });
  const grouped = groupPostsByLanguage([en1, pt1, en2, pt2]);
  assert.equal(grouped.length, 2);
  const sorted = sortPostsNewestFirst(grouped);
  assert.deepEqual(sorted.map((p) => p.slug), ['new', 'old']);
});

test('groupPostsByLanguage: real-world sample (twins + algar) collapses 4→2', () => {
  // Mirrors the actual filenames in EventosTerceira.pt/_posts/.
  const inputs = [
    rawPost({
      filename: '2026-04-30-twins-temporarily-closed.md',
      lang: 'en',
      title: "Twins is temporarily closed, but they say they're 'arriving very soon'",
      date: '2026-04-30',
      category: 'news',
    }),
    rawPost({
      filename: '2026-04-30-twins-temporarily-closed-pt.md',
      lang: 'pt',
      title: "O Twins está temporariamente fechado, mas dizem que estão 'a chegar muito em breve'",
      date: '2026-04-30',
      category: 'news',
    }),
    rawPost({
      filename: '2026-03-21-algar-do-carvao-reopening.md',
      lang: 'en',
      title: 'Algar do Carvão has reopened, but plan around the construction',
      date: '2026-03-21',
      category: 'news',
    }),
    rawPost({
      filename: '2026-03-21-algar-do-carvao-reopening-pt.md',
      lang: 'pt',
      title: 'O Algar do Carvão reabriu, mas conta com as obras',
      date: '2026-03-21',
      category: 'news',
    }),
  ];
  const grouped = sortPostsNewestFirst(groupPostsByLanguage(inputs));
  assert.equal(grouped.length, 2);
  assert.deepEqual(
    grouped.map((p) => p.slug),
    ['twins-temporarily-closed', 'algar-do-carvao-reopening'],
  );
  // Each surviving post carries both languages.
  for (const p of grouped) {
    assert.ok(p.title, 'has EN title');
    assert.ok(p.title_pt, 'has PT title');
    assert.notEqual(p.title, p.title_pt, 'titles differ between languages');
  }
});
