import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { colors, fonts } from '../utils/theme';
import {
  fetchSpecialEvents,
  fetchWeeklyEvents,
  isThisWeek,
  isUpcoming,
  clearCache,
  applyEventFilters,
} from '../utils/data';
import {
  getRemindedEvents,
  setEventReminder,
  removeEventReminder,
  makeEventKey,
} from '../utils/storage';
import {
  requestPermissions,
  rescheduleAllNotifications,
  scheduleOneReminder,
} from '../utils/notifications';
import EventCard from '../components/EventCard';
import LoadingView from '../components/LoadingView';

export default function SpecialEventsScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('thisWeek');
  const [remindedKeys, setRemindedKeys] = useState(new Set());
  const [search, setSearch] = useState('');
  const [kidFriendlyOnly, setKidFriendlyOnly] = useState(false);

  const loadEvents = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) clearCache();
    const [all, reminded] = await Promise.all([
      fetchSpecialEvents(),
      getRemindedEvents(),
    ]);
    setEvents(all);
    setRemindedKeys(reminded);
  }, []);

  useEffect(() => {
    loadEvents().finally(() => setLoading(false));
  }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents(true);
    // Reschedule notifications on refresh since data may have changed
    const [special, weekly] = await Promise.all([
      fetchSpecialEvents(),
      fetchWeeklyEvents(),
    ]);
    await rescheduleAllNotifications(special, weekly);
    setRefreshing(false);
  }, [loadEvents]);

  const handleToggleReminder = useCallback(
    async (event) => {
      const key = makeEventKey(event);
      const isCurrentlyReminded = remindedKeys.has(key);

      if (!isCurrentlyReminded) {
        const granted = await requestPermissions();
        if (!granted) return;
        await setEventReminder(event);
        await scheduleOneReminder(event);
      } else {
        await removeEventReminder(event);
        // Full reschedule to remove the cancelled notification
        const [special, weekly] = await Promise.all([
          fetchSpecialEvents(),
          fetchWeeklyEvents(),
        ]);
        await rescheduleAllNotifications(special, weekly);
      }

      // Refresh reminded keys
      const updated = await getRemindedEvents();
      setRemindedKeys(updated);
    },
    [remindedKeys],
  );

  const filtered = useMemo(() => {
    let base;
    if (filter === 'thisWeek') base = events.filter(isThisWeek).reverse();
    else if (filter === 'upcoming') base = events.filter(isUpcoming).reverse();
    else base = events.filter((e) => !isUpcoming(e));
    return applyEventFilters(base, { search, kidFriendlyOnly });
  }, [events, filter, search, kidFriendlyOnly]);

  if (loading) return <LoadingView />;

  const showReminder = filter !== 'archive';

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.header}>Special Events</Text>
        <View style={styles.filters}>
          {[
            { key: 'thisWeek', label: 'This Week' },
            { key: 'upcoming', label: 'All Upcoming' },
            { key: 'archive', label: 'Archive' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterButton,
                filter === f.key && styles.filterActive,
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f.key && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, venue, or description…"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[
            styles.kidToggle,
            kidFriendlyOnly && styles.kidToggleActive,
          ]}
          onPress={() => setKidFriendlyOnly((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: kidFriendlyOnly }}
        >
          <Text
            style={[
              styles.kidToggleText,
              kidFriendlyOnly && styles.kidToggleTextActive,
            ]}
          >
            👶 Kid Friendly only
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => `${item.date}-${item.name}-${index}`}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            reminded={remindedKeys.has(makeEventKey(item))}
            onToggleReminder={showReminder ? handleToggleReminder : undefined}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {search || kidFriendlyOnly
                ? 'No events match your search.'
                : filter === 'thisWeek'
                  ? 'No special events this week.'
                  : 'No events to show.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  header: {
    fontSize: fonts.sizeHeader,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: fonts.sizeBody,
    color: colors.text,
    marginTop: 4,
    marginBottom: 8,
  },
  kidToggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
  },
  kidToggleActive: {
    backgroundColor: colors.kidFriendlyBadge,
    borderColor: colors.kidFriendlyBadgeDark,
  },
  kidToggleText: {
    fontSize: fonts.sizeSmall,
    color: colors.textLight,
    fontWeight: '600',
  },
  kidToggleTextActive: {
    color: colors.kidFriendlyBadgeText,
    fontWeight: '700',
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: fonts.sizeSmall,
    color: colors.textLight,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.white,
  },
  list: {
    paddingBottom: 24,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fonts.sizeBody,
    color: colors.textMuted,
  },
});
