import { eventDetailParams } from '../utils/eventRoute';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocale } from '../i18n';
import { fetchSpecialEvents, getSpecialFeedState, eventKind, eventDateRange, sortDatedEvents, sortExhibitions, isActive, todayAzores } from '../utils/data';
import { homeFeedback } from '../utils/navigation';
import { shortcutWindow } from '../utils/discovery';
import EventCard from '../components/EventCard';
import { colors } from '../utils/theme';

export default function HomeScreen({ navigation }) {
  const { t } = useLocale();
  const [events, setEvents] = useState([]);
  const [selection, setSelection] = useState('today');
  const [loading, setLoading] = useState(true);
  const [feedState, setFeedState] = useState({ status: 'loading' });
  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try { setEvents(await fetchSpecialEvents(refresh)); setFeedState(getSpecialFeedState()); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const window = shortcutWindow(selection, todayAzores());
  const dated = sortDatedEvents(events.filter((event) => eventKind(event) === 'event' && isActive(event)));
  const selected = dated.filter((event) => { const range = eventDateRange(event); return range && range.start <= window.end && range.end >= window.start; });
  const feedback = homeFeedback(feedState.status, selected.length, loading);
  const onView = sortExhibitions(events.filter((event) => eventKind(event) === 'exhibition' && isActive(event))).slice(0, 3);
  const open = (event) => navigation.navigate('EventDetail', eventDetailParams(event));
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingVertical: 16 }}>
    <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '700', paddingHorizontal: 16 }}>{t('home.title')}</Text>
    <TouchableOpacity accessibilityRole="button" style={{ padding: 16, minHeight: 44, minWidth: 44 }} onPress={() => navigation.navigate('Events', { kind: 'event', range: 'all' })}><Text>{t('discovery.search')}</Text></TouchableOpacity>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 }}>{['today', 'tomorrow', 'weekend'].map((key) => <TouchableOpacity key={key} accessibilityRole="button" accessibilityState={{ selected: key === selection }} onPress={() => setSelection(key)} style={{ padding: 16, backgroundColor: key === selection ? colors.border : colors.card }}><Text>{t(`discovery.${key}`)}</Text></TouchableOpacity>)}</View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 }}>
      {[
        ['Weekly', 'tabs.weekly'],
        ['Events', 'discovery.onView', { kind: 'exhibition', range: 'all' }],
        ['Blog', 'tabs.blog'],
        ['Resources', 'discovery.resources'],
        ['Settings', 'tabs.settings'],
        ['SuggestEvent', 'tabs.suggestEvent'],
      ].map(([route, label, params]) => <TouchableOpacity key={label} accessibilityRole="button" style={{ minHeight: 44, minWidth: 44, maxWidth: '100%', flexShrink: 1, padding: 12, justifyContent: 'center' }} onPress={() => params ? navigation.navigate(route, params) : navigation.navigate(route)}><Text>{t(label)}</Text></TouchableOpacity>)}
    </View>
    <Text style={{ padding: 16 }}>{window.start}{window.end !== window.start ? ` – ${window.end}` : ''} · Atlantic/Azores</Text>
    {['cached', 'error'].includes(feedback) && <TouchableOpacity accessibilityRole="button" style={{ padding: 16 }} onPress={() => load(true)}><Text accessibilityLiveRegion="polite">{t(`discovery.${feedback}`)} · {t('discovery.retry')}</Text></TouchableOpacity>}
    {feedback === 'loading' && <Text style={{ padding: 16 }}>{t('discovery.loading')}</Text>}
    {!!feedState.rejectedRecords && <Text style={{ padding: 16 }}>{t('discovery.partial', { count: feedState.rejectedRecords })}</Text>}
    {selected.slice(0, 5).map((event) => <EventCard key={event.id || `${event.date}-${event.name}`} event={event} compact onOpen={() => open(event)} />)}
    {feedback === 'emptyDate' && !feedState.rejectedRecords && <Text style={{ padding: 16 }}>{t('discovery.emptyDate')}</Text>}
    <TouchableOpacity accessibilityRole="button" style={{ padding: 16, minHeight: 44, minWidth: 44 }} onPress={() => navigation.navigate('Events', { kind: 'event', range: 'all' })}><Text>{t('home.links.allUpcoming')}</Text></TouchableOpacity>
    {!!onView.length && <Text accessibilityRole="header" style={{ padding: 16, fontSize: 22 }}>{t('discovery.onView')}</Text>}
    {onView.map((event) => <EventCard key={event.id || `${event.date}-${event.name}`} event={event} compact onOpen={() => open(event)} />)}
    <Text style={{ padding: 16 }}>{t('home.intro.p1')}</Text>
  </ScrollView>;
}
