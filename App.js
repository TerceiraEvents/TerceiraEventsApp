import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
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

const Tab = createBottomTabNavigator();

const tabIcons = {
  Home: { focused: '⌂', unfocused: '⌂' },
  Weekly: { focused: '\u{1F504}', unfocused: '\u{1F504}' },
  Events: { focused: '★', unfocused: '☆' },
  Venues: { focused: '\u{1F4CD}', unfocused: '\u{1F4CD}' },
  Blog: { focused: '\u{1F4F0}', unfocused: '\u{1F4F0}' },
  Resources: { focused: '\u{1F517}', unfocused: '\u{1F517}' },
  Settings: { focused: '⚙️', unfocused: '⚙' },
};

function handleNotificationNavigation(navigation, data) {
  if (!data) return;
  if (data.type === 'daily_summary' || data.type === 'event_reminder') {
    navigation.navigate('Events');
  }
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
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: colors.white,
          headerTitleStyle: {
            fontWeight: '700',
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.white,
            borderTopColor: colors.border,
          },
          tabBarIcon: ({ focused, color, size }) => {
            const icons = tabIcons[route.name];
            return (
              <Text style={{ fontSize: size - 4, color }}>
                {focused ? icons.focused : icons.unfocused}
              </Text>
            );
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: t('app.name'), headerShown: false }}
        />
        <Tab.Screen
          name="Weekly"
          component={WeeklyScreen}
          options={{ title: t('tabs.weekly') }}
        />
        <Tab.Screen
          name="Events"
          component={SpecialEventsScreen}
          options={{ title: t('tabs.events') }}
        />
        <Tab.Screen
          name="Venues"
          component={VenuesScreen}
          options={{ title: t('tabs.venues') }}
        />
        <Tab.Screen
          name="Blog"
          component={BlogStack}
          options={{ title: t('tabs.blog'), headerShown: false }}
        />
        <Tab.Screen
          name="Resources"
          component={ResourcesScreen}
          options={{ title: t('tabs.resources') }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: t('tabs.settings') }}
        />
        <Tab.Screen
          name="SuggestEvent"
          component={SuggestEventScreen}
          options={{
            title: t('tabs.suggestEvent'),
            tabBarButton: () => null,
          }}
        />
      </Tab.Navigator>
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
