import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, type ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import AppHeader from '@/components/AppHeader';
import { formatWeekLabel } from '@/lib/weeklyRecaps';
import { useGenerateRecap, useMarkRecapRead, useDeleteRecap } from '@/hooks/useWeeklyRecapsQuery';
import { captureEvent, EVENTS } from '@/lib/analytics';
import type { WeeklyRecap, WeeklyRecapContent, QualifyingWeek } from '@/lib/types';

interface WeeklyRecapDetailProps {
  visible: boolean;
  week: QualifyingWeek | null;
  onClose: () => void;
}

export default function WeeklyRecapDetail({
  visible,
  week,
  onClose,
}: WeeklyRecapDetailProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const generateRecap = useGenerateRecap();
  const markRead = useMarkRecapRead();
  const deleteRecap = useDeleteRecap();

  const recap = week?.recap ?? null;
  const isGenerating = generateRecap.isPending;
  const hasGenerated = generateRecap.isSuccess && !!generateRecap.data?.recap;
  const needsGeneration = week && !recap && !hasGenerated;
  const generationError = generateRecap.isError
    ? generateRecap.error?.message
    : (generateRecap.data && 'error' in generateRecap.data)
      ? generateRecap.data.error
      : null;
  const wasSkipped = generateRecap.data && 'skipped' in generateRecap.data && generateRecap.data.skipped;

  const { mutate: doGenerate } = generateRecap;
  const { mutate: doMarkRead } = markRead;

  const triggerGeneration = useCallback(() => {
    if (!week) return;
    doGenerate({
      weekStart: week.week_start,
      weekEnd: week.week_end,
    });
  }, [week, doGenerate]);

  // Auto-generate if the week hasn't been generated yet (only once)
  useEffect(() => {
    if (visible && needsGeneration && !isGenerating && !generationError && !wasSkipped) {
      triggerGeneration();
    }
  }, [visible, needsGeneration, isGenerating, generationError, wasSkipped, triggerGeneration]);

  // Mark as read and track view when opened with an existing recap
  useEffect(() => {
    if (visible && recap) {
      captureEvent(EVENTS.RECAP_VIEWED, {
        week_start: recap.week_start,
        was_unread: !recap.is_read,
      });
      if (!recap.is_read) {
        doMarkRead(recap.id);
      }
    }
  }, [visible, recap, doMarkRead]);

  // Also mark read if generation just completed successfully
  useEffect(() => {
    if (
      generateRecap.isSuccess &&
      generateRecap.data?.recap &&
      !generateRecap.data.recap.is_read
    ) {
      doMarkRead(generateRecap.data.recap.id);
    }
  }, [generateRecap.isSuccess, generateRecap.data, doMarkRead]);

  const handleClose = useCallback(() => {
    generateRecap.reset();
    onClose();
  }, [onClose, generateRecap]);

  const handleDelete = useCallback(() => {
    if (!displayRecap) return;
    Alert.alert(
      'Delete Recap',
      'This will permanently delete this recap so you can regenerate it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteRecap.mutate(displayRecap.id, {
              onSuccess: () => {
                generateRecap.reset();
                onClose();
              },
            });
          },
        },
      ],
    );
  }, [displayRecap, deleteRecap, generateRecap, onClose]);

  const displayRecap: WeeklyRecap | null =
    recap ?? (generateRecap.data?.recap as WeeklyRecap | undefined) ?? null;

  if (!week) return null;

  const weekLabel = formatWeekLabel(week.week_start, week.week_end);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader
          title="Weekly Recap"
          subtitle={weekLabel}
          onBack={handleClose}
          rightAction={
            __DEV__ && displayRecap
              ? { icon: 'trash', onPress: handleDelete, color: '#E53935' }
              : undefined
          }
        />

        {isGenerating && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Generating your recap...</Text>
            <Text style={styles.loadingSubtext}>
              Analysing your habits, goals, and reflections
            </Text>
          </View>
        )}

        {!isGenerating && (generationError || wasSkipped) && (
          <View style={styles.centered}>
            <View style={styles.errorIcon}>
              <FontAwesome
                name={wasSkipped ? 'info-circle' : 'exclamation-triangle'}
                size={36}
                color={wasSkipped ? colors.textMuted : colors.danger}
              />
            </View>
            <Text style={styles.errorTitle}>
              {wasSkipped
                ? 'Not enough activity'
                : 'Something went wrong'}
            </Text>
            <Text style={styles.errorSubtext}>
              {wasSkipped
                ? 'This week had fewer than 4 active days. Keep tracking and a recap will be available for weeks with more data.'
                : 'We couldn\'t generate your recap. Please try again.'}
            </Text>
            {!wasSkipped && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={triggerGeneration}
                activeOpacity={0.8}
              >
                <FontAwesome name="refresh" size={14} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Tap to retry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!isGenerating && !generationError && !wasSkipped && displayRecap && (
          <RecapContent content={displayRecap.content} styles={styles} colors={colors} />
        )}
      </SafeAreaView>
    </Modal>
  );
}

function RecapContent({
  content,
  styles,
  colors,
}: {
  content: WeeklyRecapContent;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Week Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <FontAwesome name="calendar" size={14} color={colors.primary} />
          <Text style={styles.sectionTitle}>Week at a Glance</Text>
        </View>
        <Text style={styles.summaryText}>{content.week_summary}</Text>
      </View>

      {/* Habit Review */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <FontAwesome name="check-circle" size={14} color={colors.success} />
          <Text style={styles.sectionTitle}>Habits</Text>
          <View style={styles.adherenceBadge}>
            <Text style={styles.adherenceBadgeText}>
              {content.habit_review.overall_adherence_pct}%
            </Text>
          </View>
        </View>
        <Text style={styles.narrativeText}>
          {content.habit_review.narrative}
        </Text>
        {content.habit_review.standout_habit && (
          <View style={styles.highlightRow}>
            <FontAwesome name="trophy" size={12} color={colors.warning} />
            <Text style={styles.highlightText}>
              {content.habit_review.standout_habit}
            </Text>
          </View>
        )}
        {content.habit_review.needs_attention && (
          <View style={styles.highlightRow}>
            <FontAwesome name="exclamation-circle" size={12} color={colors.danger} />
            <Text style={styles.highlightText}>
              {content.habit_review.needs_attention}
            </Text>
          </View>
        )}
      </View>

      {/* Goal Progress */}
      {content.goal_progress.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="bullseye" size={14} color={colors.primary} />
            <Text style={styles.sectionTitle}>Goals</Text>
          </View>
          {content.goal_progress.map((goal, index) => (
            <View key={index} style={styles.goalCard}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.narrativeText}>{goal.narrative}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Reflection Themes */}
      {content.reflection_themes.narrative && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="book" size={14} color={colors.secondary} />
            <Text style={styles.sectionTitle}>Reflections</Text>
          </View>
          <Text style={styles.narrativeText}>
            {content.reflection_themes.narrative}
          </Text>
          {content.reflection_themes.wins?.length > 0 && content.reflection_themes.wins.map((win, i) => (
            <View key={i} style={styles.highlightRow}>
              <Text style={styles.highlightEmoji}>🏆</Text>
              <Text style={styles.highlightText}>{win}</Text>
            </View>
          ))}
          {content.reflection_themes.growth_opportunity && (
            <View style={styles.highlightRow}>
              <Text style={styles.highlightEmoji}>🌱</Text>
              <Text style={styles.highlightText}>
                {content.reflection_themes.growth_opportunity}
              </Text>
            </View>
          )}
          {content.reflection_themes.gratitude_highlight && (
            <View style={styles.highlightRow}>
              <Text style={styles.highlightEmoji}>🙏</Text>
              <Text style={styles.highlightText}>
                {content.reflection_themes.gratitude_highlight}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Looking Ahead */}
      <View style={[styles.section, styles.lookingAheadSection]}>
        <View style={styles.sectionHeader}>
          <FontAwesome name="arrow-right" size={14} color={colors.primary} />
          <Text style={styles.sectionTitle}>Looking Ahead</Text>
        </View>
        <Text style={styles.narrativeText}>{content.looking_ahead}</Text>
      </View>
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: 120,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    loadingText: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textPrimary,
      marginTop: theme.spacing.lg,
    },
    loadingSubtext: {
      fontSize: theme.fontSize.sm,
      color: colors.textSecondary,
      marginTop: theme.spacing.xs,
      textAlign: 'center',
    },
    errorIcon: {
      marginBottom: theme.spacing.md,
    },
    errorTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    errorSubtext: {
      fontSize: theme.fontSize.sm,
      color: colors.textSecondary,
      marginTop: theme.spacing.sm,
      textAlign: 'center',
      lineHeight: 20,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: 12,
      paddingHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.lg,
    },
    retryButtonText: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: '#FFFFFF',
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginTop: theme.spacing.md,
      ...theme.shadow.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textPrimary,
      flex: 1,
    },
    adherenceBadge: {
      backgroundColor: colors.primaryLightOverlay25,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    adherenceBadgeText: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.bold,
      color: colors.primary,
    },
    summaryText: {
      fontSize: theme.fontSize.md,
      color: colors.textPrimary,
      lineHeight: 24,
    },
    narrativeText: {
      fontSize: theme.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    highlightRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    highlightEmoji: {
      fontSize: 14,
      marginTop: 1,
    },
    highlightText: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    goalCard: {
      marginBottom: theme.spacing.sm,
    },
    goalTitle: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    lookingAheadSection: {
      backgroundColor: colors.primaryLightOverlay15,
      borderWidth: 1,
      borderColor: colors.primaryLightOverlay25,
      marginBottom: theme.spacing.lg,
      flexShrink: 0,
    },
  });
}
