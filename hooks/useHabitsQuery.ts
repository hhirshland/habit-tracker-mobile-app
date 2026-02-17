import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EVENTS, captureEvent } from '@/lib/analytics';
import { queryKeys } from '@/lib/queryClient';
import {
  getHabits,
  getCompletionsForDate,
  getCompletionsForWeek,
  getCompletionsForDateRange,
  getSnoozesForDate,
  getSnoozesForDateRange,
  getStreak,
  toggleHabitCompletion,
  snoozeHabit,
  unsnoozeHabit,
  createHabit,
  updateHabit,
  deleteHabit,
  computeWeeklyAdherence,
  getTodayDate,
} from '@/lib/habits';
import type { HealthMetricType } from '@/lib/types';

// ── Stale times ────────────────────────────────

const STALE = {
  habits: 1000 * 60 * 5, // 5 min – habit list rarely changes
  completions: 1000 * 30, // 30 sec – changes when user interacts
  snoozes: 1000 * 30,
  streak: 1000 * 60, // 1 min
} as const;

// ── Query hooks ────────────────────────────────

export function useHabits() {
  return useQuery({
    queryKey: queryKeys.habits.all,
    queryFn: getHabits,
    staleTime: STALE.habits,
  });
}

export function useCompletionsForDate(date: string) {
  return useQuery({
    queryKey: queryKeys.completions.forDate(date),
    queryFn: () => getCompletionsForDate(date),
    staleTime: STALE.completions,
  });
}

export function useCompletionsForWeek(start: string, end: string) {
  return useQuery({
    queryKey: queryKeys.completions.forWeek(start, end),
    queryFn: () => getCompletionsForWeek(start, end),
    staleTime: STALE.completions,
  });
}

export function useCompletionsForRange(start: string, end: string) {
  return useQuery({
    queryKey: queryKeys.completions.forRange(start, end),
    queryFn: () => getCompletionsForDateRange(start, end),
    staleTime: STALE.completions,
  });
}

export function useSnoozesForDate(date: string) {
  return useQuery({
    queryKey: queryKeys.snoozes.forDate(date),
    queryFn: () => getSnoozesForDate(date),
    staleTime: STALE.snoozes,
  });
}

export function useSnoozesForRange(start: string, end: string) {
  return useQuery({
    queryKey: queryKeys.snoozes.forRange(start, end),
    queryFn: () => getSnoozesForDateRange(start, end),
    staleTime: STALE.snoozes,
  });
}

export function useStreak() {
  return useQuery({
    queryKey: queryKeys.streak,
    queryFn: getStreak,
    staleTime: STALE.streak,
  });
}

export function useWeeklyAdherence(weekStart: string, weekEnd: string) {
  const habitsQuery = useHabits();
  const completionsQuery = useCompletionsForWeek(weekStart, weekEnd);

  const habits = habitsQuery.data ?? [];
  const completions = completionsQuery.data ?? [];
  const today = getTodayDate();
  const weekEnded = weekEnd < today;

  const stats = computeWeeklyAdherence(habits, completions, weekEnd, today);
  const completedTotal = stats.reduce((sum, s) => sum + s.completedDays, 0);
  const targetTotal = stats.reduce((sum, s) => sum + s.targetDays, 0);
  const adherencePercent = targetTotal > 0 ? Math.min(100, Math.round((completedTotal / targetTotal) * 100)) : 0;

  return {
    data: {
      stats,
      completedTotal,
      targetTotal,
      adherencePercent,
      weekEnded,
    },
    isLoading: habitsQuery.isLoading || completionsQuery.isLoading,
    isFetching: habitsQuery.isFetching || completionsQuery.isFetching,
    error: habitsQuery.error ?? completionsQuery.error ?? null,
    refetch: async () => {
      await Promise.all([habitsQuery.refetch(), completionsQuery.refetch()]);
    },
  };
}

// ── Mutation hooks ─────────────────────────────

/** Invalidate all queries that could be affected by a completion change */
function useInvalidateOnCompletionChange() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['completions'] });
    qc.invalidateQueries({ queryKey: queryKeys.streak });
  };
}

/** Invalidate snooze-related queries */
function useInvalidateOnSnoozeChange() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['snoozes'] });
  };
}

export function useToggleCompletion() {
  const invalidate = useInvalidateOnCompletionChange();
  return useMutation({
    mutationFn: ({
      habitId,
      userId,
      date,
      isCompleted,
    }: {
      habitId: string;
      userId: string;
      date: string;
      isCompleted: boolean;
      habitName?: string;
      isAutoComplete?: boolean;
    }) => toggleHabitCompletion(habitId, userId, date, isCompleted),
    onSuccess: (_, variables) => {
      invalidate();
      if (variables.isCompleted) {
        captureEvent(EVENTS.HABIT_UNCOMPLETED, {
          habit_id: variables.habitId,
          habit_name: variables.habitName,
        });
        return;
      }

      captureEvent(EVENTS.HABIT_COMPLETED, {
        habit_id: variables.habitId,
        habit_name: variables.habitName,
        is_auto_complete: !!variables.isAutoComplete,
        day_of_week: new Date(`${variables.date}T12:00:00`).getDay(),
      });
    },
  });
}

export function useSnoozeHabit() {
  const invalidate = useInvalidateOnSnoozeChange();
  return useMutation({
    mutationFn: ({
      habitId,
      userId,
      date,
    }: {
      habitId: string;
      userId: string;
      date: string;
      habitName?: string;
    }) => snoozeHabit(habitId, userId, date),
    onSuccess: (_, variables) => {
      invalidate();
      captureEvent(EVENTS.HABIT_SNOOZED, {
        habit_id: variables.habitId,
        habit_name: variables.habitName,
      });
    },
  });
}

export function useUnsnoozeHabit() {
  const invalidate = useInvalidateOnSnoozeChange();
  return useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string; habitName?: string }) =>
      unsnoozeHabit(habitId, date),
    onSuccess: (_, variables) => {
      invalidate();
      captureEvent(EVENTS.HABIT_UNSNOOZED, {
        habit_id: variables.habitId,
        habit_name: variables.habitName,
      });
    },
  });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      habit,
    }: {
      userId: string;
      habit: {
        name: string;
        description?: string;
        frequency_per_week: number;
        specific_days: number[] | null;
        metric_type?: HealthMetricType | null;
        metric_threshold?: number | null;
        auto_complete?: boolean;
      };
    }) => createHabit(userId, habit),
    onSuccess: (createdHabit, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.habits.all });
      captureEvent(EVENTS.HABIT_CREATED, {
        habit_name: createdHabit.name || variables.habit.name,
        frequency_per_week: variables.habit.frequency_per_week,
        has_specific_days: !!variables.habit.specific_days?.length,
        auto_complete: !!variables.habit.auto_complete,
        metric_type: variables.habit.metric_type ?? null,
      });
    },
  });
}

export function useUpdateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      habitId,
      updates,
    }: {
      habitId: string;
      updates: {
        name?: string;
        description?: string | null;
        frequency_per_week?: number;
        specific_days?: number[] | null;
        is_active?: boolean;
        metric_type?: HealthMetricType | null;
        metric_threshold?: number | null;
        auto_complete?: boolean;
      };
    }) => updateHabit(habitId, updates),
    onSuccess: (_updatedHabit, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.habits.all });
      captureEvent(EVENTS.HABIT_UPDATED, {
        habit_id: variables.habitId,
        fields_changed: Object.keys(variables.updates),
      });
    },
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      habitId,
      habitName,
    }: {
      habitId: string;
      habitName?: string;
    }) => deleteHabit(habitId),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.habits.all });
      captureEvent(EVENTS.HABIT_DELETED, {
        habit_id: variables.habitId,
        habit_name: variables.habitName,
      });
    },
  });
}

/** Invalidate all habit-related caches (useful for pull-to-refresh) */
export function useRefreshAllHabitData() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.habits.all });
    qc.invalidateQueries({ queryKey: ['completions'] });
    qc.invalidateQueries({ queryKey: ['snoozes'] });
    qc.invalidateQueries({ queryKey: queryKeys.streak });
  };
}
