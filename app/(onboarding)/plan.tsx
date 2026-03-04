import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { captureEvent, EVENTS } from '@/lib/analytics';
import OnboardingProgress from '@/components/OnboardingProgress';

const GOAL_LABELS: Record<string, string> = {
  health: 'Health & Fitness',
  productivity: 'Productivity',
  mindfulness: 'Mindfulness',
  learning: 'Learning & Growth',
  relationships: 'Relationships',
  finance: 'Finance',
  creativity: 'Creativity',
  other: 'Personal Goals',
};

const CHALLENGE_SOLUTIONS: Record<string, { feature: string; icon: string; description: string }> = {
  remembering: {
    feature: 'Smart Reminders',
    icon: 'bell',
    description: 'Daily notifications so you never miss a habit',
  },
  motivation: {
    feature: 'Streaks & Progress',
    icon: 'fire',
    description: 'Visual streaks and weekly recaps to keep you going',
  },
  too_much: {
    feature: 'Top 3 Priorities',
    icon: 'list-ol',
    description: 'Focus on what matters most each day',
  },
  tracking: {
    feature: 'Goals & Analytics',
    icon: 'line-chart',
    description: 'Track progress with charts and Apple Health integration',
  },
};

const EXPERIENCE_TIPS: Record<string, string> = {
  beginner: 'Start with 2-3 simple habits and build from there',
  intermediate: 'Focus on consistency over quantity — we\'ll help you stay on track',
  advanced: 'Level up with goals, journaling, and weekly AI reflections',
};

function parseJsonParam(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const value = Array.isArray(raw) ? raw[0] : raw;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

export default function PlanScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    goals?: string;
    experience?: string;
    challenge?: string;
  }>();

  const goals = parseJsonParam(params.goals);
  const experience = (Array.isArray(params.experience) ? params.experience[0] : params.experience) ?? 'beginner';
  const challenge = (Array.isArray(params.challenge) ? params.challenge[0] : params.challenge) ?? 'motivation';
  const tip = EXPERIENCE_TIPS[experience] ?? EXPERIENCE_TIPS.beginner;
  const solution = CHALLENGE_SOLUTIONS[challenge] ?? CHALLENGE_SOLUTIONS.motivation;

  useEffect(() => {
    captureEvent(EVENTS.ONBOARDING_PLAN_VIEWED, {
      experience_level: experience,
      challenge,
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress current={4} total={7} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.readyBadge}>
            <FontAwesome name="check" size={20} color="#fff" />
          </View>
          <Text style={styles.title}>Your Plan is Ready</Text>
          <Text style={styles.subtitle}>
            Based on your answers, here's how Thrive will help you
          </Text>
        </View>

        <View style={styles.tipCard}>
          <FontAwesome name="lightbulb-o" size={18} color={colors.warning} />
          <Text style={styles.tipText}>{tip}</Text>
        </View>

        {goals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Focus Areas</Text>
            <View style={styles.goalTags}>
              {goals.map((g) => (
                <View key={g} style={styles.goalTag}>
                  <Text style={styles.goalTagText}>{GOAL_LABELS[g] ?? g}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tailored For You</Text>
          <View style={styles.featureCard}>
            <View style={styles.featureIconCircle}>
              <FontAwesome name={solution.icon as any} size={20} color="#fff" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureLabel}>{solution.feature}</Text>
              <Text style={styles.featureDescription}>{solution.description}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What You'll Get</Text>
          {[
            { icon: 'check-circle', text: 'Habit tracking with streaks' },
            { icon: 'check-circle', text: 'Goal setting with progress charts' },
            { icon: 'check-circle', text: 'Daily journal for reflection' },
            { icon: 'check-circle', text: 'AI-powered weekly recaps' },
            { icon: 'check-circle', text: 'Apple Health integration' },
          ].map((item, i) => (
            <View key={i} style={styles.benefitRow}>
              <FontAwesome name={item.icon as any} size={16} color={colors.success} />
              <Text style={styles.benefitText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() =>
            router.push({
              pathname: '/(onboarding)/paywall',
              params: {
                goals: params.goals ?? '[]',
                experience,
                challenge,
              },
            })
          }
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>Start Your Free Trial</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    header: {
      alignItems: 'center',
      paddingTop: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    readyBadge: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.fontSize.xxl,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    tipCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: colors.warningBackground,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    tipText: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      color: colors.textPrimary,
      lineHeight: 20,
      fontWeight: theme.fontWeight.medium,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: theme.spacing.sm,
    },
    goalTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    goalTag: {
      backgroundColor: colors.primaryLightOverlay30,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs + 2,
    },
    goalTagText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: colors.primary,
    },
    featureCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    featureIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureContent: {
      flex: 1,
      gap: 2,
    },
    featureLabel: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textPrimary,
    },
    featureDescription: {
      fontSize: theme.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs + 2,
    },
    benefitText: {
      fontSize: theme.fontSize.md,
      color: colors.textPrimary,
    },
    bottom: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
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
