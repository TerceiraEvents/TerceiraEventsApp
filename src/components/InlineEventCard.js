import React, { useCallback, useState } from 'react';
import { Alert, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Text from './Text';
import EventCard from './EventCard';
import { useLocale } from '../i18n';
import { isEnded, fetchSpecialEvents, fetchWeeklyEvents } from '../utils/data';
import { getRemindedEventsStrict, makeEventKey, getSettings, setEventReminder, removeEventReminder } from '../utils/storage';
import { publishedEventTime, reminderDate } from '../utils/eventTime';
import { requestPermissions, scheduleOneReminder, rescheduleAllNotifications } from '../utils/notifications';
import { changeReminder } from '../utils/changeReminder';

/** Full discovery card with a strictly read, independent reminder state. */
export default function InlineEventCard({ event, onOpen }) {
  const { t } = useLocale();
  const [reminded, setReminded] = useState(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    try { setReminded((await getRemindedEventsStrict()).has(makeEventKey(event))); setFailed(false); }
    catch { setReminded(null); setFailed(true); }
  }, [event]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const toggle = async () => {
    try {
      setReminded(await changeReminder(event, reminded, {
        date: reminderDate, settings: getSettings, remove: removeEventReminder, store: setEventReminder,
        permission: requestPermissions, schedule: scheduleOneReminder,
        unresolved: () => Alert.alert(t('discovery.reminderTimeUnknown')),
        denied: () => Alert.alert(t('discovery.reminderPermissionDenied')),
        reschedule: async () => { const [special, weekly] = await Promise.all([fetchSpecialEvents(), fetchWeeklyEvents()]); await rescheduleAllNotifications(special, weekly); },
      }));
    } catch { Alert.alert(t('discovery.storageError')); }
  };
  return <View>
    {failed && <TouchableOpacity accessibilityRole="button" style={{ padding: 16 }} onPress={load}><Text accessibilityLiveRegion="polite">{t('discovery.reminderUnknown')} · {t('discovery.retry')}</Text></TouchableOpacity>}
    <EventCard event={event} onOpen={onOpen} calendarEnabled={!isEnded(event)} reminded={reminded} reminderUnavailable={reminded === true && !publishedEventTime(event).start} onToggleReminder={reminded === null || (isEnded(event) && !reminded) ? undefined : toggle} />
  </View>;
}
