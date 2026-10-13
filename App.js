import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { getPathFromState, getStateFromPath, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { handleNotificationNavigation, rootRoutes, primaryRoutes } from './src/utils/navigation';
import { headerOptions, statusBarStyleForRoute } from './src/navigation/headerTheme';
import { createLinking } from './src/navigation/linking';
import EventDetailScreen from './src/screens/EventDetailScreen';
import MoreScreen from './src/screens/MoreScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarHeight } from './src/utils/tabLayout';
import * as Notifications from 'expo-notifications';
import { colors } from './src/utils/theme';
import { fetchSpecialEvents, fetchWeeklyEvents } from './src/utils/data';
import { rescheduleAllNotifications } from './src/utils/notifications';
import { LocaleProvider, t, useLocale } from './src/i18n';

import HomeScreen from './src/screens/HomeScreen';
import WeeklyScreen from './src/screens/WeeklyScreen';
import WeeklyRouteAlias from './src/navigation/WeeklyRouteAlias';
import SpecialEventsScreen from './src/screens/SpecialEventsScreen';
import VenuesScreen from './src/screens/VenuesScreen';
import ResourcesScreen from './src/screens/ResourcesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SuggestEventScreen from './src/screens/SuggestEventScreen';
import BlogStack from './src/navigation/BlogStack';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function PrimaryTabs() {
  const { t } = useLocale();
  const { fontScale, width } = useWindowDimensions();
  const { bottom, left = 0, right = 0 } = useSafeAreaInsets();
  const tabWeights = { [primaryRoutes.home]: 0.9, [primaryRoutes.events]: 1.15, [primaryRoutes.weekly]: 1.15, [primaryRoutes.venues]: 1, [primaryRoutes.more]: 0.8 };
  const totalWeight = Object.values(tabWeights).reduce((sum, value) => sum + value, 0);
  const icons = {
    [primaryRoutes.home]: '⌂',
    [primaryRoutes.events]: '◇',
    [primaryRoutes.weekly]: '▦',
    [primaryRoutes.venues]: '⌖',
    [primaryRoutes.more]: '☰',
  };
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      ...headerOptions(route.name),
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: { height: tabBarHeight(fontScale, bottom) },
      tabBarLabelPosition: 'below-icon',
      tabBarItemStyle: { flex: tabWeights[route.name] },
      tabBarLabel: ({ children, color }) => <Text style={{ color, fontSize: 12, lineHeight: 18, textAlign: 'center', width: (width - left - right) * tabWeights[route.name] / totalWeight }}>{children}</Text>,
      tabBarIcon: ({ color, size }) => <Text accessibilityElementsHidden allowFontScaling={false} style={{ color, fontSize: size }}>{icons[route.name]}</Text>,
    })}>
      <Tab.Screen name={primaryRoutes.home} component={HomeScreen} options={{ title: t('tabs.home'), tabBarAccessibilityLabel: t('tabs.home') }} />
      <Tab.Screen name={primaryRoutes.events} component={SpecialEventsScreen} options={{ title: t('discovery.explore'), tabBarAccessibilityLabel: t('discovery.explore') }} />
      <Tab.Screen name={primaryRoutes.weekly} component={WeeklyScreen} options={{ title: t('tabs.weekly'), tabBarAccessibilityLabel: t('tabs.weekly') }} />
      <Tab.Screen name={primaryRoutes.venues} component={VenuesScreen} options={{ title: t('tabs.venues'), tabBarAccessibilityLabel: t('tabs.venues') }} />
      <Tab.Screen name={primaryRoutes.more} component={MoreScreen} options={{ title: t('discovery.more'), tabBarAccessibilityLabel: t('discovery.more') }} />
    </Tab.Navigator>
  );
}

// Inner component so it re-renders when the locale changes; this is
// what makes tab labels and screen titles flip without an app restart.
function AppShell() {
  const navigationRef = useRef(null);
  const [statusBarStyle, setStatusBarStyle] = useState(statusBarStyleForRoute(primaryRoutes.home));
  const updateHeader = () => {
    const routeName = navigationRef.current?.getCurrentRoute()?.name;
    if (routeName) setStatusBarStyle(statusBarStyleForRoute(routeName));
  };
  // Subscribe to locale changes — value isn't used directly, but the
  // hook keeps this subtree in sync with the provider.
  useLocale();

  useEffect(() => {
    (async () => {
      try {
        const [special, weekly] = await Promise.all([
          fetchSpecialEvents(),
          fetchWeeklyEvents(),
        ]);
        await rescheduleAllNotifications(special, weekly);
      } catch {
        // Silently ignore — notifications are best-effort
      }
    })();

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (navigationRef.current) {
          handleNotificationNavigation(navigationRef.current, data);
        }
      });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        setTimeout(() => {
          if (navigationRef.current) {
            handleNotificationNavigation(navigationRef.current, data);
          }
        }, 500);
      }
    });

    return () => {
      responseSubscription.remove();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef} linking={createLinking({
      prefixes: [Linking.createURL('/'), 'terceiraevents://', 'https://eventosterceira.pt', 'https://www.eventosterceira.pt'],
      parsePath: getStateFromPath,
      serializeState: getPathFromState,
    })}
      onStateChange={updateHeader}
      onReady={updateHeader}>
      <StatusBar style={statusBarStyle} />
      <Stack.Navigator screenOptions={({ route }) => headerOptions(route.name)}>
        <Stack.Screen name={rootRoutes.main} component={PrimaryTabs} options={{ headerShown: false }} />
        <Stack.Screen name={rootRoutes.detail} component={EventDetailScreen} options={{ title: t('discovery.details') }} />
        <Stack.Screen name={rootRoutes.weekly} component={WeeklyRouteAlias} options={{ headerShown: false }} />
        <Stack.Screen name={rootRoutes.blog} component={BlogStack} options={{ headerShown: false }} />
        <Stack.Screen name={rootRoutes.resources} component={ResourcesScreen} options={{ title: t('discovery.resources') }} />
        <Stack.Screen name={rootRoutes.settings} component={SettingsScreen} options={{ title: t('tabs.settings') }} />
        <Stack.Screen name={rootRoutes.suggest} component={SuggestEventScreen} options={{ title: t('tabs.suggestEvent') }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <AppShell />
    </LocaleProvider>
  );
}
