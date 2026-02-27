import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EVENTS, captureEvent } from '@/lib/analytics';
import {
  cancelAllScheduledNotifications,
  NOTIFICATIONS_ENABLED_STORAGE_KEY,
  requestNotificationPermissions,
  rescheduleNotifications,
} from '@/lib/notifications';

export function useNotificationsSetting() {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const readValue = useCallback(async () => {
    const value = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_STORAGE_KEY);
    setEnabled(value === 'true');
    setLoaded(true);
  }, []);

  useEffect(() => {
    readValue();
  }, [readValue]);

  useFocusEffect(
    useCallback(() => {
      readValue();
    }, [readValue])
  );

  const toggle = useCallback(async () => {
    const nextEnabled = !enabled;

    if (nextEnabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setEnabled(false);
        await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_STORAGE_KEY, 'false');
        return;
      }
    }

    setEnabled(nextEnabled);
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_STORAGE_KEY, nextEnabled ? 'true' : 'false');

    if (nextEnabled) {
      await rescheduleNotifications();
    } else {
      await cancelAllScheduledNotifications();
    }

    captureEvent(EVENTS.NOTIFICATIONS_TOGGLED, { enabled: nextEnabled });
  }, [enabled]);

  return { enabled, loaded, toggle };
}
