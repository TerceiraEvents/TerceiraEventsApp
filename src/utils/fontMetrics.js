/** Preserves unscaled inherited font metrics and converts them through the platform API. */
export function fontStyles(style, inherited, convert) {
  const base = {
    fontSize: style.fontSize ?? inherited.fontSize ?? 14,
    lineHeight: style.lineHeight ?? inherited.lineHeight,
  };
  return {
    base,
    scaled: { fontSize: convert(base.fontSize), ...(base.lineHeight === undefined ? {} : { lineHeight: convert(base.lineHeight) }) },
  };
}
