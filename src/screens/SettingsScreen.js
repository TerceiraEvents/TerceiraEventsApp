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

const LEAD_TIME_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
  { label: '1 day', value: 1440 },
];

const SUMMARY_TIME_OPTIONS = [
  { label: '7:00 AM', hour: 7, minute: 0 },
  { label: '8:00 AM', hour: 8, minute: 0 },
  { label: '9:00 AM', hour: 9, minute: 0 },
  { label: '10:00 AM', hour: 10, minute: 0 },
  { label: '11:00 AM', hour: 11, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
];

export default function SettingsScreen() {
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const updateSetting = useCallback(
    async (key, value) => {
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      await saveSettings(updated);

      // If toggling notifications on, request permissions
      if (key === 'dailySummaryEnabled' && value) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            'Notifications Disabled',
            'Please enable notifications in your device settings to receive daily summaries.',
          );
          const reverted = { ...updated, dailySummaryEnabled: false };
          setSettings(reverted);
          await saveSettings(reverted);
          return;
        }
      }

      // Reschedule notifications with new settings
      const [special, weekly] = await Promise.all([
        fetchSpecialEvents(),
        fetchWeeklyEvents(),
      ]);
      await rescheduleAllNotifications(special, weekly);
    },
    [settings],
  );

  if (!settings) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Settings</Text>

      {/* Daily Summary Section */}
      <Text style={styles.sectionTitle}>Daily Summary</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Daily Summary</Text>
            <Text style={styles.sublabel}>
              Get a notification each morning with the day{"'"}s events
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
            <Text style={styles.pickerLabel}>Summary Time</Text>
            <View style={styles.chips}>
              {SUMMARY_TIME_OPTIONS.map((opt) => {
                const active =
                  settings.dailySummaryHour === opt.hour &&
                  settings.dailySummaryMinute === opt.minute;
                return (
                  <TouchableOpacity
                    key={opt.label}
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
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.label}>Include Weekly Events</Text>
                <Text style={styles.sublabel}>
                  Show recurring weekly events in the daily summary
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
                <Text style={styles.label}>Only Reminded Weekly Events</Text>
                <Text style={styles.sublabel}>
                  When weekly events are included, only show ones you set a
                  reminder for
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

      {/* Event Reminders Section */}
      <Text style={styles.sectionTitle}>Event Reminders</Text>
      <View style={styles.card}>
        <Text style={styles.pickerLabel}>Remind Me Before Event</Text>
        <Text style={styles.sublabel}>
          How long before an event to send the reminder notification
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
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Tap the bell icon on any special event to set a reminder. You{"'"}ll
          get a notification before the event starts.
        </Text>
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
