import { fetchPosts } from '../utils/posts';
import { localizedField } from '../utils/i18nFields';
import CategoryPill from '../components/CategoryPill';
import Text from '../components/Text';
import useAzoresDay from '../hooks/useAzoresDay';
import useSpecialFeed from '../hooks/useSpecialFeed';
import { eventDetailParams } from '../utils/eventRoute';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useLocale } from '../i18n';
import { fetchSpecialEvents, getSpecialFeedState, eventKind, eventDateRange, sortDatedEvents, sortExhibitions, isActive, formatPostDate } from '../utils/data';
import { homeFeedback } from '../utils/navigation';
import { shortcutWindow } from '../utils/discovery';
import EventCard from '../components/EventCard';
import { colors } from '../utils/theme';

export default function HomeScreen({ navigation }) {
  const { t, locale } = useLocale();
  const azoresDay = useAzoresDay();
  const [events, setEvents] = useState([]);
  const [selection, setSelection] = useState('today');
  const [loading, setLoading] = useState(true);
  const [feedState, setFeedState] = useState({ status: 'loading' });
  const [posts, setPosts] = useState([]);
  useSpecialFeed(useCallback((all, state) => { setEvents(all); setFeedState(state); setLoading(false); }, []));
  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try { setEvents(await fetchSpecialEvents(refresh)); setFeedState(getSpecialFeedState()); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let cancelled = false;
    fetchPosts().then((all) => { if (!cancelled) setPosts(all || []); });
    return () => { cancelled = true; };
  }, []);
  const window = shortcutWindow(selection, azoresDay);
  const dated = sortDatedEvents(events.filter((event) => eventKind(event) === 'event' && isActive(event, azoresDay)));
  const selected = dated.filter((event) => { const range = eventDateRange(event); return range && range.start <= window.end && range.end >= window.start; });
  const feedback = homeFeedback(feedState.status, selected.length, loading);
  const onView = sortExhibitions(events.filter((event) => eventKind(event) === 'exhibition' && isActive(event, azoresDay) && eventDateRange(event)?.start <= azoresDay)).slice(0, 3);
  const openCatalog = (kind, range) => navigation.navigate('Events', { kind, range, resetFilters: true });
  const open = (event) => navigation.navigate('EventDetail', eventDetailParams(event));
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingVertical: 16 }}>
    <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '700', paddingHorizontal: 16 }}>{t('home.title')}</Text>
    <Text style={{ paddingHorizontal: 16, paddingTop: 8, color: colors.textLight }}>{t('home.subtitle')}</Text>
    <TouchableOpacity accessibilityRole="button" style={{ padding: 16, minHeight: 44, minWidth: 44 }} onPress={() => openCatalog('event', 'all')}><Text>{t('discovery.search')}</Text></TouchableOpacity>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 }}>{['today', 'tomorrow', 'weekend'].map((key) => <TouchableOpacity key={key} accessibilityRole="button" accessibilityState={{ selected: key === selection }} onPress={() => setSelection(key)} style={{ padding: 16, backgroundColor: key === selection ? colors.border : colors.card }}><Text>{t(`discovery.${key}`)}</Text></TouchableOpacity>)}</View>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t(`home.links.${selection}`)} style={{ padding: 16, minHeight: 44, minWidth: 44 }} onPress={() => openCatalog('event', selection)}><Text>{t(`home.links.${selection}`)}</Text></TouchableOpacity>
    <View style={{ paddingHorizontal: 16 }}><TouchableOpacity accessibilityRole="button" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }} onPress={() => navigation.navigate('Weekly')}><Text>{t('tabs.weekly')}</Text></TouchableOpacity></View>
    <Text style={{ padding: 16 }}>{window.start}{window.end !== window.start ? ` – ${window.end}` : ''} · Atlantic/Azores</Text>
    {['cached', 'error'].includes(feedback) && <TouchableOpacity accessibilityRole="button" style={{ padding: 16 }} onPress={() => load(true)}><Text accessibilityLiveRegion="polite">{t(`discovery.${feedback}`)} · {t('discovery.retry')}</Text></TouchableOpacity>}
    {feedback === 'loading' && <Text style={{ padding: 16 }}>{t('discovery.loading')}</Text>}
    {feedState.refreshing && <Text accessibilityLiveRegion="polite" style={{ padding: 16 }}>{t('discovery.refreshing')}</Text>}
    {feedState.cacheTimeUnknown && <Text accessibilityLiveRegion="polite" style={{ padding: 16 }}>{t('discovery.cacheTimeUnknown')}</Text>}
    {!!feedState.rejectedRecords && <Text style={{ padding: 16 }}>{t('discovery.partial', { count: feedState.rejectedRecords })}</Text>}
    {selected.slice(0, 5).map((event) => <EventCard key={event.id || `${event.date}-${event.name}`} event={event} compact onOpen={() => open(event)} />)}
    {feedback === 'emptyDate' && !feedState.rejectedRecords && <Text style={{ padding: 16 }}>{t('discovery.emptyDate')}</Text>}
    {!!onView.length && <Text accessibilityRole="header" style={{ padding: 16, fontSize: 22 }}>{t('discovery.onView')}</Text>}
    {onView.map((event) => <EventCard key={event.id || `${event.date}-${event.name}`} event={event} compact onOpen={() => open(event)} />)}
    <Text style={{ padding: 16 }}>{t('home.intro.p1')}</Text>
    <Text style={{ paddingHorizontal: 16, paddingBottom: 16 }}>{t('home.intro.p2')}</Text>
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      {[
        ['weekly', 'Weekly'], ['specialEvents', 'Events'], ['venues', 'Venues'],
        ['blog', 'Blog'], ['resources', 'Resources'], ['suggest', 'SuggestEvent'],
      ].map(([key, route]) => <TouchableOpacity key={key} accessibilityRole="button" style={{ padding: 16, minHeight: 44, minWidth: 44, backgroundColor: colors.card, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.accent }} onPress={() => route === 'Events' ? openCatalog('event', 'all') : navigation.navigate(route)}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>{t(`home.buttons.${key}`)}</Text>
        <Text style={{ paddingTop: 4, color: colors.textLight }}>{t(`home.buttons.${key}Subtitle`)}</Text>
      </TouchableOpacity>)}
      <TouchableOpacity accessibilityRole="button" style={{ padding: 16, minHeight: 44, minWidth: 44 }} onPress={() => openCatalog('exhibition', 'all')}><Text>{t('discovery.onView')}</Text></TouchableOpacity>
    </View>
    {!!posts.length && <View style={{ padding: 16, gap: 12 }}>
      <Text accessibilityRole="header" style={{ fontSize: 22 }}>{t('home.sections.blog')}</Text>
      {posts.slice(0, 3).map((post) => <TouchableOpacity key={post.slug || post.filename} accessibilityRole="button" style={{ padding: 16, minHeight: 44, minWidth: 44, backgroundColor: colors.card, borderRadius: 8 }} onPress={() => navigation.navigate('Blog', { screen: 'Post', params: { slug: post.slug, post } })}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><CategoryPill category={post.category} /><Text>{formatPostDate(post.date, locale)}</Text></View>
        <Text style={{ fontSize: 18, fontWeight: '600', paddingTop: 8 }}>{localizedField(post, 'title', locale)}</Text>
      </TouchableOpacity>)}
      <TouchableOpacity accessibilityRole="button" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }} onPress={() => navigation.navigate('Blog')}><Text>{t('home.links.allPosts')}</Text></TouchableOpacity>
    </View>}
  </ScrollView>;
}
