import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, Alert } from 'react-native';
import { useLocale } from '../i18n';
import { fetchSpecialEvents, fetchWeeklyEvents, isEnded } from '../utils/data';
import { getSavedEvents, toggleSavedEvent, getRemindedEvents, makeEventKey, setEventReminder, removeEventReminder } from '../utils/storage';
import { eventId } from '../utils/eventIdentity';
import { requestPermissions, scheduleOneReminder, rescheduleAllNotifications } from '../utils/notifications';
import EventCard from '../components/EventCard';
import LoadingView from '../components/LoadingView';

export default function EventDetailScreen({ route }) {
  const { t } = useLocale();
  const [event, setEvent] = useState(route.params?.event || null);
  const [loading, setLoading] = useState(!event);
  const [reminded, setReminded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([fetchSpecialEvents(), getSavedEvents().catch(() => { if (active) Alert.alert(t('discovery.storageError')); return []; }), getRemindedEvents()]).then(([events, collection, reminders]) => {
      if (!active) return;
      const id = route.params?.id || eventId(route.params?.event);
      const current = events.find((item) => eventId(item) === id && id);
      setEvent(current || route.params?.event || null);
      setUnavailable(Boolean(id) && !current);
      if (current || route.params?.event) setReminded(reminders.has(makeEventKey(current || route.params?.event)));
      setSaved(collection.some((entry) => entry.id === id));
    }).catch(() => { if (active) Alert.alert(t('discovery.storageError')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [route.params, t]);
  if (loading) return <LoadingView />;
  if (!event) return <Text accessibilityRole="alert" style={{ padding: 24 }}>{t('discovery.unavailable')}</Text>;
  return <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
    {unavailable && <Text style={{ padding: 16 }}>{t('discovery.unavailable')}</Text>}
    {isEnded(event) && <Text style={{ padding: 16 }}>{t('discovery.ended')}</Text>}
    <TouchableOpacity disabled={!eventId(event)} accessibilityRole="button" accessibilityState={{ selected: saved, disabled: !eventId(event) }} style={{ padding: 16 }} onPress={async () => {
      try { setSaved(await toggleSavedEvent(event)); } catch { Alert.alert(t('discovery.storageError')); }
    }}><Text>{t(saved ? 'discovery.unsave' : 'discovery.save')}</Text></TouchableOpacity>
    <EventCard event={event} reminded={reminded} onToggleReminder={isEnded(event) ? undefined : async () => {
      try {
        if (reminded) { await removeEventReminder(event); const [special, weekly] = await Promise.all([fetchSpecialEvents(), fetchWeeklyEvents()]); await rescheduleAllNotifications(special, weekly); }
        else { if (!await requestPermissions()) return; await setEventReminder(event); await scheduleOneReminder(event); }
        setReminded(!reminded);
      } catch { Alert.alert(t('discovery.storageError')); }
    }} />
    <Text style={{ padding: 16 }}>{t('discovery.localOnly')}</Text>
  </ScrollView>;
}
