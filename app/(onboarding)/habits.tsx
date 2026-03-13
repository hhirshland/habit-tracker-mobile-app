import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { captureEvent, EVENTS } from '@/lib/analytics';
import HabitForm from '@/components/HabitForm';
import AppHeader from '@/components/AppHeader';
import OnboardingProgress from '@/components/OnboardingProgress';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { CATEGORY_ICONS } from '@/components/CategoryPicker';
import type { IdentityStatement } from '@/lib/types';
import type { SelectedIdentity } from './identity';
import { getSuggestedHabitsForCategory, type SuggestedHabit } from '@/lib/identityTemplates';

interface PendingHabit {
  id: string;
  name: string;
  description: string;
  frequency_per_week: number;
  specific_days: number[] | null;
  identity_id?: string;
}

interface FormModal {
  visible: boolean;
  identityId: string | null;
  prefill: { name: string; frequency_per_week: number } | null;
}

function parseIdentitiesParam(raw: string | string[] | undefined): SelectedIdentity[] {
  if (!raw) return [];
  const value = Array.isArray(raw) ? raw[0] : raw;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function OnboardingHabitsScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{
    identities?: string;
    experience?: string;
    challenge?: string;
    archetype?: string;
  }>();
  const identities = useMemo(() => parseIdentitiesParam(params.identities), [params.identities]);
  const tempIdentityStatements: IdentityStatement[] = useMemo(
    () =>
      identities.map((identity, i) => ({
        id: identity.statement,
        user_id: '',
        statement: identity.statement,
        emoji: identity.emoji,
        sort_order: i,
        is_active: true,
        created_at: '',
        updated_at: '',
      })),
    [identities],
  );
  const [habits, setHabits] = useState<PendingHabit[]>([]);
  const [formModal, setFormModal] = useState<FormModal>({
    visible: false,
    identityId: null,
    prefill: null,
  });
  const startTime = useRef(Date.now());

  useEffect(() => {
    captureEvent(EVENTS.ONBOARDING_STEP_VIEWED, { step_name: 'habits', step_number: 4 });
  }, []);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const getSuggestions = useCallback(
    (identity: SelectedIdentity): SuggestedHabit[] => {
      if (identity.suggestedHabits?.length) return identity.suggestedHabits;
      return getSuggestedHabitsForCategory(identity.categoryId);
    },
    [],
  );

  const openForm = useCallback(
    (identityStatement: string, prefill?: { name: string; frequency_per_week: number }) => {
      setFormModal({
        visible: true,
        identityId: identityStatement,
        prefill: prefill ?? null,
      });
    },
    [],
  );

  const closeForm = useCallback(() => {
    setFormModal({ visible: false, identityId: null, prefill: null });
  }, []);

  const handleAddHabit = useCallback(
    (data: {
      name: string;
      description: string;
      frequency_per_week: number;
      specific_days: number[] | null;
      identity_statement_id: string | null;
    }) => {
      const newHabit: PendingHabit = {
        id: Date.now().toString(),
        name: data.name,
        description: data.description,
        frequency_per_week: data.frequency_per_week,
        specific_days: data.specific_days,
        identity_id: data.identity_statement_id ?? formModal.identityId ?? undefined,
      };
      setHabits((prev) => [...prev, newHabit]);
      captureEvent(EVENTS.ONBOARDING_HABIT_ADDED, {
        habit_name: data.name,
        has_health_metric: false,
        position: habits.length + 1,
      });
      closeForm();
    },
    [formModal.identityId, habits.length, closeForm],
  );

  const handleRemoveHabit = useCallback((id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const handleFinish = () => {
    if (habits.length === 0) {
      Alert.alert('Add a Habit', 'Please add at least one habit to get started.');
      return;
    }

    const identitiesWithoutHabits = identities.filter(
      (identity) => !habits.some((h) => h.identity_id === identity.statement),
    );

    if (identitiesWithoutHabits.length > 0) {
      Alert.alert(
        'Missing Habits',
        'We recommend adding at least one habit per identity. Continue anyway?',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Continue Anyway', onPress: navigateToFeatures },
        ],
      );
      return;
    }

    navigateToFeatures();
  };

  const navigateToFeatures = () => {
    captureEvent(EVENTS.ONBOARDING_STEP_COMPLETED, {
      step_name: 'habits',
      step_number: 4,
      duration_seconds: Math.round((Date.now() - startTime.current) / 1000),
    });
    router.push({
      pathname: '/(onboarding)/features',
      params: {
        habits: JSON.stringify(habits),
        identities: params.identities ?? '[]',
        experience: params.experience ?? 'beginner',
        challenge: params.challenge ?? 'motivation',
      },
    });
  };

  const getDaysLabel = (habit: PendingHabit) => {
    if (habit.specific_days && habit.specific_days.length > 0) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return habit.specific_days.map((d) => dayNames[d]).join(', ');
    }
    return `${habit.frequency_per_week}x per week`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress current={4} total={5} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Set Up Your Habits</Text>
          <Text style={styles.subtitle}>
            Add at least one habit per identity.{'\n'}You can always adjust later.
          </Text>
        </View>

        {identities.map((identity) => {
          const identityHabits = habits.filter((h) => h.identity_id === identity.statement);
          const suggestions = getSuggestions(identity);
          const iconName = CATEGORY_ICONS[identity.categoryId] ?? 'star';

          return (
            <View key={identity.statement} style={styles.identitySection}>
              <View style={styles.identityHeader}>
                <View style={styles.identityIconCircle}>
                  <FontAwesome name={iconName as any} size={16} color={colors.primary} />
                </View>
                <Text style={styles.identityLabel}>{identity.statement}</Text>
              </View>

              {identityHabits.map((habit) => (
                <View key={habit.id} style={styles.habitCard}>
                  <View style={styles.habitInfo}>
                    <Text style={styles.habitName}>{habit.name}</Text>
                    <Text style={styles.habitFrequency}>{getDaysLabel(habit)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveHabit(habit.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <FontAwesome name="times-circle" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addHabitButton}
                onPress={() => openForm(identity.statement)}
                activeOpacity={0.8}
              >
                <FontAwesome name="plus" size={14} color={colors.primary} />
                <Text style={styles.addHabitText}>Add Habit</Text>
              </TouchableOpacity>

              {suggestions.length > 0 && (
                <View style={styles.suggestedChips}>
                  {suggestions.map((sh) => {
                    const isAdded = habits.some((h) => h.name === sh.name);
                    return (
                      <TouchableOpacity
                        key={sh.name}
                        style={[
                          styles.suggestedChip,
                          isAdded && styles.suggestedChipAdded,
                        ]}
                        onPress={() => {
                          if (isAdded) {
                            const match = habits.find((h) => h.name === sh.name);
                            if (match) handleRemoveHabit(match.id);
                          } else {
                            openForm(identity.statement, {
                              name: sh.name,
                              frequency_per_week: sh.frequency_per_week,
                            });
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <FontAwesome
                          name={isAdded ? 'check' : 'plus'}
                          size={12}
                          color={isAdded ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.suggestedChipText,
                            isAdded && styles.suggestedChipTextAdded,
                          ]}
                        >
                          {sh.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.finishButton, habits.length === 0 && styles.finishButtonDisabled]}
          onPress={handleFinish}
          disabled={habits.length === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.finishButtonText}>
            Continue{habits.length > 0 ? ` (${habits.length} habit${habits.length !== 1 ? 's' : ''})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={formModal.visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <AppHeader title="Add Habit" onBack={closeForm} />
          <View style={styles.modalFormContent}>
          <HabitForm
            key={`${formModal.identityId}-${formModal.prefill?.name ?? 'new'}`}
            initialData={
              formModal.prefill
                ? {
                    name: formModal.prefill.name,
                    frequency_per_week: formModal.prefill.frequency_per_week,
                    identity_statement_id: formModal.identityId,
                  }
                : { identity_statement_id: formModal.identityId }
            }
            onSubmit={handleAddHabit}
            onCancel={closeForm}
            submitLabel="Add Habit"
            showDescription={false}
            identityStatements={tempIdentityStatements}
            defaultIdentityId={formModal.identityId}
          />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    header: {
      alignItems: 'center',
      paddingTop: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: theme.fontSize.xxl,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    identitySection: {
      marginBottom: theme.spacing.xl,
    },
    identityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    identityIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primaryLightOverlay30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    identityLabel: {
      flex: 1,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textPrimary,
    },
    habitCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    habitInfo: {
      flex: 1,
    },
    habitName: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textPrimary,
    },
    habitFrequency: {
      fontSize: theme.fontSize.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    addHabitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingVertical: 14,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1.5,
      borderColor: colors.primary,
      marginBottom: theme.spacing.sm,
    },
    addHabitText: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: colors.primary,
    },
    suggestedChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    suggestedChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs + 2,
    },
    suggestedChipAdded: {
      backgroundColor: colors.primaryLightOverlay15,
      borderColor: colors.primary,
    },
    suggestedChipText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
      color: colors.textPrimary,
    },
    suggestedChipTextAdded: {
      color: colors.primary,
    },
    bottom: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
    },
    finishButton: {
      backgroundColor: colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: 16,
      alignItems: 'center',
      ...theme.shadow.md,
    },
    finishButtonDisabled: {
      opacity: 0.5,
    },
    finishButtonText: {
      color: '#fff',
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalFormContent: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
  });
