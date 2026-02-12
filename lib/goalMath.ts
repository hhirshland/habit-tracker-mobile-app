import { MetricDataPoint } from './health';
import { Goal } from './types';

// ──────────────────────────────────────────────
// Linear Regression
// ──────────────────────────────────────────────

export interface RegressionResult {
  slope: number; // change per day
  intercept: number; // value at day 0 (the first data point's date)
  r2: number; // coefficient of determination
  standardError: number; // standard error of the estimate
  n: number; // number of data points
  xMean: number;
  sumSquaredX: number; // sum of (xi - xMean)^2
}

/**
 * Compute simple linear regression on data points.
 * X-axis is days since the first data point.
 */
export function linearRegression(data: MetricDataPoint[]): RegressionResult | null {
  if (data.length < 2) return null;

  const baseDate = new Date(data[0].date).getTime();
  const msPerDay = 86400000;

  const points = data.map((d) => ({
    x: (new Date(d.date).getTime() - baseDate) / msPerDay,
    y: d.value,
  }));

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const sumY2 = points.reduce((s, p) => s + p.y * p.y, 0);

  const xMean = sumX / n;
  const yMean = sumY / n;

  const denom = sumX2 - (sumX * sumX) / n;
  if (denom === 0) return null;

  const slope = (sumXY - (sumX * sumY) / n) / denom;
  const intercept = yMean - slope * xMean;

  // R-squared
  const ssRes = points.reduce((s, p) => {
    const predicted = slope * p.x + intercept;
    return s + (p.y - predicted) ** 2;
  }, 0);
  const ssTot = sumY2 - (sumY * sumY) / n;
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  // Standard error of estimate
  const se = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  // Sum of squared deviations of x
  const sumSquaredX = points.reduce((s, p) => s + (p.x - xMean) ** 2, 0);

  return { slope, intercept, r2, standardError: se, n, xMean, sumSquaredX };
}

// ──────────────────────────────────────────────
// Goal Trajectory
// ──────────────────────────────────────────────

export interface TrajectoryPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

/**
 * Compute the ideal goal trajectory line.
 * If rate is set, uses rate-based decline/increase from start_value.
 * If target_date is set, interpolates linearly from start_value to target_value.
 */
export function computeGoalTrajectory(goal: Goal, numPoints: number = 50): TrajectoryPoint[] {
  const startValue = goal.start_value ?? goal.target_value;
  const startDate = new Date(goal.start_date);
  const msPerDay = 86400000;

  let endDate: Date;
  if (goal.target_date) {
    endDate = new Date(goal.target_date);
  } else if (goal.rate && goal.rate > 0) {
    // Calculate how long it takes to reach target at the given rate (per week)
    const totalChange = Math.abs(goal.target_value - startValue);
    const weeksNeeded = totalChange / goal.rate;
    const daysNeeded = Math.ceil(weeksNeeded * 7);
    endDate = new Date(startDate.getTime() + daysNeeded * msPerDay);
  } else {
    // Default: show 90 days
    endDate = new Date(startDate.getTime() + 90 * msPerDay);
  }

  const totalDays = (endDate.getTime() - startDate.getTime()) / msPerDay;
  if (totalDays <= 0) return [];

  const points: TrajectoryPoint[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const frac = i / numPoints;
    const dayOffset = frac * totalDays;
    const date = new Date(startDate.getTime() + dayOffset * msPerDay);
    const value = startValue + (goal.target_value - startValue) * frac;
    points.push({
      date: formatDateLocal(date),
      value: Math.round(value * 10) / 10,
    });
  }

  return points;
}

// ──────────────────────────────────────────────
// Trend Projection with Confidence Band
// ──────────────────────────────────────────────

export interface ProjectionPoint {
  date: string;
  predicted: number;
  upper: number;
  lower: number;
}

/**
 * Project the current trend into the future using the regression results.
 * Returns points with a widening confidence band.
 *
 * @param data - Historical data points
 * @param regression - Pre-computed regression result
 * @param futureDays - How many days to project forward from the projection start
 * @param confidenceMultiplier - Multiplier for the confidence band (default 1.96 for ~95%)
 * @param projectionStartDate - Date to start the projection from (default: last data point)
 */
export function computeProjection(
  data: MetricDataPoint[],
  regression: RegressionResult,
  futureDays: number = 60,
  confidenceMultiplier: number = 1.96,
  projectionStartDate?: Date
): ProjectionPoint[] {
  if (data.length < 2) return [];

  const baseDate = new Date(data[0].date).getTime();
  const msPerDay = 86400000;
  const lastDate = new Date(data[data.length - 1].date).getTime();

  // Start projection from the given date (e.g. today) or the last data point
  const startMs = projectionStartDate ? projectionStartDate.getTime() : lastDate;
  const startDayX = (startMs - baseDate) / msPerDay;

  const { slope, intercept, standardError, n, xMean, sumSquaredX } = regression;

  // Ensure the confidence band always has visible width.
  // When n <= 2, standardError is 0 (perfect fit). Use a minimum spread
  // based on the data value range so the area chart is visible.
  const values = data.map((d) => d.value);
  const valRange = Math.max(...values) - Math.min(...values);
  const meanVal = values.reduce((s, v) => s + v, 0) / values.length;
  const minSE = Math.max(valRange * 0.15, Math.abs(meanVal) * 0.02, 0.5);
  const effectiveSE = Math.max(standardError, minSE);

  const points: ProjectionPoint[] = [];
  const numPoints = Math.min(futureDays, 120); // cap at 120 points

  for (let i = 0; i <= numPoints; i++) {
    const dayOffset = startDayX + (i / numPoints) * futureDays;
    const date = new Date(baseDate + dayOffset * msPerDay);
    const predicted = slope * dayOffset + intercept;

    // Prediction interval width widens as we move away from the data center
    const h = 1 + 1 / n + (sumSquaredX > 0 ? (dayOffset - xMean) ** 2 / sumSquaredX : 0);
    const interval = confidenceMultiplier * effectiveSE * Math.sqrt(h);

    points.push({
      date: formatDateLocal(date),
      predicted: Math.round(predicted * 10) / 10,
      upper: Math.round((predicted + interval) * 10) / 10,
      lower: Math.round((predicted - interval) * 10) / 10,
    });
  }

  return points;
}

/**
 * Estimate when the trend line will reach the target value.
 * Returns a date string or null if unreachable / moving away.
 */
export function estimateCompletionDate(
  data: MetricDataPoint[],
  regression: RegressionResult,
  targetValue: number
): string | null {
  if (data.length < 2) return null;

  const { slope, intercept } = regression;
  if (slope === 0) return null;

  const baseDate = new Date(data[0].date).getTime();
  const msPerDay = 86400000;

  // dayX where predicted = targetValue
  const dayX = (targetValue - intercept) / slope;
  const lastDayX = (new Date(data[data.length - 1].date).getTime() - baseDate) / msPerDay;

  // Only valid if it's in the future
  if (dayX <= lastDayX) return null;

  // Don't project more than 2 years out
  if (dayX - lastDayX > 730) return null;

  const estimatedDate = new Date(baseDate + dayX * msPerDay);
  return formatDateLocal(estimatedDate);
}

/**
 * Compute a rate-based projection when there isn't enough data for regression.
 * Uses the goal's rate (per week) or the trajectory slope to project forward
 * from the last known value.
 */
export function computeRateBasedProjection(
  goal: Goal,
  currentValue: number | null,
  futureDays: number = 90,
  numPoints: number = 50
): ProjectionPoint[] {
  const startValue = currentValue ?? goal.start_value ?? goal.target_value;
  const msPerDay = 86400000;

  // Determine the daily rate of change
  let dailyRate: number;
  if (goal.rate && goal.rate > 0) {
    // rate is per week; convert to per day
    dailyRate = goal.rate / 7;
    // If target is less than start, the rate should be negative (e.g. weight loss)
    if (goal.target_value < startValue) {
      dailyRate = -dailyRate;
    }
  } else {
    // Derive rate from start_value → target_value over the trajectory duration
    const sv = goal.start_value ?? goal.target_value;
    const totalChange = goal.target_value - sv;
    const trajDays = goal.target_date
      ? (new Date(goal.target_date).getTime() - new Date(goal.start_date).getTime()) / msPerDay
      : 90;
    dailyRate = trajDays > 0 ? totalChange / trajDays : 0;
  }

  if (dailyRate === 0) return [];

  // Calculate how many days until target is reached at this rate
  const remaining = goal.target_value - startValue;
  const daysNeeded = Math.abs(remaining / dailyRate);
  const projDays = Math.min(Math.ceil(daysNeeded), futureDays, 730);

  const baseDate = new Date(); // project from today
  const points: ProjectionPoint[] = [];

  // Use a variance spread that widens over time (±2% of value per 30 days)
  const spreadPerDay = Math.abs(startValue) * 0.02 / 30;

  for (let i = 0; i <= numPoints; i++) {
    const frac = i / numPoints;
    const dayOffset = frac * projDays;
    const date = new Date(baseDate.getTime() + dayOffset * msPerDay);
    const predicted = startValue + dailyRate * dayOffset;
    const spread = spreadPerDay * dayOffset;

    points.push({
      date: formatDateLocal(date),
      predicted: Math.round(predicted * 10) / 10,
      upper: Math.round((predicted + spread) * 10) / 10,
      lower: Math.round((predicted - spread) * 10) / 10,
    });
  }

  return points;
}

/**
 * Compute the number of future days until the regression trend reaches the target value.
 * By default counts from the last data point; pass `fromDate` to count from a specific date (e.g. today).
 * Returns null if slope is zero, target is already passed, or > 2 years out.
 */
export function daysToTarget(
  data: MetricDataPoint[],
  regression: RegressionResult,
  targetValue: number,
  fromDate?: Date
): number | null {
  if (data.length < 2) return null;

  const { slope, intercept } = regression;
  if (slope === 0) return null;

  const baseDate = new Date(data[0].date).getTime();
  const msPerDay = 86400000;

  // Reference point: fromDate (e.g. today) or the last data point
  const refMs = fromDate ? fromDate.getTime() : new Date(data[data.length - 1].date).getTime();
  const refDayX = (refMs - baseDate) / msPerDay;

  // Day (from base) where the regression line hits the target
  const targetDayX = (targetValue - intercept) / slope;

  // Must be in the future relative to the reference date
  if (targetDayX <= refDayX) return null;

  const futureDays = targetDayX - refDayX;

  // Cap at 2 years
  if (futureDays > 730) return null;

  return Math.ceil(futureDays);
}

/**
 * Compute progress percentage toward goal.
 * Handles both "decrease" goals (weight loss) and "increase" goals (more steps).
 */
export function computeProgressPercent(
  startValue: number | null,
  currentValue: number | null,
  targetValue: number
): number {
  if (startValue === null || currentValue === null) return 0;
  const totalChange = targetValue - startValue;
  if (totalChange === 0) return currentValue === targetValue ? 100 : 0;
  const currentChange = currentValue - startValue;
  const percent = (currentChange / totalChange) * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
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
