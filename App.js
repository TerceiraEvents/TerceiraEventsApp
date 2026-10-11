import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { getPathFromState, getStateFromPath, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { handleNotificationNavigation } from './src/utils/navigation';
import { eventIdFromUrl } from './src/utils/eventLinks';
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
    <NavigationContainer ref={navigationRef} linking={{ getPathFromState: (state, options) => { const clean = (value) => ({ ...value, routes: value.routes.map((route) => ({ ...route, ...(route.name === 'EventDetail' ? { params: route.params?.id ? { id: route.params.id } : {} } : {}), ...(route.state ? { state: clean(route.state) } : {}) })) }); return getPathFromState(clean(state), options); }, getStateFromPath: (path, options) => { const id = eventIdFromUrl(`https://eventosterceira.pt/${path.replace(/^\//, '')}`); return id ? { routes: [{ name: 'Main' }, { name: 'EventDetail', params: { id } }] } : getStateFromPath(path, options); }, prefixes: [Linking.createURL('/'), 'terceiraevents://', 'https://eventosterceira.pt', 'https://www.eventosterceira.pt'], config: { screens: { EventDetail: 'events/', Main: { screens: { Home: '', Events: 'special/', Saved: 'saved/' } } } } }}>
      <StatusBar style="dark" />
      <Stack.Navigator>
        <Stack.Screen name="Main" component={PrimaryTabs} options={{ headerShown: false }} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: t('discovery.details') }} />
        <Stack.Screen name="Weekly" component={WeeklyScreen} options={{ title: t('tabs.weekly') }} />
        <Stack.Screen name="Blog" component={BlogStack} options={{ headerShown: false }} />
        <Stack.Screen name="Resources" component={ResourcesScreen} options={{ title: t('tabs.resources') }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('tabs.settings') }} />
        <Stack.Screen name="SuggestEvent" component={SuggestEventScreen} options={{ title: t('tabs.suggestEvent') }} />
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
