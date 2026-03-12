import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, type ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useHealth } from '@/contexts/HealthContext';
import {
  HEALTH_METRIC_DISPLAY_NAMES,
} from '@/lib/health';
import { getWeekRange } from '@/lib/habits';
import { getGoalCurrentValue } from '@/lib/goals';
import { Goal, Habit, QualifyingWeek } from '@/lib/types';
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
import { useUserSettings } from '@/contexts/UserSettingsContext';
import type { HabitWeeklyStats } from '@/lib/habits';
import GoalCard from '@/components/GoalCard';
import GoalDetailModal from '@/components/GoalDetailModal';
import AddGoalSheet from '@/components/AddGoalSheet';
import Sparkline from '@/components/Sparkline';
import MetricDetailModal from '@/components/MetricDetailModal';
import EditMetricsSheet from '@/components/EditMetricsSheet';
import HabitsThisWeek from '@/components/HabitsThisWeek';
import JournalHistorySection from '@/components/JournalHistorySection';
import WeeklyRecapBanner from '@/components/WeeklyRecapBanner';
import WeeklyRecapDetail from '@/components/WeeklyRecapDetail';
import WeeklyRecapsHistory from '@/components/WeeklyRecapsHistory';
import {
  useQualifyingWeeks,
  useRefreshRecaps,
} from '@/hooks/useWeeklyRecapsQuery';

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
  styles: ReturnType<typeof createStyles>;
}

function MetricCard({ title, value, subtitle, icon, color, sparklineData, onPress, styles }: MetricCardProps) {
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
// Connect Apple Health CTA
// ─────────────────────────────────────────────────

function ConnectHealthCTA({
  onConnect,
  connecting,
  authFailed,
  styles,
  colors,
}: {
  onConnect: () => void;
  connecting: boolean;
  authFailed: boolean;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.ctaContainer}>
      <View style={styles.ctaIconContainer}>
        <FontAwesome name="heartbeat" size={48} color={colors.primary} />
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

function NotAvailable({ styles, colors }: { styles: ReturnType<typeof createStyles>; colors: ThemeColors }) {
  return (
    <View style={styles.ctaContainer}>
      <View style={styles.ctaIconContainer}>
        <FontAwesome name="heartbeat" size={48} color={colors.textMuted} />
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { isAvailable, isAuthorized, loading, metrics, connect, refresh, authFailed, missingMetrics } = useHealth();
  const { settings } = useUserSettings();
  const [refreshing, setRefreshing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedRecapWeek, setSelectedRecapWeek] = useState<QualifyingWeek | null>(null);

  // ── Weekly Recaps ──
  const refreshRecaps = useRefreshRecaps();

  const recapSinceDate = useMemo(() => {
    if (!user) return null;
    return user.created_at?.slice(0, 10) ?? null;
  }, [user]);
  const { data: qualifyingWeeks = [] } = useQualifyingWeeks(recapSinceDate);

  // Unseen = ungenerated OR generated-but-unread (shown as banners at top)
  const unseenWeeks = useMemo(
    () => qualifyingWeeks.filter((w) => !w.recap || !w.recap.is_read),
    [qualifyingWeeks],
  );
  // Viewed = generated + read (shown in history horizontal scroll)
  const viewedWeeks = useMemo(
    () => qualifyingWeeks.filter((w) => w.recap && w.recap.is_read),
    [qualifyingWeeks],
  );

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
  const top3Enabled = settings.top3_todos_enabled;
  const { data: weekTodos = [] } = useDailyTodosForRange(weekRange.start, weekRange.end);

  // Daily Journal
  const journalEnabled = settings.journal_enabled;
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
    const datesCompleted: string[] = [];
    for (const [date, total] of todosByDate) {
      if (total === 3 && (completedByDate.get(date) ?? 0) === 3) {
        daysCompleted++;
        datesCompleted.push(date);
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
      if (remaining > remainingDays) status = 'behind';
      else status = 'on_track';
    }

    return {
      habit: { id: '__top3_todos__', name: 'Complete daily intentions' } as Habit,
      completedDays: daysCompleted,
      targetDays,
      adherencePercent: Math.min(100, Math.round((daysCompleted / targetDays) * 100)),
      status,
      completedDates: datesCompleted,
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
  const [showJournalHistory, setShowJournalHistory] = useState(false);

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
    refreshGoals();
    refreshRecaps();
    queryClient.invalidateQueries({ queryKey: ['dailyTodos'] });
    queryClient.invalidateQueries({ queryKey: ['dailyJournal'] });
    if (isAuthorized) {
      refreshHealthHistory();
      await refresh();
    }
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

  const healthReady = isAvailable && isAuthorized;

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
            tintColor={colors.primary}
          />
        }
      >
        {/* Unseen Weekly Recap Banners (ungenerated + generated-but-unread) */}
        {unseenWeeks.map((week) => (
          <WeeklyRecapBanner
            key={week.week_start}
            week={week}
            onPress={() => setSelectedRecapWeek(week)}
          />
        ))}

        {/* Missing Permissions Banner */}
        {healthReady && missingMetrics.length > 0 && (
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
        <HabitsThisWeek
          weekLabel={weekRange.label}
          weekStart={weekRange.start}
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
          isLoading={weeklyAdherenceLoading}
          stats={weeklyAdherence?.stats ?? []}
          top3TodoWeeklyStat={top3TodoWeeklyStat}
        />

        {/* Weekly Recaps History (viewed only) */}
        <WeeklyRecapsHistory
          weeks={viewedWeeks}
          onSelectWeek={setSelectedRecapWeek}
        />

        {/* Journal History Row */}
        {journalEnabled && journalEntries.length > 0 && (
          <TouchableOpacity
            style={styles.journalRow}
            onPress={() => setShowJournalHistory(true)}
            activeOpacity={0.7}
          >
            <View style={styles.journalRowLeft}>
              <FontAwesome name="book" size={16} color={colors.primary} />
              <Text style={styles.journalRowLabel}>Journal</Text>
              <Text style={styles.journalRowCount}>{journalEntries.length} entries</Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Goals Section */}
        <View style={styles.goalsSectionHeader}>
          <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>Goals</Text>
          <TouchableOpacity
            style={styles.addGoalButton}
            onPress={() => setShowAddGoal(true)}
            activeOpacity={0.7}
          >
            <FontAwesome name="plus" size={12} color={colors.primary} />
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
            <FontAwesome name="bullseye" size={24} color={colors.textMuted} />
            <Text style={styles.emptyGoalsText}>
              Set goals to track your progress toward what matters most
            </Text>
            <View style={styles.emptyGoalsButton}>
              <FontAwesome name="plus" size={12} color={colors.primary} />
              <Text style={styles.emptyGoalsButtonText}>Add Goal</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Metrics Section — gated by HealthKit access */}
        {healthReady ? (
          <>
            <View style={styles.metricsSectionHeader}>
              <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>Metrics</Text>
              <TouchableOpacity
                style={styles.editMetricsButton}
                onPress={() => setShowEditMetrics(true)}
                activeOpacity={0.7}
              >
                <FontAwesome name="pencil" size={12} color={colors.primary} />
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
                    styles={styles}
                  />
                );
              })}
            </View>

            {/* Hint about linking */}
            <View style={styles.hintCard}>
              <FontAwesome name="lightbulb-o" size={16} color={colors.primary} />
              <Text style={styles.hintText}>
                Link habits to health metrics to auto-complete them when you hit your targets. Edit a
                habit and toggle "Link to Health Metric."
              </Text>
            </View>
          </>
        ) : isAvailable ? (
          <ConnectHealthCTA onConnect={handleConnect} connecting={connecting} authFailed={authFailed} styles={styles} colors={colors} />
        ) : (
          <NotAvailable styles={styles} colors={colors} />
        )}
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

      {/* Weekly Recap Detail Modal */}
      <WeeklyRecapDetail
        visible={selectedRecapWeek !== null}
        week={selectedRecapWeek}
        onClose={() => setSelectedRecapWeek(null)}
      />

      {/* Journal History Modal */}
      <Modal
        visible={showJournalHistory}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowJournalHistory(false)}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.journalModalHeader}>
            <Text style={styles.headerTitle}>Journal History</Text>
            <TouchableOpacity onPress={() => setShowJournalHistory(false)}>
              <FontAwesome name="times" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
            showsVerticalScrollIndicator={false}
          >
            <JournalHistorySection entries={journalEntries} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textPrimary,
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
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  journalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    ...theme.shadow.sm,
  },
  journalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  journalRowLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.textPrimary,
  },
  journalRowCount: {
    fontSize: theme.fontSize.sm,
    color: colors.textMuted,
  },
  journalModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Metric Cards
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  metricCard: {
    width: '48.5%' as any,
    backgroundColor: colors.surface,
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
    color: colors.textPrimary,
    marginBottom: 2,
  },
  metricTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: colors.textSecondary,
  },
  metricSubtitle: {
    fontSize: theme.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },


  // Connect CTA
  ctaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  ctaIconContainer: {
    marginBottom: theme.spacing.lg,
    opacity: 0.9,
  },
  ctaTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: theme.fontSize.md,
    color: colors.textSecondary,
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
    backgroundColor: colors.primary,
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
    color: colors.primary,
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
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
    ...theme.shadow.sm,
  },
  emptyHabitsText: {
    fontSize: theme.fontSize.sm,
    color: colors.textSecondary,
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
    color: colors.primary,
  },
  emptyGoalsCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
    ...theme.shadow.sm,
  },
  emptyGoalsText: {
    fontSize: theme.fontSize.sm,
    color: colors.textSecondary,
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
    color: colors.primary,
  },

  // Hint
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryLightOverlay15,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  hintText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  });
}
