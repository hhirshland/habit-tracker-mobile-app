import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { useThemeColors } from '@/hooks/useTheme';
import { DailyJournalEntry } from '@/lib/types';

interface DailyJournalSectionProps {
  date: string;
  entry: DailyJournalEntry | null;
  onSubmit: (win: string, tension: string, gratitude: string) => void;
}

type Draft = { win: string; tension: string; gratitude: string };

const pendingDrafts = new Map<string, Draft>();

export default function DailyJournalSection({
  date,
  entry,
  onSubmit,
}: DailyJournalSectionProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [modalVisible, setModalVisible] = useState(false);
  const [win, setWin] = useState('');
  const [tension, setTension] = useState('');
  const [gratitude, setGratitude] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);
  const fieldOffsets = useRef<Record<string, number>>({});
  const fields = useRef({ win: '', tension: '', gratitude: '' });

  useEffect(() => {
    const draft = pendingDrafts.get(date);
    if (draft) {
      setWin(draft.win);
      setTension(draft.tension);
      setGratitude(draft.gratitude);
      fields.current = { ...draft };
    } else {
      const w = entry?.win ?? '';
      const t = entry?.tension ?? '';
      const g = entry?.gratitude ?? '';
      setWin(w);
      setTension(t);
      setGratitude(g);
      fields.current = { win: w, tension: t, gratitude: g };
    }
  }, [date, entry]);

  const saveDraft = useCallback(() => {
    const { win: w, tension: t, gratitude: g } = fields.current;
    const saved = { win: entry?.win ?? '', tension: entry?.tension ?? '', gratitude: entry?.gratitude ?? '' };
    if (w !== saved.win || t !== saved.tension || g !== saved.gratitude) {
      pendingDrafts.set(date, { win: w, tension: t, gratitude: g });
    } else {
      pendingDrafts.delete(date);
    }
  }, [date, entry]);

  const updateWin = useCallback((text: string) => {
    setWin(text);
    fields.current.win = text;
    saveDraft();
  }, [saveDraft]);

  const updateTension = useCallback((text: string) => {
    setTension(text);
    fields.current.tension = text;
    saveDraft();
  }, [saveDraft]);

  const updateGratitude = useCallback((text: string) => {
    setGratitude(text);
    fields.current.gratitude = text;
    saveDraft();
  }, [saveDraft]);

  const scrollToField = useCallback((field: string) => {
    setTimeout(() => {
      const y = fieldOffsets.current[field];
      if (y != null) {
        scrollViewRef.current?.scrollTo({ y, animated: true });
      }
    }, 350);
  }, []);

  const isCompleted =
    entry !== null &&
    entry.win.trim() !== '' &&
    entry.tension.trim() !== '' &&
    entry.gratitude.trim() !== '';

  const handleOpen = () => {
    setModalVisible(true);
  };

  const canSave = win.trim() && tension.trim() && gratitude.trim();

  const handleSubmit = () => {
    if (!canSave) return;
    pendingDrafts.delete(date);
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
              <FontAwesome name="book" size={11} color={colors.primary} />
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
            color={colors.textMuted}
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
          behavior={Platform.OS === 'android' ? 'height' : undefined}
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
            ref={scrollViewRef}
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
          >
            <View
              style={styles.promptGroup}
              onLayout={(e) => {
                fieldOffsets.current.win = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.promptLabelRow}>
                <Text style={styles.promptEmoji}>🏆</Text>
                <Text style={styles.promptLabel}>One Win</Text>
              </View>
              <Text style={styles.promptHint}>What went well today?</Text>
              <TextInput
                style={styles.promptInput}
                value={win}
                onChangeText={updateWin}
                placeholder="I accomplished..."
                placeholderTextColor={colors.textMuted}
                multiline
                scrollEnabled={false}
                maxLength={500}
                textAlignVertical="top"
                onFocus={() => scrollToField('win')}
              />
            </View>

            <View
              style={styles.promptGroup}
              onLayout={(e) => {
                fieldOffsets.current.tension = e.nativeEvent.layout.y;
              }}
            >
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
                onChangeText={updateTension}
                placeholder="I struggled with..."
                placeholderTextColor={colors.textMuted}
                multiline
                scrollEnabled={false}
                maxLength={500}
                textAlignVertical="top"
                onFocus={() => scrollToField('tension')}
              />
            </View>

            <View
              style={styles.promptGroup}
              onLayout={(e) => {
                fieldOffsets.current.gratitude = e.nativeEvent.layout.y;
              }}
            >
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
                onChangeText={updateGratitude}
                placeholder="I'm grateful for..."
                placeholderTextColor={colors.textMuted}
                multiline
                scrollEnabled={false}
                maxLength={500}
                textAlignVertical="top"
                onFocus={() => scrollToField('gratitude')}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function createStyles(colors: import('@/lib/theme').ThemeColors) {
  return StyleSheet.create({
    container: {
      marginBottom: theme.spacing.xs,
    },
    sectionLabel: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.semibold as any,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
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
      backgroundColor: colors.primaryLightOverlay25,
    },
    iconCircleCompleted: {
      backgroundColor: colors.primary,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold as any,
      color: colors.textPrimary,
    },
    titleCompleted: {
      color: colors.textMuted,
      textDecorationLine: 'line-through',
    },
    subtitle: {
      fontSize: theme.fontSize.xs,
      color: colors.textSecondary,
      marginTop: 1,
    },

    // Modal
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    modalCancel: {
      fontSize: theme.fontSize.md,
      color: colors.textSecondary,
    },
    modalTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold as any,
      color: colors.textPrimary,
    },
    modalDone: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold as any,
      color: colors.primary,
    },
    modalDoneDisabled: {
      color: colors.textMuted,
    },
    modalBody: {
      flex: 1,
    },
    modalBodyContent: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl * 3,
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
      color: colors.textPrimary,
    },
    promptHint: {
      fontSize: theme.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    promptInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.fontSize.md,
      color: colors.textPrimary,
      minHeight: 80,
      lineHeight: 22,
    },
  });
}
