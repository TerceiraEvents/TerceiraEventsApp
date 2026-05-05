// Shared tag vocabulary for special events.
//
// Keep slugs in sync with:
//   - EventosTerceira.pt   _data/event_tags.yml
//   - event-submit-worker        src/tags.js
//
// Labels are NOT stored here anymore — they're resolved from
// `tags.<slug>` in the i18n string catalogs (src/i18n/strings.*.json).
// `getTagMeta(slug, locale)` returns the localized label.

import { t as translate } from '../i18n/core.js';

export const TAGS = [
  { slug: 'kid-friendly', emoji: '👶' },
  { slug: 'live-music', emoji: '🎵' },
  { slug: 'cinema', emoji: '🎬' },
  { slug: 'theater', emoji: '🎭' },
  { slug: 'dance', emoji: '💃' },
  { slug: 'nightlife', emoji: '🌙' },
  { slug: 'karaoke', emoji: '🎤' },
  { slug: 'food-drink', emoji: '🍽️' },
  { slug: 'exhibition', emoji: '🖼️' },
  { slug: 'literature', emoji: '📖' },
  { slug: 'workshop', emoji: '📚' },
  { slug: 'free', emoji: '🆓' },
  { slug: 'outdoor', emoji: '🌳' },
  { slug: 'bullfighting', emoji: '🐂' },
];

export const TAGS_BY_SLUG = Object.fromEntries(TAGS.map((t) => [t.slug, t]));

export const VALID_TAG_SLUGS = new Set(TAGS.map((t) => t.slug));

// Normalize a raw tag list from a YAML event. Accepts either a proper
// array of strings, or a legacy `kid_friendly: true` boolean (returned
// as ['kid-friendly']). Unknown tags are preserved but lowercased so
// the UI can still render their slug.
export function normalizeEventTags(event) {
  if (!event) return [];
  const out = [];
  const seen = new Set();
  const push = (t) => {
    if (typeof t !== 'string') return;
    const slug = t.trim().toLowerCase();
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    out.push(slug);
  };
  if (Array.isArray(event.tags)) {
    event.tags.forEach(push);
  }
  if (event.kid_friendly === true) {
    push('kid-friendly');
  }
  return out;
}

export function getTagMeta(slug) {
  const known = TAGS_BY_SLUG[slug];
  // For known slugs the label comes from the active i18n catalog; for
  // unknown ones we synthesize a Title Case label from the slug.
  if (known) {
    return {
      slug,
      emoji: known.emoji,
      label: translate(`tags.${slug}`, {
        defaultValue: titleCase(slug),
      }),
    };
  }
  return {
    slug,
    emoji: '🏷️',
    label: titleCase(slug),
  };
}

function titleCase(slug) {
  return String(slug)
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
