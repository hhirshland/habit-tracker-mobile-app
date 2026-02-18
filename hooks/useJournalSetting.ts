import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EVENTS, captureEvent } from '@/lib/analytics';

const STORAGE_KEY = '@daily_journal_enabled';

export function useJournalSetting() {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const readValue = useCallback(async () => {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
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
    const newValue = !enabled;
    setEnabled(newValue);
    await AsyncStorage.setItem(STORAGE_KEY, newValue ? 'true' : 'false');
    captureEvent(EVENTS.JOURNAL_TOGGLED, { enabled: newValue });
  }, [enabled]);

  return { enabled, loaded, toggle };
}
