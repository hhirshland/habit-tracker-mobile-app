import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';

const DISMISSED_KEY = '@identity_card_dismissed';

export default function DefineIdentityCard() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((val) => setDismissed(val === 'true'));
  }, []);

  const handleDismiss = async () => {
    setDismissed(true);
    await AsyncStorage.setItem(DISMISSED_KEY, 'true');
  };

  const handleCTA = () => {
    router.push('/identity-setup');
  };

  if (dismissed === null || dismissed) return null;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <FontAwesome name="times" size={14} color={colors.textMuted} />
      </TouchableOpacity>

      <Text style={styles.emoji}>🪞</Text>
      <Text style={styles.title}>Define Your Identity</Text>
      <Text style={styles.subtitle}>
        Lasting habits start with who you want to be. Define your identity and align your daily
        actions.
      </Text>
      <TouchableOpacity style={styles.ctaButton} onPress={handleCTA} activeOpacity={0.8}>
        <Text style={styles.ctaText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: theme.spacing.lg,
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    dismissButton: {
      position: 'absolute',
      top: theme.spacing.sm,
      right: theme.spacing.sm,
    },
    emoji: {
      fontSize: 36,
    },
    title: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: theme.fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    ctaButton: {
      backgroundColor: colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: 12,
      paddingHorizontal: theme.spacing.xl,
      marginTop: theme.spacing.xs,
    },
    ctaText: {
      color: '#fff',
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
    },
  });
