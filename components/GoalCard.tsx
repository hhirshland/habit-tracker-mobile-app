import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@/lib/theme';
import { Goal, GOAL_TYPE_ICONS, GOAL_TYPE_COLORS } from '@/lib/types';
import { computeProgressPercent } from '@/lib/goalMath';

interface GoalCardProps {
  goal: Goal;
  currentValue: number | null;
  onPress: () => void;
}

export default function GoalCard({ goal, currentValue, onPress }: GoalCardProps) {
  const color = GOAL_TYPE_COLORS[goal.goal_type] ?? theme.colors.primary;
  const icon = GOAL_TYPE_ICONS[goal.goal_type] ?? 'star';
  const progress = computeProgressPercent(goal.start_value, currentValue, goal.target_value);

  const formatValue = (val: number | null): string => {
    if (val === null) return '—';
    if (goal.unit === 'mm:ss') {
      const mins = Math.floor(val);
      const secs = Math.round((val - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    if (goal.unit === 'steps' && val >= 1000) {
      return `${(val / 1000).toFixed(1)}k`;
    }
    if (val >= 100) return Math.round(val).toString();
    return val.toFixed(1);
  };

  const subtitle = goal.rate && goal.rate_unit
    ? `${goal.rate} ${goal.rate_unit}`
    : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: color + '18' }]}>
          <FontAwesome name={icon as any} size={14} color={color} />
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(progress, 100)}%`, backgroundColor: color },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={1}>{goal.title}</Text>

      <View style={styles.valueRow}>
        <Text style={styles.currentValue}>{formatValue(currentValue)}</Text>
        <FontAwesome name="long-arrow-right" size={10} color={theme.colors.textMuted} style={styles.arrow} />
        <Text style={styles.targetValue}>{formatValue(goal.target_value)} {goal.unit !== 'mm:ss' ? goal.unit : ''}</Text>
      </View>

      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    width: '100%' as any,
    ...theme.shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressTrack: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textMuted,
  },
  title: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  arrow: {
    marginHorizontal: 6,
  },
  targetValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  subtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
