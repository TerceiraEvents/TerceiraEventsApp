import React, { useCallback, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocale } from '../i18n';
import { fetchSpecialEvents, sortDatedEvents } from '../utils/data';
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
  return <ScrollView><Text style={{ padding: 16 }}>{t('discovery.localOnly')}</Text>
    {error && <Text accessibilityRole="alert" style={{ padding: 16 }}>{t('discovery.storageError')}</Text>}
    {!items.length && <Text style={{ padding: 16 }}>{t('discovery.savedEmpty')}</Text>}
    {sortDatedEvents(items.map((item) => item.event)).map((event) => <React.Fragment key={event.id}>
      {items.find((item) => item.id === event.id)?.unavailable && <Text style={{ padding: 16 }}>{t('discovery.unavailable')}</Text>}
      <EventCard event={event} compact onOpen={() => navigation.navigate('EventDetail', { id: event.id, event })} />
    </React.Fragment>)}
  </ScrollView>;
}
