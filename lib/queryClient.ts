import { QueryClient, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

// ── Wire up React Query's online manager to NetInfo ──
// This tells React Query to pause refetches when offline
// and automatically resume them when connectivity returns.
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Show cached data immediately, refetch in background if stale
      staleTime: 1000 * 60, // 1 minute default
      gcTime: 1000 * 60 * 30, // Keep unused cache for 30 minutes (longer for offline)
      retry: 2,
      refetchOnWindowFocus: false, // Not relevant for mobile
      refetchOnReconnect: true,
      // When offline, serve stale cache instead of showing errors
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Allow mutations to be attempted even when offline (we handle queueing)
      networkMode: 'always',
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
} as const;
