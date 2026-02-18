import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@/lib/theme';
import { DailyJournalEntry } from '@/lib/types';

interface DailyJournalSectionProps {
  entry: DailyJournalEntry | null;
  onSubmit: (win: string, tension: string, gratitude: string) => void;
}

export default function DailyJournalSection({
  entry,
  onSubmit,
}: DailyJournalSectionProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [win, setWin] = useState('');
  const [tension, setTension] = useState('');
  const [gratitude, setGratitude] = useState('');

  const isCompleted =
    entry !== null &&
    entry.win.trim() !== '' &&
    entry.tension.trim() !== '' &&
    entry.gratitude.trim() !== '';

  const handleOpen = () => {
    if (entry) {
      setWin(entry.win);
      setTension(entry.tension);
      setGratitude(entry.gratitude);
    } else {
      setWin('');
      setTension('');
      setGratitude('');
    }
    setModalVisible(true);
  };

  const canSave = win.trim() && tension.trim() && gratitude.trim();

  const handleSubmit = () => {
    if (!canSave) return;
    onSubmit(win.trim(), tension.trim(), gratitude.trim());
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Daily Journal</Text>
      <TouchableOpacity
        style={styles.card}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          <View
            style={[
              styles.iconCircle,
              isCompleted ? styles.iconCircleCompleted : styles.iconCircleIncomplete,
            ]}
          >
            {isCompleted ? (
              <FontAwesome name="check" size={10} color="#fff" />
            ) : (
              <FontAwesome name="book" size={11} color={theme.colors.primary} />
            )}
          </View>
          <View style={styles.textContainer}>
            <Text
              style={[styles.title, isCompleted && styles.titleCompleted]}
            >
              {isCompleted ? 'Journal completed' : 'Journal entry'}
            </Text>
            <Text style={styles.subtitle}>
              {isCompleted
                ? 'Tap to view or edit'
                : '1 win \u00B7 1 tension \u00B7 1 gratitude'}
            </Text>
          </View>
          <FontAwesome
            name="chevron-right"
            size={12}
            color={theme.colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Daily Journal</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={!canSave}>
              <Text
                style={[
                  styles.modalDone,
                  !canSave && styles.modalDoneDisabled,
                ]}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.promptGroup}>
              <View style={styles.promptLabelRow}>
                <Text style={styles.promptEmoji}>🏆</Text>
                <Text style={styles.promptLabel}>One Win</Text>
              </View>
              <Text style={styles.promptHint}>What went well today?</Text>
              <TextInput
                style={styles.promptInput}
                value={win}
                onChangeText={setWin}
                placeholder="I accomplished..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.promptGroup}>
              <View style={styles.promptLabelRow}>
                <Text style={styles.promptEmoji}>🔥</Text>
                <Text style={styles.promptLabel}>One Point of Tension</Text>
              </View>
              <Text style={styles.promptHint}>
                What challenged you today?
              </Text>
              <TextInput
                style={styles.promptInput}
                value={tension}
                onChangeText={setTension}
                placeholder="I struggled with..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.promptGroup}>
              <View style={styles.promptLabelRow}>
                <Text style={styles.promptEmoji}>🙏</Text>
                <Text style={styles.promptLabel}>One Gratitude</Text>
              </View>
              <Text style={styles.promptHint}>
                What are you grateful for?
              </Text>
              <TextInput
                style={styles.promptInput}
                value={gratitude}
                onChangeText={setGratitude}
                placeholder="I'm grateful for..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xs,
  },
  sectionLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleIncomplete: {
    backgroundColor: theme.colors.primaryLightOverlay25,
  },
  iconCircleCompleted: {
    backgroundColor: theme.colors.primary,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.textPrimary,
  },
  titleCompleted: {
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  subtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modalCancel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.textPrimary,
  },
  modalDone: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.primary,
  },
  modalDoneDisabled: {
    color: theme.colors.textMuted,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  promptGroup: {
    gap: theme.spacing.xs,
  },
  promptLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  promptEmoji: {
    fontSize: 20,
  },
  promptLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.textPrimary,
  },
  promptHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  promptInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    minHeight: 80,
    lineHeight: 22,
  },
});
