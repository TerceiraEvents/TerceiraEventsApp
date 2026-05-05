import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, fonts } from '../utils/theme';
import { TAGS, getTagMeta } from '../utils/tags';
import { useLocale } from '../i18n';

const SUBMIT_URL =
  'https://event-submit-worker.terceriaevents.workers.dev/submit-event';

const INITIAL_FORM = {
  eventName: '',
  date: '',
  time: '',
  venue: '',
  address: '',
  mapUrl: '',
  description: '',
  instagramLink: '',
  imageUrl: '',
  submitterName: '',
  tags: [],
};

export default function SuggestEventScreen() {
  const { t } = useLocale();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleTag = (slug) => {
    setForm((prev) => {
      const has = prev.tags.includes(slug);
      return {
        ...prev,
        tags: has
          ? prev.tags.filter((s) => s !== slug)
          : [...prev.tags, slug],
      };
    });
  };

  const validate = () => {
    const missing = [];
    if (!form.eventName.trim()) missing.push(t('suggest.fields.name'));
    if (!form.date.trim()) missing.push(t('suggest.fields.date'));
    if (!form.venue.trim()) missing.push(t('suggest.fields.venue'));
    if (missing.length > 0) {
      Alert.alert(
        t('suggest.alerts.requiredTitle'),
        t('suggest.alerts.requiredBody', { missing: missing.join(', ') }),
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.eventName.trim(),
          date: form.date.trim(),
          time: form.time.trim() || undefined,
          venue: form.venue.trim(),
          address: form.address.trim() || undefined,
          map_url: form.mapUrl.trim() || undefined,
          description: form.description.trim() || undefined,
          instagram: form.instagramLink.trim() || undefined,
          image: form.imageUrl.trim() || undefined,
          tags: form.tags.length ? form.tags : undefined,
          submitterName: form.submitterName.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      Alert.alert(
        t('suggest.alerts.successTitle'),
        t('suggest.alerts.successBody'),
      );
      setForm(INITIAL_FORM);
    } catch {
      Alert.alert(
        t('suggest.alerts.failTitle'),
        t('suggest.alerts.failBody'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.header}>{t('suggest.title')}</Text>
        <Text style={styles.intro}>{t('suggest.intro')}</Text>

        <View style={styles.card}>
          <FormField
            label={t('suggest.fields.name')}
            required
            value={form.eventName}
            onChangeText={(v) => updateField('eventName', v)}
            placeholder={t('suggest.fields.namePlaceholder')}
          />

          <View style={styles.divider} />
          <FormField
            label={t('suggest.fields.date')}
            required
            value={form.date}
            onChangeText={(v) => updateField('date', v)}
            placeholder={t('suggest.fields.datePlaceholder')}
            keyboardType="numbers-and-punctuation"
          />

          <View style={styles.divider} />
          <FormField
            label={t('suggest.fields.time')}
            value={form.time}
            onChangeText={(v) => updateField('time', v)}
            placeholder={t('suggest.fields.timePlaceholder')}
            keyboardType="numbers-and-punctuation"
          />

          <View style={styles.divider} />
          <FormField
            label={t('suggest.fields.venue')}
            required
            value={form.venue}
            onChangeText={(v) => updateField('venue', v)}
            placeholder={t('suggest.fields.venuePlaceholder')}
          />

          <View style={styles.divider} />
          <FormField
            label={t('suggest.fields.address')}
            value={form.address}
            onChangeText={(v) => updateField('address', v)}
            placeholder={t('suggest.fields.addressPlaceholder')}
          />

          <View style={styles.divider} />
          <FormField
            label={t('suggest.fields.mapsLink')}
            value={form.mapUrl}
            onChangeText={(v) => updateField('mapUrl', v)}
            placeholder="https://maps.app.goo.gl/..."
            keyboardType="url"
            autoCapitalize="none"
          />
          <Text style={styles.hint}>{t('suggest.fields.mapsHint')}</Text>

          <View style={styles.divider} />
          <FormField
            label={t('suggest.fields.description')}
            value={form.description}
            onChangeText={(v) => updateField('description', v)}
            placeholder={t('suggest.fields.descriptionPlaceholder')}
            multiline
          />

          <View style={styles.divider} />
          <FormField
            label={t('suggest.fields.instagram')}
            value={form.instagramLink}
            onChangeText={(v) => updateField('instagramLink', v)}
            placeholder="https://instagram.com/..."
            keyboardType="url"
            autoCapitalize="none"
          />

          <View style={styles.divider} />
          <FormField
            label={t('suggest.fields.imageUrl')}
            value={form.imageUrl}
            onChangeText={(v) => updateField('imageUrl', v)}
            placeholder="https://..."
            keyboardType="url"
            autoCapitalize="none"
          />
          <Text style={styles.hint}>{t('suggest.fields.imageUrlHint')}</Text>

          <View style={styles.divider} />
          <View>
            <Text style={styles.label}>{t('suggest.fields.tags')}</Text>
            <Text style={styles.hint}>{t('suggest.fields.tagsHint')}</Text>
            <View style={styles.tagChipsRow}>
              {TAGS.map((tag) => {
                const meta = getTagMeta(tag.slug);
                const active = form.tags.includes(tag.slug);
                return (
                  <TouchableOpacity
                    key={tag.slug}
                    style={[styles.tagChip, active && styles.tagChipActive]}
                    onPress={() => toggleTag(tag.slug)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        active && styles.tagChipTextActive,
                      ]}
                    >
                      {tag.emoji} {meta.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.divider} />
          <FormField
            label={t('suggest.fields.yourName')}
            value={form.submitterName}
            onChangeText={(v) => updateField('submitterName', v)}
            placeholder={t('suggest.fields.yourNamePlaceholder')}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.7}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>{t('suggest.submit')}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>{t('suggest.disclaimer')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({
  label,
  required,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
}) {
  return (
    <View>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    fontSize: fonts.sizeHeader,
    fontWeight: '700',
    color: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 8,
  },
  intro: {
    fontSize: fonts.sizeBody,
    color: colors.textLight,
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 16,
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  label: {
    fontSize: fonts.sizeBody,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fonts.sizeBody,
    color: colors.text,
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: 10,
  },
  submitButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: fonts.sizeLarge,
    fontWeight: '700',
    color: colors.white,
  },
  disclaimer: {
    fontSize: fonts.sizeSmall,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 16,
    lineHeight: 18,
  },
  hint: {
    fontSize: fonts.sizeSmall,
    color: colors.textMuted,
    marginTop: 4,
  },
  tagChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagChipText: {
    fontSize: fonts.sizeSmall,
    color: colors.textLight,
    fontWeight: '600',
  },
  tagChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
});
