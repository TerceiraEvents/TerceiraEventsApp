// Network-driven sanity check that the app's hard-coded fetch URLs
// and tag vocabulary still match the website. Runs in CI on push to
// main and on a weekly schedule — silent drift between the two repos
// has bitten this project before (the app fetches from a redirected
// repo name; if the redirect ever stops, the app silently shows no
// data with no warning).
//
// Stdlib only — no devDeps needed.

import { readFileSync } from 'node:fs';

// Mirror the URLs the production code uses. If they change in
// src/utils/data.js or src/utils/posts.js, update both here and there.
const TAGS_VOCAB_URL =
  'https://raw.githubusercontent.com/TerceiraEvents/EventosTerceira.pt/main/_data/event_tags.yml';
const SPECIAL_EVENTS_URL =
  'https://raw.githubusercontent.com/TerceiraEvents/EventosTerceira.pt/main/_data/special_events.yml';
const WEEKLY_EVENTS_URL =
  'https://raw.githubusercontent.com/TerceiraEvents/EventosTerceira.pt/main/_data/weekly.yml';
const POSTS_LIST_URL =
  'https://api.github.com/repos/TerceiraEvents/EventosTerceira.pt/contents/_posts';
const POST_RAW_BASE =
  'https://raw.githubusercontent.com/TerceiraEvents/EventosTerceira.pt/main/_posts/';

const errors = [];

async function check200(url, label) {
  try {
    const r = await fetch(url, { method: 'GET' });
    if (!r.ok) {
      errors.push(`${label}: HTTP ${r.status} from ${url}`);
      return null;
    }
    return await r.text();
  } catch (e) {
    errors.push(`${label}: fetch failed for ${url} — ${e.message}`);
    return null;
  }
}

// 1. Each fetch URL is reachable and returns a non-empty body.
console.log('Checking fetch URLs are reachable…');
const eventsBody = await check200(SPECIAL_EVENTS_URL, 'special_events.yml');
const weeklyBody = await check200(WEEKLY_EVENTS_URL, 'weekly.yml');
const tagsBody = await check200(TAGS_VOCAB_URL, 'event_tags.yml');
const postsListJson = await check200(POSTS_LIST_URL, 'posts list (GitHub Contents API)');

// 2. Body sanity: each YAML/JSON file has the expected top-level shape.
if (eventsBody && !eventsBody.includes('- date:')) {
  errors.push("special_events.yml: body doesn't contain '- date:' — schema may have changed");
}
if (weeklyBody && !weeklyBody.includes('- day:')) {
  errors.push("weekly.yml: body doesn't contain '- day:' — schema may have changed");
}
if (postsListJson) {
  let arr;
  try {
    arr = JSON.parse(postsListJson);
    if (!Array.isArray(arr)) errors.push('posts list: expected JSON array, got something else');
    else if (arr.length === 0) console.log('  (posts directory is empty — fine but suspicious)');
    else {
      // Pick the first .md file and verify the raw URL pattern works
      const md = arr.find((f) => f.name && f.name.endsWith('.md'));
      if (md) {
        const sample = await check200(POST_RAW_BASE + md.name, `sample post (${md.name})`);
        if (sample && !sample.startsWith('---')) {
          errors.push(`sample post ${md.name}: doesn't start with '---' (front matter); URL or content has changed`);
        }
      }
    }
  } catch (e) {
    errors.push(`posts list: JSON parse failed — ${e.message}`);
  }
}

// 3. Tag-vocabulary sync: the slugs in the app's TAGS list must be a
// subset of the slugs in the website's _data/event_tags.yml. (Strict
// equality would catch website-only additions which is fine; the app
// just wouldn't display them.)
console.log('Checking tag vocabulary sync…');
const tagsSource = readFileSync(new URL('../src/utils/tags.js', import.meta.url), 'utf8');
const appSlugs = [];
const slugRe = /slug:\s*['"]([\w-]+)['"]/g;
let m;
while ((m = slugRe.exec(tagsSource)) !== null) appSlugs.push(m[1]);

if (appSlugs.length === 0) {
  errors.push("Couldn't extract slugs from src/utils/tags.js — regex needs updating");
}

const websiteSlugs = [];
if (tagsBody) {
  // event_tags.yml: lines like `- slug: kid-friendly`
  const re = /^-\s+slug:\s*([\w-]+)/gm;
  while ((m = re.exec(tagsBody)) !== null) websiteSlugs.push(m[1]);
}

if (appSlugs.length && websiteSlugs.length) {
  const appOnly = appSlugs.filter((s) => !websiteSlugs.includes(s));
  const websiteOnly = websiteSlugs.filter((s) => !appSlugs.includes(s));
  if (appOnly.length > 0) {
    errors.push(`Tag drift: app has slugs that the website doesn't know about: ${appOnly.join(', ')}. Add them to _data/event_tags.yml or remove from src/utils/tags.js.`);
  }
  if (websiteOnly.length > 0) {
    // Website-only additions are warnings, not errors — events that
    // use them just won't get a styled tag pill in the app.
    console.log(`  WARN: website-only tag slugs (app won't render pills for these): ${websiteOnly.join(', ')}`);
  } else {
    console.log(`  OK — ${appSlugs.length} slugs match between app and website`);
  }
}

if (errors.length === 0) {
  console.log('\nOK — app/website data fetch and tag vocabulary in sync');
  process.exit(0);
}

console.log(`\nFAIL: ${errors.length} issue(s):`);
for (const e of errors) console.log(`  ✗ ${e}`);
process.exit(1);
