import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@/lib/theme';
import { Habit } from '@/lib/types';

/**
 * Variant A — Purple Left Border Accent
 * Design thesis: A bold vertical stripe on the left edge of the card
 * signals importance at a glance, similar to priority indicators in
 * task apps like Todoist.
 */

interface PriorityItemProps {
  habit: Habit;
  isCompleted: boolean;
  isSnoozed?: boolean;
  isRequired: boolean;
  weeklyProgress?: { done: number; total: number };
  onToggle: () => void;
  onSnooze?: () => void;
  onUnsnooze?: () => void;
}

export default function PriorityItemVariantA({
  habit,
  isCompleted,
  isSnoozed,
  isRequired,
  weeklyProgress,
  onToggle,
  onSnooze,
  onUnsnooze,
}: PriorityItemProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });

    return (
      <Animated.View style={[styles.snoozeAction, { transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={styles.snoozeButton}
          onPress={() => {
            swipeableRef.current?.close();
            onSnooze?.();
          }}
          activeOpacity={0.8}
        >
          <FontAwesome name="clock-o" size={20} color="#fff" />
          <Text style={styles.snoozeText}>Snooze</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Snoozed state
  if (isSnoozed) {
    return (
      <TouchableOpacity
        style={[styles.container, styles.containerSnoozed]}
        onPress={onUnsnooze}
        activeOpacity={0.7}
      >
        <View style={styles.snoozeIcon}>
          <FontAwesome name="clock-o" size={16} color={theme.colors.warning} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.name, styles.nameSnoozed]} numberOfLines={1}>
            {habit.name}
          </Text>
        </View>

        <Text style={styles.unsnoozeTapLabel}>Tap to restore</Text>
      </TouchableOpacity>
    );
  }

  const card = (
    <TouchableOpacity
      style={[
        styles.container,
        isRequired && !isCompleted && styles.containerRequired,
        isCompleted && styles.containerCompleted,
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      {/* Purple left accent bar for required items */}
      {isRequired && !isCompleted && <View style={styles.accentBar} />}

      <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
        {isCompleted && <FontAwesome name="check" size={12} color="#fff" />}
      </View>

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isCompleted && styles.nameCompleted]} numberOfLines={1}>
            {habit.name}
          </Text>
        </View>

        {weeklyProgress && !habit.specific_days && (
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (weeklyProgress.done / weeklyProgress.total) * 100)}%`,
                  },
                  weeklyProgress.done >= weeklyProgress.total && styles.progressComplete,
                ]}
              />
            </View>
            <Text style={[styles.progressText, isCompleted && styles.progressTextCompleted]}>
              {weeklyProgress.done}/{weeklyProgress.total}
            </Text>
          </View>
        )}
      </View>

      {isCompleted && (
        <FontAwesome name="check-circle" size={20} color={theme.colors.success} />
      )}
    </TouchableOpacity>
  );

  if (!isCompleted && onSnooze) {
    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        {card}
      </Swipeable>
    );
  }

  return card;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  containerRequired: {
    borderLeftWidth: 0,
    paddingLeft: theme.spacing.md,
  },
  containerCompleted: {
    backgroundColor: theme.colors.completed,
    borderColor: theme.colors.completed,
    ...theme.shadow.sm,
    shadowOpacity: 0,
    elevation: 0,
  },
  containerSnoozed: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE082',
    ...theme.shadow.sm,
    shadowOpacity: 0,
    elevation: 0,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.borderRadius.md,
    borderBottomLeftRadius: theme.borderRadius.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  snoozeIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  name: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  nameCompleted: {
    color: theme.colors.completedText,
    textDecorationLine: 'line-through',
    opacity: 0.8,
  },
  nameSnoozed: {
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  unsnoozeTapLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.warning,
    fontWeight: theme.fontWeight.medium,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: 6,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 2,
  },
  progressComplete: {
    backgroundColor: theme.colors.success,
  },
  progressText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontWeight: theme.fontWeight.medium,
    minWidth: 28,
    textAlign: 'right',
  },
  progressTextCompleted: {
    color: theme.colors.completedText,
    opacity: 0.7,
  },
  snoozeAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snoozeButton: {
    flex: 1,
    width: '100%',
    backgroundColor: theme.colors.warning,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  snoozeText: {
    color: '#fff',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
});
