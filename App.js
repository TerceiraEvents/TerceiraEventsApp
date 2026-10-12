import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { getPathFromState, getStateFromPath, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { handleNotificationNavigation, rootRoutes } from './src/utils/navigation';
import { createLinking } from './src/navigation/linking';
import EventDetailScreen from './src/screens/EventDetailScreen';
import SavedScreen from './src/screens/SavedScreen';
import MoreScreen from './src/screens/MoreScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import { colors } from './src/utils/theme';
import { fetchSpecialEvents, fetchWeeklyEvents } from './src/utils/data';
import { rescheduleAllNotifications } from './src/utils/notifications';
import { LocaleProvider, t, useLocale } from './src/i18n';

import HomeScreen from './src/screens/HomeScreen';
import WeeklyScreen from './src/screens/WeeklyScreen';
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
  return <Tab.Navigator screenOptions={({ route }) => ({ tabBarIcon: ({ color, size }) => <Text accessibilityElementsHidden style={{ color, fontSize: size }}>{({ Home: '⌂', Events: '◇', Venues: '⌖', Saved: '♡', More: '☰' })[route.name]}</Text>, headerStyle: { backgroundColor: colors.primary }, headerTintColor: colors.white, tabBarActiveTintColor: colors.primary })}>
    <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tabs.home') }} />
    <Tab.Screen name="Events" component={SpecialEventsScreen} options={{ title: t('discovery.explore') }} />
    <Tab.Screen name="Venues" component={VenuesScreen} options={{ title: t('tabs.venues') }} />
    <Tab.Screen name="Saved" component={SavedScreen} options={{ title: t('discovery.saved') }} />
    <Tab.Screen name="More" component={MoreScreen} options={{ title: t('discovery.more') }} />
  </Tab.Navigator>;
}

// Inner component so it re-renders when the locale changes; this is
// what makes tab labels and screen titles flip without an app restart.
function AppShell() {
  const navigationRef = useRef(null);
  const [primaryHeader, setPrimaryHeader] = useState(true);
  const updateHeader = () => setPrimaryHeader(['Home', 'Events', 'Venues', 'Saved', 'More'].includes(navigationRef.current?.getCurrentRoute()?.name));
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
      <StatusBar style={primaryHeader ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.white }, headerTintColor: colors.text }}>
        <Stack.Screen name={rootRoutes.main} component={PrimaryTabs} options={{ headerShown: false }} />
        <Stack.Screen name={rootRoutes.detail} component={EventDetailScreen} options={{ title: t('discovery.details') }} />
        <Stack.Screen name={rootRoutes.weekly} component={WeeklyScreen} options={{ title: t('tabs.weekly') }} />
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
