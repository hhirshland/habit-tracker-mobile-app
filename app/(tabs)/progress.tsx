import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@/lib/theme';
import { useHealth } from '@/contexts/HealthContext';
import {
  getStepHistory,
  getWeightHistory,
  getRHRHistory,
  MetricDataPoint,
  WorkoutSummary,
} from '@/lib/health';
import Sparkline from '@/components/Sparkline';

// ─────────────────────────────────────────────────────
// Metric Card Component
// ─────────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
  sparklineData?: number[];
}

function MetricCard({ title, value, subtitle, icon, color, sparklineData }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
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
    </View>
  );
}

// ─────────────────────────────────────────────────────
// Workout Row Component
// ─────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────
// Connect Apple Health CTA
// ─────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────
// Not Available on Android
// ─────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────
// Main Progress Screen
// ─────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { isAvailable, isAuthorized, loading, metrics, connect, refresh, authFailed } = useHealth();
  const [refreshing, setRefreshing] = useState(false);
  const [stepHistory, setStepHistory] = useState<MetricDataPoint[]>([]);
  const [weightHistory, setWeightHistory] = useState<MetricDataPoint[]>([]);
  const [rhrHistory, setRhrHistory] = useState<MetricDataPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!isAuthorized) return;
    setLoadingHistory(true);
    try {
      const [steps, weight, rhr] = await Promise.all([
        getStepHistory(14),
        getWeightHistory(90),
        getRHRHistory(14),
      ]);
      setStepHistory(steps);
      setWeightHistory(weight);
      setRhrHistory(rhr);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [isAuthorized]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthorized) {
        refresh();
        loadHistory();
      }
    }, [isAuthorized, refresh, loadHistory])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), loadHistory()]);
    setRefreshing(false);
  };

  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const success = await connect();
      if (success) {
        loadHistory();
      }
    } finally {
      setConnecting(false);
    }
  };

  // Format helpers
  const formatSteps = (steps: number | null) => {
    if (steps === null) return '—';
    if (steps >= 1000) return `${(steps / 1000).toFixed(1)}k`;
    return steps.toString();
  };

  const formatWeight = (weight: number | null) => {
    if (weight === null) return '—';
    return `${weight} lbs`;
  };

  const formatRHR = (rhr: number | null) => {
    if (rhr === null) return '—';
    return `${rhr} bpm`;
  };

  const workoutCountThisWeek = metrics.workoutsThisWeek.length;
  const totalWorkoutMinutes = metrics.workoutsThisWeek.reduce((sum, w) => sum + w.duration, 0);

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

  // Show loading state
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
        {/* Metric Cards Grid */}
        <Text style={styles.sectionLabel}>Today</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Steps"
            value={formatSteps(metrics.steps)}
            icon="road"
            color="#4CAF50"
            sparklineData={stepHistory.map((p) => p.value)}
          />
          <MetricCard
            title="Weight"
            value={formatWeight(metrics.weight)}
            icon="balance-scale"
            color="#2196F3"
            sparklineData={weightHistory.map((p) => p.value)}
          />
          <MetricCard
            title="Resting HR"
            value={formatRHR(metrics.restingHeartRate)}
            icon="heartbeat"
            color="#E91E63"
            sparklineData={rhrHistory.map((p) => p.value)}
          />
          <MetricCard
            title="Workouts"
            value={`${workoutCountThisWeek}`}
            subtitle={totalWorkoutMinutes > 0 ? `${totalWorkoutMinutes} min this week` : 'This week'}
            icon="bolt"
            color={theme.colors.warning}
          />
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
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────

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
    paddingBottom: theme.spacing.xxl,
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
