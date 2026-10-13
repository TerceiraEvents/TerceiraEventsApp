import { fontHeaderOptions } from './fontHeader';
import Text from '../components/Text';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { colors } from '../utils/theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BlogScreen from '../screens/BlogScreen';
import PostScreen from '../screens/PostScreen';
import { headerOptions } from './headerTheme';
import { blogRoutes, rootRoutes } from '../utils/navigation';
import { useLocale } from '../i18n';
import { localizedField } from '../utils/i18nFields';

const Stack = createNativeStackNavigator();

export default function BlogStack({ navigation }) {
  const { t, locale } = useLocale();
  return (
    <Stack.Navigator
      screenOptions={({ route }) => fontHeaderOptions(headerOptions(route.name))}
    >
      <Stack.Screen
        name={blogRoutes.index}
        component={BlogScreen}
        options={{
          title: t('tabs.blog'),
          headerLeft: () => <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('blog.back')} style={{ minWidth: 44, minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate(rootRoutes.main)}><Text style={{ color: colors.text }}>{t('blog.back')}</Text></TouchableOpacity>,
        }}
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
