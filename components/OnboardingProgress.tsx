import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';

interface OnboardingProgressProps {
  current: number;
  total: number;
}

export default function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  const colors = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.md,
          gap: theme.spacing.xs,
        },
        bar: {
          flex: 1,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.borderLight,
        },
        barFilled: {
          backgroundColor: colors.primary,
        },
        label: {
          fontSize: theme.fontSize.xs,
          color: colors.textMuted,
          fontWeight: theme.fontWeight.medium,
          marginLeft: theme.spacing.xs,
          minWidth: 32,
          textAlign: 'right',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.bar, i < current && styles.barFilled]}
        />
      ))}
      <Text style={styles.label}>
        {current}/{total}
      </Text>
    </View>
  );
}
