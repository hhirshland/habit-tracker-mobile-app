import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@/lib/theme';
import { HealthMetrics } from '@/lib/health';
import { MetricDefinition } from '@/lib/metricsConfig';
import { useMetricHistory } from '@/hooks/useHealthQuery';
import MetricChart from './MetricChart';

const screenWidth = Dimensions.get('window').width;

type TimeRange = 'week' | 'month' | '6mo';

const TIME_RANGES: { key: TimeRange; label: string; days: number }[] = [
  { key: 'week', label: 'Week', days: 7 },
  { key: 'month', label: 'Month', days: 28 },
  { key: '6mo', label: '6mo', days: 168 },
];

interface MetricDetailModalProps {
  visible: boolean;
  metric: MetricDefinition | null;
  metrics: HealthMetrics;
  onClose: () => void;
}

export default function MetricDetailModal({
  visible,
  metric,
  metrics,
  onClose,
}: MetricDetailModalProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  const days = TIME_RANGES.find((r) => r.key === timeRange)!.days;
  const { data: historyData = [], isLoading } = useMetricHistory(
    metric?.key ?? null,
    days,
    visible && metric !== null
  );

  // Compute stats from history data
  const stats = useMemo(() => {
    if (historyData.length === 0) return null;

    const values = historyData.map((d) => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { avg, min, max, count: values.length };
  }, [historyData]);

  if (!metric) return null;

  const currentValue = metric.getValue(metrics);
  const subtitle = metric.getSubtitle?.(metrics);

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
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.headerButton}>Close</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={[styles.headerIcon, { backgroundColor: metric.color + '18' }]}>
              <FontAwesome name={metric.icon} size={14} color={metric.color} />
            </View>
            <Text style={styles.headerTitle}>{metric.title}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Value */}
          <View style={styles.currentValueCard}>
            <Text style={styles.currentValueLabel}>Current</Text>
            <Text style={[styles.currentValueText, { color: metric.color }]}>
              {metric.formatValue(currentValue)}
            </Text>
            {subtitle && <Text style={styles.currentValueSubtitle}>{subtitle}</Text>}
          </View>

          {/* Time Range Selector */}
          <View style={styles.timeRangeContainer}>
            {TIME_RANGES.map((range) => (
              <TouchableOpacity
                key={range.key}
                style={[
                  styles.timeRangeButton,
                  timeRange === range.key && [
                    styles.timeRangeButtonActive,
                    { backgroundColor: metric.color + '18' },
                  ],
                ]}
                onPress={() => setTimeRange(range.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    timeRange === range.key && [
                      styles.timeRangeTextActive,
                      { color: metric.color },
                    ],
                  ]}
                >
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chart */}
          <View style={styles.chartCard}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={metric.color} />
                <Text style={styles.loadingText}>Loading data…</Text>
              </View>
            ) : historyData.length > 0 ? (
              <MetricChart
                data={historyData}
                width={screenWidth - theme.spacing.lg * 2 - theme.spacing.md * 2}
                height={220}
                color={metric.color}
                unit={metric.unit}
              />
            ) : (
              <View style={styles.loadingContainer}>
                <FontAwesome name="line-chart" size={24} color={theme.colors.textMuted} />
                <Text style={styles.loadingText}>No data for this period</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          {stats && (
            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Average</Text>
                  <Text style={styles.statValue}>{formatStatValue(stats.avg, metric.unit)}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Min</Text>
                  <Text style={styles.statValue}>{formatStatValue(stats.min, metric.unit)}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Max</Text>
                  <Text style={styles.statValue}>{formatStatValue(stats.max, metric.unit)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Data info */}
          {stats && (
            <View style={styles.dataInfo}>
              <FontAwesome name="database" size={12} color={theme.colors.textMuted} />
              <Text style={styles.dataInfoText}>
                {stats.count} data point{stats.count !== 1 ? 's' : ''} in the last{' '}
                {days === 7 ? '7 days' : days === 28 ? '28 days' : '6 months'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function formatStatValue(value: number, unit: string): string {
  if (unit === 'steps') {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return Math.round(value).toString();
  }
  if (value >= 100) return Math.round(value).toString();
  if (value === 0) return '0';
  return value.toFixed(1);
}

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
    minWidth: 44,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },

  // Current value
  currentValueCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  currentValueLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  currentValueText: {
    fontSize: 42,
    fontWeight: theme.fontWeight.bold,
  },
  currentValueSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  // Time range
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    marginBottom: theme.spacing.md,
    ...theme.shadow.sm,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  timeRangeButtonActive: {
    borderRadius: theme.borderRadius.sm,
  },
  timeRangeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textMuted,
  },
  timeRangeTextActive: {
    fontWeight: theme.fontWeight.bold,
  },

  // Chart
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    minHeight: 220,
    ...theme.shadow.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },

  // Stats
  statsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadow.sm,
  },
  statsRow: {
    flexDirection: 'row',
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

  // Data info
  dataInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  dataInfoText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
});
