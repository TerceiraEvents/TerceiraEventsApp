import React from 'react';
import Text from '../components/Text';
import { hasNativeFontMetrics } from '../utils/nativeFontMetrics';

/** Uses shared Android text metrics for public navigation header titles. */
export function fontHeaderOptions(options) {
  if (!hasNativeFontMetrics) return options;
  return { ...options, headerTitle: ({ children, tintColor }) => <Text accessibilityRole="header" numberOfLines={1} ellipsizeMode="tail" style={[options.headerTitleStyle, { color: tintColor ?? options.headerTintColor, fontSize: options.headerTitleStyle?.fontSize ?? 21 }]}>{children}</Text> };
}
