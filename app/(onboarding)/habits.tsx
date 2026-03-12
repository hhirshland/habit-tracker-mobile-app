import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { captureEvent, EVENTS } from '@/lib/analytics';
import HabitForm from '@/components/HabitForm';
import OnboardingProgress from '@/components/OnboardingProgress';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { CATEGORY_ICONS } from '@/components/CategoryPicker';
import type { IdentityStatement } from '@/lib/types';
import type { SelectedIdentity } from './identity';

interface PendingHabit {
  id: string;
  name: string;
  description: string;
  frequency_per_week: number;
  specific_days: number[] | null;
  identity_id?: string;
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
  const [showForm, setShowForm] = useState(identities.length === 0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    captureEvent(EVENTS.ONBOARDING_STEP_VIEWED, { step_name: 'habits', step_number: 4 });
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          paddingHorizontal: theme.spacing.lg,
        },
        header: {
          alignItems: 'center',
          paddingTop: theme.spacing.xl,
          marginBottom: theme.spacing.lg,
        },
        suggestionsSection: {
          marginBottom: theme.spacing.lg,
        },
        identityHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.sm,
        },
        identityEmoji: {
          fontSize: 20,
        },
        identityLabel: {
          fontSize: theme.fontSize.md,
          fontWeight: theme.fontWeight.semibold,
          color: colors.textPrimary,
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
        identityBadge: {
          fontSize: 14,
          marginRight: 2,
        },
        emoji: {
          fontSize: 48,
          marginBottom: theme.spacing.md,
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
        sectionTitle: {
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.semibold,
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: theme.spacing.sm,
        },
        habitsList: {
          flex: 1,
          marginBottom: theme.spacing.md,
        },
        habitsScroll: {
          flex: 1,
        },
        habitsScrollContent: {
          paddingBottom: theme.spacing.sm,
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
        habitNameRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
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
        formContainer: {
          flex: 1,
        },
        actionsContainer: {
          gap: theme.spacing.md,
          paddingBottom: theme.spacing.md,
        },
        addMoreButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          paddingVertical: 16,
          borderRadius: theme.borderRadius.md,
          borderWidth: 2,
          borderColor: colors.primary,
          borderStyle: 'dashed',
        },
        addMoreText: {
          fontSize: theme.fontSize.md,
          fontWeight: theme.fontWeight.semibold,
          color: colors.primary,
        },
        finishButton: {
          backgroundColor: colors.primary,
          borderRadius: theme.borderRadius.md,
          paddingVertical: 16,
          alignItems: 'center',
          ...theme.shadow.md,
        },
        finishButtonText: {
          color: '#fff',
          fontSize: theme.fontSize.lg,
          fontWeight: theme.fontWeight.semibold,
        },
      }),
    [colors]
  );

  const addSuggestedHabit = (
    name: string,
    frequencyPerWeek: number,
    identityStatement: string,
  ) => {
    if (habits.some((h) => h.name === name)) return;
    const newHabit: PendingHabit = {
      id: Date.now().toString(),
      name,
      description: '',
      frequency_per_week: frequencyPerWeek,
      specific_days: null,
      identity_id: identityStatement,
    };
    setHabits((prev) => [...prev, newHabit]);
    captureEvent(EVENTS.ONBOARDING_HABIT_ADDED, {
      habit_name: name,
      has_health_metric: false,
      position: habits.length + 1,
    });
  };

  const handleAddHabit = (data: {
    name: string;
    description: string;
    frequency_per_week: number;
    specific_days: number[] | null;
  }) => {
    const newHabit: PendingHabit = {
      id: Date.now().toString(),
      ...data,
    };
    setHabits((prev) => [...prev, newHabit]);
    captureEvent(EVENTS.ONBOARDING_HABIT_ADDED, {
      habit_name: data.name,
      has_health_metric: false,
      position: habits.length + 1,
    });
    setShowForm(false);
  };

  const handleRemoveHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const handleFinish = () => {
    if (habits.length === 0) {
      Alert.alert('Add a Habit', 'Please add at least one habit to get started.');
      return;
    }

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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🎯</Text>
        <Text style={styles.title}>Set Up Your Habits</Text>
        <Text style={styles.subtitle}>
          Add the habits you want to track. You can always add more later.
        </Text>
      </View>

      {showForm ? (
        <View style={styles.formContainer}>
          <HabitForm
            onSubmit={handleAddHabit}
            onCancel={habits.length > 0 ? () => setShowForm(false) : undefined}
            submitLabel="Add Habit"
            identityStatements={tempIdentityStatements}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.habitsScroll}
          contentContainerStyle={styles.habitsScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {identities.length > 0 && (
            <View style={styles.suggestionsSection}>
              <Text style={styles.sectionTitle}>Suggested Habits</Text>
              {identities.map((identity) => {
                if (!identity.suggestedHabits?.length) return null;
                return (
                  <View key={identity.statement} style={{ marginBottom: theme.spacing.md }}>
                    <View style={styles.identityHeader}>
                      <FontAwesome
                        name={(CATEGORY_ICONS[identity.categoryId] ?? 'star') as any}
                        size={16}
                        color={colors.primary}
                      />
                      <Text style={styles.identityLabel}>{identity.statement}</Text>
                    </View>
                    <View style={styles.suggestedChips}>
                      {identity.suggestedHabits.map((sh) => {
                        const isAdded = habits.some((h) => h.name === sh.name);
                        return (
                          <TouchableOpacity
                            key={sh.name}
                            style={[
                              styles.suggestedChip,
                              isAdded && styles.suggestedChipAdded,
                            ]}
                            onPress={() =>
                              isAdded
                                ? handleRemoveHabit(
                                    habits.find((h) => h.name === sh.name)?.id ?? '',
                                  )
                                : addSuggestedHabit(
                                    sh.name,
                                    sh.frequency_per_week,
                                    identity.statement,
                                  )
                            }
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
                  </View>
                );
              })}
            </View>
          )}

          {habits.length > 0 && (
            <View style={styles.habitsList}>
              <Text style={styles.sectionTitle}>Your Habits ({habits.length})</Text>
              {habits.map((habit) => {
                const identityMatch = identities.find(
                  (i) => i.statement === habit.identity_id,
                );
                return (
                  <View key={habit.id} style={styles.habitCard}>
                    <View style={styles.habitInfo}>
                      <View style={styles.habitNameRow}>
                        {identityMatch && (
                          <FontAwesome
                            name={(CATEGORY_ICONS[identityMatch.categoryId] ?? 'star') as any}
                            size={14}
                            color={colors.primary}
                          />
                        )}
                        <Text style={styles.habitName}>{habit.name}</Text>
                      </View>
                      <Text style={styles.habitFrequency}>{getDaysLabel(habit)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveHabit(habit.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <FontAwesome name="times-circle" size={22} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={() => setShowForm(true)}
              activeOpacity={0.8}
            >
              <FontAwesome name="plus" size={16} color={colors.primary} />
              <Text style={styles.addMoreText}>Add Custom Habit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.finishButton}
              onPress={handleFinish}
              activeOpacity={0.8}
            >
              <Text style={styles.finishButtonText}>
                Continue ({habits.length} habit{habits.length !== 1 ? 's' : ''})
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
      </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

