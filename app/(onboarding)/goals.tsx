import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { captureEvent, EVENTS } from '@/lib/analytics';
import OnboardingProgress from '@/components/OnboardingProgress';

const GOAL_OPTIONS = [
  { id: 'health', label: 'Health & Fitness', icon: 'heartbeat' as const },
  { id: 'productivity', label: 'Productivity', icon: 'rocket' as const },
  { id: 'mindfulness', label: 'Mindfulness', icon: 'leaf' as const },
  { id: 'learning', label: 'Learning & Growth', icon: 'graduation-cap' as const },
  { id: 'relationships', label: 'Relationships', icon: 'users' as const },
  { id: 'finance', label: 'Finance', icon: 'line-chart' as const },
  { id: 'creativity', label: 'Creativity', icon: 'paint-brush' as const },
  { id: 'other', label: 'Other', icon: 'plus-circle' as const },
] as const;

export default function GoalsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState<string[]>([]);

  const toggleGoal = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const handleContinue = () => {
    captureEvent(EVENTS.ONBOARDING_GOAL_SELECTED, {
      goals: selected,
      goal_count: selected.length,
    });
    router.push({
      pathname: '/(onboarding)/experience',
      params: { goals: JSON.stringify(selected) },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress current={1} total={7} />

      <View style={styles.header}>
        <Text style={styles.title}>What do you want{'\n'}to improve?</Text>
        <Text style={styles.subtitle}>Select all that apply</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {GOAL_OPTIONS.map((goal) => {
          const isSelected = selected.includes(goal.id);
          return (
            <TouchableOpacity
              key={goal.id}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => toggleGoal(goal.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                <FontAwesome
                  name={goal.icon}
                  size={20}
                  color={isSelected ? '#fff' : colors.primary}
                />
              </View>
              <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                {goal.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.ctaButton, selected.length === 0 && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={selected.length === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>Continue</Text>
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
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      marginBottom: theme.spacing.lg,
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
    },
    scroll: {
      flex: 1,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    card: {
      width: '47.5%',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    cardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLightOverlay15,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primaryLightOverlay30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircleSelected: {
      backgroundColor: colors.primary,
    },
    cardLabel: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    cardLabelSelected: {
      color: colors.primary,
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
    ctaDisabled: {
      opacity: 0.5,
    },
    ctaText: {
      color: '#fff',
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
    },
  });
