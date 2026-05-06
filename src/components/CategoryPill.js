import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../utils/theme';
import { useLocale } from '../i18n';
import { categoryPillMeta } from '../utils/blogCategory';

export default function CategoryPill({ category }) {
  const { t } = useLocale();
  const meta = categoryPillMeta(category, t);
  if (!meta) return null;
  return (
    <View style={[styles.pill, { backgroundColor: meta.bg }]}>
      <Text style={[styles.pillText, { color: meta.text }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pillText: {
    fontSize: fonts.sizeSmall - 2,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
