import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGoals,
  createGoal,
  deleteGoal,
  addGoalEntry,
  getGoalCurrentValue,
} from '@/lib/goals';
import type { Goal, GoalType } from '@/lib/types';

// ── Stale times ────────────────────────────────

const STALE = {
  goals: 1000 * 60 * 5, // 5 min – goals rarely change
  currentValues: 1000 * 60 * 2, // 2 min – health data changes slowly
} as const;

// ── Query keys ─────────────────────────────────

export const goalKeys = {
  all: ['goals'] as const,
  currentValue: (goalId: string) => ['goals', 'currentValue', goalId] as const,
} as const;

// ── Query hooks ────────────────────────────────

export function useGoals() {
  return useQuery({
    queryKey: goalKeys.all,
    queryFn: getGoals,
    staleTime: STALE.goals,
  });
}

export function useGoalCurrentValue(goal: Goal | null) {
  return useQuery({
    queryKey: goalKeys.currentValue(goal?.id ?? ''),
    queryFn: () => getGoalCurrentValue(goal!),
    staleTime: STALE.currentValues,
    enabled: !!goal,
  });
}

// ── Mutation hooks ─────────────────────────────

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      goal,
    }: {
      userId: string;
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
      };
    }) => createGoal(userId, goal),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => deleteGoal(goalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useAddGoalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      goalId,
      userId,
      value,
      date,
    }: {
      goalId: string;
      userId: string;
      value: number;
      date: string;
    }) => addGoalEntry(goalId, userId, value, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

/** Invalidate all goal caches (useful for pull-to-refresh) */
export function useRefreshGoals() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['goals'] });
  };
}
