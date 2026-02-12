import { supabase } from './supabase';
import { Goal, GoalEntry, GoalType } from './types';
import {
  getWeightHistory,
  getStepHistory,
  getRHRHistory,
  getBodyFatHistory,
  getLatestWeight,
  getLatestBodyFatPercentage,
  getLatestBMI,
  getLatestLeanBodyMass,
  getTodaySteps,
  getTodayRestingHeartRate,
  MetricDataPoint,
} from './health';

// ──────────────────────────────────────────────
// Goal CRUD
// ──────────────────────────────────────────────

export async function getGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createGoal(
  userId: string,
  goal: {
    goal_type: GoalType;
    title: string;
    target_value: number;
    unit: string;
    start_value?: number | null;
    start_date?: string | null;
    target_date?: string | null;
    rate?: number | null;
    rate_unit?: string | null;
    data_source: 'apple_health' | 'manual';
  }
): Promise<Goal> {
  const insertData: Record<string, any> = {
    user_id: userId,
    goal_type: goal.goal_type,
    title: goal.title,
    target_value: goal.target_value,
    unit: goal.unit,
    start_value: goal.start_value ?? null,
    target_date: goal.target_date ?? null,
    rate: goal.rate ?? null,
    rate_unit: goal.rate_unit ?? null,
    data_source: goal.data_source,
  };

  // Only override start_date if explicitly provided (otherwise DB defaults to now())
  if (goal.start_date) {
    insertData.start_date = goal.start_date;
  }

  const { data, error } = await supabase
    .from('goals')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGoal(
  goalId: string,
  updates: Partial<Pick<Goal, 'title' | 'target_value' | 'unit' | 'target_date' | 'rate' | 'rate_unit' | 'is_active'>>
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', goalId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .update({ is_active: false })
    .eq('id', goalId);

  if (error) throw error;
}

// ──────────────────────────────────────────────
// Goal Entry CRUD (manual data points)
// ──────────────────────────────────────────────

export async function getGoalEntries(
  goalId: string,
  days?: number
): Promise<GoalEntry[]> {
  let query = supabase
    .from('goal_entries')
    .select('*')
    .eq('goal_id', goalId)
    .order('recorded_date', { ascending: true });

  if (days) {
    const start = new Date();
    start.setDate(start.getDate() - days);
    query = query.gte('recorded_date', formatDate(start));
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addGoalEntry(
  goalId: string,
  userId: string,
  value: number,
  date: string
): Promise<GoalEntry> {
  const { data, error } = await supabase
    .from('goal_entries')
    .upsert(
      {
        goal_id: goalId,
        user_id: userId,
        value,
        recorded_date: date,
      },
      { onConflict: 'goal_id,recorded_date' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGoalEntry(entryId: string): Promise<void> {
  const { error } = await supabase
    .from('goal_entries')
    .delete()
    .eq('id', entryId);

  if (error) throw error;
}

// ──────────────────────────────────────────────
// Get progress data for a goal
// ──────────────────────────────────────────────

/**
 * Fetch historical data points for a goal.
 * For Apple Health goals, reads from HealthKit.
 * For manual goals, reads from goal_entries.
 */
export async function getGoalHistoryData(
  goal: Goal,
  days: number = 90
): Promise<MetricDataPoint[]> {
  if (goal.data_source === 'apple_health') {
    switch (goal.goal_type) {
      case 'weight':
        return getWeightHistory(days);
      case 'steps':
        return getStepHistory(Math.min(days, 30)); // steps is per-day sequential, limit for perf
      case 'resting_hr':
        return getRHRHistory(days);
      case 'body_fat':
        return getBodyFatHistory(days);
      case 'bmi':
        return getBMIOrLeanMassHistory('bmi', days);
      case 'lean_body_mass':
        return getBMIOrLeanMassHistory('lean_body_mass', days);
      default:
        return [];
    }
  }

  // Manual goals — read from goal_entries table
  const entries = await getGoalEntries(goal.id, days);
  return entries.map((e) => ({ date: e.recorded_date, value: e.value }));
}

/**
 * Get the current (latest) value for a goal.
 */
export async function getGoalCurrentValue(goal: Goal): Promise<number | null> {
  if (goal.data_source === 'apple_health') {
    switch (goal.goal_type) {
      case 'weight':
        return getLatestWeight();
      case 'steps':
        return getTodaySteps();
      case 'resting_hr':
        return getTodayRestingHeartRate();
      case 'body_fat':
        return getLatestBodyFatPercentage();
      case 'bmi':
        return getLatestBMI();
      case 'lean_body_mass':
        return getLatestLeanBodyMass();
      default:
        return null;
    }
  }

  // Manual: return latest entry
  const entries = await getGoalEntries(goal.id);
  if (entries.length === 0) return goal.start_value;
  return entries[entries.length - 1].value;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generic history fetcher for BMI and lean body mass using queryQuantitySamples.
 * These don't have dedicated history functions in health.ts yet, so we reuse the pattern.
 */
async function getBMIOrLeanMassHistory(
  type: 'bmi' | 'lean_body_mass',
  days: number
): Promise<MetricDataPoint[]> {
  // Try importing health module dynamically
  try {
    const mod = require('@kingstinct/react-native-healthkit');
    const qti =
      type === 'bmi'
        ? 'HKQuantityTypeIdentifierBodyMassIndex'
        : 'HKQuantityTypeIdentifierLeanBodyMass';
    const unit = type === 'bmi' ? undefined : 'lb';

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const opts: any = {
      limit: 0,
      filter: { date: { startDate: start, endDate: end } },
    };
    if (unit) opts.unit = unit;

    const samples = await mod.queryQuantitySamples(qti, opts);
    return samples.map((s: any) => ({
      date: formatDate(new Date(s.startDate)),
      value: Math.round(s.quantity * 10) / 10,
    }));
  } catch {
    return [];
  }
}
