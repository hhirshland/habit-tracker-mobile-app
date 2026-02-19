import type { UserSettings } from '@/lib/userSettings';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  settings: UserSettings | null;
  has_onboarded: boolean;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export const METRIC_TYPE_LABELS: Record<HealthMetricType, string> = {
  steps: 'Steps',
  weight: 'Weight (lbs)',
  resting_heart_rate: 'Resting HR (bpm)',
  workout_minutes: 'Workout Min',
  body_fat_percentage: 'Body Fat (%)',
  lean_body_mass: 'Lean Mass (lbs)',
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
  | 'steps'
  | 'resting_hr'
  | 'weekly_workouts'
  | 'body_fat'
  | 'bmi'
  | 'lean_body_mass'
  | 'custom';

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
  steps: 'Daily Steps',
  resting_hr: 'Resting Heart Rate',
  weekly_workouts: 'Weekly Workouts',
  body_fat: 'Body Fat %',
  bmi: 'BMI',
  lean_body_mass: 'Lean Body Mass',
  custom: 'Custom Goal',
};

export const GOAL_TYPE_ICONS: Record<GoalType, string> = {
  weight: 'balance-scale',
  running_pr: 'clock-o',
  steps: 'road',
  resting_hr: 'heartbeat',
  weekly_workouts: 'bolt',
  body_fat: 'pie-chart',
  bmi: 'calculator',
  lean_body_mass: 'child',
  custom: 'star',
};

export const GOAL_TYPE_COLORS: Record<GoalType, string> = {
  weight: '#2196F3',
  running_pr: '#FF5722',
  steps: '#4CAF50',
  resting_hr: '#E91E63',
  weekly_workouts: '#F39C12',
  body_fat: '#9C27B0',
  bmi: '#607D8B',
  lean_body_mass: '#00BCD4',
  custom: '#6C63FF',
};

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
