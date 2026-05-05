import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BlogScreen from '../screens/BlogScreen';
import PostScreen from '../screens/PostScreen';
import { colors } from '../utils/theme';
import { useLocale } from '../i18n';
import { localizedField } from '../utils/i18nFields';

const Stack = createNativeStackNavigator();

export default function BlogStack() {
  const { t, locale } = useLocale();
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
        options={{ title: t('tabs.blog') }}
      />
      <Stack.Screen
        name="Post"
        component={PostScreen}
        options={({ route }) => ({
          title:
            (route?.params?.post &&
              localizedField(route.params.post, 'title', locale)) ||
            t('post.stackTitle'),
          headerBackTitle: t('tabs.blog'),
        })}
      />
    </Stack.Navigator>
  );
}
