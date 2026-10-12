/** Reserve icon, two scaled label lines and the device safe area. */
export function tabBarHeight(fontScale, bottomInset) {
  return 34 + 2 * 18 * fontScale + 8 + bottomInset;
}
