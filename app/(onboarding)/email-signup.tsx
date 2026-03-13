import React, { useMemo, useRef } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import OnboardingProgress from '@/components/OnboardingProgress';
import SignUpForm from '@/components/SignUpForm';
import { EVENTS, captureEvent } from '@/lib/analytics';

export default function EmailSignUpScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const startTime = useRef(Date.now());

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
      <AppHeader title="Sign Up with Email" />
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
            <SignUpForm mode="email" onSuccess={handleSuccess} />
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
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
    },
  });
