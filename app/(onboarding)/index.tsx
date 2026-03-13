import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { captureEvent, EVENTS } from '@/lib/analytics';
import ThriveLogo from '@/components/ThriveLogo';

export default function WelcomeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const startTime = useRef(Date.now());

  useEffect(() => {
    captureEvent(EVENTS.ONBOARDING_STARTED);
    captureEvent(EVENTS.ONBOARDING_STEP_VIEWED, { step_name: 'welcome', step_number: 0 });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.hero}>
            <ThriveLogo size={80} style={styles.logo} />
            <Text style={styles.appName}>Thrive</Text>
          </View>

          <View style={styles.messaging}>
            <Text style={styles.headline}>
              Become your best self
            </Text>
            <Text style={styles.subtext}>
              Connect your daily actions to the{'\n'}person you want to be.
            </Text>
          </View>

          <View style={styles.features}>
            {[
              { icon: '✓', text: 'Define your identity' },
              { icon: '✓', text: 'Build daily habits that align' },
              { icon: '✓', text: 'Watch yourself grow, week over week' },
            ].map((item, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.checkCircle}>
                  <Text style={styles.checkText}>{item.icon}</Text>
                </View>
                <Text style={styles.featureText}>{item.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.socialProof}>
            <FontAwesome name="star" size={14} color={colors.warning} />
            <Text style={styles.socialProofText}>
              Join thousands thriving every day
            </Text>
          </View>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => {
              captureEvent(EVENTS.ONBOARDING_STEP_COMPLETED, {
                step_name: 'welcome',
                step_number: 0,
                duration_seconds: Math.round((Date.now() - startTime.current) / 1000),
              });
              router.push('/(onboarding)/paywall');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaText}>Get Started</Text>
          </TouchableOpacity>
          <View style={styles.signInRow}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity>
                <Text style={styles.signInLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
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
      marginBottom: theme.spacing.xl,
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
    socialProof: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },
    socialProofText: {
      fontSize: theme.fontSize.sm,
      color: colors.textSecondary,
      fontWeight: theme.fontWeight.medium,
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
    signInRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: theme.spacing.md,
    },
    signInText: {
      fontSize: theme.fontSize.sm,
      color: colors.textSecondary,
    },
    signInLink: {
      fontSize: theme.fontSize.sm,
      color: colors.primary,
      fontWeight: theme.fontWeight.semibold,
    },
  });
