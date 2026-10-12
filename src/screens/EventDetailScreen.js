import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useLocale } from '../i18n';
import { fetchSpecialEvents, fetchWeeklyEvents, getSpecialFeedState, isEnded } from '../utils/data';
import { getSavedEvents, toggleSavedEvent, getRemindedEventsStrict, makeEventKey, setEventReminder, removeEventReminder } from '../utils/storage';
import { loadDetailData } from '../utils/detailData';
import { eventId, resolveEventDetail } from '../utils/eventIdentity';
import { requestPermissions, scheduleOneReminder, rescheduleAllNotifications } from '../utils/notifications';
import EventCard from '../components/EventCard';
import LoadingView from '../components/LoadingView';

export default function EventDetailScreen({ route }) {
  const { t } = useLocale();
  const [event, setEvent] = useState(route.params?.event || null);
  const [loading, setLoading] = useState(!event);
  const [reminded, setReminded] = useState(null);
  const [reminderFailed, setReminderFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [feedState, setFeedState] = useState({ status: 'loading' });
  const id = route.params?.id || eventId(route.params?.event);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      const { events, saved: collection, reminders, savedError, reminderError } = await loadDetailData({
        fetchEvents: () => fetchSpecialEvents(refresh),
        readSaved: getSavedEvents,
        readReminders: getRemindedEventsStrict,
      });
      if (savedError) Alert.alert(t('discovery.storageError'));
      setReminderFailed(Boolean(reminderError));
      if (reminderError) setReminded(null);
      const state = getSpecialFeedState();
      const resolved = resolveEventDetail({ id, snapshot: route.params?.event, events, feedState: state });
      setEvent(resolved.event);
      setUnavailable(resolved.unavailable);
      setFeedState(state);
      if (resolved.event && reminders) setReminded(reminders.has(makeEventKey(resolved.event)));
      setSaved(collection.some((entry) => entry.id === id));
    } catch { Alert.alert(t('discovery.storageError')); }
    finally { setLoading(false); }
  }, [id, route.params?.event, t]);

  useEffect(() => { load(); }, [load]);

  const toggleReminder = async () => {
    try {
      if (reminded) {
        await removeEventReminder(event);
        const [special, weekly] = await Promise.all([fetchSpecialEvents(), fetchWeeklyEvents()]);
        await rescheduleAllNotifications(special, weekly);
      } else {
        if (!await requestPermissions()) return;
        await setEventReminder(event);
        await scheduleOneReminder(event);
      }
      setReminded(!reminded);
    } catch { Alert.alert(t('discovery.storageError')); }
  };

  if (loading && !event) return <LoadingView />;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      {['error', 'cached'].includes(feedState.status) && (
        <TouchableOpacity accessibilityRole="button" style={styles.notice} onPress={() => load(true)}>
          <Text accessibilityLiveRegion="polite">{t(`discovery.${feedState.status}`)} · {t('discovery.retry')}</Text>
        </TouchableOpacity>
      )}
      {!!feedState.rejectedRecords && <Text style={styles.notice}>{t('discovery.partial', { count: feedState.rejectedRecords })}</Text>}
      {feedState.status === 'cached' && !event && <Text style={styles.notice}>{t('discovery.detailUncertain')}</Text>}
      {unavailable && <Text style={styles.notice}>{t('discovery.unavailable')}</Text>}
      {reminderFailed && event && <TouchableOpacity accessibilityRole="button" style={styles.notice} onPress={() => load(true)}><Text accessibilityLiveRegion="polite">{t('discovery.reminderUnknown')} · {t('discovery.retry')}</Text></TouchableOpacity>}
      {event && <>
        {isEnded(event) && <Text style={styles.notice}>{t('discovery.ended')}</Text>}
        <TouchableOpacity
          disabled={!eventId(event)}
          accessibilityRole="button"
          accessibilityState={{ selected: saved, disabled: !eventId(event) }}
          style={styles.notice}
          onPress={async () => {
            try { setSaved(await toggleSavedEvent(event)); }
            catch { Alert.alert(t('discovery.storageError')); }
          }}
        ><Text>{t(saved ? 'discovery.unsave' : 'discovery.save')}</Text></TouchableOpacity>
        <EventCard event={event} calendarEnabled={!isEnded(event)} reminded={reminded} onToggleReminder={isEnded(event) || reminded === null ? undefined : toggleReminder} />
        <Text style={styles.notice}>{t('discovery.localOnly')}</Text>
      </>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16 },
  notice: { padding: 16 },
});
