import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  ScrollView,
  Keyboard,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { EVENTS, captureEvent } from '@/lib/analytics';
import { createHabit } from '@/lib/habits';
import { createIdentityStatements } from '@/lib/identityStatements';
import { supabase } from '@/lib/supabase';
import { normalizePhoneNumber, updateEveningCallPreferences } from '@/lib/eveningCalls';
import OnboardingProgress from '@/components/OnboardingProgress';
import SaveContactButton from '@/components/SaveContactButton';

interface PendingHabit {
  id: string;
  name: string;
  description: string;
  frequency_per_week: number;
  specific_days: number[] | null;
  identity_id?: string;
}

interface OnboardingIdentity {
  statement: string;
  emoji: string;
  categoryId: string;
  suggestedHabits: Array<{ name: string; frequency_per_week: number }>;
  isCustom: boolean;
}

function parseJsonParam<T>(raw: string | string[] | undefined): T[] {
  if (!raw) return [];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function OnboardingFeaturesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, refreshProfile } = useAuth();
  const { updateSettings } = useUserSettings();
  const params = useLocalSearchParams<{ habits?: string | string[]; identities?: string | string[] }>();
  const habits = useMemo(() => parseJsonParam<PendingHabit>(params.habits), [params.habits]);
  const identities = useMemo(() => parseJsonParam<OnboardingIdentity>(params.identities), [params.identities]);

  const [top3TodosEnabled, setTop3TodosEnabled] = useState(false);
  const [journalEnabled, setJournalEnabled] = useState(false);
  const [eveningCallEnabled, setEveningCallEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [phoneInputFocused, setPhoneInputFocused] = useState(false);
  const phoneInputRef = useRef<TextInput>(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    captureEvent(EVENTS.ONBOARDING_STEP_VIEWED, { step_name: 'features', step_number: 5 });
  }, []);

  const handleCompleteOnboarding = async () => {
    if (!user) return;
    if (habits.length === 0) {
      Alert.alert('Missing Habits', 'Please add at least one habit to continue.');
      router.back();
      return;
    }

    if (eveningCallEnabled && phoneNumber.trim()) {
      const normalized = normalizePhoneNumber(phoneNumber.trim());
      if (!normalized) {
        Alert.alert(
          'Invalid Phone Number',
          'Please enter a valid US phone number for the evening check-in call.',
        );
        return;
      }
    }

    setSaving(true);
    try {
      await updateSettings({
        top3_todos_enabled: top3TodosEnabled,
        journal_enabled: journalEnabled,
      });

      if (eveningCallEnabled && phoneNumber.trim()) {
        const normalized = normalizePhoneNumber(phoneNumber.trim())!;
        await updateEveningCallPreferences(user.id, {
          phone_number: normalized,
          evening_call_enabled: true,
          evening_call_time: '20:00:00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }

      // Create identity statements and build a lookup for linking habits
      const identityLookup = new Map<string, string>();
      if (identities.length > 0) {
        const created = await createIdentityStatements(
          user.id,
          identities.map((identity, index) => ({
            statement: identity.statement,
            emoji: identity.emoji,
            sort_order: index,
          })),
        );
        for (const record of created) {
          identityLookup.set(record.statement, record.id);
        }
      }

      for (const habit of habits) {
        const identityStatementId = habit.identity_id
          ? identityLookup.get(habit.identity_id) ?? null
          : null;
        await createHabit(user.id, {
          name: habit.name,
          description: habit.description || undefined,
          frequency_per_week: habit.frequency_per_week,
          specific_days: habit.specific_days,
          identity_statement_id: identityStatementId,
        });
      }

      await supabase
        .from('profiles')
        .update({ has_onboarded: true })
        .eq('user_id', user.id);

      await refreshProfile();
      captureEvent(EVENTS.ONBOARDING_STEP_COMPLETED, {
        step_name: 'features',
        step_number: 5,
        duration_seconds: Math.round((Date.now() - startTime.current) / 1000),
      });
      captureEvent(EVENTS.ONBOARDING_COMPLETED, {
        habits_count: habits.length,
        top3_todos_enabled: top3TodosEnabled,
        journal_enabled: journalEnabled,
        evening_call_enabled: eveningCallEnabled,
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
      <OnboardingProgress current={5} total={5} />
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
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.featureCard}>
          <View style={styles.featureTopRow}>
            <View style={styles.featureTitleRow}>
              <View style={styles.featureIcon}>
                <FontAwesome name="list-ol" size={18} color={colors.primary} />
              </View>
              <Text style={styles.featureTitle}>Daily Intentions</Text>
            </View>
            <Switch
              value={top3TodosEnabled}
              onValueChange={setTop3TodosEnabled}
              trackColor={{ false: colors.borderLight, true: colors.primaryLight }}
              thumbColor="#f4f3f4"
            />
          </View>
          <Text style={styles.featureDescription}>
            Start each morning by choosing the three things that matter most. Your intentions appear
            on your home screen — a daily practice of living with purpose.
          </Text>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureTopRow}>
            <View style={styles.featureTitleRow}>
              <View style={styles.featureIcon}>
                <FontAwesome name="book" size={18} color={colors.primary} />
              </View>
              <Text style={styles.featureTitle}>Daily Journal</Text>
            </View>
            <Switch
              value={journalEnabled}
              onValueChange={setJournalEnabled}
              trackColor={{ false: colors.borderLight, true: colors.primaryLight }}
              thumbColor="#f4f3f4"
            />
          </View>
          <Text style={styles.featureDescription}>
            End your day with a quick reflection: one win, one tension, and one gratitude. This
            simple practice helps you notice progress and patterns over time.
          </Text>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureTopRow}>
            <View style={styles.featureTitleRow}>
              <View style={styles.featureIcon}>
                <FontAwesome name="phone" size={18} color={colors.primary} />
              </View>
              <Text style={styles.featureTitle}>Evening Check-In Call</Text>
            </View>
            <Switch
              value={eveningCallEnabled}
              onValueChange={setEveningCallEnabled}
              trackColor={{ false: colors.borderLight, true: colors.primaryLight }}
              thumbColor="#f4f3f4"
            />
          </View>
          <Text style={styles.featureDescription}>
            Get a nightly call from Thrive to reflect on your day. It automatically updates your
            journal, habits, and todos in the app for you.
          </Text>
          {eveningCallEnabled && (
            <View style={styles.phoneField}>
              <Text style={styles.phoneLabel}>Phone Number</Text>
              <View style={styles.phoneInputRow}>
                <TextInput
                  ref={phoneInputRef}
                  style={[styles.phoneInput, styles.phoneInputFlex]}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={colors.textMuted}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  onFocus={() => setPhoneInputFocused(true)}
                  onBlur={() => setPhoneInputFocused(false)}
                />
                {phoneInputFocused && (
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => Keyboard.dismiss()}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
              <SaveContactButton compact />
            </View>
          )}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  emoji: {
    fontSize: 44,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.primaryLightOverlay30,
  },
  featureTitle: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.textPrimary,
  },
  featureDescription: {
    fontSize: theme.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  phoneField: {
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
  },
  phoneLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: colors.textPrimary,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  phoneInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: theme.fontSize.md,
    color: colors.textPrimary,
  },
  phoneInputFlex: {
    flex: 1,
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
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
    borderColor: colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  backButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.textSecondary,
  },
  continueButton: {
    flex: 2,
    backgroundColor: colors.primary,
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
