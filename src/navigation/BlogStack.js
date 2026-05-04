import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BlogScreen from '../screens/BlogScreen';
import PostScreen from '../screens/PostScreen';
import { colors } from '../utils/theme';

const Stack = createNativeStackNavigator();

export default function BlogStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="BlogIndex"
        component={BlogScreen}
        options={{ title: 'Blog' }}
      />
      <Stack.Screen
        name="Post"
        component={PostScreen}
        options={({ route }) => ({
          title: route?.params?.post?.title || 'Post',
          headerBackTitle: 'Blog',
        })}
      />
    </Stack.Navigator>
  );
}
