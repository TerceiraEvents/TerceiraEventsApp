/**
 * Read a published field in the requested locale, the original field, or an
 * available EN/PT version. Missing translations preserve published information.
 */
export function localizedField(item, field, locale) {
  if (!item || !field) return undefined;
  for (const key of [`${field}_${locale}`, field, `${field}_en`, `${field}_pt`]) {
    if (item[key] != null && item[key] !== '') return item[key];
  }
  return undefined;
}

/** Return a shallow copy with the requested fields resolved for the locale. */
export function localizeFields(item, fields, locale) {
  if (!item) return item;
  const out = { ...item };
  for (const field of fields) out[field] = localizedField(item, field, locale);
  return out;
}
