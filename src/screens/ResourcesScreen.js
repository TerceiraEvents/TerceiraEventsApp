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
import { resources, instagramAccounts, facebookPages } from '../utils/data';
import { useLocale } from '../i18n';
import { localizedField } from '../utils/i18nFields';

export default function ResourcesScreen() {
  const { t, locale } = useLocale();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>{t('resources.title')}</Text>
      <Text style={styles.intro}>{t('resources.intro')}</Text>

      {resources.map((r) => (
        <TouchableOpacity
          key={r.name}
          style={styles.card}
          onPress={() => Linking.openURL(r.url)}
          activeOpacity={0.7}
        >
          <Text style={styles.resourceName}>{r.name}</Text>
          <Text style={styles.resourceDesc}>
            {localizedField(r, 'description', locale)}
          </Text>
          {r.appStore && (
            <TouchableOpacity
              onPress={() => Linking.openURL(r.appStore)}
              style={styles.appStoreButton}
            >
              <Text style={styles.appStoreText}>{t('resources.appStore')}</Text>
            </TouchableOpacity>
          )}
          {r.playStore && (
            <TouchableOpacity
              onPress={() => Linking.openURL(r.playStore)}
              style={styles.appStoreButton}
            >
              <Text style={styles.appStoreText}>
                {t('resources.playStore')}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>{t('resources.instagramTitle')}</Text>
      <Text style={styles.sectionIntro}>{t('resources.instagramIntro')}</Text>
      <View style={styles.socialList}>
        {instagramAccounts.map((a) => (
          <TouchableOpacity
            key={a.handle}
            style={styles.socialItem}
            onPress={() => Linking.openURL(a.url)}
          >
            <Text style={styles.socialHandle}>{a.handle}</Text>
            <Text style={styles.socialLabel}>
              {localizedField(a, 'label', locale)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t('resources.facebookTitle')}</Text>
      <Text style={styles.sectionIntro}>{t('resources.facebookIntro')}</Text>
      <View style={styles.socialList}>
        {facebookPages.map((p) => (
          <TouchableOpacity
            key={p.name}
            style={styles.socialItem}
            onPress={() => Linking.openURL(p.url)}
          >
            <Text style={styles.socialHandle}>{p.name}</Text>
            <Text style={styles.socialLabel}>
              {localizedField(p, 'label', locale)}
            </Text>
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
  resourceName: {
    fontSize: fonts.sizeMedium,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  resourceDesc: {
    fontSize: fonts.sizeBody,
    color: colors.textLight,
    lineHeight: 20,
  },
  appStoreButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  appStoreText: {
    fontSize: fonts.sizeSmall,
    color: colors.white,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: fonts.sizeTitle,
    fontWeight: '700',
    color: colors.primary,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 4,
  },
  sectionIntro: {
    fontSize: fonts.sizeBody,
    color: colors.textLight,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  socialList: {
    paddingHorizontal: 16,
  },
  socialItem: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  socialHandle: {
    fontSize: fonts.sizeBody,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  socialLabel: {
    fontSize: fonts.sizeSmall,
    color: colors.textLight,
    flex: 1,
  },
});
