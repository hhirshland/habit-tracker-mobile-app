import {
  linearRegression,
  weightedLinearRegression,
  computeGoalTrajectory,
  computeProjection,
  computeWeightedProjection,
  estimateCompletionDate,
  weightedEstimateCompletionDate,
  daysToTarget,
  weightedDaysToTarget,
  computeProgressPercent,
  computeRateBasedProjection,
  RegressionResult,
  WeightedRegressionResult,
} from '../goalMath';
import { Goal } from '../types';

// ── Test helpers ──────────────────────────────────

type MetricDataPoint = { date: string; value: number };

function makeDataPoints(
  startDate: string,
  values: number[],
  intervalDays: number = 1
): MetricDataPoint[] {
  const base = new Date(startDate + 'T12:00:00').getTime();
  const msPerDay = 86400000;
  return values.map((value, i) => {
    const d = new Date(base + i * intervalDays * msPerDay);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return { date: `${year}-${month}-${day}`, value };
  });
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'test-goal-1',
    user_id: 'test-user-1',
    goal_type: 'weight',
    title: 'Lose weight',
    target_value: 180,
    unit: 'lbs',
    start_value: 200,
    start_date: '2025-01-01T00:00:00Z',
    target_date: '2025-07-01T00:00:00Z',
    rate: null,
    rate_unit: null,
    data_source: 'manual',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ── linearRegression ─────────────────────────────

describe('linearRegression', () => {
  it('returns null for empty array', () => {
    expect(linearRegression([])).toBeNull();
  });

  it('returns null for a single data point', () => {
    expect(linearRegression([{ date: '2025-01-01', value: 100 }])).toBeNull();
  });

  it('returns null when all x-values are identical', () => {
    const data = [
      { date: '2025-01-01', value: 100 },
      { date: '2025-01-01', value: 105 },
    ];
    expect(linearRegression(data)).toBeNull();
  });

  it('computes correct slope and intercept for a perfect linear dataset', () => {
    // y = 100 + 2x (x in days)
    const data = makeDataPoints('2025-01-01', [100, 102, 104, 106, 108]);
    const result = linearRegression(data)!;

    expect(result).not.toBeNull();
    expect(result.slope).toBeCloseTo(2, 5);
    expect(result.intercept).toBeCloseTo(100, 5);
    expect(result.r2).toBeCloseTo(1, 5);
    expect(result.n).toBe(5);
  });

  it('returns r2 between 0 and 1 for noisy data', () => {
    const data = makeDataPoints('2025-01-01', [100, 103, 101, 106, 104, 108]);
    const result = linearRegression(data)!;

    expect(result).not.toBeNull();
    expect(result.r2).toBeGreaterThanOrEqual(0);
    expect(result.r2).toBeLessThanOrEqual(1);
    expect(result.slope).toBeGreaterThan(0); // general upward trend
  });

  it('computes correct standard error', () => {
    // Perfect fit with only 2 points: SE should be 0 (n - 2 = 0)
    const data = makeDataPoints('2025-01-01', [100, 102]);
    const result = linearRegression(data)!;
    expect(result.standardError).toBe(0);
  });

  it('computes non-zero standard error for noisy data with >2 points', () => {
    const data = makeDataPoints('2025-01-01', [100, 105, 98, 110, 103]);
    const result = linearRegression(data)!;
    expect(result.standardError).toBeGreaterThan(0);
  });

  it('handles negative slope (declining trend)', () => {
    const data = makeDataPoints('2025-01-01', [200, 198, 196, 194]);
    const result = linearRegression(data)!;
    expect(result.slope).toBeCloseTo(-2, 5);
    expect(result.intercept).toBeCloseTo(200, 5);
  });
});

// ── weightedLinearRegression ─────────────────────

describe('weightedLinearRegression', () => {
  it('returns null for fewer than 2 data points', () => {
    expect(weightedLinearRegression([])).toBeNull();
    expect(weightedLinearRegression([{ date: '2025-01-01', value: 100 }])).toBeNull();
  });

  it('gives more weight to recent data points', () => {
    // Old data trends up, recent data trends down
    const data = [
      ...makeDataPoints('2025-01-01', [100, 110, 120, 130], 1), // days 0-3: up
      ...makeDataPoints('2025-01-15', [130, 125, 120, 115], 1), // days 14-17: down
    ];

    const unweighted = linearRegression(data);
    const weighted = weightedLinearRegression(data, 7); // short half-life

    expect(unweighted).not.toBeNull();
    expect(weighted).not.toBeNull();
    // Weighted should lean toward the recent downward trend
    expect(weighted!.slope).toBeLessThan(unweighted!.slope);
  });

  it('with uniform spacing and consistent trend, results are similar to unweighted', () => {
    // Perfectly linear data — both should give similar slope
    const data = makeDataPoints('2025-01-01', [100, 102, 104, 106, 108, 110]);
    const unweighted = linearRegression(data)!;
    const weighted = weightedLinearRegression(data)!;

    expect(weighted.slope).toBeCloseTo(unweighted.slope, 0);
  });

  it('returns valid nEffective', () => {
    const data = makeDataPoints('2025-01-01', [100, 102, 104, 106, 108]);
    const result = weightedLinearRegression(data)!;
    expect(result.nEffective).toBeGreaterThanOrEqual(2);
    expect(result.nEffective).toBeLessThanOrEqual(data.length);
  });
});

// ── computeGoalTrajectory ────────────────────────

describe('computeGoalTrajectory', () => {
  it('returns empty array when end date is before start date', () => {
    const goal = makeGoal({
      start_date: '2025-07-01T00:00:00Z',
      target_date: '2025-01-01T00:00:00Z',
    });
    expect(computeGoalTrajectory(goal)).toEqual([]);
  });

  it('returns numPoints+1 points interpolated from start to target', () => {
    const goal = makeGoal();
    const points = computeGoalTrajectory(goal, 10);

    expect(points).toHaveLength(11);
    expect(points[0].value).toBeCloseTo(200, 0);
    expect(points[10].value).toBeCloseTo(180, 0);
  });

  it('all dates are formatted as YYYY-MM-DD', () => {
    const goal = makeGoal();
    const points = computeGoalTrajectory(goal, 5);
    points.forEach((p) => {
      expect(p.date).toMatch(DATE_REGEX);
    });
  });

  it('uses rate to calculate end date when no target_date', () => {
    const goal = makeGoal({
      target_date: null,
      rate: 2, // 2 lbs per week
      rate_unit: 'week',
      start_value: 200,
      target_value: 180,
    });
    const points = computeGoalTrajectory(goal, 10);
    expect(points.length).toBeGreaterThan(0);
    expect(points[points.length - 1].value).toBeCloseTo(180, 0);
  });

  it('defaults to 90 days when no target_date or rate', () => {
    const goal = makeGoal({
      target_date: null,
      rate: null,
    });
    const points = computeGoalTrajectory(goal, 50);
    expect(points).toHaveLength(51);
    // First and last dates should be ~90 days apart
    const firstDate = new Date(points[0].date);
    const lastDate = new Date(points[points.length - 1].date);
    const dayDiff = (lastDate.getTime() - firstDate.getTime()) / 86400000;
    expect(dayDiff).toBeCloseTo(90, 0);
  });

  it('uses target_value as start_value when start_value is null', () => {
    const goal = makeGoal({ start_value: null });
    const points = computeGoalTrajectory(goal, 5);
    expect(points[0].value).toBeCloseTo(goal.target_value, 0);
  });
});

// ── computeProjection ────────────────────────────

describe('computeProjection', () => {
  it('returns empty array for fewer than 2 data points', () => {
    const reg: RegressionResult = {
      slope: 1, intercept: 100, r2: 1, standardError: 0, n: 1, xMean: 0, sumSquaredX: 0,
    };
    expect(computeProjection([{ date: '2025-01-01', value: 100 }], reg)).toEqual([]);
  });

  it('predicted values follow regression line', () => {
    const data = makeDataPoints('2025-01-01', [100, 102, 104, 106, 108]);
    const reg = linearRegression(data)!;
    const projection = computeProjection(data, reg, 30);

    expect(projection.length).toBeGreaterThan(0);
    // First projected point should be near the last data value
    expect(projection[0].predicted).toBeCloseTo(108, 1);
  });

  it('confidence band widens further from data', () => {
    const data = makeDataPoints('2025-01-01', [100, 103, 101, 106, 104, 108, 107, 110]);
    const reg = linearRegression(data)!;
    const projection = computeProjection(data, reg, 60);

    const firstWidth = projection[0].upper - projection[0].lower;
    const lastWidth = projection[projection.length - 1].upper - projection[projection.length - 1].lower;
    expect(lastWidth).toBeGreaterThan(firstWidth);
  });

  it('caps output at 121 points (120 + 1) for large futureDays', () => {
    const data = makeDataPoints('2025-01-01', [100, 102, 104]);
    const reg = linearRegression(data)!;
    const projection = computeProjection(data, reg, 500);
    expect(projection).toHaveLength(121);
  });

  it('all dates are formatted as YYYY-MM-DD', () => {
    const data = makeDataPoints('2025-01-01', [100, 102, 104]);
    const reg = linearRegression(data)!;
    const projection = computeProjection(data, reg, 30);
    projection.forEach((p) => {
      expect(p.date).toMatch(DATE_REGEX);
    });
  });
});

// ── computeWeightedProjection ────────────────────

describe('computeWeightedProjection', () => {
  it('returns empty array for fewer than 2 data points', () => {
    const reg: WeightedRegressionResult = {
      slope: 1, intercept: 100, standardError: 0, nEffective: 1,
      xMeanWeighted: 0, sumWeightedSquaredX: 0,
    };
    expect(computeWeightedProjection([{ date: '2025-01-01', value: 100 }], reg)).toEqual([]);
  });

  it('produces projection points with confidence bands', () => {
    const data = makeDataPoints('2025-01-01', [100, 102, 104, 106, 108]);
    const reg = weightedLinearRegression(data)!;
    const projection = computeWeightedProjection(data, reg, 30);

    expect(projection.length).toBeGreaterThan(0);
    projection.forEach((p) => {
      expect(p.upper).toBeGreaterThanOrEqual(p.predicted);
      expect(p.lower).toBeLessThanOrEqual(p.predicted);
    });
  });
});

// ── estimateCompletionDate ───────────────────────

describe('estimateCompletionDate', () => {
  it('returns null for fewer than 2 data points', () => {
    const reg: RegressionResult = {
      slope: 1, intercept: 100, r2: 1, standardError: 0, n: 1, xMean: 0, sumSquaredX: 0,
    };
    expect(estimateCompletionDate([{ date: '2025-01-01', value: 100 }], reg, 200)).toBeNull();
  });

  it('returns null when slope is zero', () => {
    const data = makeDataPoints('2025-01-01', [100, 100, 100]);
    // Manually create a regression with slope=0
    const reg: RegressionResult = {
      slope: 0, intercept: 100, r2: 1, standardError: 0, n: 3, xMean: 1, sumSquaredX: 2,
    };
    expect(estimateCompletionDate(data, reg, 200)).toBeNull();
  });

  it('returns null when target is already passed (in the past)', () => {
    // slope=2, intercept=100. Target 104 is at day 2, last data point is day 4
    const data = makeDataPoints('2025-01-01', [100, 102, 104, 106, 108]);
    const reg = linearRegression(data)!;
    expect(estimateCompletionDate(data, reg, 104)).toBeNull();
  });

  it('returns null when target is more than 2 years out', () => {
    const data = makeDataPoints('2025-01-01', [100, 100.01]); // very slow increase
    const reg = linearRegression(data)!;
    expect(estimateCompletionDate(data, reg, 10000)).toBeNull();
  });

  it('returns valid date for reachable target (weight loss)', () => {
    // slope=-1 (losing 1lb/day), intercept=200
    const data = makeDataPoints('2025-01-01', [200, 199, 198, 197, 196]);
    const reg = linearRegression(data)!;
    const result = estimateCompletionDate(data, reg, 180);

    expect(result).not.toBeNull();
    expect(result).toMatch(DATE_REGEX);
  });

  it('returns valid date for reachable target (steps increase)', () => {
    const data = makeDataPoints('2025-01-01', [5000, 5500, 6000, 6500, 7000]);
    const reg = linearRegression(data)!;
    const result = estimateCompletionDate(data, reg, 10000);

    expect(result).not.toBeNull();
    expect(result).toMatch(DATE_REGEX);
  });
});

// ── weightedEstimateCompletionDate ───────────────

describe('weightedEstimateCompletionDate', () => {
  it('returns null for fewer than 2 data points', () => {
    const reg: WeightedRegressionResult = {
      slope: 1, intercept: 100, standardError: 0, nEffective: 1,
      xMeanWeighted: 0, sumWeightedSquaredX: 0,
    };
    expect(weightedEstimateCompletionDate([{ date: '2025-01-01', value: 100 }], reg, 200)).toBeNull();
  });

  it('returns valid date when target is reachable', () => {
    const data = makeDataPoints('2025-01-01', [200, 199, 198, 197, 196, 195]);
    const reg = weightedLinearRegression(data)!;
    const result = weightedEstimateCompletionDate(data, reg, 180);

    expect(result).not.toBeNull();
    expect(result).toMatch(DATE_REGEX);
  });
});

// ── daysToTarget ─────────────────────────────────

describe('daysToTarget', () => {
  it('returns null for insufficient data', () => {
    const reg: RegressionResult = {
      slope: 1, intercept: 100, r2: 1, standardError: 0, n: 1, xMean: 0, sumSquaredX: 0,
    };
    expect(daysToTarget([], reg, 200)).toBeNull();
  });

  it('returns null when slope is zero', () => {
    const data = makeDataPoints('2025-01-01', [100, 100, 100]);
    const reg: RegressionResult = {
      slope: 0, intercept: 100, r2: 1, standardError: 0, n: 3, xMean: 1, sumSquaredX: 2,
    };
    expect(daysToTarget(data, reg, 200)).toBeNull();
  });

  it('returns null when target is already behind reference date', () => {
    const data = makeDataPoints('2025-01-01', [100, 102, 104, 106, 108]);
    const reg = linearRegression(data)!;
    // Target 104 is already passed (at day 2, last data is day 4)
    expect(daysToTarget(data, reg, 104)).toBeNull();
  });

  it('returns correct day count for known scenario', () => {
    // slope=2, intercept=100. target=120. at day 4 (last), value=108
    // target at day 10. daysFromLast = 10 - 4 = 6
    const data = makeDataPoints('2025-01-01', [100, 102, 104, 106, 108]);
    const reg = linearRegression(data)!;
    const result = daysToTarget(data, reg, 120);

    expect(result).toBe(6);
  });

  it('respects fromDate parameter', () => {
    const data = makeDataPoints('2025-01-01', [100, 102, 104, 106, 108]);
    const reg = linearRegression(data)!;
    // From day 2 (Jan 3), target 120 is at day 10, so 8 days
    const fromDate = new Date('2025-01-03T12:00:00');
    const result = daysToTarget(data, reg, 120, fromDate);

    expect(result).toBe(8);
  });

  it('returns null when more than 730 days out', () => {
    const data = makeDataPoints('2025-01-01', [100, 100.01]);
    const reg = linearRegression(data)!;
    expect(daysToTarget(data, reg, 10000)).toBeNull();
  });
});

// ── weightedDaysToTarget ─────────────────────────

describe('weightedDaysToTarget', () => {
  it('returns null for insufficient data', () => {
    const reg: WeightedRegressionResult = {
      slope: 1, intercept: 100, standardError: 0, nEffective: 1,
      xMeanWeighted: 0, sumWeightedSquaredX: 0,
    };
    expect(weightedDaysToTarget([], reg, 200)).toBeNull();
  });

  it('returns a positive number for a reachable target', () => {
    const data = makeDataPoints('2025-01-01', [100, 102, 104, 106, 108]);
    const reg = weightedLinearRegression(data)!;
    const result = weightedDaysToTarget(data, reg, 120);

    expect(result).not.toBeNull();
    expect(result).toBeGreaterThan(0);
  });
});

// ── computeProgressPercent ───────────────────────

describe('computeProgressPercent', () => {
  it('returns 0 when startValue is null', () => {
    expect(computeProgressPercent(null, 190, 180)).toBe(0);
  });

  it('returns 0 when currentValue is null', () => {
    expect(computeProgressPercent(200, null, 180)).toBe(0);
  });

  it('returns 100 when currentValue equals targetValue and totalChange is 0', () => {
    expect(computeProgressPercent(180, 180, 180)).toBe(100);
  });

  it('returns 0 when currentValue equals startValue and totalChange is nonzero', () => {
    expect(computeProgressPercent(200, 200, 180)).toBe(0);
  });

  it('handles decrease goals correctly (weight loss)', () => {
    // Start 200, current 190, target 180 → 50%
    expect(computeProgressPercent(200, 190, 180)).toBe(50);
  });

  it('handles increase goals correctly (more steps)', () => {
    // Start 5000, current 7500, target 10000 → 50%
    expect(computeProgressPercent(5000, 7500, 10000)).toBe(50);
  });

  it('clamps to 0 when going the wrong direction', () => {
    // Start 200, target 180 (decrease), but current is 210 (going up)
    expect(computeProgressPercent(200, 210, 180)).toBe(0);
  });

  it('clamps to 100 when exceeding target', () => {
    // Start 200, target 180, current 170 (beyond target)
    expect(computeProgressPercent(200, 170, 180)).toBe(100);
  });

  it('returns rounded integer', () => {
    // Start 0, target 3, current 1 → 33.33... → 33
    const result = computeProgressPercent(0, 1, 3);
    expect(result).toBe(33);
    expect(Number.isInteger(result)).toBe(true);
  });
});

// ── computeRateBasedProjection ───────────────────

describe('computeRateBasedProjection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-01T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns empty array when dailyRate is 0', () => {
    const goal = makeGoal({
      rate: null,
      target_date: null,
      start_value: 200,
      target_value: 200, // no change needed
    });
    expect(computeRateBasedProjection(goal, 200)).toEqual([]);
  });

  it('converts weekly rate to daily rate correctly', () => {
    const goal = makeGoal({
      rate: 7, // 7 per week = 1 per day
      start_value: 100,
      target_value: 200,
    });
    const points = computeRateBasedProjection(goal, 100, 90, 10);

    expect(points.length).toBeGreaterThan(0);
    // After 1 day (frac=1/10), should increase by ~(projDays/10) * 1/day
    // The first point (frac=0) should equal startValue
    expect(points[0].predicted).toBeCloseTo(100, 0);
  });

  it('applies negative daily rate for weight loss goals', () => {
    const goal = makeGoal({
      rate: 2, // 2 lbs per week
      start_value: 200,
      target_value: 180,
    });
    const points = computeRateBasedProjection(goal, 200, 90, 10);

    expect(points.length).toBeGreaterThan(0);
    // Last point should be lower than first
    expect(points[points.length - 1].predicted).toBeLessThan(points[0].predicted);
  });

  it('derives rate from goal dates when no explicit rate', () => {
    const goal = makeGoal({
      rate: null,
      start_value: 200,
      target_value: 180,
      start_date: '2025-01-01T00:00:00Z',
      target_date: '2025-04-01T00:00:00Z', // 90 days
    });
    const points = computeRateBasedProjection(goal, 200, 90, 10);

    expect(points.length).toBeGreaterThan(0);
    expect(points[points.length - 1].predicted).toBeLessThan(200);
  });

  it('spread widens over time', () => {
    const goal = makeGoal({ rate: 2, start_value: 200, target_value: 180 });
    const points = computeRateBasedProjection(goal, 200, 90, 50);

    if (points.length > 1) {
      const firstSpread = points[0].upper - points[0].lower;
      const lastSpread = points[points.length - 1].upper - points[points.length - 1].lower;
      expect(lastSpread).toBeGreaterThan(firstSpread);
    }
  });

  it('all dates are formatted as YYYY-MM-DD', () => {
    const goal = makeGoal({ rate: 2, start_value: 200, target_value: 180 });
    const points = computeRateBasedProjection(goal, 200, 90, 10);
    points.forEach((p) => {
      expect(p.date).toMatch(DATE_REGEX);
    });
  });
});
