import React, { createContext, forwardRef, useContext } from 'react';
import { Text as NativeText, useWindowDimensions } from 'react-native';

const FontScaleContext = createContext(1);

/** Shares the native font scale without remounting child screens or navigation. */
export function TextProvider({ children }) {
  const { fontScale } = useWindowDimensions();
  return <FontScaleContext.Provider value={fontScale}>{children}</FontScaleContext.Provider>;
}

/** Returns the shared native font scale for content-only renderer refreshes. */
export function useFontScale() {
  return useContext(FontScaleContext);
}

/** Forwards native Text props/ref and refreshes scaling text hosts on font changes. */
const Text = forwardRef(function Text(props, ref) {
  const fontScale = useFontScale();
  return <NativeText {...props} ref={ref} key={props.allowFontScaling === false ? 'fixed' : fontScale} />;
});
export default Text;
