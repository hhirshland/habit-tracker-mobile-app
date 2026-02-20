import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  colorsForMode,
  lightTheme,
  darkTheme,
  type Theme,
  type ThemeColors,
  type ThemeMode,
} from '@/lib/theme';

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return useMemo(() => colorsForMode((scheme as ThemeMode) ?? 'light'), [scheme]);
}

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return useMemo(
    () => (scheme === 'dark' ? darkTheme : lightTheme),
    [scheme],
  );
}
