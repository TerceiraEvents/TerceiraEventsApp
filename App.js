import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import { colors } from './src/utils/theme';
import { fetchSpecialEvents, fetchWeeklyEvents } from './src/utils/data';
import { rescheduleAllNotifications } from './src/utils/notifications';

import HomeScreen from './src/screens/HomeScreen';
import WeeklyScreen from './src/screens/WeeklyScreen';
import SpecialEventsScreen from './src/screens/SpecialEventsScreen';
import VenuesScreen from './src/screens/VenuesScreen';
import ResourcesScreen from './src/screens/ResourcesScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const tabIcons = {
  Home: { focused: '\u2302', unfocused: '\u2302' },
  Weekly: { focused: '\u{1F504}', unfocused: '\u{1F504}' },
  Events: { focused: '\u2605', unfocused: '\u2606' },
  Venues: { focused: '\u{1F4CD}', unfocused: '\u{1F4CD}' },
  Resources: { focused: '\u{1F517}', unfocused: '\u{1F517}' },
  Settings: { focused: '\u2699\uFE0F', unfocused: '\u2699' },
};

function handleNotificationNavigation(navigation, data) {
  if (!data) return;
  if (data.type === 'daily_summary' || data.type === 'event_reminder') {
    navigation.navigate('Events');
  }
}

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    // Reschedule notifications on app start
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

    // Handle notification tapped while app is running
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (navigationRef.current) {
          handleNotificationNavigation(navigationRef.current, data);
        }
      });

    // Handle notification that opened the app from killed state
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        // Small delay to ensure navigation is ready
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
          options={{ title: 'Terceira Events', headerShown: false }}
        />
        <Tab.Screen
          name="Weekly"
          component={WeeklyScreen}
          options={{ title: 'Weekly' }}
        />
        <Tab.Screen
          name="Events"
          component={SpecialEventsScreen}
          options={{ title: 'Events' }}
        />
        <Tab.Screen
          name="Venues"
          component={VenuesScreen}
          options={{ title: 'Venues' }}
        />
        <Tab.Screen
          name="Resources"
          component={ResourcesScreen}
          options={{ title: 'More' }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
