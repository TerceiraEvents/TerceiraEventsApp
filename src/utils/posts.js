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
export function parsePostFile(text) {
  if (typeof text !== 'string') return null;
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  let meta;
  try {
    meta = yamlLoad(m[1]) || {};
  } catch {
    return null;
  }
  if (typeof meta !== 'object') return null;
  return { meta, body: m[2] };
}

// "2026-03-21-algar-do-carvao-reopening.md" → "algar-do-carvao-reopening"
export function slugFromFilename(name) {
  const m = String(name || '').match(/^\d{4}-\d{2}-\d{2}-([\w-]+)\.md$/);
  return m ? m[1] : null;
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
  const parsed = parsePostFile(rawText);
  if (!parsed) return null;
  const slug = slugFromFilename(filename);
  const date = isoDate(parsed.meta.date);
  return {
    filename,
    slug,
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

    const valid = sortPostsNewestFirst(posts.filter(Boolean));
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
