// Shared tag vocabulary for special events.
//
// Keep this list in sync with:
//   - EventosTerceira   _data/event_tags.yml
//   - event-submit-worker        src/tags.js

export const TAGS = [
  { slug: 'kid-friendly', label: 'Kid Friendly', emoji: '👶' },
  { slug: 'live-music', label: 'Live Music', emoji: '🎵' },
  { slug: 'cinema', label: 'Cinema', emoji: '🎬' },
  { slug: 'theater', label: 'Theater', emoji: '🎭' },
  { slug: 'dance', label: 'Dance', emoji: '💃' },
  { slug: 'nightlife', label: 'Nightlife', emoji: '🌙' },
  { slug: 'karaoke', label: 'Karaoke', emoji: '🎤' },
  { slug: 'food-drink', label: 'Food & Drink', emoji: '🍽️' },
  { slug: 'exhibition', label: 'Exhibition', emoji: '🖼️' },
  { slug: 'literature', label: 'Literature', emoji: '📖' },
  { slug: 'workshop', label: 'Workshop', emoji: '📚' },
  { slug: 'free', label: 'Free', emoji: '🆓' },
  { slug: 'outdoor', label: 'Outdoor', emoji: '🌳' },
  { slug: 'bullfighting', label: 'Bullfighting', emoji: '🐂' },
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
  return (
    TAGS_BY_SLUG[slug] || {
      slug,
      label: slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      emoji: '🏷️',
    }
  );
}
