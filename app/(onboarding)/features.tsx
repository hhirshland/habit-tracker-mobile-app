import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';
import { EVENTS, captureEvent } from '@/lib/analytics';
import { createHabit } from '@/lib/habits';
import { supabase } from '@/lib/supabase';

interface PendingHabit {
  id: string;
  name: string;
  description: string;
  frequency_per_week: number;
  specific_days: number[] | null;
}

const TOP3_STORAGE_KEY = '@top_3_todos_enabled';
const JOURNAL_STORAGE_KEY = '@daily_journal_enabled';

function parseHabitsParam(rawHabits: string | string[] | undefined): PendingHabit[] {
  if (!rawHabits) return [];
  const value = Array.isArray(rawHabits) ? rawHabits[0] : rawHabits;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Invalid onboarding habits payload:', error);
    return [];
  }
}

export default function OnboardingFeaturesScreen() {
  const { user, refreshProfile } = useAuth();
  const params = useLocalSearchParams<{ habits?: string | string[] }>();
  const habits = useMemo(() => parseHabitsParam(params.habits), [params.habits]);

  const [top3TodosEnabled, setTop3TodosEnabled] = useState(false);
  const [journalEnabled, setJournalEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCompleteOnboarding = async () => {
    if (!user) return;
    if (habits.length === 0) {
      Alert.alert('Missing Habits', 'Please add at least one habit to continue.');
      router.back();
      return;
    }

    setSaving(true);
    try {
      await AsyncStorage.multiSet([
        [TOP3_STORAGE_KEY, top3TodosEnabled ? 'true' : 'false'],
        [JOURNAL_STORAGE_KEY, journalEnabled ? 'true' : 'false'],
      ]);

      for (const habit of habits) {
        await createHabit(user.id, {
          name: habit.name,
          description: habit.description || undefined,
          frequency_per_week: habit.frequency_per_week,
          specific_days: habit.specific_days,
        });
      }

      await supabase
        .from('profiles')
        .update({ has_onboarded: true })
        .eq('user_id', user.id);

      await refreshProfile();
      captureEvent(EVENTS.ONBOARDING_COMPLETED, {
        habits_count: habits.length,
        top3_todos_enabled: top3TodosEnabled,
        journal_enabled: journalEnabled,
      });
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to finish onboarding. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>✨</Text>
        <Text style={styles.title}>Choose Extra Features</Text>
        <Text style={styles.subtitle}>
          Turn on optional tools to help you focus and reflect. You can change these any time in
          Profile.
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.featureCard}>
          <View style={styles.featureTopRow}>
            <View style={styles.featureTitleRow}>
              <View style={styles.featureIcon}>
                <FontAwesome name="list-ol" size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.featureTitle}>Daily Top 3 Priorities</Text>
            </View>
            <Switch
              value={top3TodosEnabled}
              onValueChange={setTop3TodosEnabled}
              trackColor={{ false: theme.colors.borderLight, true: theme.colors.primaryLight }}
              thumbColor={top3TodosEnabled ? theme.colors.primary : '#f4f3f4'}
            />
          </View>
          <Text style={styles.featureDescription}>
            Each day, pick the three most important tasks you want to finish. Your Top 3 appear on
            your home screen so your focus is clear before everything else.
          </Text>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureTopRow}>
            <View style={styles.featureTitleRow}>
              <View style={styles.featureIcon}>
                <FontAwesome name="book" size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.featureTitle}>Daily Journal</Text>
            </View>
            <Switch
              value={journalEnabled}
              onValueChange={setJournalEnabled}
              trackColor={{ false: theme.colors.borderLight, true: theme.colors.primaryLight }}
              thumbColor={journalEnabled ? theme.colors.primary : '#f4f3f4'}
            />
          </View>
          <Text style={styles.featureDescription}>
            End your day with a quick reflection: one win, one tension, and one gratitude. This
            simple practice helps you notice progress and patterns over time.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
          disabled={saving}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueButton, saving && styles.buttonDisabled]}
          onPress={handleCompleteOnboarding}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
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
    fontSize: 44,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  featureCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  featureTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.sm,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight + '30',
  },
  featureTitle: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  featureDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  backButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  continueButton: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    ...theme.shadow.md,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
