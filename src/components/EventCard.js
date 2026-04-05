import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Share, Platform, Image } from 'react-native';
import * as Calendar from 'expo-calendar';
import { colors, fonts } from '../utils/theme';
import { parseEventDate, formatDate } from '../utils/data';
import FlagEventModal from './FlagEventModal';

const BASE_URL =
  'https://raw.githubusercontent.com/TerceiraEvents/Angraevents.github.io/main';

function getImageUrl(imagePath) {
  // Full URL (e.g. from R2 uploads): use as-is
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  // Relative path on the website repo: prepend GitHub raw base
  return `${BASE_URL}${imagePath}`;
}

export default function EventCard({ event, reminded, onToggleReminder }) {
  const [flagVisible, setFlagVisible] = useState(false);
  const date = parseEventDate(event.date);
  const formatted = date ? formatDate(date) : null;

  const openInstagram = () => {
    if (event.instagram) {
      Linking.openURL(event.instagram);
    }
  };

  const addToCalendar = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Calendar access is required to add events.');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      let targetCalendar;
      if (Platform.OS === 'ios') {
        targetCalendar = await Calendar.getDefaultCalendarAsync();
      } else {
        targetCalendar =
          calendars.find((c) => c.accessLevel === 'owner' && c.isPrimary) ||
          calendars.find((c) => c.accessLevel === 'owner') ||
          calendars.find((c) => c.allowsModifications);
      }

      if (!targetCalendar) {
        Alert.alert('Error', 'No writable calendar found on this device.');
        return;
      }

      const eventDate = parseEventDate(event.date);
      const startDate = new Date(eventDate);
      if (event.time) {
        const [hours, minutes] = event.time.split(':').map(Number);
        startDate.setHours(hours, minutes, 0, 0);
      } else {
        startDate.setHours(12, 0, 0, 0);
      }

      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

      const location = [event.venue, event.address].filter(Boolean).join(', ');

      await Calendar.createEventAsync(targetCalendar.id, {
        title: event.name,
        startDate,
        endDate,
        location,
        notes: event.description || '',
      });

      Alert.alert('Added to calendar!', `"${event.name}" has been added to your calendar.`);
    } catch (error) {
      Alert.alert('Error', 'Could not add event to calendar. ' + error.message);
    }
  };

  const shareEvent = async () => {
    const dateLine = formatted
      ? `${formatted.month} ${formatted.day}, ${formatted.year}`
      : '';
    const timePart = event.time ? ` at ${event.time}` : '';
    const venueLine = [event.venue, event.address].filter(Boolean).join(', ');

    const lines = [event.name];
    if (dateLine) lines.push(`${dateLine}${timePart}`);
    if (venueLine) lines.push(venueLine);
    lines.push('');
    lines.push('Shared from Terceira Events');

    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // user cancelled or share failed
    }
  };

  return (
    <View style={styles.card}>
      {formatted && (
        <View style={styles.dateBadge}>
          <Text style={styles.dateMonth}>{formatted.month}</Text>
          <Text style={styles.dateDay}>{formatted.day}</Text>
          <Text style={styles.dateYear}>{formatted.year}</Text>
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, styles.nameWithButtons]}>
            {event.name}
          </Text>
          <TouchableOpacity
            onPress={shareEvent}
            style={styles.shareButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.shareIcon}>{'\u{1F4E4}'}</Text>
          </TouchableOpacity>
          {onToggleReminder && (
            <TouchableOpacity
              onPress={addToCalendar}
              style={styles.calendarButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.calendarIcon}>{'\u{1F4C5}'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setFlagVisible(true)}
            style={styles.flagButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.flagIcon}>{'\u{1F6A9}'}</Text>
          </TouchableOpacity>
          {onToggleReminder && (
            <TouchableOpacity
              onPress={() => onToggleReminder(event)}
              style={[styles.bellButton, reminded && styles.bellActive]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.bellIcon}>{reminded ? '\u{1F514}' : '\u{1F515}'}</Text>
            </TouchableOpacity>
          )}
        </View>
        {event.festival && (
          <View style={styles.festivalBadge}>
            <Text style={styles.festivalText}>{event.festival}</Text>
          </View>
        )}
        <Text style={styles.venue}>{event.venue}</Text>
        {event.time && <Text style={styles.time}>{event.time}</Text>}
        {event.description && (
          <Text style={styles.description}>{event.description}</Text>
        )}
        {event.image && (
          <Image
            source={{ uri: getImageUrl(event.image) }}
            style={styles.eventImage}
            resizeMode="cover"
            accessibilityLabel={`Image for ${event.name}`}
          />
        )}
        {event.address && (
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`
              )
            }
          >
            <Text style={styles.address}>{event.address}</Text>
          </TouchableOpacity>
        )}
        {event.instagram && (
          <TouchableOpacity onPress={openInstagram} style={styles.linkButton}>
            <Text style={styles.linkText}>View on Instagram</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlagEventModal
        visible={flagVisible}
        event={event}
        onClose={() => setFlagVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  dateBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    width: 56,
    height: 64,
    marginRight: 12,
  },
  dateMonth: {
    color: colors.white,
    fontSize: fonts.sizeSmall,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dateDay: {
    color: colors.white,
    fontSize: fonts.sizeTitle,
    fontWeight: '700',
  },
  dateYear: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: fonts.sizeMedium,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
    flex: 1,
  },
  nameWithButtons: {
    marginRight: 8,
  },
  shareButton: {
    padding: 4,
    borderRadius: 16,
    marginRight: 2,
  },
  shareIcon: {
    fontSize: 18,
  },
  calendarButton: {
    padding: 4,
    borderRadius: 16,
    marginRight: 2,
  },
  calendarIcon: {
    fontSize: 18,
  },
  flagButton: {
    padding: 4,
    borderRadius: 16,
    marginRight: 2,
  },
  flagIcon: {
    fontSize: 18,
  },
  bellButton: {
    padding: 4,
    borderRadius: 16,
  },
  bellActive: {
    backgroundColor: '#fef3c7',
  },
  bellIcon: {
    fontSize: 18,
  },
  festivalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.festivalBadge,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  festivalText: {
    color: colors.white,
    fontSize: fonts.sizeSmall,
    fontWeight: '600',
  },
  venue: {
    fontSize: fonts.sizeBody,
    color: colors.primaryLight,
    fontWeight: '600',
    marginBottom: 2,
  },
  time: {
    fontSize: fonts.sizeBody,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontSize: fonts.sizeBody,
    color: colors.textLight,
    marginTop: 4,
    lineHeight: 20,
  },
  eventImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginTop: 8,
  },
  address: {
    fontSize: fonts.sizeSmall,
    color: colors.primary,
    marginTop: 4,
    textDecorationLine: 'underline',
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
