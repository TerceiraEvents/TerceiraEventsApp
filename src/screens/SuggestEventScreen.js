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

const SUBMIT_URL =
  'https://event-submit-worker.terceriaevents.workers.dev/submit-event';

const INITIAL_FORM = {
  eventName: '',
  date: '',
  time: '',
  venue: '',
  address: '',
  description: '',
  instagramLink: '',
  submitterName: '',
};

export default function SuggestEventScreen() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const missing = [];
    if (!form.eventName.trim()) missing.push('Event Name');
    if (!form.date.trim()) missing.push('Date');
    if (!form.venue.trim()) missing.push('Venue');
    if (missing.length > 0) {
      Alert.alert(
        'Required Fields',
        `Please fill in: ${missing.join(', ')}`,
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
          description: form.description.trim() || undefined,
          instagram: form.instagramLink.trim() || undefined,
          submitterName: form.submitterName.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      Alert.alert(
        'Thank You!',
        'Your event suggestion has been submitted for review.',
      );
      setForm(INITIAL_FORM);
    } catch {
      Alert.alert(
        'Submission Failed',
        'Could not submit your event suggestion. Please check your internet connection and try again.',
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
        <Text style={styles.header}>Suggest an Event</Text>
        <Text style={styles.intro}>
          Know about an event happening on Terceira? Submit it here and we will
          review it for inclusion in the app.
        </Text>

        <View style={styles.card}>
          <FormField
            label="Event Name"
            required
            value={form.eventName}
            onChangeText={(v) => updateField('eventName', v)}
            placeholder="e.g. Summer Jazz Festival"
          />

          <View style={styles.divider} />
          <FormField
            label="Date"
            required
            value={form.date}
            onChangeText={(v) => updateField('date', v)}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />

          <View style={styles.divider} />
          <FormField
            label="Time"
            value={form.time}
            onChangeText={(v) => updateField('time', v)}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
          />

          <View style={styles.divider} />
          <FormField
            label="Venue"
            required
            value={form.venue}
            onChangeText={(v) => updateField('venue', v)}
            placeholder="e.g. Praca de Toiros"
          />

          <View style={styles.divider} />
          <FormField
            label="Address"
            value={form.address}
            onChangeText={(v) => updateField('address', v)}
            placeholder="Street address or area"
          />

          <View style={styles.divider} />
          <FormField
            label="Description"
            value={form.description}
            onChangeText={(v) => updateField('description', v)}
            placeholder="Tell us about the event..."
            multiline
          />

          <View style={styles.divider} />
          <FormField
            label="Instagram Link"
            value={form.instagramLink}
            onChangeText={(v) => updateField('instagramLink', v)}
            placeholder="https://instagram.com/..."
            keyboardType="url"
            autoCapitalize="none"
          />

          <View style={styles.divider} />
          <FormField
            label="Your Name"
            value={form.submitterName}
            onChangeText={(v) => updateField('submitterName', v)}
            placeholder="For credit (optional)"
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
            <Text style={styles.submitButtonText}>Submit Event Suggestion</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          All submissions are reviewed before being published. We may edit
          details for clarity.
        </Text>
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
});
