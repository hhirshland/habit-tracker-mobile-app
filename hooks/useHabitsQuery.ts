import { useQuery, useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
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
import type { HabitCompletion, HabitSnooze, HealthMetricType } from '@/lib/types';
import { addPendingMutation } from '@/lib/offlineStorage';

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

// ── Mutation hooks with optimistic updates ────

export function useToggleCompletion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      habitId,
      userId,
      date,
      isCompleted,
    }: {
      habitId: string;
      userId: string;
      date: string;
      isCompleted: boolean;
    }) => {
      if (!onlineManager.isOnline()) {
        // Queue mutation for later sync
        await addPendingMutation('toggle_completion', {
          habitId,
          userId,
          date,
          isCompleted,
        });
        return;
      }
      return toggleHabitCompletion(habitId, userId, date, isCompleted);
    },

    // Optimistic update: immediately reflect the change in cache
    onMutate: async ({ habitId, userId, date, isCompleted }) => {
      // Cancel any in-flight refetches for this date's completions
      await qc.cancelQueries({ queryKey: queryKeys.completions.forDate(date) });

      // Snapshot the previous value
      const previousCompletions = qc.getQueryData<HabitCompletion[]>(
        queryKeys.completions.forDate(date)
      );

      // Optimistically update the cache
      qc.setQueryData<HabitCompletion[]>(
        queryKeys.completions.forDate(date),
        (old = []) => {
          if (isCompleted) {
            // Remove the completion
            return old.filter((c) => c.habit_id !== habitId);
          } else {
            // Add a new completion (with a temporary local ID)
            const optimisticCompletion: HabitCompletion = {
              id: `offline_${Date.now()}`,
              habit_id: habitId,
              user_id: userId,
              completed_date: date,
              created_at: new Date().toISOString(),
            };
            return [...old, optimisticCompletion];
          }
        }
      );

      // Also update week completions and range completions optimistically
      qc.setQueriesData<HabitCompletion[]>(
        { queryKey: ['completions', 'week'] },
        (old = []) => {
          if (isCompleted) {
            return old.filter(
              (c) => !(c.habit_id === habitId && c.completed_date === date)
            );
          } else {
            return [
              ...old,
              {
                id: `offline_${Date.now()}`,
                habit_id: habitId,
                user_id: userId,
                completed_date: date,
                created_at: new Date().toISOString(),
              },
            ];
          }
        }
      );

      qc.setQueriesData<HabitCompletion[]>(
        { queryKey: ['completions', 'range'] },
        (old = []) => {
          if (isCompleted) {
            return old.filter(
              (c) => !(c.habit_id === habitId && c.completed_date === date)
            );
          } else {
            return [
              ...old,
              {
                id: `offline_${Date.now()}`,
                habit_id: habitId,
                user_id: userId,
                completed_date: date,
                created_at: new Date().toISOString(),
              },
            ];
          }
        }
      );

      return { previousCompletions };
    },

    onError: (_err, { date }, context) => {
      // Roll back optimistic update on error (only if we're online — offline mutations are queued)
      if (onlineManager.isOnline() && context?.previousCompletions) {
        qc.setQueryData(
          queryKeys.completions.forDate(date),
          context.previousCompletions
        );
      }
    },

    onSettled: () => {
      // Only refetch if online
      if (onlineManager.isOnline()) {
        qc.invalidateQueries({ queryKey: ['completions'] });
        qc.invalidateQueries({ queryKey: queryKeys.streak });
      }
    },
  });
}

export function useSnoozeHabit() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      habitId,
      userId,
      date,
    }: {
      habitId: string;
      userId: string;
      date: string;
    }) => {
      if (!onlineManager.isOnline()) {
        await addPendingMutation('snooze', { habitId, userId, date });
        return;
      }
      return snoozeHabit(habitId, userId, date);
    },

    onMutate: async ({ habitId, userId, date }) => {
      await qc.cancelQueries({ queryKey: queryKeys.snoozes.forDate(date) });

      const previousSnoozes = qc.getQueryData<HabitSnooze[]>(
        queryKeys.snoozes.forDate(date)
      );

      qc.setQueryData<HabitSnooze[]>(
        queryKeys.snoozes.forDate(date),
        (old = []) => [
          ...old,
          {
            id: `offline_${Date.now()}`,
            habit_id: habitId,
            user_id: userId,
            snoozed_date: date,
            created_at: new Date().toISOString(),
          },
        ]
      );

      return { previousSnoozes };
    },

    onError: (_err, { date }, context) => {
      if (onlineManager.isOnline() && context?.previousSnoozes) {
        qc.setQueryData(queryKeys.snoozes.forDate(date), context.previousSnoozes);
      }
    },

    onSettled: () => {
      if (onlineManager.isOnline()) {
        qc.invalidateQueries({ queryKey: ['snoozes'] });
      }
    },
  });
}

export function useUnsnoozeHabit() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ habitId, date }: { habitId: string; date: string }) => {
      if (!onlineManager.isOnline()) {
        await addPendingMutation('unsnooze', { habitId, date });
        return;
      }
      return unsnoozeHabit(habitId, date);
    },

    onMutate: async ({ habitId, date }) => {
      await qc.cancelQueries({ queryKey: queryKeys.snoozes.forDate(date) });

      const previousSnoozes = qc.getQueryData<HabitSnooze[]>(
        queryKeys.snoozes.forDate(date)
      );

      qc.setQueryData<HabitSnooze[]>(
        queryKeys.snoozes.forDate(date),
        (old = []) => old.filter((s) => s.habit_id !== habitId)
      );

      return { previousSnoozes };
    },

    onError: (_err, { date }, context) => {
      if (onlineManager.isOnline() && context?.previousSnoozes) {
        qc.setQueryData(queryKeys.snoozes.forDate(date), context.previousSnoozes);
      }
    },

    onSettled: () => {
      if (onlineManager.isOnline()) {
        qc.invalidateQueries({ queryKey: ['snoozes'] });
      }
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
