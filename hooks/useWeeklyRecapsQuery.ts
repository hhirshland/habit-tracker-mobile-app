import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWeeklyRecaps,
  getLatestUnreadRecap,
  getQualifyingWeeks,
  markRecapAsRead,
  deleteRecap,
  triggerRecapGeneration,
} from '@/lib/weeklyRecaps';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { captureEvent, EVENTS } from '@/lib/analytics';

const STALE = {
  recaps: 1000 * 60 * 5, // 5 min
  unread: 1000 * 60 * 2, // 2 min
  qualifying: 1000 * 60 * 5, // 5 min
} as const;

export function useWeeklyRecaps() {
  return useQuery({
    queryKey: queryKeys.weeklyRecaps.all,
    queryFn: getWeeklyRecaps,
    staleTime: STALE.recaps,
  });
}

export function useUnreadRecap() {
  return useQuery({
    queryKey: queryKeys.weeklyRecaps.unread,
    queryFn: getLatestUnreadRecap,
    staleTime: STALE.unread,
  });
}

export function useQualifyingWeeks(sinceDate: string | null) {
  return useQuery({
    queryKey: queryKeys.weeklyRecaps.qualifyingWeeks,
    queryFn: () => getQualifyingWeeks(sinceDate!),
    staleTime: STALE.qualifying,
    enabled: !!sinceDate,
  });
}

export function useGenerateRecap() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      weekStart,
      weekEnd,
    }: {
      weekStart: string;
      weekEnd: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      return triggerRecapGeneration(user.id, weekStart, weekEnd);
    },
    onSuccess: (data, variables) => {
      if (data.recap) {
        qc.invalidateQueries({ queryKey: queryKeys.weeklyRecaps.all });
        qc.invalidateQueries({ queryKey: queryKeys.weeklyRecaps.unread });
        qc.invalidateQueries({ queryKey: queryKeys.weeklyRecaps.qualifyingWeeks });
        captureEvent(EVENTS.RECAP_GENERATED, {
          week_start: variables.weekStart,
          generation_time_ms: data.generation_time_ms ?? 0,
        });
      }
      if (data.error) {
        captureEvent(EVENTS.RECAP_GENERATION_FAILED, {
          week_start: variables.weekStart,
          error_type: data.error,
        });
      }
    },
  });
}

export function useMarkRecapRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: markRecapAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.weeklyRecaps.all });
      qc.invalidateQueries({ queryKey: queryKeys.weeklyRecaps.unread });
      qc.invalidateQueries({ queryKey: queryKeys.weeklyRecaps.qualifyingWeeks });
    },
  });
}

export function useDeleteRecap() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: deleteRecap,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weeklyRecaps'] });
    },
  });
}

export function useRefreshRecaps() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['weeklyRecaps'] });
  };
}
