import { colors } from '../utils/theme.js';
import { primaryRoutes } from '../utils/navigation.js';

const primaryNames = new Set(Object.values(primaryRoutes));
const primary = { background: colors.primary, tint: colors.white, statusBar: 'light' };
const stack = { background: colors.white, tint: colors.text, statusBar: 'dark' };

function themeForRoute(routeName) {
  return primaryNames.has(routeName) ? primary : stack;
}

export function headerOptions(routeName) {
  const theme = themeForRoute(routeName);
  return { headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.tint, headerTitleStyle: { fontWeight: '700' } };
}

export function statusBarStyleForRoute(routeName) {
  return themeForRoute(routeName).statusBar;
}
