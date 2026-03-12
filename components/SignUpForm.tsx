import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/contexts/AuthContext';
import { EVENTS, captureEvent } from '@/lib/analytics';
import { isAppleAuthAvailable } from '@/lib/socialAuth';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';

interface SignUpFormProps {
  onSuccess: () => void;
}

export default function SignUpForm({ onSuccess }: SignUpFormProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signUp, signInWithApple, signInWithGoogle } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'apple' | 'google' | null>(null);

  const isBusy = loading || !!socialLoading;

  const handleAppleSignUp = async () => {
    setSocialLoading('apple');
    const { error } = await signInWithApple();
    setSocialLoading(null);
    if (error) {
      if ((error as any).code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Apple Sign In Failed', error.message);
    } else {
      onSuccess();
    }
  };

  const handleGoogleSignUp = async () => {
    setSocialLoading('google');
    const { error } = await signInWithGoogle();
    setSocialLoading(null);
    if (error) {
      if (error.message === 'Google sign-in was cancelled') return;
      Alert.alert('Google Sign In Failed', error.message);
    } else {
      onSuccess();
    }
  };

  const handleEmailSignUp = async () => {
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
      onSuccess();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.socialButtons}>
        {isAppleAuthAvailable() && (
          <TouchableOpacity
            style={styles.appleButton}
            onPress={handleAppleSignUp}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            {socialLoading === 'apple' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesome name="apple" size={20} color="#fff" />
                <Text style={styles.socialButtonText}>Continue with Apple</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignUp}
          disabled={isBusy}
          activeOpacity={0.8}
        >
          {socialLoading === 'google' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome name="google" size={18} color="#fff" />
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

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
          style={[styles.emailButton, isBusy && styles.buttonDisabled]}
          onPress={handleEmailSignUp}
          disabled={isBusy}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.emailButtonText}>Continue with email</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {},
    socialButtons: {
      gap: theme.spacing.md,
    },
    appleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: 16,
      ...theme.shadow.sm,
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: 16,
      ...theme.shadow.sm,
    },
    socialButtonText: {
      color: '#fff',
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      marginVertical: theme.spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: theme.fontSize.sm,
      color: colors.textMuted,
    },
    form: {
      marginTop: theme.spacing.xs,
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
    emailButton: {
      backgroundColor: colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    emailButtonText: {
      color: colors.textPrimary,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
    },
  });
