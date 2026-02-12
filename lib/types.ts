export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  has_onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export type HealthMetricType = 'steps' | 'weight' | 'resting_heart_rate' | 'workout_minutes';

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
  resting_heart_rate: 'Resting Heart Rate (bpm)',
  workout_minutes: 'Workout Minutes',
};

export const METRIC_TYPE_DEFAULTS: Record<HealthMetricType, number> = {
  steps: 10000,
  weight: 0,
  resting_heart_rate: 0,
  workout_minutes: 30,
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
