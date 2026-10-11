import React, { useCallback, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocale } from '../i18n';
import { fetchSpecialEvents, sortDatedEvents, sortExhibitions, eventKind, isEnded } from '../utils/data';
import { getSavedEvents } from '../utils/storage';
import { reconcileSaved } from '../utils/eventIdentity';
import EventCard from '../components/EventCard';

export default function SavedScreen({ navigation }) {
  const { t } = useLocale();
  const [items, setItems] = useState([]);
  const [error, setError] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getSavedEvents(), fetchSpecialEvents()]).then(([saved, events]) => { if (active) { setItems(reconcileSaved(saved, events)); setError(false); } }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []));
  const sections = [
    ['discovery.dated', sortDatedEvents(items.filter((item) => !isEnded(item.event) && eventKind(item.event) === 'event').map((item) => item.event))],
    ['discovery.onView', sortExhibitions(items.filter((item) => !isEnded(item.event) && eventKind(item.event) === 'exhibition').map((item) => item.event))],
    ['discovery.ended', sortDatedEvents(items.filter((item) => isEnded(item.event)).map((item) => item.event))],
  ];
  return <ScrollView><Text style={{ padding: 16 }}>{t('discovery.localOnly')}</Text>
    {error && <Text accessibilityRole="alert" style={{ padding: 16 }}>{t('discovery.storageError')}</Text>}
    {!items.length && <Text style={{ padding: 16 }}>{t('discovery.savedEmpty')}</Text>}
    {sections.filter(([, events]) => events.length).map(([label, events]) => <React.Fragment key={label}><Text accessibilityRole="header" style={{ padding: 16, fontSize: 22 }}>{t(label)}</Text>{events.map((event) => <React.Fragment key={event.id}>
      {items.find((item) => item.id === event.id)?.unavailable && <Text style={{ padding: 16 }}>{t('discovery.unavailable')}</Text>}
      <EventCard event={event} compact onOpen={() => navigation.navigate('EventDetail', { id: event.id, event })} />
    </React.Fragment>)}</React.Fragment>)}
  </ScrollView>;
}
