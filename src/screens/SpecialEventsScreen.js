import { useFocusEffect } from '@react-navigation/native';
import { reconcileSaved } from '../utils/eventIdentity';
import { getSavedEvents } from '../utils/storage';
import { eventDetailParams } from '../utils/eventRoute';
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
  getSpecialFeedState,
  applyEventFilters,
  sortEventsByDate,
  isInRange,
  eventKind,
  sortExhibitions,
} from '../utils/data';
import { matchesDiscoveryOptions, localityCoverage } from '../utils/discovery';
import { TAGS, getTagMeta } from '../utils/tags';
import {
  rescheduleAllNotifications,
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

export default function SpecialEventsScreen({ navigation, route }) {
  const { t } = useLocale();
  const [events, setEvents] = useState([]);
  const [feedState, setFeedState] = useState({ status: 'loading' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('week');
  const [locality, setLocality] = useState('');
  const [free, setFree] = useState(false);
  const [family, setFamily] = useState(false);
  const [kind, setKind] = useState('event');
  const [savedOnly, setSavedOnly] = useState(false);
  const [savedRecords, setSavedRecords] = useState(null);
  const [savedReadError, setSavedReadError] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [rangePickerOpen, setRangePickerOpen] = useState(false);

  useEffect(() => {
    if (['event', 'exhibition'].includes(route?.params?.kind)) setKind(route.params.kind);
    if (route?.params?.range === 'all') setRange('all');
    if (route?.params?.saved === true) setSavedOnly(true);
    if (['event', 'exhibition'].includes(route?.params?.kind) || route?.params?.range === 'all' || route?.params?.saved === true) navigation.setParams({ kind: undefined, range: undefined, saved: undefined });
  }, [navigation, route?.params?.kind, route?.params?.range, route?.params?.saved]);

  const loadSaved = useCallback(async () => {
    setSavedRecords(null);
    try { setSavedRecords(await getSavedEvents()); setSavedReadError(false); }
    catch { setSavedReadError(true); }
  }, []);
  useFocusEffect(useCallback(() => { loadSaved(); }, [loadSaved]));

  const loadEvents = useCallback(async (forceRefresh = false) => {
    const all = await fetchSpecialEvents(forceRefresh);
    setEvents(all);
    setFeedState(getSpecialFeedState());
  }, []);

  useEffect(() => {
    loadEvents().finally(() => setLoading(false));
  }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
    await loadEvents(true);
    // Reschedule notifications on refresh since data may have changed
    const [special, weekly] = await Promise.all([
      fetchSpecialEvents(),
      fetchWeeklyEvents(),
    ]);
    await rescheduleAllNotifications(special, weekly);
    } finally { setRefreshing(false); }
  }, [loadEvents]);

  const savedIDs = useMemo(() => savedRecords?.map((entry) => entry.id) || null, [savedRecords]);
  const savedItems = useMemo(() => reconcileSaved(savedRecords || [], events, feedState), [savedRecords, events, feedState]);
  const sortedEvents = useMemo(() => sortEventsByDate(savedOnly ? savedItems.map((entry) => entry.event).filter(Boolean) : events), [events, savedOnly, savedItems]);

  const filtered = useMemo(() => {
    let base = sortedEvents.filter((e) => isInRange(e, range) && eventKind(e) === kind);
    if (kind === 'exhibition') base = sortExhibitions(base);
    if (range === 'archive') base = base.reverse();
    return applyEventFilters(base, { search, selectedTag }).filter((event) => matchesDiscoveryOptions(event, { locality, free, family, savedOnly, savedIDs }));
  }, [sortedEvents, range, search, selectedTag, kind, locality, free, family, savedOnly, savedIDs]);

  if (loading) return <LoadingView />;

  const localities = localityCoverage(events);
  const activeTag = selectedTag ? getTagMeta(selectedTag) : null;
  const activeRange = RANGE_BY_KEY[range] || RANGE_DEFS[0];
  const activeRangeLabel = t(`specialEvents.ranges.${activeRange.i18nKey}`);

  const filters = (
      <View style={styles.headerArea}>
        <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: savedOnly, disabled: savedIDs === null && !savedOnly }} disabled={savedIDs === null && !savedOnly} style={{ padding: 16, minWidth: 44, minHeight: 44 }} onPress={() => { if (!savedOnly) setRange('all'); setSavedOnly(!savedOnly); }}><Text>{t('discovery.saved')}</Text></TouchableOpacity>
        {savedOnly && <Text style={{ padding: 8 }}>{t('discovery.localOnly')} {t('discovery.otherFilters')}</Text>}
        {savedOnly && savedIDs === null && !savedReadError && <Text accessibilityLiveRegion="polite">{t('discovery.loadingSaved')}</Text>}
        {savedReadError && <TouchableOpacity accessibilityRole="button" style={{ padding: 16 }} onPress={loadSaved}><Text accessibilityLiveRegion="polite">{t('discovery.savedUnknown')} · {t('discovery.retry')}</Text></TouchableOpacity>}
        <TouchableOpacity accessibilityRole="button" style={{ padding: 16, minWidth: 44, minHeight: 44 }} onPress={() => { setSavedOnly(false); setRange('week'); setKind('event'); setLocality(''); setFree(false); setFamily(false); setSearch(''); setSelectedTag(''); }}><Text>{t('discovery.reset')}</Text></TouchableOpacity>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {['event', 'exhibition'].map((value) => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: kind === value }} style={{ padding: 16, backgroundColor: kind === value ? colors.border : colors.card }} onPress={() => setKind(value)}><Text>{t(value === 'event' ? 'discovery.dated' : 'discovery.onView')}</Text></TouchableOpacity>)}
          <TouchableOpacity accessibilityRole="button" style={{ padding: 16 }} onPress={() => navigation.navigate('Weekly')}><Text>{t('discovery.weekly')}</Text></TouchableOpacity>
        </View>
        <Text style={styles.header}>{t('specialEvents.title')}</Text>
        {['cached', 'error'].includes(feedState.status) && <TouchableOpacity accessibilityRole="button" style={{ padding: 16 }} onPress={onRefresh}><Text accessibilityLiveRegion="polite">{t(`discovery.${feedState.status}`)} · {t('discovery.retry')}</Text></TouchableOpacity>}
        {feedState.cacheTimeUnknown && <Text accessibilityLiveRegion="polite" style={{ padding: 16 }}>{t('discovery.cacheTimeUnknown')}</Text>}
        {!!feedState.rejectedRecords && <Text accessibilityLiveRegion="polite">{t('discovery.partial', { count: feedState.rejectedRecords })}</Text>}
        {feedState.fetchedAt && <Text>{t('discovery.fetched')} {feedState.fetchedAt}</Text>}
        <Text accessibilityLiveRegion="polite">{filtered.length} {t(filtered.length === 1 ? 'discovery.result' : 'discovery.results')}</Text>
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {(localities.options.length ? ['', ...localities.options] : []).map((value) => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: locality === value }} style={{ padding: 12, backgroundColor: locality === value ? colors.border : colors.card }} onPress={() => setLocality(value)}><Text>{t(`discovery.${value || 'allPlaces'}`)}</Text></TouchableOpacity>)}
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: free }} style={{ padding: 12, backgroundColor: free ? colors.border : colors.card }} onPress={() => setFree(!free)}><Text>{t('discovery.free')}</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: family }} style={{ padding: 12, backgroundColor: family ? colors.border : colors.card }} onPress={() => setFamily(!family)}><Text>{t('discovery.family')}</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={{ padding: 12 }} onPress={() => { setSearch(''); setSelectedTag(''); setLocality(''); setFree(false); setFamily(false); setRange('week'); setKind('event'); }}><Text>{t('discovery.reset')}</Text></TouchableOpacity>
        </View>
        {!!localities.options.length && localities.confirmed < localities.total && <Text>{t('discovery.localityPartial')}</Text>}
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
  );

  return (
    <View style={styles.container}>

      <FlatList
        ListHeaderComponent={filters}
        keyboardShouldPersistTaps="handled"
        data={filtered}
        keyExtractor={(item, index) => `${item.date}-${item.name}-${index}`}
        renderItem={({ item }) => (
          <View>
          {savedOnly && savedItems.some((entry) => entry.id === item.id && entry.unavailable) && <Text style={{ padding: 16 }}>{t('discovery.unavailable')}</Text>}
          <EventCard
            event={item}
            compact
            onOpen={() => navigation.navigate('EventDetail', eventDetailParams(item))}
          />
          </View>
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
              {search || selectedTag || locality || free || family
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
