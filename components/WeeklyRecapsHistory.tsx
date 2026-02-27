import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, type ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { formatWeekLabel } from '@/lib/weeklyRecaps';
import type { QualifyingWeek } from '@/lib/types';

interface WeeklyRecapsHistoryProps {
  weeks: QualifyingWeek[]; // only viewed (generated + read) recaps
  onSelectWeek: (week: QualifyingWeek) => void;
}

function RecapCard({
  week,
  onPress,
  styles,
  colors,
}: {
  week: QualifyingWeek;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const hasRecap = !!week.recap;
  const isUnread = hasRecap && !week.recap!.is_read;
  const adherence = week.recap?.content?.habit_review?.overall_adherence_pct;
  const weekLabel = formatWeekLabel(week.week_start, week.week_end);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        !hasRecap && styles.cardUngenerated,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isUnread && <View style={styles.unreadDot} />}
      <View style={styles.cardIconRow}>
        <FontAwesome
          name={hasRecap ? 'lightbulb-o' : 'magic'}
          size={16}
          color={hasRecap ? colors.primary : colors.textMuted}
        />
        {adherence != null && (
          <View style={styles.adherenceChip}>
            <Text style={styles.adherenceChipText}>{adherence}%</Text>
          </View>
        )}
      </View>
      <Text style={[styles.cardWeekLabel, !hasRecap && styles.cardWeekLabelDimmed]}>
        {weekLabel}
      </Text>
      {!hasRecap && (
        <Text style={styles.tapToGenerate}>Tap to generate</Text>
      )}
    </TouchableOpacity>
  );
}

export default function WeeklyRecapsHistory({
  weeks,
  onSelectWeek,
}: WeeklyRecapsHistoryProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (weeks.length === 0) {
    return (
      <>
        <Text style={styles.sectionLabel}>Weekly Recaps</Text>
        <View style={styles.emptyCard}>
          <FontAwesome name="star-o" size={20} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Your first weekly recap will appear after this week
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Text style={styles.sectionLabel}>Weekly Recaps</Text>
      <FlatList
        data={weeks}
        keyExtractor={(item) => item.week_start}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <RecapCard
            week={item}
            onPress={() => onSelectWeek(item)}
            styles={styles}
            colors={colors}
          />
        )}
      />
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sectionLabel: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    listContent: {
      gap: theme.spacing.sm,
    },
    card: {
      width: 140,
      backgroundColor: colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      position: 'relative',
      ...theme.shadow.sm,
    },
    cardUngenerated: {
      opacity: 0.7,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderStyle: 'dashed',
    },
    unreadDot: {
      position: 'absolute',
      top: theme.spacing.sm,
      right: theme.spacing.sm,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    cardIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    adherenceChip: {
      backgroundColor: colors.primaryLightOverlay25,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    adherenceChipText: {
      fontSize: 10,
      fontWeight: theme.fontWeight.bold,
      color: colors.primary,
    },
    cardWeekLabel: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textPrimary,
    },
    cardWeekLabelDimmed: {
      color: colors.textSecondary,
    },
    tapToGenerate: {
      fontSize: theme.fontSize.xs,
      color: colors.textMuted,
      marginTop: 4,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      alignItems: 'center',
      gap: theme.spacing.sm,
      ...theme.shadow.sm,
    },
    emptyText: {
      fontSize: theme.fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
