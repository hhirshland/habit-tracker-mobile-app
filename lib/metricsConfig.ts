import FontAwesome from '@expo/vector-icons/FontAwesome';
import { HealthMetrics } from './health';
import { theme } from './theme';

// ──────────────────────────────────────────────
// Metric Definitions
// ──────────────────────────────────────────────

export interface MetricDefinition {
  key: string;
  title: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
  unit: string;
  getValue: (metrics: HealthMetrics) => number | null;
  formatValue: (value: number | null) => string;
  getSubtitle?: (metrics: HealthMetrics) => string | undefined;
}

export const ALL_METRICS: MetricDefinition[] = [
  {
    key: 'steps',
    title: 'Steps',
    icon: 'road',
    color: '#4CAF50',
    unit: 'steps',
    getValue: (m) => m.steps,
    formatValue: (v) => {
      if (v === null) return '—';
      if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
      return v.toString();
    },
  },
  {
    key: 'exercise',
    title: 'Exercise',
    icon: 'clock-o',
    color: '#FF5722',
    unit: 'min',
    getValue: (m) => m.exerciseMinutes,
    formatValue: (v) => (v === null ? '—' : `${v} min`),
  },
  {
    key: 'weight',
    title: 'Weight',
    icon: 'balance-scale',
    color: '#2196F3',
    unit: 'lbs',
    getValue: (m) => m.weight,
    formatValue: (v) => (v === null ? '—' : `${v} lbs`),
  },
  {
    key: 'bodyFat',
    title: 'Body Fat',
    icon: 'pie-chart',
    color: '#9C27B0',
    unit: '%',
    getValue: (m) => m.bodyFatPercentage,
    formatValue: (v) => (v === null ? '—' : `${v}%`),
  },
  {
    key: 'leanMass',
    title: 'Lean Mass',
    icon: 'child',
    color: '#00BCD4',
    unit: 'lbs',
    getValue: (m) => m.leanBodyMass,
    formatValue: (v) => (v === null ? '—' : `${v} lbs`),
  },
  {
    key: 'bmi',
    title: 'BMI',
    icon: 'calculator',
    color: '#607D8B',
    unit: '',
    getValue: (m) => m.bodyMassIndex,
    formatValue: (v) => (v === null ? '—' : `${v}`),
  },
  {
    key: 'restingHR',
    title: 'Resting HR',
    icon: 'heartbeat',
    color: '#E91E63',
    unit: 'bpm',
    getValue: (m) => m.restingHeartRate,
    formatValue: (v) => (v === null ? '—' : `${v} bpm`),
  },
  {
    key: 'hrv',
    title: 'HRV',
    icon: 'signal',
    color: '#3F51B5',
    unit: 'ms',
    getValue: (m) => m.hrv,
    formatValue: (v) => (v === null ? '—' : `${v} ms`),
  },
  {
    key: 'daylight',
    title: 'Daylight',
    icon: 'sun-o',
    color: '#FFC107',
    unit: 'min',
    getValue: (m) => m.timeInDaylight,
    formatValue: (v) => (v === null ? '—' : `${v} min`),
  },
  {
    key: 'workouts',
    title: 'Workouts',
    icon: 'bolt',
    color: theme.colors.warning,
    unit: 'workouts',
    getValue: (m) => m.workoutsThisWeek.length,
    formatValue: (v) => (v === null ? '—' : `${v}`),
    getSubtitle: (m) => {
      const total = m.workoutsThisWeek.reduce((sum, w) => sum + w.duration, 0);
      return total > 0 ? `${total} min this week` : 'This week';
    },
  },
];

/** Default ordered list of all metric keys (all visible) */
export const DEFAULT_VISIBLE_KEYS = ALL_METRICS.map((m) => m.key);

/** Look up a metric definition by key */
export function getMetricByKey(key: string): MetricDefinition | undefined {
  return ALL_METRICS.find((m) => m.key === key);
}
