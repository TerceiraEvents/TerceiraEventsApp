import { eventDetailParams } from '../utils/eventRoute';
import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocale } from '../i18n';
import { fetchSpecialEvents, getSpecialFeedState, sortDatedEvents, sortExhibitions, eventKind, isEnded } from '../utils/data';
import { getSavedEvents } from '../utils/storage';
import { reconcileSaved } from '../utils/eventIdentity';
import EventCard from '../components/EventCard';

export default function SavedScreen({ navigation }) {
  const { t } = useLocale();
  const [items, setItems] = useState([]);
  const [storageError, setStorageError] = useState(false);
  const [feedState, setFeedState] = useState({ status: 'loading' });
  const load = useCallback(async (refresh = false) => {
    try {
      const [saved, events] = await Promise.all([getSavedEvents(), fetchSpecialEvents(refresh)]);
      const state = getSpecialFeedState();
      setItems(reconcileSaved(saved, events, state));
      setFeedState(state);
      setStorageError(false);
    } catch { setStorageError(true); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sections = [
    ['discovery.dated', sortDatedEvents(items.filter((item) => !isEnded(item.event) && eventKind(item.event) === 'event').map((item) => item.event))],
    ['discovery.onView', sortExhibitions(items.filter((item) => !isEnded(item.event) && eventKind(item.event) === 'exhibition').map((item) => item.event))],
    ['discovery.ended', sortDatedEvents(items.filter((item) => isEnded(item.event)).map((item) => item.event))],
  ];
  return (
    <ScrollView>
      <Text style={styles.notice}>{t('discovery.localOnly')}</Text>
      {['error', 'cached'].includes(feedState.status) && (
        <TouchableOpacity accessibilityRole="button" style={styles.notice} onPress={() => load(true)}>
          <Text accessibilityLiveRegion="polite">{t(`discovery.${feedState.status}`)} · {t('discovery.retry')}</Text>
        </TouchableOpacity>
      )}
      {!!feedState.rejectedRecords && <Text style={styles.notice}>{t('discovery.partial', { count: feedState.rejectedRecords })}</Text>}
      {storageError && <TouchableOpacity accessibilityRole="button" style={styles.notice} onPress={() => load()}><Text accessibilityRole="alert">{t('discovery.storageError')} · {t('discovery.retry')}</Text></TouchableOpacity>}
      {!storageError && !items.length && <Text style={styles.notice}>{t('discovery.savedEmpty')}</Text>}
      {sections.filter(([, events]) => events.length).map(([label, events]) => (
        <React.Fragment key={label}>
          <Text accessibilityRole="header" style={styles.heading}>{t(label)}</Text>
          {events.map((event) => (
            <React.Fragment key={event.id}>
              {items.find((item) => item.id === event.id)?.unavailable && <Text style={styles.notice}>{t('discovery.unavailable')}</Text>}
              <EventCard event={event} compact onOpen={() => navigation.navigate('EventDetail', eventDetailParams(event))} />
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  notice: { padding: 16 },
  heading: { padding: 16, fontSize: 22 },
});
