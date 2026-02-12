import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@/lib/theme';
import { Habit, DAY_LABELS, DayOfWeek } from '@/lib/types';

interface HabitItemProps {
  habit: Habit;
  onEdit: () => void;
  onDelete: () => void;
}

export default function HabitItem({ habit, onEdit, onDelete }: HabitItemProps) {
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
          <FontAwesome name="calendar" size={12} color={theme.colors.textMuted} />
          <Text style={styles.scheduleText}>{getDaysLabel()}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onEdit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FontAwesome name="pencil" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FontAwesome name="trash-o" size={16} color={theme.colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.textPrimary,
    flex: 1,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textMuted,
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
