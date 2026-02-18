import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Show cached data immediately, refetch in background if stale
      staleTime: 1000 * 60, // 1 minute default
      gcTime: 1000 * 60 * 10, // Keep unused cache for 10 minutes
      retry: 2,
      refetchOnWindowFocus: false, // Not relevant for mobile
      refetchOnReconnect: true,
    },
  },
});

// ── Query key factory ──────────────────────────
// Centralised keys make cache invalidation predictable.

export const queryKeys = {
  habits: {
    all: ['habits'] as const,
  },
  completions: {
    forDate: (date: string) => ['completions', date] as const,
    forWeek: (start: string, end: string) => ['completions', 'week', start, end] as const,
    forRange: (start: string, end: string) => ['completions', 'range', start, end] as const,
  },
  snoozes: {
    forDate: (date: string) => ['snoozes', date] as const,
    forRange: (start: string, end: string) => ['snoozes', 'range', start, end] as const,
  },
  streak: ['streak'] as const,
  health: {
    metrics: ['health', 'metrics'] as const,
    history: (type: string, days: number) => ['health', 'history', type, days] as const,
  },
  dailyTodos: {
    forDate: (date: string) => ['dailyTodos', date] as const,
    forRange: (start: string, end: string) => ['dailyTodos', 'range', start, end] as const,
  },
  dailyJournal: {
    forDate: (date: string) => ['dailyJournal', date] as const,
    forRange: (start: string, end: string) => ['dailyJournal', 'range', start, end] as const,
  },
} as const;
