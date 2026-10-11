export function handleNotificationNavigation(navigation, data) {
  if (data?.type === 'daily_summary' || data?.type === 'event_reminder') navigation.navigate('Main', { screen: 'Events' });
}

export function homeFeedback(status, eventCount, loading) {
  if (loading) return 'loading';
  if (status === 'error' || status === 'cached') return status;
  return eventCount ? null : 'emptyDate';
}
