import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { fetchPosts, clearPostsCache } from '../utils/posts';
import { formatPostDate } from '../utils/data';
import { colors, fonts } from '../utils/theme';
import LoadingView from '../components/LoadingView';

const CATEGORY_COLORS = {
  news: { bg: '#fce8c8', text: '#6b4a0a' },
  guide: { bg: '#d8f3dc', text: '#1a3a2a' },
  advice: { bg: '#e3eaff', text: '#2a3a6b' },
};

const formatDate = formatPostDate;

function CategoryPill({ category }) {
  if (!category) return null;
  const meta =
    CATEGORY_COLORS[category] || { bg: colors.border, text: colors.text };
  return (
    <View style={[styles.pill, { backgroundColor: meta.bg }]}>
      <Text style={[styles.pillText, { color: meta.text }]}>
        {String(category).toUpperCase()}
      </Text>
    </View>
  );
}

export default function BlogScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force) => {
    if (force) clearPostsCache();
    const all = await fetchPosts();
    setPosts(all);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  if (loading) return <LoadingView />;

  return (
    <FlatList
      style={styles.container}
      data={posts}
      keyExtractor={(item) => item.slug || item.filename}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <View style={styles.headerArea}>
          <Text style={styles.header}>Blog</Text>
          <Text style={styles.intro}>
            News, guides, and stories about life on Terceira.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('Post', { slug: item.slug, post: item })
          }
        >
          <View style={styles.metaRow}>
            <CategoryPill category={item.category} />
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
          </View>
          <Text style={styles.title}>{item.title}</Text>
          {item.excerpt ? (
            <Text style={styles.excerpt}>{item.excerpt}</Text>
          ) : null}
          <Text style={styles.readMore}>Read more →</Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No posts yet. Check back soon.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingBottom: 32 },
  headerArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  header: {
    fontSize: fonts.sizeHeader,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  intro: {
    color: colors.textLight,
    fontSize: fonts.sizeBody,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: fonts.sizeSmall,
  },
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
  title: {
    fontSize: fonts.sizeLarge,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
    lineHeight: 24,
  },
  excerpt: {
    color: colors.textLight,
    marginBottom: 8,
    lineHeight: 20,
    fontSize: fonts.sizeBody,
  },
  readMore: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: fonts.sizeSmall,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fonts.sizeBody,
  },
});
