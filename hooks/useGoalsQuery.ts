import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EVENTS, captureEvent } from '@/lib/analytics';
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
    onSuccess: (createdGoal) => {
      qc.invalidateQueries({ queryKey: goalKeys.all });
      captureEvent(EVENTS.GOAL_CREATED, {
        goal_type: createdGoal.goal_type,
        target_value: createdGoal.target_value,
        unit: createdGoal.unit,
        data_source: createdGoal.data_source,
        has_target_date: !!createdGoal.target_date,
      });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, goalType }: { goalId: string; goalType?: GoalType }) =>
      deleteGoal(goalId),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: goalKeys.all });
      captureEvent(EVENTS.GOAL_DELETED, {
        goal_id: variables.goalId,
        goal_type: variables.goalType,
      });
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
      goalType?: GoalType;
    }) => addGoalEntry(goalId, userId, value, date),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      captureEvent(EVENTS.GOAL_ENTRY_ADDED, {
        goal_id: variables.goalId,
        goal_type: variables.goalType,
        value: variables.value,
      });
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
