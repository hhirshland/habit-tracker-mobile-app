import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '@/lib/theme';

interface WeeklyAdherenceSummaryProps {
  weekLabel: string;
  weekOffset: number;
  adherencePercent: number;
  completedTotal: number;
  targetTotal: number;
  disableNextWeek: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onJumpToCurrentWeek: () => void;
}

function getAdherenceColor(adherencePercent: number): string {
  if (adherencePercent >= 80) return theme.colors.success;
  if (adherencePercent >= 50) return theme.colors.warning;
  return theme.colors.danger;
}

export default function WeeklyAdherenceSummary({
  weekLabel,
  weekOffset,
  adherencePercent,
  completedTotal,
  targetTotal,
  disableNextWeek,
  onPrevWeek,
  onNextWeek,
  onJumpToCurrentWeek,
}: WeeklyAdherenceSummaryProps) {
  const size = 76;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, adherencePercent));
  const progressLength = (progress / 100) * circumference;
  const color = getAdherenceColor(progress);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Habits This Week</Text>
        <View style={styles.weekNav}>
          <TouchableOpacity style={styles.navButton} onPress={onPrevWeek} activeOpacity={0.7}>
            <FontAwesome name="chevron-left" size={12} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <TouchableOpacity
            style={[styles.navButton, disableNextWeek && styles.navButtonDisabled]}
            onPress={onNextWeek}
            activeOpacity={0.7}
            disabled={disableNextWeek}
          >
            <FontAwesome
              name="chevron-right"
              size={12}
              color={disableNextWeek ? theme.colors.textMuted : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.copyBlock}>
          <Text style={styles.kicker}>Overall adherence</Text>
          <Text style={styles.copyValue}>
            {completedTotal} of {targetTotal} habit-days completed
          </Text>
          {weekOffset !== 0 && (
            <TouchableOpacity onPress={onJumpToCurrentWeek} activeOpacity={0.7}>
              <Text style={styles.backToCurrent}>Back to current week</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.ringWrap}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.colors.borderLight}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${progressLength} ${circumference - progressLength}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <Text style={styles.ringValue}>{progress}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navButton: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.6,
  },
  weekLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    minWidth: 110,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  copyBlock: {
    flex: 1,
  },
  kicker: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  copyValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  backToCurrent: {
    marginTop: 6,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  ringWrap: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    position: 'absolute',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
});
