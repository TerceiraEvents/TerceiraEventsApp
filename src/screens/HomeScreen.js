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
  formatPostDate,
  formatEventDateShort,
} from '../utils/data';
import { useLocale } from '../i18n';
import { localizedField } from '../utils/i18nFields';
import CategoryPill from '../components/CategoryPill';

const buttonScreens = [
  { key: 'weekly', screen: 'Weekly' },
  { key: 'specialEvents', screen: 'Events' },
  { key: 'venues', screen: 'Venues' },
  { key: 'blog', screen: 'Blog' },
  { key: 'resources', screen: 'Resources' },
  { key: 'suggest', screen: 'SuggestEvent' },
];

// Date formatters live in utils/data so they can be unit-tested.
const formatDate = formatPostDate;
const formatEventDate = formatEventDateShort;

export default function HomeScreen({ navigation }) {
  const { t, locale } = useLocale();
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
        <Text style={styles.title}>{t('home.title')}</Text>
        <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
      </View>

      <View style={styles.intro}>
        <Text style={styles.introText}>{t('home.intro.p1')}</Text>
        <Text style={styles.introText}>{t('home.intro.p2')}</Text>
      </View>

      <View style={styles.buttonsContainer}>
        {buttonScreens.map((btn) => (
          <TouchableOpacity
            key={btn.screen}
            style={styles.navButton}
            onPress={() => navigation.navigate(btn.screen)}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonTitle}>{t(`home.buttons.${btn.key}`)}</Text>
            <Text style={styles.buttonSubtitle}>
              {t(`home.buttons.${btn.key}Subtitle`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {previewEvents.length > 0 ? (
        <View style={styles.eventsSection}>
          <Text style={styles.eventsHeading}>
            {t('home.sections.specialEvents')}
          </Text>
          {previewEvents.map((event, idx) => (
            <TouchableOpacity
              key={`${event.date}-${event.name}-${idx}`}
              style={styles.eventItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Events')}
            >
              <View style={styles.eventMetaRow}>
                <Text style={styles.eventDate}>
                  {formatEventDate(event.date, locale)}
                </Text>
                {event.time ? (
                  <Text style={styles.eventTime}>· {event.time}</Text>
                ) : null}
              </View>
              <Text style={styles.eventItemTitle}>
                {localizedField(event, 'name', locale)}
              </Text>
              {event.venue ? (
                <Text style={styles.eventVenue}>
                  {localizedField(event, 'venue', locale)}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => navigation.navigate('Events')}
            activeOpacity={0.7}
          >
            <Text style={styles.eventsAll}>{t('home.links.allUpcoming')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {previewPosts.length > 0 ? (
        <View style={styles.blogSection}>
          <Text style={styles.blogHeading}>{t('home.sections.blog')}</Text>
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
                <Text style={styles.blogDate}>
                  {formatDate(post.date, locale)}
                </Text>
              </View>
              <Text style={styles.blogItemTitle}>
                {localizedField(post, 'title', locale)}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => navigation.navigate('Blog')}
            activeOpacity={0.7}
          >
            <Text style={styles.blogAll}>{t('home.links.allPosts')}</Text>
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
