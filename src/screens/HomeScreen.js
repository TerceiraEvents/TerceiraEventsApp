import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocale } from '../i18n';
import { fetchSpecialEvents, eventKind, eventDateRange, sortDatedEvents, sortExhibitions, isActive, todayAzores } from '../utils/data';
import { shortcutWindow } from '../utils/discovery';
import EventCard from '../components/EventCard';
import { colors } from '../utils/theme';

export default function HomeScreen({ navigation }) {
  const { t } = useLocale();
  const [events, setEvents] = useState([]);
  const [selection, setSelection] = useState('today');
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; fetchSpecialEvents().then((all) => { if (active) setEvents(all); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const window = shortcutWindow(selection, todayAzores());
  const dated = sortDatedEvents(events.filter((event) => eventKind(event) === 'event' && isActive(event)));
  const selected = dated.filter((event) => { const range = eventDateRange(event); return range && range.start <= window.end && range.end >= window.start; });
  const onView = sortExhibitions(events.filter((event) => eventKind(event) === 'exhibition' && isActive(event))).slice(0, 3);
  const open = (event) => navigation.navigate('EventDetail', { id: event.id, event });
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingVertical: 16 }}>
    <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '700', paddingHorizontal: 16 }}>{t('home.title')}</Text>
    <TouchableOpacity accessibilityRole="button" style={{ padding: 16 }} onPress={() => navigation.navigate('Events')}><Text>{t('discovery.search')}</Text></TouchableOpacity>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 }}>{['today', 'tomorrow', 'weekend'].map((key) => <TouchableOpacity key={key} accessibilityRole="button" accessibilityState={{ selected: key === selection }} onPress={() => setSelection(key)} style={{ padding: 16, backgroundColor: key === selection ? colors.border : colors.card }}><Text>{t(`discovery.${key}`)}</Text></TouchableOpacity>)}</View>
    <Text style={{ padding: 16 }}>{window.start}{window.end !== window.start ? ` – ${window.end}` : ''} · Atlantic/Azores</Text>
    {loading ? <Text style={{ padding: 16 }}>{t('discovery.loading')}</Text> : selected.length ? selected.slice(0, 5).map((event) => <EventCard key={event.id || `${event.date}-${event.name}`} event={event} compact onOpen={() => open(event)} />) : <Text style={{ padding: 16 }}>{t('discovery.emptyDate')}</Text>}
    <TouchableOpacity accessibilityRole="button" style={{ padding: 16 }} onPress={() => navigation.navigate('Events')}><Text>{t('home.links.allUpcoming')}</Text></TouchableOpacity>
    {!!onView.length && <Text accessibilityRole="header" style={{ padding: 16, fontSize: 22 }}>{t('discovery.onView')}</Text>}
    {onView.map((event) => <EventCard key={event.id || `${event.date}-${event.name}`} event={event} compact onOpen={() => open(event)} />)}
    <TouchableOpacity accessibilityRole="button" style={{ padding: 16 }} onPress={() => navigation.navigate('Weekly')}><Text>{t('discovery.weekly')}</Text></TouchableOpacity>
    <Text style={{ padding: 16 }}>{t('home.intro.p1')}</Text>
  </ScrollView>;
}
