import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { formatDate } from '@/lib/habits';
import { DAY_LABELS, DayOfWeek } from '@/lib/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_ITEM_SIZE = 44;
const DAY_ITEM_MARGIN = 4;
const DAY_CONTAINER_WIDTH = 56;
const DAY_TOTAL_WIDTH = DAY_CONTAINER_WIDTH + DAY_ITEM_MARGIN * 2;
// Number of days to show in each direction beyond the initial 7
const BUFFER_DAYS = 30;

interface DayData {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayOfWeek: DayOfWeek;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
  isFuture: boolean;
}

interface CalendarStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateString: string) => void;
  dayProgress: Record<string, { completed: number; total: number }>; // dateString -> progress
}

function generateDays(centerDate: Date): DayData[] {
  const days: DayData[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = -BUFFER_DAYS; i <= BUFFER_DAYS; i++) {
    const date = new Date(centerDate);
    date.setDate(centerDate.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const dayOfWeek = date.getDay() as DayOfWeek;
    days.push({
      date,
      dateString: formatDate(date),
      dayOfWeek,
      dayLabel: DAY_LABELS[dayOfWeek],
      dayNumber: date.getDate(),
      isToday: date.getTime() === today.getTime(),
      isFuture: date.getTime() > today.getTime(),
    });
  }

  return days;
}

function ProgressRing({
  progress,
  isFuture,
  colors,
}: {
  progress: number; // 0 to 1
  isFuture: boolean;
  colors: import('@/lib/theme').ThemeColors;
}) {
  const size = DAY_ITEM_SIZE;
  const center = size / 2;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  // Progress ring color
  let ringColor = colors.primary;
  if (progress >= 1) {
    ringColor = colors.success;
  }

  const trackColor = isFuture ? 'transparent' : colors.borderLight;

  return (
    <Svg width={size} height={size}>
      {/* Background track */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      {/* Progress arc */}
      {progress > 0 && !isFuture && (
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      )}
    </Svg>
  );
}

export default function CalendarStrip({
  selectedDate,
  onSelectDate,
  dayProgress,
}: CalendarStripProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = generateDays(today);

  // The "today" index in the array
  const todayIndex = BUFFER_DAYS; // center of the array

  // Initial scroll so today appears at position 5 (6th item, 0-indexed) in the visible strip
  const initialScrollX = (todayIndex - 5) * DAY_TOTAL_WIDTH;

  useEffect(() => {
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: initialScrollX, animated: false });
    }, 50);
    return () => clearTimeout(timeout);
  }, [initialScrollX]);

  const getProgress = useCallback(
    (dateString: string): number => {
      const prog = dayProgress[dateString];
      if (!prog || prog.total === 0) return 0;
      return Math.min(prog.completed / prog.total, 1);
    },
    [dayProgress]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={DAY_TOTAL_WIDTH}
        decelerationRate="fast"
      >
        {days.map((day) => {
          const isSelected = day.dateString === selectedDate;
          const progress = getProgress(day.dateString);

          return (
            <TouchableOpacity
              key={day.dateString}
              style={[
                styles.dayContainer,
                isSelected && styles.dayContainerSelected,
                day.isToday && !isSelected && styles.dayContainerToday,
              ]}
              onPress={() => onSelectDate(day.dateString)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayLabel,
                  isSelected && styles.dayLabelSelected,
                  day.isToday && !isSelected && styles.dayLabelToday,
                  day.isFuture && !isSelected && styles.dayLabelFuture,
                ]}
              >
                {day.dayLabel}
              </Text>
              <View style={styles.ringContainer}>
                <ProgressRing
                  progress={progress}
                  isFuture={day.isFuture}
                  colors={colors}
                />
                <View style={styles.dayNumberOverlay}>
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                      day.isToday && !isSelected && styles.dayNumberToday,
                      day.isFuture && !isSelected && styles.dayNumberFuture,
                    ]}
                  >
                    {day.dayNumber}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: import('@/lib/theme').ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingVertical: theme.spacing.xs,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.sm,
    },
    // Base day container — rectangular with rounded corners
    dayContainer: {
      alignItems: 'center',
      marginHorizontal: DAY_ITEM_MARGIN,
      width: DAY_CONTAINER_WIDTH,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.md,
    },
    // Selected day — prominent background
    dayContainerSelected: {
      backgroundColor: colors.primaryLightOverlay15,
    },
    // Today (not selected) — subtle background
    dayContainerToday: {
      backgroundColor: colors.borderLight,
    },
    dayLabel: {
      fontSize: 11,
      fontWeight: theme.fontWeight.medium,
      color: colors.textSecondary,
      marginBottom: 4,
      textTransform: 'capitalize',
    },
    dayLabelSelected: {
      color: colors.primary,
      fontWeight: theme.fontWeight.bold,
    },
    dayLabelToday: {
      color: colors.textPrimary,
      fontWeight: theme.fontWeight.semibold,
    },
    dayLabelFuture: {
      color: colors.textMuted,
    },
    ringContainer: {
      width: DAY_ITEM_SIZE,
      height: DAY_ITEM_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayNumberOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayNumber: {
      fontSize: 16,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textPrimary,
    },
    dayNumberSelected: {
      fontWeight: theme.fontWeight.bold,
      color: colors.primary,
    },
    dayNumberToday: {
      color: colors.textPrimary,
      fontWeight: theme.fontWeight.bold,
    },
    dayNumberFuture: {
      color: colors.textMuted,
    },
  });
}
