import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import OnboardingProgress from '@/components/OnboardingProgress';
import SignUpForm from '@/components/SignUpForm';
import { EVENTS, captureEvent } from '@/lib/analytics';

export default function OnboardingSignUpScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const startTime = useRef(Date.now());

  useEffect(() => {
    captureEvent(EVENTS.ONBOARDING_STEP_VIEWED, { step_name: 'signup', step_number: 2 });
  }, []);

  const handleSuccess = () => {
    captureEvent(EVENTS.ONBOARDING_STEP_COMPLETED, {
      step_name: 'signup',
      step_number: 2,
      duration_seconds: Math.round((Date.now() - startTime.current) / 1000),
    });
    router.replace('/(onboarding)/identity');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress current={2} total={5} />
      <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <View style={styles.successBadge}>
                <FontAwesome name="check-circle" size={20} color={colors.success} />
                <Text style={styles.successText}>Subscription activated!</Text>
              </View>
              <Text style={styles.title}>Create Your Account</Text>
              <Text style={styles.subtitle}>
                Save your progress and keep your data safe
              </Text>
            </View>

            <SignUpForm onSuccess={handleSuccess} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Pressable>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    successBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: colors.successLight,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      marginBottom: theme.spacing.md,
    },
    successText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: colors.success,
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
    },
  });
