import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BlogScreen from '../screens/BlogScreen';
import PostScreen from '../screens/PostScreen';
import { headerOptions } from './headerTheme';
import { blogRoutes } from '../utils/navigation';
import { useLocale } from '../i18n';
import { localizedField } from '../utils/i18nFields';

const Stack = createNativeStackNavigator();

export default function BlogStack() {
  const { t, locale } = useLocale();
  return (
    <Stack.Navigator
      screenOptions={({ route }) => headerOptions(route.name)}
    >
      <Stack.Screen
        name={blogRoutes.index}
        component={BlogScreen}
        options={{ title: t('tabs.blog') }}
      />
      <Stack.Screen
        name={blogRoutes.post}
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
