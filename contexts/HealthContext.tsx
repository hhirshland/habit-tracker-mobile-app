import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  HealthMetrics,
  isHealthKitAvailable,
  requestHealthPermissions,
  checkHealthAuthorization,
  getTodayMetrics,
} from '@/lib/health';

interface HealthContextType {
  /** Whether HealthKit is available on this device (iOS only) */
  isAvailable: boolean;
  /** Whether the user has granted HealthKit read permissions */
  isAuthorized: boolean;
  /** Whether we're currently loading health data */
  loading: boolean;
  /** Today's health metrics */
  metrics: HealthMetrics;
  /** Whether the last connect attempt failed (user may need to go to Settings) */
  authFailed: boolean;
  /** Request HealthKit permissions from the user */
  connect: () => Promise<boolean>;
  /** Refresh health data */
  refresh: () => Promise<void>;
}

const defaultMetrics: HealthMetrics = {
  steps: null,
  weight: null,
  restingHeartRate: null,
  workoutsThisWeek: [],
};

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [isAvailable] = useState(() => isHealthKitAvailable());
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<HealthMetrics>(defaultMetrics);
  const [authFailed, setAuthFailed] = useState(false);

  // Prevent concurrent loads
  const loadingRef = useRef(false);

  // Check authorization on mount (iOS only)
  useEffect(() => {
    if (!isAvailable) return;

    checkHealthAuthorization().then((authorized) => {
      console.log('[HealthContext] Initial authorization check:', authorized);
      setIsAuthorized(authorized);
      if (authorized) {
        loadMetrics();
      }
    });
  }, [isAvailable]);

  const loadMetrics = useCallback(async () => {
    if (!isAvailable || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const data = await getTodayMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('[HealthContext] Error loading health metrics:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [isAvailable]);

  const connect = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;

    setAuthFailed(false);

    console.log('[HealthContext] Starting connect flow...');
    const granted = await requestHealthPermissions();
    console.log('[HealthContext] requestHealthPermissions returned:', granted);

    if (granted) {
      setIsAuthorized(true);
      await loadMetrics();
    } else {
      setIsAuthorized(false);
      setAuthFailed(true);
    }

    return granted;
  }, [isAvailable, loadMetrics]);

  const refresh = useCallback(async () => {
    if (isAuthorized) {
      await loadMetrics();
    }
  }, [isAuthorized, loadMetrics]);

  return (
    <HealthContext.Provider
      value={{
        isAvailable,
        isAuthorized,
        loading,
        metrics,
        authFailed,
        connect,
        refresh,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
}
