import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@/lib/theme';
import { Goal, GOAL_TYPE_COLORS, GOAL_TYPE_ICONS } from '@/lib/types';
import { MetricDataPoint } from '@/lib/health';
import { getGoalHistoryData, getGoalCurrentValue } from '@/lib/goals';
import {
  computeGoalTrajectory,
  computeRateBasedProjection,
  computeProgressPercent,
  weightedLinearRegression,
  computeWeightedProjection,
  weightedEstimateCompletionDate,
  weightedDaysToTarget,
  TrajectoryPoint,
  ProjectionPoint,
} from '@/lib/goalMath';
import GoalChart from './GoalChart';

const screenWidth = Dimensions.get('window').width;

interface GoalDetailModalProps {
  visible: boolean;
  goal: Goal | null;
  onClose: () => void;
  onDelete: (goalId: string) => void;
  onLogEntry: (goalId: string, value: number, date: string) => void;
}

export default function GoalDetailModal({
  visible,
  goal,
  onClose,
  onDelete,
  onLogEntry,
}: GoalDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState<MetricDataPoint[]>([]);
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([]);
  const [projection, setProjection] = useState<ProjectionPoint[]>([]);
  const [estimatedDate, setEstimatedDate] = useState<string | null>(null);
  const [projectedEndDate, setProjectedEndDate] = useState<string | null>(null);

  // Log entry form
  const [showLogForm, setShowLogForm] = useState(false);
  const [logValue, setLogValue] = useState('');
  const [logDate, setLogDate] = useState(() => new Date());

  const loadData = useCallback(async () => {
    if (!goal) return;
    setLoading(true);
    try {
      const [history, current] = await Promise.all([
        getGoalHistoryData(goal, 180),
        getGoalCurrentValue(goal),
      ]);

      // Only use data from the goal's start date onward for calculations
      const goalStartStr = goal.start_date.split('T')[0];
      const filteredHistory = history.filter((d) => d.date >= goalStartStr);

      setHistoryData(filteredHistory);
      setCurrentValue(current);

      // Compute trajectory
      const traj = computeGoalTrajectory(goal);
      setTrajectory(traj);

      // Compute projection from data trend
      let endDate: string | null = null;
      let projectionComputed = false;

      if (filteredHistory.length >= 2) {
        const reg = weightedLinearRegression(filteredHistory);
        if (reg) {
          const today = new Date();

          // Calculate how many future days from today until the target is hit.
          // If weightedDaysToTarget returns null (slope going the wrong direction),
          // fall back to the trajectory duration so we still show the projection area.
          let futureDays = weightedDaysToTarget(filteredHistory, reg, goal.target_value, today);
          if (futureDays === null && traj.length > 0) {
            // Use trajectory span as fallback duration
            const trajStart = new Date(traj[0].date).getTime();
            const trajEnd = new Date(traj[traj.length - 1].date).getTime();
            futureDays = Math.ceil((trajEnd - trajStart) / 86400000);
          }
          futureDays = futureDays ?? 90;

          // Projection starts from today, not from the last data point
          const proj = computeWeightedProjection(filteredHistory, reg, futureDays, 1.96, today);
          setProjection(proj);
          projectionComputed = proj.length >= 2;

          const estDate = weightedEstimateCompletionDate(filteredHistory, reg, goal.target_value);
          setEstimatedDate(estDate);
          endDate = estDate;

          // If no estimated completion date, use the last projection point
          if (!endDate && proj.length > 0) {
            endDate = proj[proj.length - 1].date;
          }
        }
      }

      // Fallback: rate-based projection when not enough data for regression
      if (!projectionComputed) {
        const rateProj = computeRateBasedProjection(goal, current);
        if (rateProj.length > 0) {
          setProjection(rateProj);
          projectionComputed = true;
          endDate = rateProj[rateProj.length - 1].date;
        }
      }

      // If no projection-based end date, fall back to trajectory end date
      if (!endDate && traj.length > 0) {
        endDate = traj[traj.length - 1].date;
      }
      setProjectedEndDate(endDate);
    } catch (error) {
      console.error('Error loading goal data:', error);
    } finally {
      setLoading(false);
    }
  }, [goal]);

  useEffect(() => {
    if (visible && goal) {
      loadData();
    } else {
      // Reset
      setHistoryData([]);
      setCurrentValue(null);
      setTrajectory([]);
      setProjection([]);
      setEstimatedDate(null);
      setProjectedEndDate(null);
      setShowLogForm(false);
      setLogValue('');
      setLogDate(new Date());
    }
  }, [visible, goal, loadData]);

  const isToday = useMemo(() => {
    const now = new Date();
    return (
      logDate.getFullYear() === now.getFullYear() &&
      logDate.getMonth() === now.getMonth() &&
      logDate.getDate() === now.getDate()
    );
  }, [logDate]);

  const shiftLogDate = (days: number) => {
    setLogDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      // Don't allow future dates
      const now = new Date();
      if (next > now) return prev;
      return next;
    });
  };

  const formatLogDate = (d: Date): string => {
    const now = new Date();
    const isDateToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate();
    if (isDateToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!goal) return null;

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

  const handleDelete = () => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(goal.id);
            onClose();
          },
        },
      ]
    );
  };

  const handleLogEntry = () => {
    const val = parseFloat(logValue);
    if (isNaN(val)) return;

    const dateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
    onLogEntry(goal.id, val, dateStr);
    setLogValue('');
    setLogDate(new Date());
    setShowLogForm(false);

    // Refresh data
    setTimeout(loadData, 500);
  };

  // Determine if the goal direction is improving
  const isImproving = (): boolean | null => {
    if (historyData.length < 2 || currentValue === null || goal.start_value === null) return null;
    const goingDown = goal.target_value < goal.start_value;
    const currentDirection = currentValue < goal.start_value;
    return goingDown ? currentDirection : !currentDirection;
  };

  const improving = isImproving();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.headerButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{goal.title}</Text>
          <TouchableOpacity onPress={handleDelete}>
            <FontAwesome name="trash-o" size={18} color={theme.colors.danger} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <>
              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Starting</Text>
                  <Text style={styles.statValue}>
                    {formatValue(goal.start_value)}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Current</Text>
                  <Text style={[styles.statValue, { color }]}>
                    {formatValue(currentValue)}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Target</Text>
                  <Text style={styles.statValue}>
                    {formatValue(goal.target_value)}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Progress</Text>
                  <Text style={[styles.statValue, { color: progress >= 100 ? theme.colors.success : color }]}>
                    {progress}%
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(progress, 100)}%`, backgroundColor: color },
                    ]}
                  />
                </View>
              </View>

              {/* Chart */}
              <View style={styles.chartContainer}>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: color }]} />
                    <Text style={styles.legendText}>Actual</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.success, borderRadius: 0, height: 2 }]} />
                    <Text style={styles.legendText}>Goal</Text>
                  </View>
                  {projection.length > 0 && (
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: theme.colors.primaryLight, opacity: 0.5 }]} />
                      <Text style={styles.legendText}>Projection</Text>
                    </View>
                  )}
                </View>
                <GoalChart
                  actualData={historyData}
                  trajectory={trajectory}
                  projection={projection}
                  width={screenWidth - theme.spacing.lg * 2}
                  height={220}
                  actualColor={color}
                  unit={goal.unit}
                  goalStartDate={goal.start_date.split('T')[0]}
                  goalEndDate={projectedEndDate ?? undefined}
                />
              </View>

              {/* Insights */}
              <View style={styles.insightsContainer}>
                {goal.rate && goal.rate_unit && (
                  <View style={styles.insightRow}>
                    <FontAwesome name="line-chart" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.insightText}>
                      Goal rate: {goal.rate} {goal.rate_unit}
                    </Text>
                  </View>
                )}

                {estimatedDate && (
                  <View style={styles.insightRow}>
                    <FontAwesome name="calendar" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.insightText}>
                      Est. completion: {formatDisplayDate(estimatedDate)}
                    </Text>
                  </View>
                )}

                {improving !== null && (
                  <View style={styles.insightRow}>
                    <FontAwesome
                      name={improving ? 'arrow-up' : 'arrow-down'}
                      size={14}
                      color={improving ? theme.colors.success : theme.colors.danger}
                    />
                    <Text
                      style={[
                        styles.insightText,
                        { color: improving ? theme.colors.success : theme.colors.danger },
                      ]}
                    >
                      {improving ? 'Trending in the right direction' : 'Off track — keep going!'}
                    </Text>
                  </View>
                )}

                {historyData.length > 0 && (
                  <View style={styles.insightRow}>
                    <FontAwesome name="database" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.insightText}>
                      {historyData.length} data points • Started{' '}
                      {formatDisplayDate(goal.start_date.split('T')[0])}
                    </Text>
                  </View>
                )}
              </View>

              {/* Log entry (manual goals) */}
              {goal.data_source === 'manual' && (
                <View style={styles.logSection}>
                  {showLogForm ? (
                    <View style={styles.logForm}>
                      {/* Date selector */}
                      <View style={styles.dateRow}>
                        <TouchableOpacity
                          style={styles.dateArrow}
                          onPress={() => shiftLogDate(-1)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <FontAwesome name="chevron-left" size={14} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <View style={styles.dateLabelWrap}>
                          <FontAwesome name="calendar-o" size={13} color={theme.colors.textMuted} style={{ marginRight: 6 }} />
                          <Text style={styles.dateLabel}>{formatLogDate(logDate)}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.dateArrow, isToday && { opacity: 0.3 }]}
                          onPress={() => shiftLogDate(1)}
                          disabled={isToday}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <FontAwesome name="chevron-right" size={14} color={theme.colors.primary} />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.logInput}
                        value={logValue}
                        onChangeText={setLogValue}
                        placeholder={`Enter value (${goal.unit})`}
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="decimal-pad"
                        autoFocus
                      />
                      <View style={styles.logButtons}>
                        <TouchableOpacity
                          style={styles.logCancelButton}
                          onPress={() => { setShowLogForm(false); setLogDate(new Date()); }}
                        >
                          <Text style={styles.logCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.logSubmitButton, !logValue && { opacity: 0.5 }]}
                          onPress={handleLogEntry}
                          disabled={!logValue}
                        >
                          <Text style={styles.logSubmitText}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.logEntryButton}
                      onPress={() => { setLogDate(new Date()); setShowLogForm(true); }}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name="plus" size={14} color={theme.colors.primary} />
                      <Text style={styles.logEntryButtonText}>Log Entry</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerButton: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: theme.spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: 4,
  },

  // Progress bar
  progressBarContainer: {
    marginTop: theme.spacing.md,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Chart
  chartContainer: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.sm,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },

  // Insights
  insightsContainer: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow.sm,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  insightText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },

  // Log entry
  logSection: {
    marginTop: theme.spacing.lg,
  },
  logEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primaryOverlay40,
    borderStyle: 'dashed',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  logEntryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  logForm: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  dateArrow: {
    padding: 6,
  },
  dateLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 130,
    paddingHorizontal: theme.spacing.sm,
  },
  dateLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  logInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  logButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  logCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  logCancelText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  logSubmitButton: {
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  logSubmitText: {
    fontSize: theme.fontSize.sm,
    color: '#fff',
    fontWeight: theme.fontWeight.semibold,
  },
});
