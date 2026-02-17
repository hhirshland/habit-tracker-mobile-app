import { supabase } from './supabase';
import { Habit, HabitCompletion, HabitSnooze, HealthMetricType } from './types';
import { getCurrentMetricValue, isHealthKitAvailable } from './health';

export type HabitWeeklyStatus = 'on_track' | 'at_risk' | 'behind' | 'met' | 'missed';

export interface HabitWeeklyStats {
  habit: Habit;
  completedDays: number;
  targetDays: number;
  adherencePercent: number;
  status: HabitWeeklyStatus;
}

// Get all active habits for the current user
export async function getHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get habits scheduled for a specific day
export function getHabitsForDay(habits: Habit[], dayOfWeek: number): Habit[] {
  return habits.filter((habit) => {
    if (!habit.is_active) return false;
    // If specific_days is set, check if today is one of them
    if (habit.specific_days && habit.specific_days.length > 0) {
      return habit.specific_days.includes(dayOfWeek);
    }
    // If no specific days, show it every day (user picks which days)
    return true;
  });
}

// Get completions for a date range
export async function getCompletionsForDate(date: string): Promise<HabitCompletion[]> {
  const { data, error } = await supabase
    .from('habit_completions')
    .select('*')
    .eq('completed_date', date);

  if (error) throw error;
  return data || [];
}

// Get completions for the current week (for "any N days" tracking)
export async function getCompletionsForWeek(
  weekStart: string,
  weekEnd: string
): Promise<HabitCompletion[]> {
  const { data, error } = await supabase
    .from('habit_completions')
    .select('*')
    .gte('completed_date', weekStart)
    .lte('completed_date', weekEnd);

  if (error) throw error;
  return data || [];
}

// Toggle habit completion for a day
export async function toggleHabitCompletion(
  habitId: string,
  userId: string,
  date: string,
  isCompleted: boolean
): Promise<void> {
  if (isCompleted) {
    // Remove completion
    const { error } = await supabase
      .from('habit_completions')
      .delete()
      .eq('habit_id', habitId)
      .eq('completed_date', date);

    if (error) throw error;
  } else {
    // Add completion
    const { error } = await supabase.from('habit_completions').insert({
      habit_id: habitId,
      user_id: userId,
      completed_date: date,
    });

    if (error) throw error;
  }
}

// Determine if a habit is required today based on its schedule and weekly progress.
// - Specific-day habits: always required when they appear in the daily view (user chose this day).
// - Frequency-based habits: required when the remaining days in the week (including today)
//   equal the number of completions still needed. e.g. 5x/week allows 2 skips;
//   once 2 days have been skipped, every remaining day is required.
export function isHabitRequiredToday(
  habit: Habit,
  dayOfWeek: number,
  weekCompletionsForHabit: number,
  isCompletedToday: boolean
): boolean {
  // If specific days are set and today is one of them, it's required
  if (habit.specific_days && habit.specific_days.length > 0) {
    return habit.specific_days.includes(dayOfWeek);
  }

  // For frequency-based habits: check if all remaining days must be completion days
  const completionsExcludingToday = weekCompletionsForHabit - (isCompletedToday ? 1 : 0);
  const stillNeeded = habit.frequency_per_week - completionsExcludingToday;
  const remainingDaysIncludingToday = 7 - dayOfWeek; // Sun=7, Mon=6, ..., Sat=1

  // If already met the weekly goal, not required
  if (stillNeeded <= 0) return false;

  return stillNeeded >= remainingDaysIncludingToday;
}

// Create a new habit
export async function createHabit(
  userId: string,
  habit: {
    name: string;
    description?: string;
    frequency_per_week: number;
    specific_days: number[] | null;
    metric_type?: HealthMetricType | null;
    metric_threshold?: number | null;
    auto_complete?: boolean;
  }
): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: userId,
      name: habit.name,
      description: habit.description || null,
      frequency_per_week: habit.frequency_per_week,
      specific_days: habit.specific_days,
      metric_type: habit.metric_type || null,
      metric_threshold: habit.metric_threshold || null,
      auto_complete: habit.auto_complete || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update a habit
export async function updateHabit(
  habitId: string,
  updates: {
    name?: string;
    description?: string | null;
    frequency_per_week?: number;
    specific_days?: number[] | null;
    is_active?: boolean;
    metric_type?: HealthMetricType | null;
    metric_threshold?: number | null;
    auto_complete?: boolean;
  }
): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .update(updates)
    .eq('id', habitId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Soft delete a habit
export async function deleteHabit(habitId: string): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .update({ is_active: false })
    .eq('id', habitId);

  if (error) throw error;
}

// Get snoozes for a specific date
export async function getSnoozesForDate(date: string): Promise<HabitSnooze[]> {
  const { data, error } = await supabase
    .from('habit_snoozes')
    .select('*')
    .eq('snoozed_date', date);

  if (error) throw error;
  return data || [];
}

// Snooze a habit for a specific date
export async function snoozeHabit(
  habitId: string,
  userId: string,
  date: string
): Promise<void> {
  const { error } = await supabase.from('habit_snoozes').insert({
    habit_id: habitId,
    user_id: userId,
    snoozed_date: date,
  });

  if (error) throw error;
}

// Unsnooze a habit for a specific date
export async function unsnoozeHabit(
  habitId: string,
  date: string
): Promise<void> {
  const { error } = await supabase
    .from('habit_snoozes')
    .delete()
    .eq('habit_id', habitId)
    .eq('snoozed_date', date);

  if (error) throw error;
}

// Calculate the user's current streak based on the day completions were logged
// (consecutive local days with at least one completion created on that day).
export async function getStreak(): Promise<{ streakCount: number; earnedToday: boolean }> {
  const today = getTodayDate();

  const { data, error } = await supabase
    .from('habit_completions')
    .select('created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return { streakCount: 0, earnedToday: false };

  // Convert each completion timestamp to the user's local calendar day, then de-duplicate.
  const uniqueDates = new Set(
    data.map((d: { created_at: string }) => formatDate(new Date(d.created_at)))
  );
  const earnedToday = uniqueDates.has(today);

  // Count consecutive days starting from today (if earned) or yesterday (if not)
  let streakCount = 0;
  const checkDate = new Date();
  checkDate.setHours(12, 0, 0, 0); // Use noon to avoid DST edge cases

  if (!earnedToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = formatDate(checkDate);
    if (uniqueDates.has(dateStr)) {
      streakCount++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { streakCount, earnedToday };
}

// Get completions for a range of dates (for calendar strip)
export async function getCompletionsForDateRange(
  startDate: string,
  endDate: string
): Promise<HabitCompletion[]> {
  const { data, error } = await supabase
    .from('habit_completions')
    .select('*')
    .gte('completed_date', startDate)
    .lte('completed_date', endDate);

  if (error) throw error;
  return data || [];
}

// Get snoozes for a range of dates (for calendar strip)
export async function getSnoozesForDateRange(
  startDate: string,
  endDate: string
): Promise<HabitSnooze[]> {
  const { data, error } = await supabase
    .from('habit_snoozes')
    .select('*')
    .gte('snoozed_date', startDate)
    .lte('snoozed_date', endDate);

  if (error) throw error;
  return data || [];
}

// Helper: format a Date to YYYY-MM-DD in the user's local timezone
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: get today's date as YYYY-MM-DD in the user's local timezone
export function getTodayDate(): string {
  return formatDate(new Date());
}

// Helper: format week labels like "Feb 9 - Feb 15"
function formatWeekLabel(start: Date, end: Date): string {
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startLabel} - ${endLabel}`;
}

function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}

function dayDiff(startDate: string, endDate: string): number {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export function getWeekRange(weekOffset: number): {
  start: string;
  end: string;
  label: string;
  isCurrentWeek: boolean;
} {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const dayOfWeek = now.getDay();

  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek + weekOffset * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: formatDate(start),
    end: formatDate(end),
    label: formatWeekLabel(start, end),
    isCurrentWeek: weekOffset === 0,
  };
}

export function computeWeeklyAdherence(
  habits: Habit[],
  completions: HabitCompletion[],
  weekEnd: string,
  referenceDate: string = getTodayDate()
): HabitWeeklyStats[] {
  const weekEnded = weekEnd < referenceDate;
  const completionDatesByHabit = new Map<string, Set<string>>();

  for (const completion of completions) {
    if (!completionDatesByHabit.has(completion.habit_id)) {
      completionDatesByHabit.set(completion.habit_id, new Set<string>());
    }
    completionDatesByHabit.get(completion.habit_id)!.add(completion.completed_date);
  }

  const stats = habits.map((habit): HabitWeeklyStats => {
    const targetDays =
      habit.specific_days && habit.specific_days.length > 0
        ? habit.specific_days.length
        : habit.frequency_per_week;
    const completedDays = completionDatesByHabit.get(habit.id)?.size ?? 0;
    const adherencePercent = targetDays > 0 ? Math.min(100, Math.round((completedDays / targetDays) * 100)) : 0;

    let status: HabitWeeklyStatus;
    if (weekEnded) {
      status = completedDays >= targetDays ? 'met' : 'missed';
    } else {
      const remainingNeeded = Math.max(targetDays - completedDays, 0);
      const remainingDaysIncludingToday = Math.max(dayDiff(referenceDate, weekEnd) + 1, 0);

      if (remainingNeeded === 0) {
        status = 'on_track';
      } else if (remainingNeeded > remainingDaysIncludingToday) {
        status = 'behind';
      } else if (remainingNeeded === remainingDaysIncludingToday) {
        status = 'at_risk';
      } else {
        status = 'on_track';
      }
    }

    return {
      habit,
      completedDays,
      targetDays,
      adherencePercent,
      status,
    };
  });

  const rank: Record<HabitWeeklyStatus, number> = {
    behind: 0,
    missed: 1,
    at_risk: 2,
    on_track: 3,
    met: 4,
  };

  return stats.sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    if (a.adherencePercent !== b.adherencePercent) return a.adherencePercent - b.adherencePercent;
    return a.habit.name.localeCompare(b.habit.name);
  });
}

// ──────────────────────────────────────────────
// Auto-completion from Health Data
// ──────────────────────────────────────────────

/**
 * Check all auto-complete habits for today and insert completions
 * for any that meet their health metric thresholds.
 * Returns the list of habit IDs that were auto-completed.
 */
export async function checkAutoCompletions(
  userId: string,
  habits: Habit[],
  existingCompletionIds: Set<string>,
  date: string
): Promise<string[]> {
  if (!isHealthKitAvailable()) return [];

  const autoCompleteHabits = habits.filter(
    (h) =>
      h.auto_complete &&
      h.metric_type &&
      h.metric_threshold != null &&
      !existingCompletionIds.has(h.id) // not already completed
  );

  if (autoCompleteHabits.length === 0) return [];

  const autoCompletedIds: string[] = [];

  for (const habit of autoCompleteHabits) {
    try {
      const currentValue = await getCurrentMetricValue(habit.metric_type!);
      if (currentValue === null) continue;

      const meetsThreshold = currentValue >= habit.metric_threshold!;

      if (meetsThreshold) {
        // Insert completion record
        const { error } = await supabase.from('habit_completions').insert({
          habit_id: habit.id,
          user_id: userId,
          completed_date: date,
        });

        // Ignore unique constraint violations (already completed)
        if (error && !error.message.includes('duplicate')) {
          console.error(`Error auto-completing habit ${habit.name}:`, error);
        } else if (!error) {
          autoCompletedIds.push(habit.id);
        }
      }
    } catch (error) {
      console.error(`Error checking metric for habit ${habit.name}:`, error);
    }
  }

  return autoCompletedIds;
}

// Helper: get the start and end of the current week (Sunday to Saturday) in local timezone
export function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}
