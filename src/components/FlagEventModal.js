import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { colors, fonts } from '../utils/theme';
import { parseEventDate, formatDate } from '../utils/data';

const FLAG_URL =
  'https://event-submit-worker.terceriaevents.workers.dev/flag-event';

export default function FlagEventModal({
  visible,
  event,
  onClose,
  eventDateOverride,
}) {
  const [reason, setReason] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!event) return null;

  const date = parseEventDate(event.date);
  const formatted = date ? formatDate(date) : null;
  const dateStr = eventDateOverride
    ? eventDateOverride
    : formatted
      ? `${formatted.month} ${formatted.day}, ${formatted.year}`
      : '';

  const reset = () => {
    setReason('');
    setSubmitterName('');
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert(
        'Missing Details',
        'Please describe what needs to change about this event.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const eventDateIso =
        date ? date.toISOString().slice(0, 10) : undefined;
      const eventDateValue = eventDateOverride || eventDateIso;
      const response = await fetch(FLAG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: event.name,
          eventDate: eventDateValue,
          eventVenue: event.venue,
          reason: reason.trim(),
          submitterName: submitterName.trim() || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      Alert.alert(
        'Thank You!',
        'Your edit suggestion has been submitted for review.',
      );
      reset();
      onClose();
    } catch {
      Alert.alert(
        'Submission Failed',
        'Could not submit your suggestion. Please check your connection and try again.',
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.title}>Suggest an Edit</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={8}>
                <Text style={styles.closeX}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.eventBox}>
              <Text style={styles.eventName}>{event.name}</Text>
              {dateStr ? <Text style={styles.eventMeta}>{dateStr}</Text> : null}
              {event.venue ? <Text style={styles.eventMeta}>{event.venue}</Text> : null}
            </View>

            <Text style={styles.label}>
              What needs to change?
              <Text style={styles.required}> *</Text>
            </Text>
            <TextInput
              style={styles.textarea}
              value={reason}
              onChangeText={setReason}
              placeholder="Wrong time, wrong venue, cancelled, typo, missing details, etc."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <Text style={[styles.label, styles.labelSpaced]}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={submitterName}
              onChangeText={setSubmitterName}
              placeholder="Optional"
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitText}>Submit</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: fonts.sizeTitle,
    fontWeight: '700',
    color: colors.primary,
  },
  closeX: {
    fontSize: 22,
    color: colors.textLight,
    paddingHorizontal: 6,
  },
  eventBox: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  eventName: {
    fontSize: fonts.sizeMedium,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  eventMeta: {
    fontSize: fonts.sizeBody,
    color: colors.textLight,
  },
  label: {
    fontSize: fonts.sizeBody,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  labelSpaced: {
    marginTop: 16,
  },
  required: {
    color: colors.error,
  },
  textarea: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fonts.sizeBody,
    color: colors.text,
    minHeight: 110,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fonts.sizeBody,
    color: colors.text,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: colors.white,
    fontSize: fonts.sizeMedium,
    fontWeight: '700',
  },
});
