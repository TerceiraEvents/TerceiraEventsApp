import { load as yamlLoad } from 'js-yaml';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPO_OWNER = 'TerceiraEvents';
const REPO_NAME = 'EventosTerceira.pt';
const POSTS_LIST_URL =
  `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/_posts`;
const POST_RAW_BASE =
  `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/_posts/`;

const STORAGE_KEY = 'terceiraevents_cache_posts';
let cachedPosts = null;

// Parse front matter + body from a markdown file's raw text.
// Returns { meta, body } or null if the file isn't a Jekyll-style post.
// `filename` is optional context used in console warnings — silently
// dropped files (malformed front matter, non-object metadata) are
// hard to debug otherwise: a post just disappears from the blog list.
export function parsePostFile(text, filename) {
  if (typeof text !== 'string') return null;
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  let meta;
  try {
    meta = yamlLoad(m[1]) || {};
  } catch (err) {
    console.warn(
      `parsePostFile: YAML parse error in ${filename || '<unknown>'}: ${err?.message || err}`,
    );
    return null;
  }
  if (typeof meta !== 'object') {
    console.warn(
      `parsePostFile: front matter in ${filename || '<unknown>'} is not a YAML mapping (got ${typeof meta})`,
    );
    return null;
  }
  return { meta, body: m[2] };
}

// "2026-03-21-algar-do-carvao-reopening.md" → "algar-do-carvao-reopening"
export function slugFromFilename(name) {
  const m = String(name || '').match(/^\d{4}-\d{2}-\d{2}-([\w-]+)\.md$/);
  return m ? m[1] : null;
}

// The website's _posts directory keeps each story as two parallel files:
//   2026-04-30-twins-temporarily-closed.md      (English; lang: en)
//   2026-04-30-twins-temporarily-closed-pt.md   (Portuguese; lang: pt)
//
// Strip a trailing `-pt` from the slug so both files map to the same
// "base slug" we group on. The front-matter `lang:` field is the
// authoritative language signal — the filename suffix is only a hint
// used as fallback (and to find the EN partner of a PT file).
export function baseSlugFromFilename(name) {
  const slug = slugFromFilename(name);
  if (!slug) return null;
  return slug.endsWith('-pt') ? slug.slice(0, -3) : slug;
}

// Detect the language of a single post record. Prefer `lang` from
// front-matter; fall back to a `-pt` filename suffix; default to `en`.
function detectLang(post) {
  if (!post) return 'en';
  const metaLang = post.lang;
  if (typeof metaLang === 'string' && metaLang.trim()) {
    return metaLang.trim().toLowerCase();
  }
  const slug = post.slug || slugFromFilename(post.filename);
  if (slug && slug.endsWith('-pt')) return 'pt';
  return 'en';
}

// Group raw single-language post records (one per .md file) into one
// logical post per `{date}-{baseSlug}`. Each group yields a record
// keyed off the canonical (non-`-pt`) slug, with translatable fields
// flattened as `<field>` (English / source-of-truth) and `<field>_pt`
// (Portuguese), matching the convention `localizedField` already
// understands for events. When only one language is present, that
// language fills the bare fields and `localizedField` falls back
// gracefully.
//
// Determinism:
//   - If two files claim the same `{baseSlug, lang}`, the later one
//     in input order wins (same merge order callers already get from
//     `Object.assign`).
//   - If a base slug has only PT, the PT record fills both `title`
//     and `title_pt` so EN-locale users see PT (graceful fallback).
const TRANSLATABLE_FIELDS = ['title', 'subtitle', 'excerpt', 'body', 'source_name'];
// Fields where the value should be the same across both translations
// (date, category, source_url). We just take whichever record has them.
const SHARED_FIELDS = ['date', 'category', 'source_url'];

export function groupPostsByLanguage(rawPosts) {
  const groups = new Map();
  for (const raw of rawPosts || []) {
    if (!raw) continue;
    const baseSlug = baseSlugFromFilename(raw.filename) || raw.slug;
    if (!baseSlug) continue;
    const lang = detectLang(raw);
    if (!groups.has(baseSlug)) groups.set(baseSlug, {});
    groups.get(baseSlug)[lang] = raw;
  }

  const out = [];
  for (const [baseSlug, byLang] of groups.entries()) {
    const en = byLang.en;
    const pt = byLang.pt;
    // Pick a "primary" record to inherit shared fields (date, etc.)
    // and the canonical filename. Prefer EN, else PT, else the first
    // we have.
    const primary = en || pt || Object.values(byLang)[0];
    if (!primary) continue;

    const merged = {
      filename: primary.filename,
      slug: baseSlug,
    };
    for (const f of SHARED_FIELDS) {
      merged[f] = primary[f] ?? null;
      // If primary lacks a shared field but the partner has it, use it.
      if (merged[f] == null) {
        for (const other of Object.values(byLang)) {
          if (other[f] != null) {
            merged[f] = other[f];
            break;
          }
        }
      }
    }
    for (const f of TRANSLATABLE_FIELDS) {
      // Bare field: EN if present, else PT (so EN-locale viewers
      // who have no English translation still see Portuguese, not
      // an empty card).
      const enVal = en ? en[f] : null;
      const ptVal = pt ? pt[f] : null;
      merged[f] = enVal != null && enVal !== '' ? enVal : (ptVal ?? null);
      // PT-suffixed field: PT if present, else fall back to EN
      // so PT-locale viewers of an EN-only post still see content.
      merged[`${f}_pt`] = ptVal != null && ptVal !== '' ? ptVal : (enVal ?? null);
    }
    out.push(merged);
  }
  return out;
}

function isoDate(value) {
  if (!value) return null;
  // js-yaml turns unquoted YAML dates (`2026-05-04`) into Date objects
  // anchored at UTC midnight. Use toISOString + slice so we don't drift
  // by a day when the host runs in a non-UTC timezone.
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

// Convert one fetched markdown file into the post shape the UI expects.
export function postFromFile(filename, rawText) {
  const parsed = parsePostFile(rawText, filename);
  if (!parsed) return null;
  const slug = slugFromFilename(filename);
  const date = isoDate(parsed.meta.date);
  return {
    filename,
    slug,
    lang: parsed.meta.lang || null,
    title: parsed.meta.title || filename,
    subtitle: parsed.meta.subtitle || null,
    date,
    category: parsed.meta.category || null,
    excerpt: parsed.meta.excerpt || null,
    source_url: parsed.meta.source_url || null,
    source_name: parsed.meta.source_name || null,
    body: parsed.body || '',
  };
}

export function sortPostsNewestFirst(posts) {
  return [...posts].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });
}

async function loadFromStorage() {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json !== null) return JSON.parse(json);
  } catch (e) {
    console.warn('posts cache read failed', e);
  }
  return null;
}

async function saveToStorage(posts) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (e) {
    console.warn('posts cache write failed', e);
  }
}

export async function fetchPosts() {
  if (cachedPosts) return cachedPosts;

  try {
    const listResp = await fetch(POSTS_LIST_URL);
    if (!listResp.ok) throw new Error(`list HTTP ${listResp.status}`);
    const files = await listResp.json();
    if (!Array.isArray(files)) throw new Error('unexpected list shape');

    const mdFiles = files.filter(
      (f) => f && typeof f.name === 'string' && f.name.endsWith('.md'),
    );

    const posts = await Promise.all(
      mdFiles.map(async (f) => {
        try {
          const r = await fetch(POST_RAW_BASE + f.name);
          if (!r.ok) return null;
          const text = await r.text();
          return postFromFile(f.name, text);
        } catch {
          return null;
        }
      }),
    );

    const grouped = groupPostsByLanguage(posts.filter(Boolean));
    const valid = sortPostsNewestFirst(grouped);
    cachedPosts = valid;
    await saveToStorage(valid);
    return valid;
  } catch (err) {
    console.warn('Failed to fetch posts:', err);
    const stored = await loadFromStorage();
    if (stored) {
      cachedPosts = stored;
      return stored;
    }
    return [];
  }
}

export function clearPostsCache() {
  cachedPosts = null;
}
