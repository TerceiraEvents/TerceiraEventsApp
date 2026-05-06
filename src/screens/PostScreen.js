import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { formatPostDate } from '../utils/data';
import { colors, fonts } from '../utils/theme';
import { useLocale } from '../i18n';
import { localizedField } from '../utils/i18nFields';
import CategoryPill from '../components/CategoryPill';

const formatDate = formatPostDate;

export default function PostScreen({ route }) {
  const { t, locale } = useLocale();
  const post = route?.params?.post;
  if (!post) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t('post.notFound')}</Text>
      </View>
    );
  }
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.metaRow}>
        <CategoryPill category={post.category} />
        <Text style={styles.dateText}>{formatDate(post.date, locale)}</Text>
      </View>
      <Text style={styles.title}>{localizedField(post, 'title', locale)}</Text>
      {localizedField(post, 'subtitle', locale) ? (
        <Text style={styles.subtitle}>
          {localizedField(post, 'subtitle', locale)}
        </Text>
      ) : null}
      <Markdown style={mdStyles}>
        {localizedField(post, 'body', locale) || ''}
      </Markdown>
      {post.source_url ? (
        <View style={styles.sourceRow}>
          <Text style={styles.sourceLabel}>{t('post.source')}</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(post.source_url)}
            accessibilityRole="link"
          >
            <Text style={styles.sourceLink}>
              {post.source_name || post.source_url}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const mdStyles = {
  body: {
    color: colors.text,
    fontSize: fonts.sizeBody,
    lineHeight: 24,
  },
  paragraph: {
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 24,
  },
  heading1: {
    color: colors.primary,
    fontSize: fonts.sizeTitle,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  heading2: {
    color: colors.primary,
    fontSize: fonts.sizeLarge + 1,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  heading3: {
    color: colors.primary,
    fontSize: fonts.sizeLarge,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 4,
  },
  link: { color: colors.primary, fontWeight: '600' },
  bullet_list: { marginVertical: 6 },
  ordered_list: { marginVertical: 6 },
  list_item: { marginVertical: 2 },
  strong: { fontWeight: '700' },
  em: { fontStyle: 'italic' },
  hr: { backgroundColor: colors.border, height: 1, marginVertical: 16 },
  code_inline: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: 'monospace',
    fontSize: fonts.sizeBody - 1,
  },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dateText: { color: colors.textMuted, fontSize: fonts.sizeSmall },
  title: {
    fontSize: fonts.sizeHeader - 4,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: fonts.sizeHeader,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: fonts.sizeBody + 1,
    color: colors.textLight,
    fontStyle: 'italic',
    marginBottom: 16,
    lineHeight: 22,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 24,
    paddingTop: 16,
  },
  sourceLabel: { color: colors.textMuted, fontSize: fonts.sizeBody },
  sourceLink: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: fonts.sizeBody,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.background,
  },
  emptyText: { color: colors.textMuted, fontSize: fonts.sizeBody },
});
