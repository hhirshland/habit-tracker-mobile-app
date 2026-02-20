import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, type ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { DailyJournalEntry } from '@/lib/types';

interface JournalHistorySectionProps {
  entries: DailyJournalEntry[];
}

function formatJournalDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function JournalEntryCard({ entry, styles, colors }: { entry: DailyJournalEntry; styles: ReturnType<typeof createStyles>; colors: ThemeColors }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.entryCard}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.entryHeader}>
        <View style={styles.entryDateRow}>
          <View style={styles.entryIconCircle}>
            <FontAwesome name="book" size={11} color={colors.primary} />
          </View>
          <Text style={styles.entryDate}>{formatJournalDate(entry.journal_date)}</Text>
        </View>
        <FontAwesome
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={colors.textMuted}
        />
      </View>

      {!expanded && (
        <Text style={styles.entryPreview} numberOfLines={1}>
          {entry.win}
        </Text>
      )}

      {expanded && (
        <View style={styles.entryBody}>
          <View style={styles.promptRow}>
            <Text style={styles.promptIcon}>🏆</Text>
            <View style={styles.promptContent}>
              <Text style={styles.promptTitle}>Win</Text>
              <Text style={styles.promptText}>{entry.win}</Text>
            </View>
          </View>
          <View style={styles.promptRow}>
            <Text style={styles.promptIcon}>🔥</Text>
            <View style={styles.promptContent}>
              <Text style={styles.promptTitle}>Tension</Text>
              <Text style={styles.promptText}>{entry.tension}</Text>
            </View>
          </View>
          <View style={styles.promptRow}>
            <Text style={styles.promptIcon}>🙏</Text>
            <View style={styles.promptContent}>
              <Text style={styles.promptTitle}>Gratitude</Text>
              <Text style={styles.promptText}>{entry.gratitude}</Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const INITIAL_SHOW = 7;
const LOAD_MORE_COUNT = 14;

export default function JournalHistorySection({ entries }: JournalHistorySectionProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showCount, setShowCount] = useState(INITIAL_SHOW);

  const visibleEntries = entries.slice(0, showCount);
  const hasMore = showCount < entries.length;

  if (entries.length === 0) {
    return (
      <>
        <Text style={styles.sectionLabel}>Journal</Text>
        <View style={styles.emptyCard}>
          <FontAwesome name="book" size={20} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            No journal entries yet. Enable the Daily Journal in your profile and start reflecting each day.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Text style={styles.sectionLabel}>Journal</Text>
      <View style={styles.entriesList}>
        {visibleEntries.map((entry) => (
          <JournalEntryCard key={entry.id} entry={entry} styles={styles} colors={colors} />
        ))}
      </View>
      {hasMore && (
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={() => setShowCount((prev) => prev + LOAD_MORE_COUNT)}
          activeOpacity={0.7}
        >
          <Text style={styles.loadMoreText}>
            Show more ({entries.length - showCount} remaining)
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  sectionLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold as any,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  entriesList: {
    gap: theme.spacing.sm,
  },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  entryIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLightOverlay25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryDate: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: colors.textPrimary,
  },
  entryPreview: {
    fontSize: theme.fontSize.sm,
    color: colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginLeft: 32,
  },
  entryBody: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  promptRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  promptIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  promptContent: {
    flex: 1,
  },
  promptTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold as any,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  promptText: {
    fontSize: theme.fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
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
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  loadMoreText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: colors.primary,
  },
  });
}
