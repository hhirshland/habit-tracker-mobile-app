import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { captureEvent, EVENTS } from '@/lib/analytics';
import ThriveLogo from '@/components/ThriveLogo';

export default function WelcomeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    captureEvent(EVENTS.ONBOARDING_STARTED);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <ThriveLogo size={80} style={styles.logo} />
          <Text style={styles.appName}>Thrive</Text>
        </View>

        <View style={styles.messaging}>
          <Text style={styles.headline}>
            Build the life you want,{'\n'}one habit at a time
          </Text>
          <Text style={styles.subtext}>
            Track habits, set goals, and reflect daily.{'\n'}Small actions compound into big results.
          </Text>
        </View>

        <View style={styles.features}>
          {[
            { icon: '✓', text: 'Build lasting habits with streaks & reminders' },
            { icon: '✓', text: 'Track goals with Apple Health integration' },
            { icon: '✓', text: 'Reflect & grow with daily journaling' },
          ].map((item, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkText}>{item.icon}</Text>
              </View>
              <Text style={styles.featureText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/(onboarding)/goals')}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      justifyContent: 'center',
    },
    hero: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    logo: {
      marginBottom: theme.spacing.md,
    },
    appName: {
      fontSize: theme.fontSize.xxxl,
      fontWeight: theme.fontWeight.bold,
      color: colors.primary,
      letterSpacing: 1,
    },
    messaging: {
      alignItems: 'center',
      marginBottom: theme.spacing.xxl,
    },
    headline: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: 30,
      marginBottom: theme.spacing.md,
    },
    subtext: {
      fontSize: theme.fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    features: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    checkCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primaryLightOverlay30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkText: {
      fontSize: 14,
      fontWeight: theme.fontWeight.bold,
      color: colors.primary,
    },
    featureText: {
      flex: 1,
      fontSize: theme.fontSize.md,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    bottom: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
    },
    ctaButton: {
      backgroundColor: colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: 18,
      alignItems: 'center',
      ...theme.shadow.md,
    },
    ctaText: {
      color: '#fff',
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
    },
  });
