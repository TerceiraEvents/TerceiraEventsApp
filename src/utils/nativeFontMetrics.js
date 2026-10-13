import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

const metrics = Platform.OS === 'android' ? requireOptionalNativeModule('TerceiraFontMetrics') : null;
/** Indicates whether the Android runtime supplies current system SP conversion. */
export const hasNativeFontMetrics = Boolean(metrics);
/** Converts an unscaled SP size to DP using the current Android system font curve. */
export function scaledFontSize(size) {
  return metrics.scaledSize(size);
}
