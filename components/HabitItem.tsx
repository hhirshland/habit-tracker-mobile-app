import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { Habit, DAY_LABELS, DayOfWeek } from '@/lib/types';

interface HabitItemProps {
  habit: Habit;
  onEdit: () => void;
  onDelete: () => void;
}

export default function HabitItem({ habit, onEdit, onDelete }: HabitItemProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const getDaysLabel = () => {
    if (habit.specific_days && habit.specific_days.length > 0) {
      return habit.specific_days.map((d) => DAY_LABELS[d as DayOfWeek]).join(', ');
    }
    if (habit.frequency_per_week === 7) return 'Every day';
    return `${habit.frequency_per_week}x per week (any days)`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {habit.name}
          </Text>
        </View>

        {habit.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {habit.description}
          </Text>
        ) : null}

        <View style={styles.scheduleRow}>
          <FontAwesome name="calendar" size={12} color={colors.textMuted} />
          <Text style={styles.scheduleText}>{getDaysLabel()}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onEdit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FontAwesome name="pencil" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FontAwesome name="trash-o" size={16} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadow.sm,
  },
  content: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  name: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.xs,
  },
  scheduleText: {
    fontSize: theme.fontSize.xs,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginLeft: theme.spacing.md,
  },
  actionButton: {
    padding: theme.spacing.xs,
  },
});
