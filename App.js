import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { colors } from './src/utils/theme';

import HomeScreen from './src/screens/HomeScreen';
import WeeklyScreen from './src/screens/WeeklyScreen';
import SpecialEventsScreen from './src/screens/SpecialEventsScreen';
import VenuesScreen from './src/screens/VenuesScreen';
import ResourcesScreen from './src/screens/ResourcesScreen';

const Tab = createBottomTabNavigator();

const tabIcons = {
  Home: { focused: '\u2302', unfocused: '\u2302' },
  Weekly: { focused: '\u{1F504}', unfocused: '\u{1F504}' },
  Events: { focused: '\u2605', unfocused: '\u2606' },
  Venues: { focused: '\u{1F4CD}', unfocused: '\u{1F4CD}' },
  Resources: { focused: '\u{1F517}', unfocused: '\u{1F517}' },
};

export default function App() {
  return (
    <NavigationContainer>
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
          options={{ title: 'Angra Events', headerShown: false }}
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
      </Tab.Navigator>
    </NavigationContainer>
  );
}
