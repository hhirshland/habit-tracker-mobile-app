export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export type UserSettings = {
  top3_todos_enabled: boolean;
  journal_enabled: boolean;
  theme_preference: ThemePreference;
};

export const USER_SETTINGS_STORAGE_KEY = '@user_settings';
export const LEGACY_TOP3_TODOS_STORAGE_KEY = '@top_3_todos_enabled';
export const LEGACY_JOURNAL_STORAGE_KEY = '@daily_journal_enabled';
export const LEGACY_THEME_STORAGE_KEY = '@theme_preference';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  top3_todos_enabled: false,
  journal_enabled: false,
  theme_preference: 'system',
};

export function coerceThemePreference(value: unknown): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
}

export function normalizeUserSettings(value: unknown): UserSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_USER_SETTINGS };
  }

  const settings = value as Partial<UserSettings>;
  return {
    top3_todos_enabled: settings.top3_todos_enabled === true,
    journal_enabled: settings.journal_enabled === true,
    theme_preference: coerceThemePreference(settings.theme_preference),
  };
}
