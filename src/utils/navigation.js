export const primaryRoutes = { home: 'Home', events: 'Events', venues: 'Venues', saved: 'Saved', more: 'More' };
export const blogRoutes = { index: 'BlogIndex', post: 'Post' };
export const rootRoutes = { main: 'Main', detail: 'EventDetail', weekly: 'Weekly', blog: 'Blog', resources: 'Resources', settings: 'Settings', suggest: 'SuggestEvent' };

export function handleNotificationNavigation(navigation, data) {
  if (data?.type === 'daily_summary' || data?.type === 'event_reminder') navigation.navigate(rootRoutes.main, { screen: 'Events' });
}

export function homeFeedback(status, eventCount, loading) {
  if (loading) return 'loading';
  if (status === 'error' || status === 'cached') return status;
  return eventCount ? null : 'emptyDate';
}
