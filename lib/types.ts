import type { UserSettings } from '@/lib/userSettings';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  settings: UserSettings | null;
  has_onboarded: boolean;
  rc_customer_id: string | null;
  phone_number: string | null;
  evening_call_enabled: boolean;
  evening_call_time: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = 'active' | 'trialing' | 'expired' | 'grace_period' | 'none';

export interface Subscription {
  id: string;
  user_id: string;
  rc_entitlement: string;
  product_id: string | null;
  status: SubscriptionStatus;
  is_active: boolean;
  original_purchase_date: string | null;
  expiration_date: string | null;
  unsubscribe_detected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  grant_type: 'free_forever' | 'free_trial_extension';
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export type HealthMetricType =
  | 'steps'
  | 'weight'
  | 'resting_heart_rate'
  | 'workout_minutes'
  | 'body_fat_percentage'
  | 'lean_body_mass'
  | 'bmi'
  | 'exercise_minutes'
  | 'time_in_daylight'
  | 'hrv';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  frequency_per_week: number;
  specific_days: number[] | null; // 0=Sun, 1=Mon, ..., 6=Sat. null means "any days"
  is_active: boolean;
  metric_type: HealthMetricType | null; // linked health metric
  metric_threshold: number | null; // threshold to auto-complete
  auto_complete: boolean; // whether to auto-complete from health data
  identity_statement_id?: string | null; // linked identity statement
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────
// Identity Statements
// ──────────────────────────────────────────────

export interface IdentityStatement {
  id: string;
  user_id: string;
  statement: string;
  emoji: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const METRIC_TYPE_LABELS: Record<HealthMetricType, string> = {
  steps: 'Steps',
  weight: 'Weight (lbs)',
  resting_heart_rate: 'Resting HR (bpm)',
  workout_minutes: 'Workout Min',
  body_fat_percentage: 'Body Fat (%)',
  lean_body_mass: 'Lean Mass %',
  bmi: 'BMI',
  exercise_minutes: 'Exercise Min',
  time_in_daylight: 'Daylight (min)',
  hrv: 'HRV (ms)',
};

export const METRIC_TYPE_DEFAULTS: Record<HealthMetricType, number> = {
  steps: 10000,
  weight: 0,
  resting_heart_rate: 0,
  workout_minutes: 30,
  body_fat_percentage: 0,
  lean_body_mass: 0,
  bmi: 0,
  exercise_minutes: 30,
  time_in_daylight: 20,
  hrv: 0,
};

export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  completed_date: string; // YYYY-MM-DD
  created_at: string;
}

export interface HabitSnooze {
  id: string;
  habit_id: string;
  user_id: string;
  snoozed_date: string; // YYYY-MM-DD
  created_at: string;
}

// ──────────────────────────────────────────────
// Goals
// ──────────────────────────────────────────────

export type GoalType =
  | 'weight'
  | 'running_pr'
  | 'resting_hr'
  | 'body_fat'
  | 'bmi'
  | 'lean_body_mass_pct'
  | 'custom'
  | 'steps'             // deprecated — existing goals still render
  | 'weekly_workouts'   // deprecated — existing goals still render
  | 'lean_body_mass';   // deprecated — replaced by lean_body_mass_pct

export interface Goal {
  id: string;
  user_id: string;
  goal_type: GoalType;
  title: string;
  target_value: number;
  unit: string;
  start_value: number | null;
  start_date: string; // ISO timestamptz
  target_date: string | null; // ISO timestamptz
  rate: number | null;
  rate_unit: string | null;
  data_source: 'apple_health' | 'manual';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoalEntry {
  id: string;
  goal_id: string;
  user_id: string;
  value: number;
  recorded_date: string; // YYYY-MM-DD
  created_at: string;
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  weight: 'Target Weight',
  running_pr: 'Running PR',
  resting_hr: 'Resting Heart Rate',
  body_fat: 'Body Fat %',
  bmi: 'BMI',
  lean_body_mass_pct: 'Lean Body Mass %',
  custom: 'Custom Goal',
  steps: 'Daily Steps',
  weekly_workouts: 'Weekly Workouts',
  lean_body_mass: 'Lean Body Mass',
};

export const GOAL_TYPE_ICONS: Record<GoalType, string> = {
  weight: 'balance-scale',
  running_pr: 'clock-o',
  resting_hr: 'heartbeat',
  body_fat: 'pie-chart',
  bmi: 'calculator',
  lean_body_mass_pct: 'child',
  custom: 'star',
  steps: 'road',
  weekly_workouts: 'bolt',
  lean_body_mass: 'child',
};

export const GOAL_TYPE_COLORS: Record<GoalType, string> = {
  weight: '#2196F3',
  running_pr: '#FF5722',
  resting_hr: '#E91E63',
  body_fat: '#9C27B0',
  bmi: '#607D8B',
  lean_body_mass_pct: '#00BCD4',
  custom: '#6C63FF',
  steps: '#4CAF50',
  weekly_workouts: '#F39C12',
  lean_body_mass: '#00BCD4',
};

export const CREATABLE_GOAL_TYPES: GoalType[] = [
  'weight', 'running_pr', 'resting_hr', 'body_fat', 'bmi', 'lean_body_mass_pct', 'custom',
];

export interface DailyJournalEntry {
  id: string;
  user_id: string;
  journal_date: string; // YYYY-MM-DD
  win: string;
  tension: string;
  gratitude: string;
  created_at: string;
  updated_at: string;
}

export interface DailyTodo {
  id: string;
  user_id: string;
  todo_date: string; // YYYY-MM-DD
  text: string;
  is_completed: boolean;
  position: number; // 1, 2, or 3
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────
// Weekly Recaps
// ──────────────────────────────────────────────

export interface WeeklyRecapContent {
  week_summary: string;
  habit_review: {
    overall_adherence_pct: number;
    narrative: string;
    standout_habit: string | null;
    needs_attention: string | null;
  };
  goal_progress: Array<{
    title: string;
    narrative: string;
  }>;
  reflection_themes: {
    narrative: string | null;
    wins: string[];
    growth_opportunity: string | null;
    gratitude_highlight: string | null;
  };
  looking_ahead: string;
  identity_review?: {
    identities: Array<{
      statement: string;
      emoji: string;
      adherence_pct: number;
      mapped_habit_count: number;
    }>;
    narrative: string;
  } | null;
}

export interface WeeklyRecap {
  id: string;
  user_id: string;
  week_start: string; // YYYY-MM-DD (Sunday)
  week_end: string; // YYYY-MM-DD (Saturday)
  content: WeeklyRecapContent;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface QualifyingWeek {
  week_start: string;
  week_end: string;
  active_days: number;
  recap: WeeklyRecap | null;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

export const DAY_LABELS_FULL: Record<DayOfWeek, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};
