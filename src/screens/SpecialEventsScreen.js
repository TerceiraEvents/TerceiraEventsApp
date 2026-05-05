import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { colors, fonts } from '../utils/theme';
import {
  fetchSpecialEvents,
  fetchWeeklyEvents,
  clearCache,
  applyEventFilters,
  sortEventsByDate,
  isInRange,
} from '../utils/data';
import { TAGS, getTagMeta } from '../utils/tags';
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
import { useLocale } from '../i18n';

const RANGE_DEFS = [
  { key: 'week', i18nKey: 'thisWeek', emoji: '📅' },
  { key: 'month', i18nKey: 'thisMonth', emoji: '📆' },
  { key: 'year', i18nKey: 'thisYear', emoji: '🗓️' },
  { key: 'all', i18nKey: 'allUpcoming', emoji: '∞' },
  { key: 'archive', i18nKey: 'archive', emoji: '📚' },
];
const RANGE_BY_KEY = Object.fromEntries(RANGE_DEFS.map((r) => [r.key, r]));

export default function SpecialEventsScreen() {
  const { t } = useLocale();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('week');
  const [remindedKeys, setRemindedKeys] = useState(new Set());
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [rangePickerOpen, setRangePickerOpen] = useState(false);

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

  const sortedEvents = useMemo(() => sortEventsByDate(events), [events]);

  const filtered = useMemo(() => {
    let base = sortedEvents.filter((e) => isInRange(e, range));
    if (range === 'archive') base = base.reverse();
    return applyEventFilters(base, { search, selectedTag });
  }, [sortedEvents, range, search, selectedTag]);

  if (loading) return <LoadingView />;

  const showReminder = range !== 'archive';
  const activeTag = selectedTag ? getTagMeta(selectedTag) : null;
  const activeRange = RANGE_BY_KEY[range] || RANGE_DEFS[0];
  const activeRangeLabel = t(`specialEvents.ranges.${activeRange.i18nKey}`);

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.header}>{t('specialEvents.title')}</Text>
        <View style={styles.dropdownRow}>
          <TouchableOpacity
            style={styles.rangeDropdown}
            onPress={() => setRangePickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('specialEvents.selectDateRange')}
          >
            <Text style={styles.rangeDropdownText} numberOfLines={1}>
              {activeRange.emoji}  {activeRangeLabel}
            </Text>
            <Text style={styles.rangeDropdownChevron}>▾</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tagDropdown, activeTag && styles.tagDropdownActive]}
            onPress={() => setTagPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('specialEvents.filterByTag')}
          >
            <Text
              style={[
                styles.tagDropdownText,
                activeTag && styles.tagDropdownTextActive,
              ]}
              numberOfLines={1}
            >
              {activeTag
                ? `${activeTag.emoji} ${activeTag.label}`
                : t('specialEvents.allTags')}
            </Text>
            <Text
              style={[
                styles.tagDropdownChevron,
                activeTag && styles.tagDropdownTextActive,
              ]}
            >
              ▾
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('specialEvents.search')}
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
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
              {search || selectedTag
                ? t('specialEvents.empty.filtered')
                : range === 'archive'
                  ? t('specialEvents.empty.archive')
                  : range === 'week'
                    ? t('specialEvents.empty.thisWeek')
                    : t('specialEvents.empty.default')}
            </Text>
          </View>
        }
      />

      <Modal
        visible={rangePickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setRangePickerOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setRangePickerOpen(false)}
        >
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {t('specialEvents.modals.dateRange')}
            </Text>
            <ScrollView style={styles.modalList}>
              {RANGE_DEFS.map((r) => {
                const active = range === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    style={[
                      styles.tagOption,
                      active && styles.tagOptionActive,
                    ]}
                    onPress={() => {
                      setRange(r.key);
                      setRangePickerOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.tagOptionText,
                        active && styles.tagOptionTextActive,
                      ]}
                    >
                      {r.emoji}  {t(`specialEvents.ranges.${r.i18nKey}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={tagPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setTagPickerOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setTagPickerOpen(false)}
        >
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {t('specialEvents.modals.filterByTag')}
            </Text>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[
                  styles.tagOption,
                  !selectedTag && styles.tagOptionActive,
                ]}
                onPress={() => {
                  setSelectedTag('');
                  setTagPickerOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.tagOptionText,
                    !selectedTag && styles.tagOptionTextActive,
                  ]}
                >
                  {t('specialEvents.allTags')}
                </Text>
              </TouchableOpacity>
              {TAGS.map((tag) => {
                const meta = getTagMeta(tag.slug);
                const active = selectedTag === tag.slug;
                return (
                  <TouchableOpacity
                    key={tag.slug}
                    style={[
                      styles.tagOption,
                      active && styles.tagOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedTag(tag.slug);
                      setTagPickerOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.tagOptionText,
                        active && styles.tagOptionTextActive,
                      ]}
                    >
                      {tag.emoji}  {meta.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  dropdownRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
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
    marginBottom: 4,
  },
  rangeDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  rangeDropdownText: {
    fontSize: fonts.sizeSmall,
    color: colors.white,
    fontWeight: '700',
    flexShrink: 1,
  },
  rangeDropdownChevron: {
    fontSize: fonts.sizeSmall,
    color: colors.white,
  },
  tagDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagDropdownActive: {
    backgroundColor: colors.kidFriendlyBadge,
    borderColor: colors.kidFriendlyBadgeDark,
  },
  tagDropdownText: {
    fontSize: fonts.sizeSmall,
    color: colors.textLight,
    fontWeight: '600',
    flexShrink: 1,
  },
  tagDropdownTextActive: {
    color: colors.kidFriendlyBadgeText,
  },
  tagDropdownChevron: {
    fontSize: fonts.sizeSmall,
    color: colors.textLight,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 16,
    maxHeight: '70%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: fonts.sizeLarge,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  modalList: {
    flexGrow: 0,
  },
  tagOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  tagOptionActive: {
    backgroundColor: colors.kidFriendlyBadgeBg,
  },
  tagOptionText: {
    fontSize: fonts.sizeMedium,
    color: colors.text,
    fontWeight: '500',
  },
  tagOptionTextActive: {
    color: colors.kidFriendlyBadgeText,
    fontWeight: '700',
  },
});
