import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
  interpolateColor,
  interpolate,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, type ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { formatWeekLabel } from '@/lib/weeklyRecaps';
import type { QualifyingWeek } from '@/lib/types';

interface WeeklyRecapBannerProps {
  week: QualifyingWeek;
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function WeeklyRecapBanner({ week, onPress }: WeeklyRecapBannerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasRecap = !!week.recap;

  const sweep = useSharedValue(0);
  const borderGlow = useSharedValue(0);

  useEffect(() => {
    sweep.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }),
        withDelay(2600, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
    borderGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [sweep, borderGlow]);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      borderGlow.value,
      [0, 1],
      [colors.primary, colors.primaryDark],
    ),
  }));

  const shineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sweep.value, [0, 0.3, 0.7, 1], [0, 0.22, 0.22, 0]),
    transform: [
      { translateX: interpolate(sweep.value, [0, 1], [-60, 420]) },
      { skewX: '-18deg' },
    ],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(borderGlow.value, [0, 1], [0.25, 0.6]),
  }));

  const weekLabel = formatWeekLabel(week.week_start, week.week_end);

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)}>
      <AnimatedTouchable
        style={[styles.container, bgStyle]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Crisp thin shine band */}
        <Animated.View style={[styles.shineBand, shineStyle]} />

        {/* Pulsing border overlay */}
        <Animated.View style={[styles.borderOverlay, borderStyle]} />

        <View style={styles.topRow}>
          <View style={styles.iconCircle}>
            <FontAwesome
              name={hasRecap ? 'lightbulb-o' : 'magic'}
              size={20}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>NEW</Text>
          </View>
        </View>

        <Text style={styles.title}>
          {hasRecap ? 'Your Weekly recap is ready' : 'Weekly recap available'}
        </Text>
        <Text style={styles.subtitle}>{weekLabel}</Text>

        <View style={styles.ctaRow}>
          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>
              {hasRecap ? 'View Your Week' : 'View'}
            </Text>
            <FontAwesome name="arrow-right" size={12} color={colors.primary} />
          </View>
        </View>
      </AnimatedTouchable>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      overflow: 'hidden',
      position: 'relative',
      ...theme.shadow.lg,
    },
    shineBand: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 36,
      backgroundColor: '#FFFFFF',
    },
    borderOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.5)',
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: theme.fontWeight.bold,
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    title: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: '#FFFFFF',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: theme.fontSize.sm,
      color: 'rgba(255,255,255,0.75)',
      marginBottom: theme.spacing.md,
    },
    ctaRow: {
      flexDirection: 'row',
    },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: '#FFFFFF',
      borderRadius: theme.borderRadius.md,
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.md,
    },
    ctaText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: colors.primary,
    },
  });
}
