import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';
import { HabitWeeklyStats } from '@/lib/habits';

interface HabitAdherenceRowProps {
  stat: HabitWeeklyStats;
}

function getStatusColor(status: HabitWeeklyStats['status']): string {
  if (status === 'behind' || status === 'missed') return theme.colors.danger;
  if (status === 'at_risk') return theme.colors.warning;
  return theme.colors.success;
}

function getStatusLabel(status: HabitWeeklyStats['status']): string {
  switch (status) {
    case 'behind':
      return 'Behind';
    case 'at_risk':
      return 'At risk';
    case 'met':
      return 'Met';
    case 'missed':
      return 'Missed';
    default:
      return 'On track';
  }
}

export default function HabitAdherenceRow({ stat }: HabitAdherenceRowProps) {
  const progress = stat.targetDays > 0 ? Math.min(100, Math.round((stat.completedDays / stat.targetDays) * 100)) : 0;
  const statusColor = getStatusColor(stat.status);

  return (
    <View style={styles.row}>
      <View style={styles.topRow}>
        <View style={styles.habitMeta}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.habitName} numberOfLines={1}>
            {stat.habit.name}
          </Text>
        </View>
        <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(stat.status)}</Text>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress}%`, backgroundColor: statusColor }]} />
        </View>
        <Text style={styles.fraction}>
          {stat.completedDays}/{stat.targetDays}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadow.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
  },
  habitName: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.borderLight,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
  },
  fraction: {
    minWidth: 34,
    textAlign: 'right',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
});
