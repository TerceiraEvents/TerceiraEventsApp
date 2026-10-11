import React from 'react';
import { ScrollView, TouchableOpacity, Text } from 'react-native';
import { useLocale } from '../i18n';
export default function MoreScreen({ navigation }) {
  const { t } = useLocale();
  return <ScrollView>{[['Blog', 'tabs.blog'], ['Resources', 'tabs.resources'], ['Settings', 'tabs.settings'], ['SuggestEvent', 'tabs.suggestEvent']].map(([route, label]) => <TouchableOpacity key={route} accessibilityRole="button" style={{ padding: 20 }} onPress={() => navigation.navigate(route)}><Text>{t(label)}</Text></TouchableOpacity>)}</ScrollView>;
}
