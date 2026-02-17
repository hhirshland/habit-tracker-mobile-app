import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { EVENTS, captureEvent, setSuperProperties } from '@/lib/analytics';
import {
  HealthMetrics,
  isHealthKitAvailable,
  requestHealthPermissions,
  checkHealthAuthorization,
  getTodayMetrics,
  detectMissingMetrics,
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
  /** Metric keys that returned null (missing permissions or no data) */
  missingMetrics: string[];
  /** Request HealthKit permissions from the user */
  connect: () => Promise<boolean>;
  /** Re-request permissions (shows native prompt for any new/ungranted types) then reload */
  requestMorePermissions: () => Promise<void>;
  /** Refresh health data */
  refresh: () => Promise<void>;
}

const defaultMetrics: HealthMetrics = {
  steps: null,
  weight: null,
  restingHeartRate: null,
  bodyFatPercentage: null,
  leanBodyMass: null,
  bodyMassIndex: null,
  exerciseMinutes: null,
  timeInDaylight: null,
  hrv: null,
  workoutsThisWeek: [],
};

const REQUESTED_HEALTH_METRICS = [
  'steps',
  'weight',
  'resting_heart_rate',
  'workout_minutes',
  'body_fat_percentage',
  'lean_body_mass',
  'bmi',
  'exercise_minutes',
  'time_in_daylight',
  'hrv',
];

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [isAvailable] = useState(() => isHealthKitAvailable());
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<HealthMetrics>(defaultMetrics);
  const [authFailed, setAuthFailed] = useState(false);
  const [missingMetrics, setMissingMetrics] = useState<string[]>([]);

  // Prevent concurrent loads
  const loadingRef = useRef(false);

  // Check authorization on mount (iOS only)
  useEffect(() => {
    if (!isAvailable) return;

    checkHealthAuthorization().then((authorized) => {
      console.log('[HealthContext] Initial authorization check:', authorized);
      setIsAuthorized(authorized);
      setSuperProperties({ has_health_connected: authorized });
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
      setMissingMetrics(detectMissingMetrics(data));
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
    captureEvent(EVENTS.HEALTH_PERMISSIONS_REQUESTED, {
      metrics: REQUESTED_HEALTH_METRICS,
    });
    const granted = await requestHealthPermissions();
    console.log('[HealthContext] requestHealthPermissions returned:', granted);

    if (granted) {
      setIsAuthorized(true);
      setSuperProperties({ has_health_connected: true });
      captureEvent(EVENTS.HEALTH_CONNECTED);
      await loadMetrics();
    } else {
      setIsAuthorized(false);
      setSuperProperties({ has_health_connected: false });
      setAuthFailed(true);
    }

    return granted;
  }, [isAvailable, loadMetrics]);

  const requestMorePermissions = useCallback(async () => {
    if (!isAvailable) return;
    // Re-call requestAuthorization — iOS will only show the prompt for types
    // that haven't been asked about yet (i.e. the new ones we added)
    captureEvent(EVENTS.HEALTH_PERMISSIONS_REQUESTED, {
      metrics: REQUESTED_HEALTH_METRICS,
    });
    await requestHealthPermissions();
    // Reload metrics to pick up any newly-permitted data
    await loadMetrics();
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
        missingMetrics,
        connect,
        requestMorePermissions,
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
