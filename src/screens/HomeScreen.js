import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, fonts } from '../utils/theme';

const buttons = [
  { title: 'Weekly Events', subtitle: 'Recurring entertainment', screen: 'Weekly' },
  { title: 'Special Events', subtitle: "What's on this week", screen: 'Events' },
  { title: 'Venues', subtitle: 'Where to go', screen: 'Venues' },
  { title: 'Resources', subtitle: 'Other ways to find events', screen: 'Resources' },
];

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.title}>Angra Events</Text>
        <Text style={styles.subtitle}>What's happening in Angra do Heroísmo</Text>
      </View>

      <View style={styles.intro}>
        <Text style={styles.introText}>
          Terceira is known as "the amusement park" of the Azores — famous for
          its bullfights on a rope, vibrant festivals, live music, and cultural
          events year-round.
        </Text>
        <Text style={styles.introText}>
          This app helps you discover what's happening in Angra do Heroísmo,
          from weekly karaoke nights to special concerts and festivals.
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
        {buttons.map((btn) => (
          <TouchableOpacity
            key={btn.screen}
            style={styles.navButton}
            onPress={() => navigation.navigate(btn.screen)}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonTitle}>{btn.title}</Text>
            <Text style={styles.buttonSubtitle}>{btn.subtitle}</Text>
          </TouchableOpacity>
        ))}
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
  hero: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fonts.sizeMedium,
    color: 'rgba(255,255,255,0.85)',
  },
  intro: {
    padding: 20,
  },
  introText: {
    fontSize: fonts.sizeBody,
    color: colors.textLight,
    lineHeight: 22,
    marginBottom: 12,
  },
  buttonsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  navButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonTitle: {
    fontSize: fonts.sizeLarge,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: fonts.sizeBody,
    color: colors.textLight,
  },
});
