import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, fonts } from '../utils/theme';
import { getSettings, saveSettings } from '../utils/storage';
import { requestPermissions, rescheduleAllNotifications } from '../utils/notifications';
import { fetchSpecialEvents, fetchWeeklyEvents } from '../utils/data';
import { useLocale, LOCALE_CHOICES } from '../i18n';

const LEAD_TIME_OPTIONS = [
  { key: '15min', value: 15 },
  { key: '30min', value: 30 },
  { key: '1h', value: 60 },
  { key: '2h', value: 120 },
  { key: '4h', value: 240 },
  { key: '1d', value: 1440 },
];

const SUMMARY_TIME_OPTIONS = [
  { key: '0700', hour: 7, minute: 0 },
  { key: '0800', hour: 8, minute: 0 },
  { key: '0900', hour: 9, minute: 0 },
  { key: '1000', hour: 10, minute: 0 },
  { key: '1100', hour: 11, minute: 0 },
  { key: '1200', hour: 12, minute: 0 },
];

export default function SettingsScreen() {
  const { t, choice, setChoice } = useLocale();
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const updateSetting = useCallback(
    async (key, value) => {
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      await saveSettings(updated);

      if (key === 'dailySummaryEnabled' && value) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            t('settings.notifications.disabledTitle'),
            t('settings.notifications.disabledBody'),
          );
          const reverted = { ...updated, dailySummaryEnabled: false };
          setSettings(reverted);
          await saveSettings(reverted);
          return;
        }
      }

      const [special, weekly] = await Promise.all([
        fetchSpecialEvents(),
        fetchWeeklyEvents(),
      ]);
      await rescheduleAllNotifications(special, weekly);
    },
    [settings, t],
  );

  if (!settings) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>{t('settings.title')}</Text>

      {/* Language */}
      <Text style={styles.sectionTitle}>{t('settings.language.section')}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>{t('settings.language.label')}</Text>
        <Text style={styles.sublabel}>{t('settings.language.description')}</Text>
        <View style={styles.chips}>
          {LOCALE_CHOICES.map((c) => {
            const active = choice === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setChoice(c)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {t(`settings.language.${c}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Daily Summary */}
      <Text style={styles.sectionTitle}>
        {t('settings.dailySummary.section')}
      </Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{t('settings.dailySummary.toggle')}</Text>
            <Text style={styles.sublabel}>
              {t('settings.dailySummary.description')}
            </Text>
          </View>
          <Switch
            value={settings.dailySummaryEnabled}
            onValueChange={(v) => updateSetting('dailySummaryEnabled', v)}
            trackColor={{ true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        {settings.dailySummaryEnabled && (
          <>
            <View style={styles.divider} />
            <Text style={styles.pickerLabel}>
              {t('settings.dailySummary.time')}
            </Text>
            <View style={styles.chips}>
              {SUMMARY_TIME_OPTIONS.map((opt) => {
                const active =
                  settings.dailySummaryHour === opt.hour &&
                  settings.dailySummaryMinute === opt.minute;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      const updated = {
                        ...settings,
                        dailySummaryHour: opt.hour,
                        dailySummaryMinute: opt.minute,
                      };
                      setSettings(updated);
                      saveSettings(updated).then(async () => {
                        const [special, weekly] = await Promise.all([
                          fetchSpecialEvents(),
                          fetchWeeklyEvents(),
                        ]);
                        await rescheduleAllNotifications(special, weekly);
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                      ]}
                    >
                      {t(`settings.times.${opt.key}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.label}>
                  {t('settings.dailySummary.includeWeekly')}
                </Text>
                <Text style={styles.sublabel}>
                  {t('settings.dailySummary.includeWeeklyDescription')}
                </Text>
              </View>
              <Switch
                value={settings.includeWeeklyInSummary}
                onValueChange={(v) =>
                  updateSetting('includeWeeklyInSummary', v)
                }
                trackColor={{ true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.label}>
                  {t('settings.dailySummary.onlyReminded')}
                </Text>
                <Text style={styles.sublabel}>
                  {t('settings.dailySummary.onlyRemindedDescription')}
                </Text>
              </View>
              <Switch
                value={settings.onlyRemindedWeeklyEvents}
                onValueChange={(v) =>
                  updateSetting('onlyRemindedWeeklyEvents', v)
                }
                trackColor={{ true: colors.primary }}
                thumbColor={colors.white}
                disabled={!settings.includeWeeklyInSummary}
              />
            </View>
          </>
        )}
      </View>

      {/* Event Reminders */}
      <Text style={styles.sectionTitle}>
        {t('settings.reminders.section')}
      </Text>
      <View style={styles.card}>
        <Text style={styles.pickerLabel}>
          {t('settings.reminders.leadTime')}
        </Text>
        <Text style={styles.sublabel}>
          {t('settings.reminders.leadTimeDescription')}
        </Text>
        <View style={styles.chips}>
          {LEAD_TIME_OPTIONS.map((opt) => {
            const active = settings.reminderLeadMinutes === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => updateSetting('reminderLeadMinutes', opt.value)}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {t(`settings.leadTimes.${opt.key}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>{t('settings.reminders.info')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    fontSize: fonts.sizeHeader,
    fontWeight: '700',
    color: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: fonts.sizeMedium,
    fontWeight: '700',
    color: colors.textLight,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: fonts.sizeBody,
    fontWeight: '600',
    color: colors.text,
  },
  sublabel: {
    fontSize: fonts.sizeSmall,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  pickerLabel: {
    fontSize: fonts.sizeBody,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fonts.sizeSmall,
    color: colors.textLight,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.white,
  },
  infoBox: {
    backgroundColor: '#f0f7e6',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoText: {
    fontSize: fonts.sizeSmall,
    color: colors.textLight,
    lineHeight: 18,
  },
});
