import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  coerceThemePreference,
  DEFAULT_USER_SETTINGS,
  LEGACY_JOURNAL_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
  LEGACY_TOP3_TODOS_STORAGE_KEY,
  normalizeUserSettings,
  ResolvedTheme,
  ThemePreference,
  UserSettings,
  USER_SETTINGS_STORAGE_KEY,
} from '@/lib/userSettings';

type UserSettingsContextValue = {
  settings: UserSettings;
  loaded: boolean;
  resolvedTheme: ResolvedTheme;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  setThemePreference: (nextPreference: ThemePreference) => Promise<void>;
};

const UserSettingsContext = createContext<UserSettingsContextValue | undefined>(undefined);

function parseBooleanString(value: string | null) {
  return value === 'true';
}

async function migrateLegacySettingsIfNeeded(): Promise<UserSettings> {
  const storedSettingsRaw = await AsyncStorage.getItem(USER_SETTINGS_STORAGE_KEY);
  if (storedSettingsRaw) {
    try {
      return normalizeUserSettings(JSON.parse(storedSettingsRaw));
    } catch (error) {
      console.warn('Invalid user settings payload in storage. Resetting to defaults.', error);
      return { ...DEFAULT_USER_SETTINGS };
    }
  }

  const [top3Raw, journalRaw, themeRaw] = await Promise.all([
    AsyncStorage.getItem(LEGACY_TOP3_TODOS_STORAGE_KEY),
    AsyncStorage.getItem(LEGACY_JOURNAL_STORAGE_KEY),
    AsyncStorage.getItem(LEGACY_THEME_STORAGE_KEY),
  ]);

  const migratedSettings: UserSettings = {
    top3_todos_enabled: parseBooleanString(top3Raw),
    journal_enabled: parseBooleanString(journalRaw),
    theme_preference: coerceThemePreference(themeRaw),
  };

  await AsyncStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(migratedSettings));
  await AsyncStorage.multiRemove([
    LEGACY_TOP3_TODOS_STORAGE_KEY,
    LEGACY_JOURNAL_STORAGE_KEY,
    LEGACY_THEME_STORAGE_KEY,
  ]);

  return migratedSettings;
}

function areSettingsEqual(a: UserSettings, b: UserSettings) {
  return (
    a.top3_todos_enabled === b.top3_todos_enabled &&
    a.journal_enabled === b.journal_enabled &&
    a.theme_preference === b.theme_preference
  );
}

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const settingsRef = useRef<UserSettings>(DEFAULT_USER_SETTINGS);
  const syncedUserIdRef = useRef<string | null>(null);

  const persistSettingsToRemote = useCallback(async (userId: string, nextSettings: UserSettings) => {
    const { error } = await supabase
      .from('profiles')
      .update({ settings: nextSettings })
      .eq('user_id', userId);

    if (error) {
      console.error('Error persisting user settings to Supabase:', error);
    }
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const nextSettings = await migrateLegacySettingsIfNeeded();
        if (isMounted) {
          setSettings(nextSettings);
          settingsRef.current = nextSettings;
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
      } finally {
        if (isMounted) {
          setLoaded(true);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const preference = settings.theme_preference;
      Appearance.setColorScheme(preference === 'system' ? null : preference);
    } catch (error) {
      console.warn('Unable to set app color scheme override:', error);
    }
  }, [settings.theme_preference]);

  const updateSettings = useCallback(async (partial: Partial<UserSettings>) => {
    const nextSettings: UserSettings = {
      ...settingsRef.current,
      ...partial,
      theme_preference: coerceThemePreference(partial.theme_preference ?? settingsRef.current.theme_preference),
    };
    setSettings(nextSettings);
    settingsRef.current = nextSettings;
    await AsyncStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
    if (user?.id) {
      await persistSettingsToRemote(user.id, nextSettings);
    }
  }, [user?.id, persistSettingsToRemote]);

  const setThemePreference = useCallback(async (nextPreference: ThemePreference) => {
    await updateSettings({ theme_preference: nextPreference });
  }, [updateSettings]);

  useEffect(() => {
    if (!loaded || authLoading) return;

    // If signed out, allow the next sign-in to trigger a fresh server sync.
    if (!user) {
      syncedUserIdRef.current = null;
      return;
    }

    // Run the server merge once per signed-in user session.
    if (syncedUserIdRef.current === user.id) return;
    syncedUserIdRef.current = user.id;

    const remoteSettings = normalizeUserSettings(profile?.settings);
    const localSettings = settingsRef.current;
    const hasRemoteSettings = profile?.settings !== null && profile?.settings !== undefined;

    if (hasRemoteSettings) {
      // Server is source of truth for signed-in users across devices.
      if (!areSettingsEqual(remoteSettings, localSettings)) {
        setSettings(remoteSettings);
        settingsRef.current = remoteSettings;
      }
      AsyncStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(remoteSettings)).catch((error) => {
        console.error('Error caching remote user settings locally:', error);
      });
    } else {
      // Seed server settings from current local settings if profile has no settings yet.
      persistSettingsToRemote(user.id, localSettings).catch(() => {
        // Errors are already logged in persistSettingsToRemote.
      });
    }
  }, [loaded, authLoading, user, profile?.settings, persistSettingsToRemote]);

  const resolvedTheme: ResolvedTheme = settings.theme_preference === 'system'
    ? (systemScheme ?? 'light')
    : settings.theme_preference;

  const value = useMemo<UserSettingsContextValue>(() => ({
    settings,
    loaded,
    resolvedTheme,
    updateSettings,
    setThemePreference,
  }), [settings, loaded, resolvedTheme, updateSettings, setThemePreference]);

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}

export function useUserSettings() {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
}

