import React, { createContext, forwardRef, useContext, useEffect } from 'react';
import { AccessibilityInfo, Platform, Text as NativeText, StyleSheet, useWindowDimensions } from 'react-native';
import { fontStyles } from '../utils/fontMetrics';
import { hasNativeFontMetrics, scaledFontSize } from '../utils/nativeFontMetrics';

const FontScaleContext = createContext(1);
const FontStyleContext = createContext({ fontSize: 14 });

/** Shares the native font scale without remounting child screens or navigation. */
export function TextProvider({ children }) {
  const { fontScale } = useWindowDimensions();
  return <FontScaleContext.Provider value={fontScale}>{children}</FontScaleContext.Provider>;
}

/** Returns the shared native font scale for content-only renderer refreshes. */
export function useFontScale() {
  return useContext(FontScaleContext);
}

function textContent(children) {
  return React.Children.toArray(children).map((child) => (typeof child === 'string' || typeof child === 'number' ? String(child) : '')).join('');
}

/** Refreshes scaling text while preserving props/ref and the platform's font curve. */
const Text = forwardRef(function Text(props, ref) {
  // iOS has no live-region concept; VoiceOver hears content changes through a
  // queued announcement. A short delay coalesces fast status updates, and the
  // effect cleanup drops pending work on unmount.
  const announcement = props.accessibilityLiveRegion ? textContent(props.children) : '';
  useEffect(() => {
    if (Platform.OS !== 'ios' || !announcement) return undefined;
    const timer = setTimeout(() => AccessibilityInfo.announceForAccessibilityWithOptions(announcement, { queue: true }), 350);
    return () => clearTimeout(timer);
  }, [announcement]);
  const fontScale = useFontScale();
  const inherited = useContext(FontStyleContext);
  const resolved = StyleSheet.flatten(props.style) || {};
  const base = { fontSize: resolved.fontSize ?? inherited.fontSize, lineHeight: resolved.lineHeight ?? inherited.lineHeight };
  const scaling = props.allowFontScaling !== false;
  const adapted = hasNativeFontMetrics && scaling ? fontStyles(resolved, inherited, scaledFontSize).scaled : null;
  return <FontStyleContext.Provider value={base}><NativeText {...props} style={adapted ? [props.style, adapted] : props.style} allowFontScaling={adapted ? false : props.allowFontScaling} ref={ref} key={scaling ? fontScale : 'fixed'} /></FontStyleContext.Provider>;
});
export default Text;
