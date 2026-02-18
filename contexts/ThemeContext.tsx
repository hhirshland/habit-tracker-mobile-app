import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (nextPreference: ThemePreference) => Promise<void>;
  loaded: boolean;
};

const STORAGE_KEY = '@theme_preference';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function coercePreference(value: string | null): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const readPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isMounted) return;
        setPreferenceState(coercePreference(stored));
      } finally {
        if (isMounted) setLoaded(true);
      }
    };

    readPreference();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      Appearance.setColorScheme(preference === 'system' ? null : preference);
    } catch (error) {
      console.warn('Unable to set app color scheme override:', error);
    }
  }, [preference]);

  const setPreference = async (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    await AsyncStorage.setItem(STORAGE_KEY, nextPreference);
  };

  const resolvedTheme: ResolvedTheme = preference === 'system'
    ? (systemScheme ?? 'light')
    : preference;

  const value = useMemo<ThemeContextValue>(() => ({
    preference,
    resolvedTheme,
    setPreference,
    loaded,
  }), [preference, resolvedTheme, loaded]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemePreference must be used within a ThemeProvider');
  }
  return context;
}
