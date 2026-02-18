import React, { useEffect, useState } from 'react';
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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';
import { EVENTS, captureEvent } from '@/lib/analytics';
import HabitForm from '@/components/HabitForm';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface PendingHabit {
  id: string;
  name: string;
  description: string;
  frequency_per_week: number;
  specific_days: number[] | null;
}

export default function OnboardingScreen() {
  const [habits, setHabits] = useState<PendingHabit[]>([]);
  const [showForm, setShowForm] = useState(true);

  useEffect(() => {
    captureEvent(EVENTS.ONBOARDING_STARTED);
  }, []);

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

    router.push({
      pathname: '/(onboarding)/features',
      params: {
        habits: JSON.stringify(habits),
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
          />
        </View>
      ) : (
        <>
          {habits.length > 0 && (
            <View style={styles.habitsList}>
              <Text style={styles.sectionTitle}>Your Habits ({habits.length})</Text>
              <ScrollView
                style={styles.habitsScroll}
                contentContainerStyle={styles.habitsScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {habits.map((habit) => (
                  <View key={habit.id} style={styles.habitCard}>
                    <View style={styles.habitInfo}>
                      <View style={styles.habitNameRow}>
                        <Text style={styles.habitName}>{habit.name}</Text>
                      </View>
                      <Text style={styles.habitFrequency}>{getDaysLabel(habit)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveHabit(habit.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <FontAwesome name="times-circle" size={22} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={() => setShowForm(true)}
              activeOpacity={0.8}
            >
              <FontAwesome name="plus" size={16} color={theme.colors.primary} />
              <Text style={styles.addMoreText}>Add Another Habit</Text>
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
        </>
      )}
      </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  emoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.textPrimary,
  },
  habitFrequency: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
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
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  addMoreText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  finishButton: {
    backgroundColor: theme.colors.primary,
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
});
