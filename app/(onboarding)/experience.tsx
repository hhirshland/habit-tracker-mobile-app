import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import OnboardingProgress from '@/components/OnboardingProgress';

const EXPERIENCE_OPTIONS = [
  {
    id: 'beginner',
    label: 'Just getting started',
    description: "I'm new to tracking habits",
    icon: 'seedling' as const,
  },
  {
    id: 'intermediate',
    label: 'Hit or miss',
    description: "I've tried before but struggle with consistency",
    icon: 'refresh' as const,
  },
  {
    id: 'advanced',
    label: 'Pretty consistent',
    description: "I have routines and I'm looking to level up",
    icon: 'trophy' as const,
  },
] as const;

export default function ExperienceScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ goals?: string }>();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    router.push({
      pathname: '/(onboarding)/challenge',
      params: {
        goals: params.goals ?? '[]',
        experience: selected!,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress current={2} total={7} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>How consistent are you{'\n'}with habits today?</Text>
          <Text style={styles.subtitle}>This helps us personalize your experience</Text>
        </View>

        <View style={styles.options}>
          {EXPERIENCE_OPTIONS.map((option) => {
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
                <View style={styles.cardText}>
                  <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                    {option.label}
                  </Text>
                  <Text style={styles.cardDescription}>{option.description}</Text>
                </View>
                {isSelected && (
                  <FontAwesome name="check-circle" size={22} color={colors.primary} />
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
    cardText: {
      flex: 1,
      gap: 2,
    },
    cardLabel: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textPrimary,
    },
    cardLabelSelected: {
      color: colors.primary,
    },
    cardDescription: {
      fontSize: theme.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 20,
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
