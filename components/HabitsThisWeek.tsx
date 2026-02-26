import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, type ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import WeeklyAdherenceSummary from '@/components/WeeklyAdherenceSummary';
import type { HabitWeeklyStats } from '@/lib/habits';

interface HabitsThisWeekProps {
  weekLabel: string;
  weekStart: string;
  weekOffset: number;
  adherencePercent: number;
  completedTotal: number;
  targetTotal: number;
  disableNextWeek: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onJumpToCurrentWeek: () => void;
  isLoading: boolean;
  stats: HabitWeeklyStats[];
  top3TodoWeeklyStat: HabitWeeklyStats | null;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getStatusColor(status: HabitWeeklyStats['status'], colors: ThemeColors): string {
  if (status === 'behind' || status === 'missed') return colors.danger;
  return colors.success;
}

function getStatusLabel(status: HabitWeeklyStats['status']): string {
  switch (status) {
    case 'behind': return 'Behind';
    case 'met': return 'Met';
    case 'missed': return 'Missed';
    default: return 'On track';
  }
}

function ExpandableHabitRow({
  stat,
  expanded,
  onToggle,
}: {
  stat: HabitWeeklyStats;
  expanded: boolean;
  onToggle: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createRowStyles(colors), [colors]);
  const progress = stat.targetDays > 0 ? Math.min(100, Math.round((stat.completedDays / stat.targetDays) * 100)) : 0;
  const statusColor = getStatusColor(stat.status, colors);
  const scheduledDays = stat.habit.specific_days ?? [0, 1, 2, 3, 4, 5, 6];
  const completedDayIndices = useMemo(() => {
    const indices = new Set<number>();
    for (const dateStr of stat.completedDates ?? []) {
      indices.add(new Date(dateStr + 'T12:00:00').getDay());
    }
    return indices;
  }, [stat.completedDates]);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.habitMeta}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.habitName} numberOfLines={1}>
            {stat.habit.name}
          </Text>
        </View>
        <View style={styles.topRowRight}>
          <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(stat.status)}</Text>
          <FontAwesome
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={10}
            color={colors.textMuted}
          />
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress}%`, backgroundColor: statusColor }]} />
        </View>
        <Text style={styles.fraction}>
          {stat.completedDays}/{stat.targetDays}
        </Text>
      </View>

      {expanded && (
        <View style={styles.gridSection}>
          <View style={styles.dayLabelsRow}>
            {DAY_LABELS.map((label, i) => (
              <View key={i} style={styles.dayCol}>
                <Text style={styles.dayLabel}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.dayCirclesRow}>
            {DAY_LABELS.map((_, dayIndex) => {
              const isScheduled = scheduledDays.includes(dayIndex);
              const isFilled = completedDayIndices.has(dayIndex);

              return (
                <View key={dayIndex} style={styles.dayCol}>
                  <View
                    style={[
                      styles.dayCircle,
                      !isScheduled && !isFilled && { backgroundColor: colors.borderLight, borderColor: colors.borderLight },
                      isScheduled && !isFilled && { borderColor: statusColor, borderWidth: 1.5, backgroundColor: 'transparent' },
                      isFilled && { backgroundColor: statusColor, borderColor: statusColor, borderWidth: 1.5 },
                    ]}
                  >
                    {isFilled && <FontAwesome name="check" size={9} color="#fff" />}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function HabitsThisWeek({
  weekLabel,
  weekStart,
  weekOffset,
  adherencePercent,
  completedTotal,
  targetTotal,
  disableNextWeek,
  onPrevWeek,
  onNextWeek,
  onJumpToCurrentWeek,
  isLoading,
  stats,
  top3TodoWeeklyStat,
}: HabitsThisWeekProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggle = useCallback((habitId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(habitId)) next.delete(habitId);
      else next.add(habitId);
      return next;
    });
  }, []);

  const allStats = useMemo(() => {
    const result = [...stats];
    if (top3TodoWeeklyStat) result.push(top3TodoWeeklyStat);
    return result;
  }, [stats, top3TodoWeeklyStat]);

  const isOnPace = useMemo(
    () => allStats.length === 0 || allStats.every((s) => s.status === 'on_track' || s.status === 'met'),
    [allStats],
  );

  return (
    <>
      <WeeklyAdherenceSummary
        weekLabel={weekLabel}
        weekOffset={weekOffset}
        adherencePercent={adherencePercent}
        completedTotal={completedTotal}
        targetTotal={targetTotal}
        isOnPace={isOnPace}
        disableNextWeek={disableNextWeek}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
        onJumpToCurrentWeek={onJumpToCurrentWeek}
      />

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : allStats.length > 0 ? (
        <View style={styles.habitRows}>
          {allStats.map((stat) => (
            <ExpandableHabitRow
              key={stat.habit.id}
              stat={stat}
              expanded={expandedIds.has(stat.habit.id)}
              onToggle={() => handleToggle(stat.habit.id)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <FontAwesome name="check-square-o" size={20} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            No active habits yet. Add habits in the Habits tab to start tracking weekly adherence.
          </Text>
        </View>
      )}
    </>
  );
}

function createRowStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      backgroundColor: colors.surface,
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
      color: colors.textPrimary,
    },
    topRowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
      backgroundColor: colors.borderLight,
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
      color: colors.textSecondary,
    },

    gridSection: {
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
      gap: 6,
    },
    dayLabelsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 0,
    },
    dayCirclesRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 0,
    },
    dayCol: {
      width: 36,
      alignItems: 'center',
    },
    dayLabel: {
      fontSize: 10,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    dayCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
  });
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    loading: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
    },
    habitRows: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      alignItems: 'center',
      marginTop: theme.spacing.sm,
      gap: theme.spacing.sm,
      ...theme.shadow.sm,
    },
    emptyText: {
      fontSize: theme.fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
