import { Platform } from 'react-native';
import type { HealthMetricType } from './types';

// Types for health data used throughout the app
export interface HealthMetrics {
  steps: number | null;
  weight: number | null; // in lbs
  restingHeartRate: number | null; // bpm
  bodyFatPercentage: number | null; // 0-100%
  leanBodyMass: number | null; // in lbs
  bodyMassIndex: number | null; // scalar
  exerciseMinutes: number | null; // minutes today
  timeInDaylight: number | null; // minutes today
  hrv: number | null; // ms (SDNN)
  workoutsThisWeek: WorkoutSummary[];
}

export interface WorkoutSummary {
  id: string;
  activityType: number;
  activityName: string;
  duration: number; // minutes
  calories: number;
  date: string; // ISO string
}

export interface MetricDataPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

// Re-export so consumers that import from health.ts still work
export type { HealthMetricType } from './types';

const isIOS = Platform.OS === 'ios';

// ──────────────────────────────────────────────
// Lazy-loaded HealthKit module
// ──────────────────────────────────────────────

let _mod: any = null;
let _loadFailed = false;

function getModule() {
  if (_mod) return _mod;
  if (_loadFailed) return null;

  try {
    _mod = require('@kingstinct/react-native-healthkit');
    return _mod;
  } catch (e) {
    console.warn('[HealthKit] Not available (Expo Go or non-iOS):', (e as Error).message);
    _loadFailed = true;
    return null;
  }
}

// In v13, QuantityTypeIdentifier values are plain string constants
const QTI = {
  stepCount: 'HKQuantityTypeIdentifierStepCount',
  bodyMass: 'HKQuantityTypeIdentifierBodyMass',
  restingHeartRate: 'HKQuantityTypeIdentifierRestingHeartRate',
  bodyFatPercentage: 'HKQuantityTypeIdentifierBodyFatPercentage',
  leanBodyMass: 'HKQuantityTypeIdentifierLeanBodyMass',
  bodyMassIndex: 'HKQuantityTypeIdentifierBodyMassIndex',
  appleExerciseTime: 'HKQuantityTypeIdentifierAppleExerciseTime',
  timeInDaylight: 'HKQuantityTypeIdentifierTimeInDaylight',
  heartRateVariabilitySDNN: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
} as const;

const READ_PERMISSIONS = [
  QTI.stepCount,
  QTI.bodyMass,
  QTI.restingHeartRate,
  QTI.bodyFatPercentage,
  QTI.leanBodyMass,
  QTI.bodyMassIndex,
  QTI.appleExerciseTime,
  QTI.timeInDaylight,
  QTI.heartRateVariabilitySDNN,
  'HKWorkoutTypeIdentifier',
];

// Track whether authorization has been confirmed via a successful query
let _authConfirmed = false;

/**
 * Check if HealthKit is available on this device (iOS + native build only)
 */
export function isHealthKitAvailable(): boolean {
  if (!isIOS) return false;
  return getModule() !== null;
}

/**
 * Request HealthKit read permissions.
 * Returns true only if we can verify data access via a test query.
 */
export async function requestHealthPermissions(): Promise<boolean> {
  const mod = getModule();
  if (!mod) return false;

  try {
    console.log('[HealthKit] Calling requestAuthorization...');
    const result = await mod.requestAuthorization({ toRead: READ_PERMISSIONS });
    console.log('[HealthKit] requestAuthorization returned:', result);

    // Brief pause to let iOS finalize the authorization state
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify that we can actually query HealthKit.
    // On iOS, requestAuthorization resolves even if the user denies,
    // so we do a test query to confirm real access.
    const canRead = await verifyReadAccess();
    _authConfirmed = canRead;
    return canRead;
  } catch (error) {
    console.error('[HealthKit] Error requesting authorization:', error);
    return false;
  }
}

/**
 * Verify we can actually read from HealthKit by running a lightweight test query.
 * Returns true if the query succeeds (even with empty data), false if it throws code 5.
 */
async function verifyReadAccess(): Promise<boolean> {
  const mod = getModule();
  if (!mod) return false;

  try {
    // Use getMostRecentQuantitySample — it's lightweight (limit 1)
    await mod.getMostRecentQuantitySample(QTI.stepCount);
    console.log('[HealthKit] Read access verified');
    return true;
  } catch (error: any) {
    const msg = error?.message ?? '';
    if (msg.includes('Code=5') || msg.includes('not determined')) {
      console.warn('[HealthKit] Read access NOT verified — authorization not determined');
      return false;
    }
    // Other errors (network, no data, etc.) are fine — we have access
    console.log('[HealthKit] Test query threw non-auth error (access likely OK):', msg);
    return true;
  }
}

/**
 * Check if we have authorization (called on mount).
 * We do a test query rather than relying on getRequestStatusForAuthorization
 * because iOS intentionally hides read-permission status.
 */
export async function checkHealthAuthorization(): Promise<boolean> {
  if (!isIOS) return false;
  const mod = getModule();
  if (!mod) return false;

  // If we previously confirmed, skip the test
  if (_authConfirmed) return true;

  const canRead = await verifyReadAccess();
  _authConfirmed = canRead;
  return canRead;
}

// ──────────────────────────────────────────────
// Metric Fetchers (all silently return null / empty on auth errors)
// ──────────────────────────────────────────────

/** Returns true if the error is benign (auth denial or no data) and should be silently ignored */
function isBenignHealthKitError(error: any): boolean {
  const msg = error?.message ?? '';
  return (
    msg.includes('Code=5') ||           // Authorization not determined / denied
    msg.includes('Code=11') ||           // No data available for the predicate
    msg.includes('not determined') ||
    msg.includes('Authorization') ||
    msg.includes('No data available')
  );
}

/** Returns true if the error is specifically an authorization denial (Code=5) */
function isPermissionDeniedError(error: any): boolean {
  const msg = error?.message ?? '';
  return msg.includes('Code=5') || msg.includes('not determined') || msg.includes('Authorization');
}

/** @deprecated Use isBenignHealthKitError instead — kept as alias for existing call sites */
const isAuthError = isBenignHealthKitError;

/**
 * Tracks metrics that failed specifically due to permission denial (Code=5).
 * Reset on each full metrics load; used by detectMissingMetrics.
 */
const _deniedMetrics = new Set<string>();

/** Call before a full metrics load to reset tracking */
export function resetDeniedMetrics() {
  _deniedMetrics.clear();
}

/** Record a metric as denied (called from catch blocks) */
function trackIfDenied(metricKey: string, error: any) {
  if (isPermissionDeniedError(error)) {
    _deniedMetrics.add(metricKey);
  }
}

/**
 * Get total step count for a given date
 */
export async function getStepsForDate(date: Date): Promise<number | null> {
  const mod = getModule();
  if (!mod) return null;

  try {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const result = await mod.queryStatisticsForQuantity(
      QTI.stepCount,
      ['cumulativeSum'],
      {
        filter: {
          date: { startDate: start, endDate: end },
        },
      }
    );

    return result?.sumQuantity?.quantity ?? null;
  } catch (error: any) {
    trackIfDenied('steps', error);
    if (!isAuthError(error)) {
      console.error('Error fetching steps:', error);
    }
    return null;
  }
}

/**
 * Get today's total steps
 */
export async function getTodaySteps(): Promise<number | null> {
  return getStepsForDate(new Date());
}

/**
 * Get the most recent weight sample
 */
export async function getLatestWeight(): Promise<number | null> {
  const mod = getModule();
  if (!mod) return null;

  try {
    const sample = await mod.getMostRecentQuantitySample(QTI.bodyMass, 'lb');
    if (!sample) return null;
    return Math.round(sample.quantity * 10) / 10;
  } catch (error: any) {
    trackIfDenied('weight', error);
    if (!isAuthError(error)) {
      console.error('Error fetching weight:', error);
    }
    return null;
  }
}

/**
 * Get today's resting heart rate
 */
export async function getTodayRestingHeartRate(): Promise<number | null> {
  const mod = getModule();
  if (!mod) return null;

  try {
    const sample = await mod.getMostRecentQuantitySample(QTI.restingHeartRate);
    if (!sample) return null;
    return Math.round(sample.quantity);
  } catch (error: any) {
    trackIfDenied('restingHeartRate', error);
    if (!isAuthError(error)) {
      console.error('Error fetching resting heart rate:', error);
    }
    return null;
  }
}

/**
 * Get the most recent body fat percentage
 */
export async function getLatestBodyFatPercentage(): Promise<number | null> {
  const mod = getModule();
  if (!mod) return null;

  try {
    const sample = await mod.getMostRecentQuantitySample(QTI.bodyFatPercentage, '%');
    if (!sample) return null;
    // HealthKit stores body fat as a decimal (0.0–1.0); convert to percentage
    const raw = sample.quantity;
    return Math.round((raw <= 1 ? raw * 100 : raw) * 10) / 10;
  } catch (error: any) {
    trackIfDenied('bodyFatPercentage', error);
    if (!isAuthError(error)) {
      console.error('Error fetching body fat percentage:', error);
    }
    return null;
  }
}

/**
 * Get the most recent lean body mass
 */
export async function getLatestLeanBodyMass(): Promise<number | null> {
  const mod = getModule();
  if (!mod) return null;

  try {
    const sample = await mod.getMostRecentQuantitySample(QTI.leanBodyMass, 'lb');
    if (!sample) return null;
    return Math.round(sample.quantity * 10) / 10;
  } catch (error: any) {
    trackIfDenied('leanBodyMass', error);
    if (!isAuthError(error)) {
      console.error('Error fetching lean body mass:', error);
    }
    return null;
  }
}

/**
 * Get the most recent body mass index
 */
export async function getLatestBMI(): Promise<number | null> {
  const mod = getModule();
  if (!mod) return null;

  try {
    const sample = await mod.getMostRecentQuantitySample(QTI.bodyMassIndex);
    if (!sample) return null;
    return Math.round(sample.quantity * 10) / 10;
  } catch (error: any) {
    trackIfDenied('bodyMassIndex', error);
    if (!isAuthError(error)) {
      console.error('Error fetching BMI:', error);
    }
    return null;
  }
}

/**
 * Get today's exercise minutes (Apple Exercise Time ring)
 */
export async function getTodayExerciseMinutes(): Promise<number | null> {
  const mod = getModule();
  if (!mod) return null;

  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();

    const result = await mod.queryStatisticsForQuantity(
      QTI.appleExerciseTime,
      ['cumulativeSum'],
      {
        filter: {
          date: { startDate: start, endDate: end },
        },
      }
    );

    return result?.sumQuantity?.quantity != null
      ? Math.round(result.sumQuantity.quantity)
      : null;
  } catch (error: any) {
    trackIfDenied('exerciseMinutes', error);
    if (!isAuthError(error)) {
      console.error('Error fetching exercise minutes:', error);
    }
    return null;
  }
}

/**
 * Get today's time in daylight (minutes)
 */
export async function getTodayTimeInDaylight(): Promise<number | null> {
  const mod = getModule();
  if (!mod) return null;

  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();

    const result = await mod.queryStatisticsForQuantity(
      QTI.timeInDaylight,
      ['cumulativeSum'],
      {
        filter: {
          date: { startDate: start, endDate: end },
        },
      }
    );

    return result?.sumQuantity?.quantity != null
      ? Math.round(result.sumQuantity.quantity)
      : null;
  } catch (error: any) {
    trackIfDenied('timeInDaylight', error);
    if (!isAuthError(error)) {
      console.error('Error fetching time in daylight:', error);
    }
    return null;
  }
}

/**
 * Get the most recent HRV (SDNN) reading
 */
export async function getLatestHRV(): Promise<number | null> {
  const mod = getModule();
  if (!mod) return null;

  try {
    const sample = await mod.getMostRecentQuantitySample(QTI.heartRateVariabilitySDNN, 'ms');
    if (!sample) return null;
    return Math.round(sample.quantity);
  } catch (error: any) {
    trackIfDenied('hrv', error);
    if (!isAuthError(error)) {
      console.error('Error fetching HRV:', error);
    }
    return null;
  }
}

// HKWorkoutActivityType number → readable name
const WORKOUT_ACTIVITY_NAMES: Record<number, string> = {
  1: 'Football',
  2: 'Archery',
  3: 'Australian Football',
  4: 'Badminton',
  5: 'Baseball',
  6: 'Basketball',
  7: 'Bowling',
  8: 'Boxing',
  9: 'Climbing',
  10: 'Cricket',
  11: 'Cross Training',
  12: 'Curling',
  13: 'Cycling',
  14: 'Dance',
  16: 'Elliptical',
  17: 'Equestrian Sports',
  18: 'Fencing',
  19: 'Fishing',
  20: 'Functional Training',
  21: 'Golf',
  22: 'Gymnastics',
  23: 'Handball',
  24: 'Hiking',
  25: 'Hockey',
  26: 'Hunting',
  27: 'Lacrosse',
  28: 'Martial Arts',
  29: 'Mind & Body',
  30: 'Mixed Metabolic Cardio',
  31: 'Paddle Sports',
  32: 'Play',
  33: 'Prep & Recovery',
  34: 'Racquetball',
  35: 'Rowing',
  36: 'Rugby',
  37: 'Running',
  38: 'Sailing',
  39: 'Skating',
  40: 'Snow Sports',
  41: 'Soccer',
  42: 'Softball',
  43: 'Squash',
  44: 'Stair Climbing',
  45: 'Surfing',
  46: 'Swimming',
  47: 'Table Tennis',
  48: 'Tennis',
  49: 'Track & Field',
  50: 'Traditional Strength',
  51: 'Volleyball',
  52: 'Walking',
  53: 'Water Fitness',
  54: 'Water Polo',
  55: 'Water Sports',
  56: 'Wrestling',
  57: 'Yoga',
  58: 'Barre',
  59: 'Core Training',
  60: 'Cross Country Skiing',
  61: 'Downhill Skiing',
  62: 'Flexibility',
  63: 'High Intensity Interval Training',
  64: 'Jump Rope',
  65: 'Kickboxing',
  66: 'Pilates',
  67: 'Snowboarding',
  68: 'Stairs',
  69: 'Step Training',
  70: 'Wheelchair Walk',
  71: 'Wheelchair Run',
  72: 'Tai Chi',
  73: 'Mixed Cardio',
  74: 'Hand Cycling',
  75: 'Disc Sports',
  76: 'Fitness Gaming',
  77: 'Cooldown',
  3000: 'Other',
};

function getWorkoutName(activityType: number): string {
  return WORKOUT_ACTIVITY_NAMES[activityType] ?? 'Workout';
}

/** Safely compute workout duration in minutes from a HealthKit workout sample */
function getWorkoutDurationMinutes(w: any): number {
  // Try computing from start/end dates first (most reliable)
  if (w.startDate && w.endDate) {
    const start = w.startDate instanceof Date ? w.startDate : new Date(w.startDate);
    const end = w.endDate instanceof Date ? w.endDate : new Date(w.endDate);
    const ms = end.getTime() - start.getTime();
    if (!isNaN(ms) && ms > 0) return Math.round(ms / 60000);
  }
  // Fall back to duration property (seconds)
  if (typeof w.duration === 'number' && !isNaN(w.duration)) {
    return Math.round(w.duration / 60);
  }
  return 0;
}

/**
 * Get workouts in the last N days
 */
export async function getRecentWorkouts(days: number = 7): Promise<WorkoutSummary[]> {
  const mod = getModule();
  if (!mod) return [];

  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const workouts = await mod.queryWorkoutSamples({
      limit: 0,
      filter: {
        date: { startDate: start, endDate: end },
      },
    });

    return workouts.map((w: any) => ({
      id: w.uuid,
      activityType: w.workoutActivityType,
      activityName: getWorkoutName(w.workoutActivityType),
      duration: getWorkoutDurationMinutes(w),
      calories: Math.round(w.totalEnergyBurned?.quantity ?? 0),
      date: w.startDate instanceof Date
        ? w.startDate.toISOString()
        : typeof w.startDate === 'string'
          ? w.startDate
          : new Date().toISOString(),
    }));
  } catch (error: any) {
    if (!isAuthError(error)) {
      console.error('Error fetching workouts:', error);
    }
    return [];
  }
}

/**
 * Get today's total workout minutes
 */
export async function getTodayWorkoutMinutes(): Promise<number> {
  const mod = getModule();
  if (!mod) return 0;

  try {
    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const workouts = await mod.queryWorkoutSamples({
      limit: 0,
      filter: {
        date: { startDate: start, endDate: end },
      },
    });

    return workouts.reduce((total: number, w: any) => total + getWorkoutDurationMinutes(w), 0);
  } catch (error: any) {
    if (!isAuthError(error)) {
      console.error('Error fetching workout minutes:', error);
    }
    return 0;
  }
}

/**
 * Get all today's metrics in one call
 */
export async function getTodayMetrics(): Promise<HealthMetrics> {
  if (!getModule()) {
    return {
      steps: null, weight: null, restingHeartRate: null,
      bodyFatPercentage: null, leanBodyMass: null, bodyMassIndex: null,
      exerciseMinutes: null, timeInDaylight: null, hrv: null,
      workoutsThisWeek: [],
    };
  }

  // Reset denied tracking so we only capture fresh permission denials
  resetDeniedMetrics();

  const [
    steps, weight, restingHeartRate,
    bodyFatPercentage, leanBodyMass, bodyMassIndex,
    exerciseMinutes, timeInDaylight, hrv,
    workoutsThisWeek,
  ] = await Promise.all([
    getTodaySteps(),
    getLatestWeight(),
    getTodayRestingHeartRate(),
    getLatestBodyFatPercentage(),
    getLatestLeanBodyMass(),
    getLatestBMI(),
    getTodayExerciseMinutes(),
    getTodayTimeInDaylight(),
    getLatestHRV(),
    getRecentWorkouts(7),
  ]);

  return {
    steps, weight, restingHeartRate,
    bodyFatPercentage, leanBodyMass, bodyMassIndex,
    exerciseMinutes, timeInDaylight, hrv,
    workoutsThisWeek,
  };
}

// ──────────────────────────────────────────────
// History / Trends (for charts)
// ──────────────────────────────────────────────

/**
 * Get daily step counts over a date range
 */
export async function getStepHistory(days: number = 30): Promise<MetricDataPoint[]> {
  if (!getModule()) return [];

  try {
    const points: MetricDataPoint[] = [];
    const today = new Date();

    // Limit to avoid massive sequential calls; bail on first auth error
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const steps = await getStepsForDate(date);
      if (steps !== null) {
        points.push({
          date: formatDateLocal(date),
          value: steps,
        });
      }
    }

    return points;
  } catch (error) {
    console.error('Error fetching step history:', error);
    return [];
  }
}

/**
 * Get weight history (all samples) over a date range
 */
export async function getWeightHistory(days: number = 90): Promise<MetricDataPoint[]> {
  const mod = getModule();
  if (!mod) return [];

  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const samples = await mod.queryQuantitySamples(
      QTI.bodyMass,
      {
        unit: 'lb',
        limit: 0,
        filter: {
          date: { startDate: start, endDate: end },
        },
      }
    );

    return samples.map((s: any) => ({
      date: formatDateLocal(new Date(s.startDate)),
      value: Math.round(s.quantity * 10) / 10,
    }));
  } catch (error: any) {
    if (!isAuthError(error)) {
      console.error('Error fetching weight history:', error);
    }
    return [];
  }
}

/**
 * Get resting heart rate history
 */
export async function getRHRHistory(days: number = 30): Promise<MetricDataPoint[]> {
  const mod = getModule();
  if (!mod) return [];

  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const samples = await mod.queryQuantitySamples(
      QTI.restingHeartRate,
      {
        limit: 0,
        filter: {
          date: { startDate: start, endDate: end },
        },
      }
    );

    return samples.map((s: any) => ({
      date: formatDateLocal(new Date(s.startDate)),
      value: Math.round(s.quantity),
    }));
  } catch (error: any) {
    if (!isAuthError(error)) {
      console.error('Error fetching RHR history:', error);
    }
    return [];
  }
}

/**
 * Get body fat percentage history
 */
export async function getBodyFatHistory(days: number = 90): Promise<MetricDataPoint[]> {
  const mod = getModule();
  if (!mod) return [];

  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const samples = await mod.queryQuantitySamples(
      QTI.bodyFatPercentage,
      {
        unit: '%',
        limit: 0,
        filter: { date: { startDate: start, endDate: end } },
      }
    );

    return samples.map((s: any) => {
      const raw = s.quantity;
      return {
        date: formatDateLocal(new Date(s.startDate)),
        value: Math.round((raw <= 1 ? raw * 100 : raw) * 10) / 10,
      };
    });
  } catch (error: any) {
    if (!isAuthError(error)) console.error('Error fetching body fat history:', error);
    return [];
  }
}

/**
 * Get HRV (SDNN) history
 */
export async function getHRVHistory(days: number = 30): Promise<MetricDataPoint[]> {
  const mod = getModule();
  if (!mod) return [];

  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const samples = await mod.queryQuantitySamples(
      QTI.heartRateVariabilitySDNN,
      {
        unit: 'ms',
        limit: 0,
        filter: { date: { startDate: start, endDate: end } },
      }
    );

    return samples.map((s: any) => ({
      date: formatDateLocal(new Date(s.startDate)),
      value: Math.round(s.quantity),
    }));
  } catch (error: any) {
    if (!isAuthError(error)) console.error('Error fetching HRV history:', error);
    return [];
  }
}

// ──────────────────────────────────────────────
// Missing-permissions detection
// ──────────────────────────────────────────────

/** Human-readable labels for each metric (used in the "missing" prompt) */
export const HEALTH_METRIC_DISPLAY_NAMES: Record<string, string> = {
  steps: 'Steps',
  weight: 'Weight',
  restingHeartRate: 'Resting Heart Rate',
  bodyFatPercentage: 'Body Fat Percentage',
  leanBodyMass: 'Lean Body Mass',
  bodyMassIndex: 'Body Mass Index',
  exerciseMinutes: 'Exercise Minutes',
  timeInDaylight: 'Time in Daylight',
  hrv: 'Heart Rate Variability',
};

/**
 * Return only the metrics that failed due to a permission denial (Code=5).
 * Metrics that simply have no data (Code=11 / null) are NOT included.
 */
export function detectMissingMetrics(_m: HealthMetrics): string[] {
  return Array.from(_deniedMetrics);
}

// ──────────────────────────────────────────────
// Auto-completion helpers
// ──────────────────────────────────────────────

/**
 * Get the current value for a given metric type (used for auto-complete checks)
 */
export async function getCurrentMetricValue(metricType: HealthMetricType): Promise<number | null> {
  switch (metricType) {
    case 'steps':
      return getTodaySteps();
    case 'weight':
      return getLatestWeight();
    case 'resting_heart_rate':
      return getTodayRestingHeartRate();
    case 'workout_minutes':
      return getTodayWorkoutMinutes();
    case 'body_fat_percentage':
      return getLatestBodyFatPercentage();
    case 'lean_body_mass':
      return getLatestLeanBodyMass();
    case 'bmi':
      return getLatestBMI();
    case 'exercise_minutes':
      return getTodayExerciseMinutes();
    case 'time_in_daylight':
      return getTodayTimeInDaylight();
    case 'hrv':
      return getLatestHRV();
    default:
      return null;
  }
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
