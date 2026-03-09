import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import OnboardingProgress from '@/components/OnboardingProgress';

const CHALLENGE_OPTIONS = [
  {
    id: 'remembering',
    label: 'Remembering to do them',
    icon: 'bell-o' as const,
  },
  {
    id: 'motivation',
    label: 'Staying motivated over time',
    icon: 'fire' as const,
  },
  {
    id: 'too_much',
    label: 'Trying to do too much at once',
    icon: 'list' as const,
  },
  {
    id: 'tracking',
    label: 'No way to track progress',
    icon: 'bar-chart' as const,
  },
] as const;

export default function ChallengeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ goals?: string; experience?: string }>();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    router.push({
      pathname: '/(onboarding)/plan',
      params: {
        goals: params.goals ?? '[]',
        experience: params.experience ?? 'beginner',
        challenge: selected!,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress current={3} total={7} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>What's your biggest challenge{'\n'}with habits?</Text>
          <Text style={styles.subtitle}>
            We'll tailor Thrive to help with exactly this
          </Text>
        </View>

        <View style={styles.options}>
          {CHALLENGE_OPTIONS.map((option) => {
            const isSelected = selected === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(option.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                  <FontAwesome
                    name={option.icon}
                    size={20}
                    color={isSelected ? '#fff' : colors.primary}
                  />
                </View>
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                  {option.label}
                </Text>
                {isSelected && (
                  <FontAwesome
                    name="check-circle"
                    size={22}
                    color={colors.primary}
                    style={styles.check}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.spacer} />

        <View style={styles.bottom}>
          <TouchableOpacity
            style={[styles.ctaButton, !selected && styles.ctaDisabled]}
            onPress={handleContinue}
            disabled={!selected}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      marginBottom: theme.spacing.xl,
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
    options: {
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
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
      flex: 1,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textPrimary,
    },
    cardLabelSelected: {
      color: colors.primary,
    },
    check: {
      marginLeft: 'auto',
    },
    spacer: {
      flex: 1,
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
