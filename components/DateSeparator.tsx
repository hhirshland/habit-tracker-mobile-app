import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useTheme';
import { theme } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme';

interface DateSeparatorProps {
  date: string;
}

function formatRelativeDate(dateStr: string): string {
  const today = new Date();
  const date = new Date(`${dateStr}T12:00:00`);

  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function DateSeparator({ date }: DateSeparatorProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const label = formatRelativeDate(date);

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Text style={styles.text}>{label}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    pill: {
      backgroundColor: colors.surface,
      borderRadius: theme.borderRadius.full,
      paddingVertical: 4,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    text: {
      fontSize: theme.fontSize.xs,
      color: colors.textMuted,
      fontWeight: theme.fontWeight.medium,
    },
  });
}
