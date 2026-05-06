// Resolution helpers for blog category pills. Component-free so the
// label/colour mapping can be unit-tested under plain Node without
// pulling in React Native.

import { colors } from './theme.js';

export const CATEGORY_COLORS = {
  news: { bg: '#fce8c8', text: '#6b4a0a' },
  guide: { bg: '#d8f3dc', text: '#1a3a2a' },
  advice: { bg: '#e3eaff', text: '#2a3a6b' },
};

const FALLBACK_COLORS = { bg: colors.border, text: colors.text };

// Resolve the displayable label for a category through the supplied
// `t()` function. Falls back to the upper-cased raw key when the
// category isn't in the i18n table — also covers `enableFallback`
// returning the EN string when a PT key is missing.
export function categoryPillMeta(category, t) {
  if (!category) return null;
  const palette = CATEGORY_COLORS[category] || FALLBACK_COLORS;
  const fallbackLabel = String(category).toUpperCase();
  const translateFn = typeof t === 'function' ? t : null;
  const translated = translateFn
    ? translateFn(`blog.categories.${category}`, { defaultValue: fallbackLabel })
    : fallbackLabel;
  return {
    label: String(translated).toUpperCase(),
    bg: palette.bg,
    text: palette.text,
  };
}
