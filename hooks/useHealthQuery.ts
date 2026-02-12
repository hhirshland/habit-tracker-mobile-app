import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  getStepHistory,
  getWeightHistory,
  getRHRHistory,
  getBodyFatHistory,
  getHRVHistory,
  getMetricHistory,
} from '@/lib/health';

// ── Stale times ────────────────────────────────

const STALE = {
  history: 1000 * 60 * 10, // 10 min – historical data changes slowly
} as const;

// ── Query hooks ────────────────────────────────

export function useStepHistory(days: number = 14, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.health.history('steps', days),
    queryFn: () => getStepHistory(days),
    staleTime: STALE.history,
    enabled,
  });
}

export function useWeightHistory(days: number = 90, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.health.history('weight', days),
    queryFn: () => getWeightHistory(days),
    staleTime: STALE.history,
    enabled,
  });
}

export function useRHRHistory(days: number = 14, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.health.history('rhr', days),
    queryFn: () => getRHRHistory(days),
    staleTime: STALE.history,
    enabled,
  });
}

export function useBodyFatHistory(days: number = 90, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.health.history('bodyFat', days),
    queryFn: () => getBodyFatHistory(days),
    staleTime: STALE.history,
    enabled,
  });
}

export function useHRVHistory(days: number = 14, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.health.history('hrv', days),
    queryFn: () => getHRVHistory(days),
    staleTime: STALE.history,
    enabled,
  });
}

/**
 * Generic metric history hook — fetches history for any metric key + day range.
 * Uses the universal dispatcher in lib/health.ts.
 */
export function useMetricHistory(metricKey: string | null, days: number, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.health.history(metricKey ?? '_none', days),
    queryFn: () => getMetricHistory(metricKey!, days),
    staleTime: STALE.history,
    enabled: enabled && metricKey !== null,
  });
}

/** Invalidate all health history caches (useful for pull-to-refresh) */
export function useRefreshHealthHistory() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['health', 'history'] });
  };
}
