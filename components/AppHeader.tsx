import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';

interface RightAction {
  icon?: string;
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: RightAction;
  showBorder?: boolean;
}

export default function AppHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  showBorder = false,
}: AppHeaderProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        showBorder && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <TouchableOpacity
        onPress={onBack ?? (() => router.back())}
        hitSlop={12}
        style={styles.leftSlot}
      >
        <FontAwesome name="chevron-left" size={18} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightAction ? (
        <TouchableOpacity
          onPress={rightAction.onPress}
          disabled={rightAction.disabled}
          activeOpacity={0.7}
          hitSlop={8}
          style={styles.rightSlot}
        >
          {rightAction.icon ? (
            <FontAwesome
              name={rightAction.icon as any}
              size={18}
              color={rightAction.color ?? colors.textPrimary}
            />
          ) : rightAction.label ? (
            <Text
              style={[
                styles.rightLabel,
                { color: rightAction.disabled ? colors.textMuted : (rightAction.color ?? colors.primary) },
              ]}
            >
              {rightAction.label}
            </Text>
          ) : null}
        </TouchableOpacity>
      ) : (
        <View style={styles.rightSlot} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  leftSlot: {
    width: 40,
    alignItems: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.xs,
    marginTop: 1,
  },
  rightSlot: {
    width: 40,
    alignItems: 'flex-end',
  },
  rightLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
});
