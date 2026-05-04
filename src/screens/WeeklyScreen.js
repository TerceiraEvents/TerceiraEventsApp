import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { colors, fonts } from '../utils/theme';
import { fetchWeeklyEvents } from '../utils/data';
import LoadingView from '../components/LoadingView';
import FlagEventModal from '../components/FlagEventModal';

export default function WeeklyScreen() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flagTarget, setFlagTarget] = useState(null);

  useEffect(() => {
    fetchWeeklyEvents()
      .then(setDays)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingView />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Weekly Events</Text>
      <Text style={styles.intro}>
        Recurring entertainment you can count on every week.
      </Text>

      {days.map((dayGroup) => (
        <View key={dayGroup.day} style={styles.daySection}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayName}>{dayGroup.day}</Text>
          </View>
          {dayGroup.events.map((event, idx) => (
            <View key={idx} style={styles.eventCard}>
              <View style={styles.titleRow}>
                <Text style={[styles.eventName, styles.eventNameWithButton]}>
                  {event.name}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setFlagTarget({ event, day: dayGroup.day })
                  }
                  style={styles.flagButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Suggest an edit"
                >
                  <Text style={styles.flagIcon}>{'\u{1F6A9}'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.eventVenue}>{event.venue}</Text>
              {event.time && (
                <Text style={styles.eventTime}>{event.time}</Text>
              )}
              {event.description && (
                <Text style={styles.eventDescription}>
                  {event.description}
                </Text>
              )}
              {event.note && (
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>{event.note}</Text>
                </View>
              )}
              {event.address && (
                <Text style={styles.address}>{event.address}</Text>
              )}
              {(event.map_url || event.address || event.venue) && (
                <TouchableOpacity
                  onPress={() => {
                    const url =
                      event.map_url ||
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        event.address || event.venue
                      )}`;
                    Linking.openURL(url);
                  }}
                  style={styles.mapButton}
                  accessibilityRole="link"
                  accessibilityLabel="Open location in Google Maps"
                >
                  <Text style={styles.mapButtonText}>📍 Open in Maps</Text>
                </TouchableOpacity>
              )}
              {event.instagram && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(event.instagram)}
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>📸 View on Instagram</Text>
                </TouchableOpacity>
              )}
              {event.url && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(event.url)}
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>🌐 Website</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      ))}

      <FlagEventModal
        visible={flagTarget !== null}
        event={flagTarget?.event}
        eventDateOverride={
          flagTarget ? `${flagTarget.day} (weekly)` : undefined
        }
        onClose={() => setFlagTarget(null)}
      />
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
  },
  intro: {
    fontSize: fonts.sizeBody,
    color: colors.textLight,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  daySection: {
    marginBottom: 16,
  },
  dayHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  dayName: {
    fontSize: fonts.sizeLarge,
    fontWeight: '700',
    color: colors.white,
  },
  eventCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eventName: {
    fontSize: fonts.sizeMedium,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  eventNameWithButton: {
    marginRight: 8,
  },
  flagButton: {
    padding: 4,
    borderRadius: 16,
  },
  flagIcon: {
    fontSize: 18,
  },
  eventVenue: {
    fontSize: fonts.sizeBody,
    color: colors.primaryLight,
    fontWeight: '600',
    marginTop: 2,
  },
  eventTime: {
    fontSize: fonts.sizeBody,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  eventDescription: {
    fontSize: fonts.sizeBody,
    color: colors.textLight,
    marginTop: 6,
    lineHeight: 20,
  },
  noteBox: {
    backgroundColor: '#fef9e7',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  noteText: {
    fontSize: fonts.sizeSmall,
    color: colors.textLight,
    lineHeight: 18,
  },
  address: {
    fontSize: fonts.sizeSmall,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: 6,
  },
  mapButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  mapButtonText: {
    fontSize: fonts.sizeSmall,
    fontWeight: '600',
    color: colors.primary,
  },
  linkButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: fonts.sizeSmall,
    color: colors.primaryLight,
    fontWeight: '600',
  },
});
