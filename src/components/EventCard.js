import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { colors, fonts } from '../utils/theme';
import { parseEventDate, formatDate } from '../utils/data';

export default function EventCard({ event }) {
  const date = parseEventDate(event.date);
  const formatted = date ? formatDate(date) : null;

  const openInstagram = () => {
    if (event.instagram) {
      Linking.openURL(event.instagram);
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
        <Text style={styles.name}>{event.name}</Text>
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
  name: {
    fontSize: fonts.sizeMedium,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
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
