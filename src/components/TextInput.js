import React, { forwardRef } from 'react';
import { TextInput as NativeTextInput, StyleSheet } from 'react-native';
import { useFontScale } from './Text';
import { fontStyles } from '../utils/fontMetrics';
import { hasNativeFontMetrics, scaledFontSize } from '../utils/nativeFontMetrics';

/** Applies current Android SP metrics while retaining native input focus, value and ref. */
const TextInput = forwardRef(function TextInput(props, ref) {
  useFontScale();
  const adapted = hasNativeFontMetrics && props.allowFontScaling !== false ? fontStyles(StyleSheet.flatten(props.style) || {}, { fontSize: 14 }, scaledFontSize).scaled : null;
  return <NativeTextInput {...props} style={adapted ? [props.style, adapted] : props.style} allowFontScaling={adapted ? false : props.allowFontScaling} ref={ref} />;
});
export default TextInput;
