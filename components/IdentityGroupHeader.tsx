import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { theme, type ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { CATEGORY_ICONS } from '@/components/CategoryPicker';
import { getCategoryIdForStatement } from '@/lib/identityTemplates';
import type { IdentityGroup } from '@/lib/identityAdherence';
import type { IdentityStatement } from '@/lib/types';

const DEFAULT_ICON = 'star';

function getIconForIdentity(identity: IdentityStatement): string {
  // Use stored category_id if available, fall back to statement-based lookup for older records
  const categoryId = identity.category_id ?? getCategoryIdForStatement(identity.statement);
  if (categoryId === 'custom' || categoryId === 'other') return DEFAULT_ICON;
  return CATEGORY_ICONS[categoryId] ?? DEFAULT_ICON;
}

interface IdentityGroupHeaderProps {
  group: IdentityGroup;
}

export default function IdentityGroupHeader({ group }: IdentityGroupHeaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { identity, adherencePercent, stats } = group;

  const isOnPace = stats.length > 0 && stats.every((s) => s.status === 'on_track' || s.status === 'met');
  const barColor = stats.length === 0 ? colors.textMuted : isOnPace ? colors.success : colors.danger;

  if (!identity) {
    return (
      <View style={styles.header}>
        <Text style={styles.ungroupedLabel}>I am Thriving</Text>
      </View>
    );
  }

  const icon = getIconForIdentity(identity);

  return (
    <View style={styles.header}>
      <View style={styles.labelRow}>
        <FontAwesome
          name={icon as React.ComponentProps<typeof FontAwesome>['name']}
          size={12}
          color={colors.textSecondary}
          style={styles.icon}
        />
        <Text style={styles.statement} numberOfLines={1}>{identity.statement}</Text>
        {stats.length > 0 && (
          <Text style={[styles.percent, { color: barColor }]}>{adherencePercent}%</Text>
        )}
      </View>
      {stats.length === 0 && (
        <TouchableOpacity
          style={[styles.addButton, { borderColor: colors.primary }]}
          activeOpacity={0.7}
          onPress={() => router.push('/manage-habits')}
        >
          <FontAwesome name="plus" size={11} color={colors.primary} />
          <Text style={[styles.addButtonText, { color: colors.primary }]}>Add a habit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xs,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      marginRight: 6,
      width: 14,
      textAlign: 'center',
    },
    statement: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.bold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      flex: 1,
    },
    percent: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.bold,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1.5,
      borderRadius: theme.borderRadius.md,
      gap: 6,
    },
    addButtonText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
    ungroupedLabel: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.bold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });
}
