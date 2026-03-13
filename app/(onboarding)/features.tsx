import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
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

  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [phoneInputFocused, setPhoneInputFocused] = useState(false);
  const phoneInputRef = useRef<TextInput>(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    captureEvent(EVENTS.ONBOARDING_STEP_VIEWED, { step_name: 'features', step_number: 5 });
  }, []);

  const hasPhoneNumber = phoneNumber.trim().length > 0;

  const completeOnboarding = async (enableCalls: boolean) => {
    if (!user) return;
    if (habits.length === 0) {
      Alert.alert('Missing Habits', 'Please add at least one habit to continue.');
      router.back();
      return;
    }

    if (enableCalls && hasPhoneNumber) {
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
        top3_todos_enabled: true,
        journal_enabled: true,
      });

      if (enableCalls && hasPhoneNumber) {
        const normalized = normalizePhoneNumber(phoneNumber.trim())!;
        await updateEveningCallPreferences(user.id, {
          phone_number: normalized,
          evening_call_enabled: true,
          evening_call_time: '20:00:00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }

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
        top3_todos_enabled: true,
        journal_enabled: true,
        evening_call_enabled: enableCalls && hasPhoneNumber,
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

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <FontAwesome name="phone" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Stay Accountable{'\n'}Every Night</Text>
          <Text style={styles.subtitle}>
            Get a nightly call from Thrive to reflect on your day.{'\n'}It updates your journal, habits, and intentions{'\n'}automatically — so you never fall off track.
          </Text>
        </View>

        <View style={styles.phoneSection}>
          <Text style={styles.phoneLabel}>Your Phone Number</Text>
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
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.enableButton, saving && styles.buttonDisabled]}
          onPress={() => completeOnboarding(true)}
          disabled={saving || !hasPhoneNumber}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.enableButtonText}>Enable Calls</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => completeOnboarding(false)}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Skip for Now</Text>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: theme.spacing.sm,
  },
  header: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLightOverlay30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  phoneSection: {
    gap: theme.spacing.sm,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
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
    paddingVertical: 14,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  actions: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  enableButton: {
    backgroundColor: colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 18,
    alignItems: 'center',
    ...theme.shadow.md,
  },
  enableButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  skipButton: {
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: colors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
