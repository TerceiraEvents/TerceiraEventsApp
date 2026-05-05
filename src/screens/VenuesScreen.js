import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { colors, fonts } from '../utils/theme';
import { venues } from '../utils/data';
import { useLocale } from '../i18n';
import { localizedField } from '../utils/i18nFields';

function VenueCard({ venue, t, locale }) {
  const description = localizedField(venue, 'description', locale);
  const address = localizedField(venue, 'address', locale);
  return (
    <View style={styles.card}>
      <Text style={styles.venueName}>{venue.name}</Text>
      <TouchableOpacity
        onPress={() =>
          Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${venue.mapQuery}`
          )
        }
      >
        <Text style={styles.address}>{address}</Text>
      </TouchableOpacity>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.links}>
        {venue.website && (
          <TouchableOpacity
            onPress={() => Linking.openURL(venue.website)}
            style={styles.linkChip}
          >
            <Text style={styles.linkChipText}>{t('venues.links.website')}</Text>
          </TouchableOpacity>
        )}
        {venue.instagram && (
          <TouchableOpacity
            onPress={() => Linking.openURL(venue.instagram)}
            style={styles.linkChip}
          >
            <Text style={styles.linkChipText}>
              {t('venues.links.instagram')}
            </Text>
          </TouchableOpacity>
        )}
        {venue.facebook && (
          <TouchableOpacity
            onPress={() => Linking.openURL(venue.facebook)}
            style={styles.linkChip}
          >
            <Text style={styles.linkChipText}>
              {t('venues.links.facebook')}
            </Text>
          </TouchableOpacity>
        )}
        {venue.tickets && (
          <TouchableOpacity
            onPress={() => Linking.openURL(venue.tickets)}
            style={styles.linkChip}
          >
            <Text style={styles.linkChipText}>{t('venues.links.tickets')}</Text>
          </TouchableOpacity>
        )}
        {venue.reservation && (
          <TouchableOpacity
            onPress={() => Linking.openURL(venue.reservation)}
            style={[styles.linkChip, styles.reserveChip]}
          >
            <Text style={styles.reserveChipText}>
              {t('venues.links.reserve')}
            </Text>
          </TouchableOpacity>
        )}
        {venue.phone && (
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(`tel:${venue.phone.replace(/\s/g, '')}`)
            }
            style={styles.linkChip}
          >
            <Text style={styles.linkChipText}>{venue.phone}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function VenuesScreen() {
  const { t, locale } = useLocale();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>{t('venues.title')}</Text>
      <Text style={styles.intro}>{t('venues.intro')}</Text>
      {venues.map((venue) => (
        <VenueCard key={venue.name} venue={venue} t={t} locale={locale} />
      ))}
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
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  venueName: {
    fontSize: fonts.sizeLarge,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  address: {
    fontSize: fonts.sizeBody,
    color: colors.primary,
    textDecorationLine: 'underline',
    marginBottom: 8,
  },
  description: {
    fontSize: fonts.sizeBody,
    color: colors.textLight,
    lineHeight: 20,
    marginBottom: 10,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkChip: {
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkChipText: {
    fontSize: fonts.sizeSmall,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  reserveChip: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  reserveChipText: {
    fontSize: fonts.sizeSmall,
    color: colors.white,
    fontWeight: '700',
  },
});
