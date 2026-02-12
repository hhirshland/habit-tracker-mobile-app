import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    }) => toggleHabitCompletion(habitId, userId, date, isCompleted),
    onSuccess: invalidate,
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
    }) => snoozeHabit(habitId, userId, date),
    onSuccess: invalidate,
  });
}

export function useUnsnoozeHabit() {
  const invalidate = useInvalidateOnSnoozeChange();
  return useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
      unsnoozeHabit(habitId, date),
    onSuccess: invalidate,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.habits.all });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.habits.all });
    },
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (habitId: string) => deleteHabit(habitId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.habits.all });
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
