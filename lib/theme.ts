import { Appearance } from 'react-native';

export type ThemeColors = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  success: string;
  successLight: string;
  warning: string;
  danger: string;
  background: string;
  surface: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  overlay: string;
  completed: string;
  completedText: string;
  warningBackground: string;
  warningBorder: string;
  warningText: string;
  primaryLightOverlay30: string;
  primaryLightOverlay25: string;
  primaryLightOverlay15: string;
  primaryOverlay60: string;
  primaryOverlay40: string;
  warningOverlay18: string;
  textMutedOverlay18: string;
};

const lightColors: ThemeColors = {
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#5A52E0',
  secondary: '#4ECDC4',
  success: '#2ECC71',
  successLight: '#E8F8F0',
  warning: '#F39C12',
  danger: '#E74C3C',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  overlay: 'rgba(0, 0, 0, 0.5)',
  completed: '#D1FAE5',
  completedText: '#065F46',
  warningBackground: '#FFF8E1',
  warningBorder: '#FFE082',
  warningText: '#E65100',
  primaryLightOverlay30: '#8B85FF30',
  primaryLightOverlay25: '#8B85FF25',
  primaryLightOverlay15: '#8B85FF15',
  primaryOverlay60: '#6C63FF60',
  primaryOverlay40: '#6C63FF40',
  warningOverlay18: '#F39C1218',
  textMutedOverlay18: '#9CA3AF18',
};

const darkColors: ThemeColors = {
  primary: '#8D86FF',
  primaryLight: '#A29DFF',
  primaryDark: '#746CF5',
  secondary: '#52D7CE',
  success: '#38D47B',
  successLight: '#173125',
  warning: '#FFB54C',
  danger: '#FF776A',
  background: '#0E1016',
  surface: '#171A22',
  card: '#171A22',
  textPrimary: '#F3F4F8',
  textSecondary: '#B2B8C5',
  textMuted: '#8D95A6',
  border: '#2A2E39',
  borderLight: '#202532',
  overlay: 'rgba(0, 0, 0, 0.65)',
  completed: '#164332',
  completedText: '#9CF0CA',
  warningBackground: '#3A2A13',
  warningBorder: '#5A3D1E',
  warningText: '#FFCC80',
  primaryLightOverlay30: '#A29DFF33',
  primaryLightOverlay25: '#A29DFF2B',
  primaryLightOverlay15: '#A29DFF1A',
  primaryOverlay60: '#8D86FF66',
  primaryOverlay40: '#8D86FF44',
  warningOverlay18: '#FFB54C24',
  textMutedOverlay18: '#8D95A630',
};

export type ThemeMode = 'light' | 'dark';

export function colorsForMode(mode: ThemeMode): ThemeColors {
  return mode === 'dark' ? darkColors : lightColors;
}

const initialColors = colorsForMode(
  (Appearance.getColorScheme() as ThemeMode) ?? 'light',
);

const sharedTheme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    /** Extra bottom padding so content clears the absolutely-positioned tab bar pill */
    tabBarClearance: 100,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 34,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
  },
};

export const lightTheme = {
  ...sharedTheme,
  colors: lightColors,
};

export const darkTheme = {
  ...sharedTheme,
  colors: darkColors,
};

export const theme = {
  ...sharedTheme,
  colors: initialColors,
};

export type Theme = typeof lightTheme;
