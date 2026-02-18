import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useHealth } from '@/contexts/HealthContext';
import {
  WorkoutSummary,
  HEALTH_METRIC_DISPLAY_NAMES,
} from '@/lib/health';
import { getWeekRange } from '@/lib/habits';
import { getGoalCurrentValue } from '@/lib/goals';
import { Goal, Habit } from '@/lib/types';
import {
  ALL_METRICS,
  DEFAULT_VISIBLE_KEYS,
  getMetricByKey,
  MetricDefinition,
} from '@/lib/metricsConfig';
import {
  useStepHistory,
  useWeightHistory,
  useRHRHistory,
  useBodyFatHistory,
  useHRVHistory,
  useRefreshHealthHistory,
} from '@/hooks/useHealthQuery';
import {
  useGoals,
  useCreateGoal,
  useDeleteGoal,
  useAddGoalEntry,
  useRefreshGoals,
} from '@/hooks/useGoalsQuery';
import { useRefreshAllHabitData, useWeeklyAdherence } from '@/hooks/useHabitsQuery';
import { useDailyTodosForRange } from '@/hooks/useDailyTodosQuery';
import { useDailyJournalForRange } from '@/hooks/useDailyJournalQuery';
import { useTop3TodosSetting } from '@/hooks/useTop3TodosSetting';
import { useJournalSetting } from '@/hooks/useJournalSetting';
import type { HabitWeeklyStats } from '@/lib/habits';
import GoalCard from '@/components/GoalCard';
import GoalDetailModal from '@/components/GoalDetailModal';
import AddGoalSheet from '@/components/AddGoalSheet';
import Sparkline from '@/components/Sparkline';
import MetricDetailModal from '@/components/MetricDetailModal';
import EditMetricsSheet from '@/components/EditMetricsSheet';
import WeeklyAdherenceSummary from '@/components/WeeklyAdherenceSummary';
import HabitAdherenceRow from '@/components/HabitAdherenceRow';
import JournalHistorySection from '@/components/JournalHistorySection';

const METRIC_PREFS_KEY = '@metric_preferences';

// ─────────────────────────────────────────────────
// Metric Card Component
// ─────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
  sparklineData?: number[];
  onPress?: () => void;
}

function MetricCard({ title, value, subtitle, icon, color, sparklineData, onPress }: MetricCardProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  return (
    <Wrapper style={styles.metricCard} {...(wrapperProps as any)}>
      <View style={styles.metricCardHeader}>
        <View style={[styles.metricIconContainer, { backgroundColor: color + '18' }]}>
          <FontAwesome name={icon} size={16} color={color} />
        </View>
        {sparklineData && sparklineData.length >= 2 && (
          <Sparkline data={sparklineData} width={80} height={32} color={color} />
        )}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </Wrapper>
  );
}

// ─────────────────────────────────────────────────
// Workout Row Component
// ─────────────────────────────────────────────────

function WorkoutRow({ workout }: { workout: WorkoutSummary }) {
  const date = new Date(workout.date);
  const dayStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <View style={styles.workoutRow}>
      <View style={styles.workoutIcon}>
        <FontAwesome name="bolt" size={14} color={theme.colors.warning} />
      </View>
      <View style={styles.workoutInfo}>
        <Text style={styles.workoutTitle}>{workout.activityName ?? 'Workout'} · {dayStr}</Text>
        <Text style={styles.workoutDetails}>
          {workout.duration} min{workout.calories > 0 ? ` · ${workout.calories} cal` : ''}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────
// Connect Apple Health CTA
// ─────────────────────────────────────────────────

function ConnectHealthCTA({
  onConnect,
  connecting,
  authFailed,
}: {
  onConnect: () => void;
  connecting: boolean;
  authFailed: boolean;
}) {
  return (
    <View style={styles.ctaContainer}>
      <View style={styles.ctaIconContainer}>
        <FontAwesome name="heartbeat" size={48} color={theme.colors.primary} />
      </View>
      <Text style={styles.ctaTitle}>Connect Apple Health</Text>
      <Text style={styles.ctaDescription}>
        Link your health data to see steps, weight, heart rate, and workouts — and auto-complete
        habits based on your activity.
      </Text>

      {authFailed && (
        <View style={styles.authFailedBox}>
          <Text style={styles.authFailedText}>
            Unable to access Health data. Please open{' '}
            <Text style={{ fontWeight: '700' }}>Settings → Health → Thrive</Text> and enable the
            data types you'd like to share, then come back and tap Connect again.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.ctaButton, connecting && { opacity: 0.6 }]}
        onPress={onConnect}
        activeOpacity={0.8}
        disabled={connecting}
      >
        {connecting ? (
          <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
        ) : (
          <FontAwesome name="heart" size={16} color="#fff" style={{ marginRight: 8 }} />
        )}
        <Text style={styles.ctaButtonText}>{connecting ? 'Connecting…' : 'Connect'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────
// Not Available on Android
// ─────────────────────────────────────────────────

function NotAvailable() {
  return (
    <View style={styles.ctaContainer}>
      <View style={styles.ctaIconContainer}>
        <FontAwesome name="heartbeat" size={48} color={theme.colors.textMuted} />
      </View>
      <Text style={styles.ctaTitle}>Health Data</Text>
      <Text style={styles.ctaDescription}>
        Apple Health integration is available on iOS devices only.
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────
// Main Progress Screen
// ─────────────────────────────────────────────────

export default function ProgressScreen() {
  const { user } = useAuth();
  const { isAvailable, isAuthorized, loading, metrics, connect, refresh, authFailed, missingMetrics } = useHealth();
  const [refreshing, setRefreshing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // ── Health history queries (last 7 days for sparklines) ──
  const { data: stepHistory = [] } = useStepHistory(7, isAuthorized);
  const { data: weightHistory = [] } = useWeightHistory(7, isAuthorized);
  const { data: rhrHistory = [] } = useRHRHistory(7, isAuthorized);
  const { data: bodyFatHistory = [] } = useBodyFatHistory(7, isAuthorized);
  const { data: hrvHistory = [] } = useHRVHistory(7, isAuthorized);
  const refreshHealthHistory = useRefreshHealthHistory();

  // ── Goals (cached) ──
  const { data: goals = [] } = useGoals();
  const createGoalMutation = useCreateGoal();
  const deleteGoalMutation = useDeleteGoal();
  const addGoalEntryMutation = useAddGoalEntry();
  const refreshGoals = useRefreshGoals();
  const refreshHabitData = useRefreshAllHabitData();
  const weekRange = getWeekRange(weekOffset);
  const {
    data: weeklyAdherence,
    isLoading: weeklyAdherenceLoading,
  } = useWeeklyAdherence(weekRange.start, weekRange.end);

  // Top 3 Todos for weekly adherence
  const { enabled: top3Enabled } = useTop3TodosSetting();
  const { data: weekTodos = [] } = useDailyTodosForRange(weekRange.start, weekRange.end);

  // Daily Journal
  const { enabled: journalEnabled } = useJournalSetting();
  const journalHistoryRange = React.useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }, []);
  const { data: journalEntries = [] } = useDailyJournalForRange(
    journalHistoryRange.start,
    journalHistoryRange.end
  );

  const top3TodoWeeklyStat = React.useMemo((): HabitWeeklyStats | null => {
    if (!top3Enabled || weekTodos.length === 0) return null;

    const todosByDate = new Map<string, number>();
    const completedByDate = new Map<string, number>();
    for (const todo of weekTodos) {
      todosByDate.set(todo.todo_date, (todosByDate.get(todo.todo_date) ?? 0) + 1);
      if (todo.is_completed) {
        completedByDate.set(todo.todo_date, (completedByDate.get(todo.todo_date) ?? 0) + 1);
      }
    }

    let daysCompleted = 0;
    for (const [date, total] of todosByDate) {
      if (total === 3 && (completedByDate.get(date) ?? 0) === 3) {
        daysCompleted++;
      }
    }

    const targetDays = 7;
    const today = new Date().toISOString().slice(0, 10);
    const weekEnded = weekRange.end < today;

    let status: HabitWeeklyStats['status'];
    if (weekEnded) {
      status = daysCompleted >= targetDays ? 'met' : 'missed';
    } else {
      const d1 = new Date(`${today}T12:00:00`);
      const d2 = new Date(`${weekRange.end}T12:00:00`);
      const remainingDays = Math.max(Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1, 0);
      const remaining = targetDays - daysCompleted;
      if (remaining <= 0) status = 'on_track';
      else if (remaining > remainingDays) status = 'behind';
      else if (remaining === remainingDays) status = 'at_risk';
      else status = 'on_track';
    }

    return {
      habit: { id: '__top3_todos__', name: 'Finish top 3 todos' } as Habit,
      completedDays: daysCompleted,
      targetDays,
      adherencePercent: Math.min(100, Math.round((daysCompleted / targetDays) * 100)),
      status,
    };
  }, [top3Enabled, weekTodos, weekRange.end]);

  // Current values for each goal (loaded in parallel)
  const [goalCurrentValues, setGoalCurrentValues] = useState<Record<string, number | null>>({});
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);

  // ── Metric preferences ──
  const [visibleMetricKeys, setVisibleMetricKeys] = useState<string[]>(DEFAULT_VISIBLE_KEYS);
  const [selectedMetric, setSelectedMetric] = useState<MetricDefinition | null>(null);
  const [showEditMetrics, setShowEditMetrics] = useState(false);

  // Load saved metric preferences on mount
  useEffect(() => {
    AsyncStorage.getItem(METRIC_PREFS_KEY).then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setVisibleMetricKeys(parsed);
          }
        } catch {}
      }
    });
  }, []);

  const handleSaveMetricPrefs = useCallback((newKeys: string[]) => {
    setVisibleMetricKeys(newKeys);
    AsyncStorage.setItem(METRIC_PREFS_KEY, JSON.stringify(newKeys));
  }, []);

  // Load current values for all goals
  useEffect(() => {
    if (goals.length === 0) return;
    const loadValues = async () => {
      const entries = await Promise.all(
        goals.map(async (g) => {
          const val = await getGoalCurrentValue(g);
          return [g.id, val] as [string, number | null];
        })
      );
      setGoalCurrentValues(Object.fromEntries(entries));
    };
    loadValues();
  }, [goals]);

  // Refresh HealthContext metrics on focus (lightweight – just today's data)
  useFocusEffect(
    useCallback(() => {
      if (isAuthorized) {
        refresh();
      }
    }, [isAuthorized, refresh])
  );

  const queryClient = useQueryClient();
  const handleRefresh = async () => {
    setRefreshing(true);
    refreshHabitData();
    refreshHealthHistory();
    refreshGoals();
    queryClient.invalidateQueries({ queryKey: ['dailyTodos'] });
    queryClient.invalidateQueries({ queryKey: ['dailyJournal'] });
    await refresh();
    setRefreshing(false);
  };

  const handleCreateGoal = async (goalData: {
    goal_type: any;
    title: string;
    target_value: number;
    unit: string;
    start_value?: number | null;
    start_date?: string | null;
    rate?: number | null;
    rate_unit?: string | null;
    data_source: 'apple_health' | 'manual';
  }) => {
    if (!user) return;
    try {
      await createGoalMutation.mutateAsync({ userId: user.id, goal: goalData });
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const goal = goals.find((g) => g.id === goalId);
      await deleteGoalMutation.mutateAsync({
        goalId,
        goalType: goal?.goal_type,
      });
      setSelectedGoal(null);
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const handleLogGoalEntry = async (goalId: string, value: number, date: string) => {
    if (!user) return;
    try {
      const goal = goals.find((g) => g.id === goalId);
      await addGoalEntryMutation.mutateAsync({
        goalId,
        userId: user.id,
        value,
        date,
        goalType: goal?.goal_type,
      });
    } catch (error) {
      console.error('Error logging goal entry:', error);
    }
  };

  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connect();
    } finally {
      setConnecting(false);
    }
  };

  // (Format helpers are now centralized in lib/metricsConfig.ts)

  // Map of sparkline data per metric key (for cards that support sparklines)
  const sparklineDataMap: Record<string, number[] | undefined> = {
    steps: stepHistory.map((p) => p.value),
    weight: weightHistory.map((p) => p.value),
    bodyFat: bodyFatHistory.map((p) => p.value),
    restingHR: rhrHistory.map((p) => p.value),
    hrv: hrvHistory.map((p) => p.value),
  };

  // Show non-iOS message
  if (!isAvailable) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progress</Text>
        </View>
        <NotAvailable />
      </SafeAreaView>
    );
  }

  // Show connect CTA
  if (!isAuthorized) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progress</Text>
        </View>
        <ConnectHealthCTA onConnect={handleConnect} connecting={connecting} authFailed={authFailed} />
      </SafeAreaView>
    );
  }

  // Show loading state only on very first load (no cached data)
  if (loading && !metrics.steps && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progress</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Missing Permissions Banner */}
        {missingMetrics.length > 0 && (
          <TouchableOpacity
            style={styles.missingBanner}
            activeOpacity={0.8}
            onPress={() => Linking.openURL('x-apple-health://')}
          >
            <View style={styles.missingBannerLeft}>
              <FontAwesome name="exclamation-circle" size={16} color="#E65100" />
              <View style={styles.missingBannerText}>
                <Text style={styles.missingBannerTitle}>Some health data is unavailable</Text>
                <Text style={styles.missingBannerBody}>
                  Missing: {missingMetrics.map((k) => HEALTH_METRIC_DISPLAY_NAMES[k] ?? k).join(', ')}.{' '}
                  Tap to open Health and grant permissions.
                </Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={12} color="#E65100" />
          </TouchableOpacity>
        )}

        {/* Habit Adherence Section */}
        <WeeklyAdherenceSummary
          weekLabel={weekRange.label}
          weekOffset={weekOffset}
          adherencePercent={(() => {
            const ct = (weeklyAdherence?.completedTotal ?? 0) + (top3TodoWeeklyStat?.completedDays ?? 0);
            const tt = (weeklyAdherence?.targetTotal ?? 0) + (top3TodoWeeklyStat?.targetDays ?? 0);
            return tt > 0 ? Math.min(100, Math.round((ct / tt) * 100)) : 0;
          })()}
          completedTotal={(weeklyAdherence?.completedTotal ?? 0) + (top3TodoWeeklyStat?.completedDays ?? 0)}
          targetTotal={(weeklyAdherence?.targetTotal ?? 0) + (top3TodoWeeklyStat?.targetDays ?? 0)}
          disableNextWeek={weekOffset === 0}
          onPrevWeek={() => setWeekOffset((prev) => prev - 1)}
          onNextWeek={() => setWeekOffset((prev) => Math.min(prev + 1, 0))}
          onJumpToCurrentWeek={() => setWeekOffset(0)}
        />

        {weeklyAdherenceLoading ? (
          <View style={styles.habitAdherenceLoading}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : (weeklyAdherence && weeklyAdherence.stats.length > 0) || top3TodoWeeklyStat ? (
          <View style={styles.habitRows}>
            {weeklyAdherence?.stats.map((stat) => (
              <HabitAdherenceRow key={stat.habit.id} stat={stat} />
            ))}
            {top3TodoWeeklyStat && (
              <HabitAdherenceRow stat={top3TodoWeeklyStat} />
            )}
          </View>
        ) : (
          <View style={styles.emptyHabitsCard}>
            <FontAwesome name="check-square-o" size={20} color={theme.colors.textMuted} />
            <Text style={styles.emptyHabitsText}>
              No active habits yet. Add habits in the Habits tab to start tracking weekly adherence.
            </Text>
          </View>
        )}

        {/* Journal History Section */}
        {journalEnabled && (
          <JournalHistorySection entries={journalEntries} />
        )}

        {/* Goals Section */}
        <View style={styles.goalsSectionHeader}>
          <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>Goals</Text>
          <TouchableOpacity
            style={styles.addGoalButton}
            onPress={() => setShowAddGoal(true)}
            activeOpacity={0.7}
          >
            <FontAwesome name="plus" size={12} color={theme.colors.primary} />
            <Text style={styles.addGoalButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {goals.length > 0 ? (
          <View style={styles.metricsGrid}>
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                currentValue={goalCurrentValues[goal.id] ?? null}
                onPress={() => setSelectedGoal(goal)}
              />
            ))}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.emptyGoalsCard}
            onPress={() => setShowAddGoal(true)}
            activeOpacity={0.7}
          >
            <FontAwesome name="bullseye" size={24} color={theme.colors.textMuted} />
            <Text style={styles.emptyGoalsText}>
              Set goals to track your progress toward what matters most
            </Text>
            <View style={styles.emptyGoalsButton}>
              <FontAwesome name="plus" size={12} color={theme.colors.primary} />
              <Text style={styles.emptyGoalsButtonText}>Add Goal</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Metrics Section */}
        <View style={styles.metricsSectionHeader}>
          <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>Metrics</Text>
          <TouchableOpacity
            style={styles.editMetricsButton}
            onPress={() => setShowEditMetrics(true)}
            activeOpacity={0.7}
          >
            <FontAwesome name="pencil" size={12} color={theme.colors.primary} />
            <Text style={styles.editMetricsButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.metricsGrid}>
          {visibleMetricKeys.map((key) => {
            const metric = getMetricByKey(key);
            if (!metric) return null;
            return (
              <MetricCard
                key={key}
                title={metric.title}
                value={metric.formatValue(metric.getValue(metrics))}
                subtitle={metric.getSubtitle?.(metrics)}
                icon={metric.icon}
                color={metric.color}
                sparklineData={sparklineDataMap[key]}
                onPress={() => setSelectedMetric(metric)}
              />
            );
          })}
        </View>

        {/* Recent Workouts */}
        {metrics.workoutsThisWeek.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Recent Workouts</Text>
            <View style={styles.workoutsCard}>
              {metrics.workoutsThisWeek.slice(0, 5).map((workout) => (
                <WorkoutRow key={workout.id} workout={workout} />
              ))}
            </View>
          </>
        )}

        {/* Hint about linking */}
        <View style={styles.hintCard}>
          <FontAwesome name="lightbulb-o" size={16} color={theme.colors.primary} />
          <Text style={styles.hintText}>
            Link habits to health metrics to auto-complete them when you hit your targets. Edit a
            habit and toggle "Link to Health Metric."
          </Text>
        </View>
      </ScrollView>

      {/* Goal Detail Modal */}
      <GoalDetailModal
        visible={selectedGoal !== null}
        goal={selectedGoal}
        onClose={() => setSelectedGoal(null)}
        onDelete={handleDeleteGoal}
        onLogEntry={handleLogGoalEntry}
      />

      {/* Add Goal Sheet */}
      <AddGoalSheet
        visible={showAddGoal}
        onClose={() => setShowAddGoal(false)}
        onSubmit={handleCreateGoal}
        currentWeight={metrics.weight}
        currentBodyFat={metrics.bodyFatPercentage}
        currentBMI={metrics.bodyMassIndex}
        currentLeanMass={metrics.leanBodyMass}
        currentRHR={metrics.restingHeartRate}
      />

      {/* Metric Detail Modal */}
      <MetricDetailModal
        visible={selectedMetric !== null}
        metric={selectedMetric}
        metrics={metrics}
        onClose={() => setSelectedMetric(null)}
      />

      {/* Edit Metrics Sheet */}
      <EditMetricsSheet
        visible={showEditMetrics}
        visibleKeys={visibleMetricKeys}
        onClose={() => setShowEditMetrics(false)}
        onSave={handleSaveMetricPrefs}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.tabBarClearance,
  },
  sectionLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },

  // Metric Cards
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  metricCard: {
    width: '48.5%' as any,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.sm,
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  metricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  metricTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  metricSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },

  // Workouts
  workoutsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    ...theme.shadow.sm,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  workoutIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.warning + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  workoutDetails: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },

  // Connect CTA
  ctaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  ctaIconContainer: {
    marginBottom: theme.spacing.lg,
    opacity: 0.9,
  },
  ctaTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  authFailedBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  authFailedText: {
    fontSize: theme.fontSize.sm,
    color: '#E65100',
    lineHeight: 20,
    textAlign: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.xl,
    ...theme.shadow.md,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },

  // Missing permissions banner
  missingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3E0',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  missingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: theme.spacing.sm,
  },
  missingBannerText: {
    flex: 1,
  },
  missingBannerTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: '#E65100',
    marginBottom: 2,
  },
  missingBannerBody: {
    fontSize: theme.fontSize.xs,
    color: '#BF360C',
    lineHeight: 18,
  },

  // Metrics section header
  metricsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  editMetricsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  editMetricsButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },

  // Goals
  habitRows: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  habitAdherenceLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
  },
  emptyHabitsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
    ...theme.shadow.sm,
  },
  emptyHabitsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  goalsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  addGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  addGoalButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  emptyGoalsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
    ...theme.shadow.sm,
  },
  emptyGoalsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyGoalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.xs,
  },
  emptyGoalsButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },

  // Hint
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.primaryLight + '15',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  hintText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
