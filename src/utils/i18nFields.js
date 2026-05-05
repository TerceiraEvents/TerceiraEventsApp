// Locale-aware content reader.
//
// Convention for translatable content fields (events, posts, venues,
// tags, anything pulled from YAML/Markdown/JS data):
//
//   <field>          — the curator's original language (source of truth)
//   <field>_pt       — Portuguese translation, if curator added one
//   <field>_en       — English translation, if curator added one
//
// The renderer asks for `localizedField(item, 'description', 'pt')`
// and gets `description_pt` if present, otherwise falls back to the
// bare `description`. This means:
//
//   - Curators writing only in Portuguese cost zero extra effort;
//     pt-locale users see the original, en-locale users see the
//     original (the fallback) until someone adds `description_en`.
//   - Same in the other direction.
//   - When both translations exist, each locale gets its own.
//
// Use a stable `locale` (the user's resolved locale, never `auto`).

export function localizedField(item, field, locale) {
  if (!item || !field) return undefined;
  const suffixed = `${field}_${locale}`;
  if (item[suffixed] != null && item[suffixed] !== '') {
    return item[suffixed];
  }
  return item[field];
}

// Convenience for several fields at once. Returns a shallow copy with
// each requested field resolved.
export function localizeFields(item, fields, locale) {
  if (!item) return item;
  const out = { ...item };
  for (const f of fields) {
    out[f] = localizedField(item, f, locale);
  }
  return out;
}
