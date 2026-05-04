import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { colors, fonts } from '../utils/theme';
import { fetchPosts } from '../utils/posts';
import {
  fetchSpecialEvents,
  sortEventsByDate,
  isInRange,
} from '../utils/data';

const buttons = [
  { title: 'Weekly Events', subtitle: 'Recurring entertainment', screen: 'Weekly' },
  { title: 'Special Events', subtitle: "What's on this week", screen: 'Events' },
  { title: 'Venues', subtitle: 'Where to go', screen: 'Venues' },
  { title: 'Blog', subtitle: 'News, guides, and stories', screen: 'Blog' },
  { title: 'Resources', subtitle: 'Other ways to find events', screen: 'Resources' },
  { title: 'Suggest Event', subtitle: 'Submit an event for review', screen: 'SuggestEvent' },
];

const CATEGORY_COLORS = {
  news: { bg: '#fce8c8', text: '#6b4a0a' },
  guide: { bg: '#d8f3dc', text: '#1a3a2a' },
  advice: { bg: '#e3eaff', text: '#2a3a6b' },
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatEventDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value) + 'T00:00:00');
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

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

export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchPosts()
      .then((all) => {
        if (!cancelled) setPosts(all || []);
      })
      .catch(() => {
        // Best-effort — if it fails, the section just stays hidden.
      });
    fetchSpecialEvents()
      .then((all) => {
        if (!cancelled) setEvents(all || []);
      })
      .catch(() => {
        // Best-effort — if it fails, the section just stays hidden.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const previewPosts = posts.slice(0, 3);
  const previewEvents = sortEventsByDate(events)
    .filter((e) => isInRange(e, 'all'))
    .slice(0, 3);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.title}>Terceira Events</Text>
        <Text style={styles.subtitle}>{"What's happening on Terceira Island"}</Text>
      </View>

      <View style={styles.intro}>
        <Text style={styles.introText}>
          {"Terceira is known as \"the amusement park\" of the Azores, famous for its bullfights on a rope, vibrant festivals, live music, and cultural events year-round."}
        </Text>
        <Text style={styles.introText}>
          {"This app helps you discover what's happening across Terceira, from weekly karaoke nights to special concerts and festivals."}
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
        {buttons.map((btn) => (
          <TouchableOpacity
            key={btn.screen}
            style={styles.navButton}
            onPress={() => navigation.navigate(btn.screen)}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonTitle}>{btn.title}</Text>
            <Text style={styles.buttonSubtitle}>{btn.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {previewEvents.length > 0 ? (
        <View style={styles.eventsSection}>
          <Text style={styles.eventsHeading}>Upcoming special events</Text>
          {previewEvents.map((event, idx) => (
            <TouchableOpacity
              key={`${event.date}-${event.name}-${idx}`}
              style={styles.eventItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Events')}
            >
              <View style={styles.eventMetaRow}>
                <Text style={styles.eventDate}>{formatEventDate(event.date)}</Text>
                {event.time ? (
                  <Text style={styles.eventTime}>· {event.time}</Text>
                ) : null}
              </View>
              <Text style={styles.eventItemTitle}>{event.name}</Text>
              {event.venue ? (
                <Text style={styles.eventVenue}>{event.venue}</Text>
              ) : null}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => navigation.navigate('Events')}
            activeOpacity={0.7}
          >
            <Text style={styles.eventsAll}>All upcoming →</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {previewPosts.length > 0 ? (
        <View style={styles.blogSection}>
          <Text style={styles.blogHeading}>From the blog</Text>
          {previewPosts.map((post) => (
            <TouchableOpacity
              key={post.slug || post.filename}
              style={styles.blogItem}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('Blog', {
                  screen: 'Post',
                  params: { slug: post.slug, post },
                })
              }
            >
              <View style={styles.blogMetaRow}>
                <CategoryPill category={post.category} />
                <Text style={styles.blogDate}>{formatDate(post.date)}</Text>
              </View>
              <Text style={styles.blogItemTitle}>{post.title}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => navigation.navigate('Blog')}
            activeOpacity={0.7}
          >
            <Text style={styles.blogAll}>All posts →</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fonts.sizeMedium,
    color: 'rgba(255,255,255,0.85)',
  },
  intro: {
    padding: 20,
  },
  introText: {
    fontSize: fonts.sizeBody,
    color: colors.textLight,
    lineHeight: 22,
    marginBottom: 12,
  },
  buttonsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  navButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonTitle: {
    fontSize: fonts.sizeLarge,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: fonts.sizeBody,
    color: colors.textLight,
  },
  eventsSection: {
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  eventsHeading: {
    fontSize: fonts.sizeLarge,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 10,
  },
  eventItem: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eventDate: {
    color: colors.textMuted,
    fontSize: fonts.sizeSmall,
    fontWeight: '600',
  },
  eventTime: {
    color: colors.textLight,
    fontSize: fonts.sizeSmall,
  },
  eventItemTitle: {
    fontSize: fonts.sizeBody + 1,
    fontWeight: '600',
    color: colors.primary,
    lineHeight: 20,
  },
  eventVenue: {
    color: colors.textLight,
    fontSize: fonts.sizeSmall,
    marginTop: 2,
  },
  eventsAll: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: fonts.sizeBody,
    paddingTop: 4,
  },
  blogSection: {
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  blogHeading: {
    fontSize: fonts.sizeLarge,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 10,
  },
  blogItem: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  blogMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  blogDate: {
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
  blogItemTitle: {
    fontSize: fonts.sizeBody + 1,
    fontWeight: '600',
    color: colors.primary,
    lineHeight: 20,
  },
  blogAll: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: fonts.sizeBody,
    paddingTop: 4,
  },
});
