import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/contexts/AuthContext';
import { EVENTS, captureEvent } from '@/lib/analytics';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import OnboardingProgress from '@/components/OnboardingProgress';
import ThriveLogo from '@/components/ThriveLogo';


export default function SignUpScreen() {
  const colors = useThemeColors();
  const { signUp } = useAuth();
  const params = useLocalSearchParams<{
    goals?: string;
    experience?: string;
    challenge?: string;
  }>();
  const isPostPurchase = !!(params.goals || params.experience || params.challenge);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);


  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      Alert.alert('Error', 'Password must include at least one uppercase letter and one number');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);

    if (error) {
      Alert.alert('Sign Up Failed', error.message);
    } else {
      captureEvent(EVENTS.USER_SIGNED_UP, { method: 'email' });
      if (isPostPurchase) {
        router.replace({
          pathname: '/(onboarding)/habits',
          params: {
            goals: params.goals ?? '[]',
            experience: params.experience ?? 'beginner',
            challenge: params.challenge ?? 'motivation',
          },
        });
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {isPostPurchase && <OnboardingProgress current={6} total={7} />}
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
            {isPostPurchase ? (
              <>
                <View style={styles.successBadge}>
                  <FontAwesome name="check-circle" size={20} color={colors.success} />
                  <Text style={styles.successText}>Subscription activated!</Text>
                </View>
                <Text style={styles.title}>One last step</Text>
                <Text style={styles.subtitle}>
                  Create an account to keep your progress safe
                </Text>
              </>
            ) : (
              <>
                <View style={styles.wordmarkRow}>
                  <ThriveLogo size={40} style={{ marginRight: 10 }} />
                  <Text style={styles.wordmark}>Thrive</Text>
                </View>
                <Text style={styles.title}>Get Started</Text>
                <Text style={styles.subtitle}>
                  Create an account to start building better habits
                </Text>
              </>
            )}
          </View>

          {isPostPurchase && (
            <View style={styles.benefits}>
              {[
                { icon: 'refresh' as const, text: 'Sync across all your devices' },
                { icon: 'shield' as const, text: 'Never lose your habits or streaks' },
                { icon: 'bar-chart' as const, text: 'Unlock personalized insights' },
              ].map((item, i) => (
                <View key={i} style={styles.benefitRow}>
                  <View style={styles.benefitIcon}>
                    <FontAwesome name={item.icon} size={14} color={colors.primary} />
                  </View>
                  <Text style={styles.benefitText}>{item.text}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter a password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <Text style={styles.passwordHint}>
                At least 8 characters, 1 uppercase letter, 1 number
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity>
                  <Text style={styles.linkText}>Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
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
    wordmarkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    wordmark: {
      fontSize: theme.fontSize.xxxl,
      fontWeight: theme.fontWeight.bold,
      color: colors.primary,
      letterSpacing: -0.5,
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
      fontSize: theme.fontSize.xxxl,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    benefits: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    benefitIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primaryLightOverlay15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    benefitText: {
      fontSize: theme.fontSize.md,
      color: colors.textPrimary,
      fontWeight: theme.fontWeight.medium,
    },
    form: {
      gap: theme.spacing.md,
    },
    inputContainer: {
      gap: theme.spacing.xs,
    },
    label: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
      color: colors.textPrimary,
      marginLeft: theme.spacing.xs,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 14,
      fontSize: theme.fontSize.md,
      color: colors.textPrimary,
    },
    passwordHint: {
      fontSize: theme.fontSize.xs,
      color: colors.textMuted,
      marginLeft: theme.spacing.xs,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: theme.spacing.sm,
      ...theme.shadow.md,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: '#fff',
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: theme.spacing.md,
    },
    footerText: {
      fontSize: theme.fontSize.sm,
      color: colors.textSecondary,
    },
    linkText: {
      fontSize: theme.fontSize.sm,
      color: colors.primary,
      fontWeight: theme.fontWeight.semibold,
    },
  });
