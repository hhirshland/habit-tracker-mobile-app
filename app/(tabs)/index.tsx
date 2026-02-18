import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { theme } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  getHabitsForDay,
  getTodayDate,
  formatDate,
  isHabitRequiredToday,
  checkAutoCompletions,
  getCompletionsForDate,
  getStreak,
  getCompletionsForDateRange,
} from '@/lib/habits';
import { Habit, DayOfWeek, DailyTodo } from '@/lib/types';
import { useHealth } from '@/contexts/HealthContext';
import {
  useHabits,
  useCompletionsForDate,
  useCompletionsForWeek,
  useCompletionsForRange,
  useSnoozesForDate,
  useSnoozesForRange,
  useStreak,
  useToggleCompletion,
  useSnoozeHabit,
  useUnsnoozeHabit,
  useRefreshAllHabitData,
} from '@/hooks/useHabitsQuery';
import {
  useDailyTodos,
  useDailyTodosForRange,
  useUpsertDailyTodo,
  useToggleDailyTodo,
  useDeleteDailyTodo,
} from '@/hooks/useDailyTodosQuery';
import {
  useDailyJournal,
  useDailyJournalForRange,
  useUpsertJournalEntry,
} from '@/hooks/useDailyJournalQuery';
import { useTop3TodosSetting } from '@/hooks/useTop3TodosSetting';
import { useJournalSetting } from '@/hooks/useJournalSetting';
import { queryKeys } from '@/lib/queryClient';
import PriorityItem from '@/components/PriorityItemVariantB';
import CalendarStrip from '@/components/CalendarStrip';
import ThriveLogo from '@/components/ThriveLogo';
import Top3TodosSection from '@/components/Top3TodosSection';
import DailyJournalSection from '@/components/DailyJournalSection';

const CALENDAR_BUFFER = 30; // days in each direction

export default function HomeScreen() {
  const { user } = useAuth();
  const { isAuthorized: healthAuthorized } = useHealth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Selected date state
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  // Derive the selected date's dayOfWeek
  const selectedDayOfWeek = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    return d.getDay() as DayOfWeek;
  }, [selectedDate]);

  // Calculate the date range for calendar strip progress
  const calendarRange = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - CALENDAR_BUFFER);
    const end = new Date(today);
    end.setDate(today.getDate() + CALENDAR_BUFFER);
    return {
      start: formatDate(start),
      end: formatDate(end),
    };
  }, []);

  // Get the week range for the selected date (for weekly progress tracking)
  const selectedWeekRange = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    const dow = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - dow);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start: formatDate(start),
      end: formatDate(end),
    };
  }, [selectedDate]);

  // ── Queries (cached, stale-while-revalidate) ──
  const { data: habits = [], isLoading: habitsLoading } = useHabits();
  const { data: completions = [] } = useCompletionsForDate(selectedDate);
  const { data: weekCompletions = [] } = useCompletionsForWeek(
    selectedWeekRange.start,
    selectedWeekRange.end
  );
  const { data: snoozes = [] } = useSnoozesForDate(selectedDate);
  const { data: streak = { streakCount: 0, earnedToday: false } } = useStreak();
  const { data: calendarCompletions = [] } = useCompletionsForRange(
    calendarRange.start,
    calendarRange.end
  );
  const { data: calendarSnoozes = [] } = useSnoozesForRange(
    calendarRange.start,
    calendarRange.end
  );

  // ── Top 3 Todos ──
  const { enabled: top3Enabled } = useTop3TodosSetting();
  const { data: dailyTodos = [] } = useDailyTodos(selectedDate);
  const { data: calendarTodos = [] } = useDailyTodosForRange(
    calendarRange.start,
    calendarRange.end
  );

  // ── Daily Journal ──
  const { enabled: journalEnabled } = useJournalSetting();
  const { data: journalEntry = null } = useDailyJournal(selectedDate);
  const { data: calendarJournals = [] } = useDailyJournalForRange(
    calendarRange.start,
    calendarRange.end
  );

  // ── Mutations ──
  const toggleMutation = useToggleCompletion();
  const snoozeMutation = useSnoozeHabit();
  const unsnoozeMutation = useUnsnoozeHabit();
  const refreshAll = useRefreshAllHabitData();
  const upsertTodoMutation = useUpsertDailyTodo();
  const toggleTodoMutation = useToggleDailyTodo();
  const deleteTodoMutation = useDeleteDailyTodo();
  const upsertJournalMutation = useUpsertJournalEntry();

  // ── Auto-complete from health data ──
  useFocusEffect(
    useCallback(() => {
      if (!user || !healthAuthorized || selectedDate !== getTodayDate()) return;
      if (habits.length === 0 || completions === undefined) return;

      const completedIds = new Set(completions.map((c) => c.habit_id));
      checkAutoCompletions(user.id, habits, completedIds, selectedDate).then(
        (autoCompleted) => {
          if (autoCompleted.length > 0) {
            // Invalidate affected caches so the UI updates
            queryClient.invalidateQueries({ queryKey: queryKeys.completions.forDate(selectedDate) });
            queryClient.invalidateQueries({ queryKey: queryKeys.streak });
            queryClient.invalidateQueries({
              queryKey: queryKeys.completions.forRange(calendarRange.start, calendarRange.end),
            });
          }
        }
      );
    }, [user, healthAuthorized, habits, completions, selectedDate, calendarRange])
  );

  const handleToggle = async (habit: Habit) => {
    if (!user) return;
    const isCompleted = completions.some((c) => c.habit_id === habit.id);
    toggleMutation.mutate({
      habitId: habit.id,
      userId: user.id,
      date: selectedDate,
      isCompleted,
      habitName: habit.name,
      isAutoComplete: habit.auto_complete,
    });
  };

  const handleSnooze = async (habit: Habit) => {
    if (!user) return;
    snoozeMutation.mutate({
      habitId: habit.id,
      userId: user.id,
      date: selectedDate,
      habitName: habit.name,
    });
  };

  const handleUnsnooze = async (habit: Habit) => {
    unsnoozeMutation.mutate({
      habitId: habit.id,
      date: selectedDate,
      habitName: habit.name,
    });
  };

  const handleSaveTodo = (position: number, text: string) => {
    if (!user) return;
    upsertTodoMutation.mutate({ userId: user.id, date: selectedDate, position, text });
  };

  const handleToggleTodo = (todo: DailyTodo) => {
    toggleTodoMutation.mutate({ todoId: todo.id, isCompleted: todo.is_completed, date: selectedDate, position: todo.position });
  };

  const handleDeleteTodo = (todo: DailyTodo) => {
    deleteTodoMutation.mutate({ todoId: todo.id, date: selectedDate });
  };

  const handleSubmitJournal = (win: string, tension: string, gratitude: string) => {
    if (!user) return;
    upsertJournalMutation.mutate({ userId: user.id, date: selectedDate, win, tension, gratitude });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    refreshAll();
    queryClient.invalidateQueries({ queryKey: ['dailyTodos'] });
    queryClient.invalidateQueries({ queryKey: ['dailyJournal'] });
    setTimeout(() => setRefreshing(false), 600);
  };

  // Calculate day progress for the calendar strip (habits + todos)
  const dayProgress = useMemo(() => {
    const progress: Record<string, { completed: number; total: number }> = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = -CALENDAR_BUFFER; i <= CALENDAR_BUFFER; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = formatDate(d);
      const dow = d.getDay() as DayOfWeek;

      const dayHabits = getHabitsForDay(habits, dow)
        .filter((h) => h.created_at.slice(0, 10) <= dateStr);
      const daySnoozedIds = new Set(
        calendarSnoozes
          .filter((s) => s.snoozed_date === dateStr)
          .map((s) => s.habit_id)
      );
      const unsnoozedHabits = dayHabits.filter((h) => !daySnoozedIds.has(h.id));
      const dayCompletions = calendarCompletions.filter(
        (c) => c.completed_date === dateStr
      );
      const completedHabitIds = new Set(dayCompletions.map((c) => c.habit_id));
      let completedCount = unsnoozedHabits.filter((h) => completedHabitIds.has(h.id)).length;
      let total = unsnoozedHabits.length;

      if (top3Enabled) {
        const dayTodos = calendarTodos.filter((t) => t.todo_date === dateStr);
        if (dayTodos.length > 0) {
          total += dayTodos.length;
          completedCount += dayTodos.filter((t) => t.is_completed).length;
        }
      }

      if (journalEnabled) {
        total += 1;
        const dayJournal = calendarJournals.find((j) => j.journal_date === dateStr);
        if (dayJournal && dayJournal.win.trim() && dayJournal.tension.trim() && dayJournal.gratitude.trim()) {
          completedCount += 1;
        }
      }

      progress[dateStr] = { completed: completedCount, total };
    }

    return progress;
  }, [habits, calendarCompletions, calendarSnoozes, top3Enabled, calendarTodos, journalEnabled, calendarJournals]);

  const selectedDayHabits = getHabitsForDay(habits, selectedDayOfWeek)
    .filter((h) => h.created_at.slice(0, 10) <= selectedDate);
  const completedIds = new Set(completions.map((c) => c.habit_id));
  const snoozedIds = new Set(snoozes.map((s) => s.habit_id));

  const getWeeklyCompletionCount = (habit: Habit) =>
    weekCompletions.filter((c) => c.habit_id === habit.id).length;

  const getIsRequired = (habit: Habit) =>
    isHabitRequiredToday(
      habit,
      selectedDayOfWeek,
      getWeeklyCompletionCount(habit),
      completedIds.has(habit.id)
    );

  // Separate into incomplete, completed, and snoozed — with required first in incomplete
  const incompleteHabits = selectedDayHabits
    .filter((h) => !completedIds.has(h.id) && !snoozedIds.has(h.id))
    .sort((a, b) => {
      const aReq = getIsRequired(a);
      const bReq = getIsRequired(b);
      if (aReq && !bReq) return -1;
      if (!aReq && bReq) return 1;
      return 0;
    });

  const completedHabits = selectedDayHabits.filter((h) => completedIds.has(h.id));
  const snoozedHabits = selectedDayHabits.filter(
    (h) => snoozedIds.has(h.id) && !completedIds.has(h.id)
  );

  const getWeeklyProgress = (habit: Habit) => {
    return {
      done: getWeeklyCompletionCount(habit),
      total: habit.frequency_per_week,
    };
  };

  // Only show full-screen spinner on very first load (no cached data)
  if (habitsLoading && habits.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const journalCompleted = journalEnabled && journalEntry !== null &&
    journalEntry.win.trim() !== '' && journalEntry.tension.trim() !== '' && journalEntry.gratitude.trim() !== '';

  const allDone =
    incompleteHabits.length === 0 &&
    (completedHabits.length > 0 || journalCompleted) &&
    (!top3Enabled || dailyTodos.every((t) => t.is_completed)) &&
    (!journalEnabled || journalCompleted);

  type ListItem =
    | { type: 'habit'; habit: Habit; state: 'incomplete' | 'completed' | 'snoozed' }
    | { type: 'label'; label: string }
    | { type: 'todosSection' }
    | { type: 'journalSection' }
    | { type: 'completedJournal' };

  const buildListData = (): ListItem[] => {
    const items: ListItem[] = [];

    // Top 3 Todos section
    if (top3Enabled) {
      items.push({ type: 'todosSection' });
    }

    // Daily Habits section
    if (incompleteHabits.length > 0) {
      items.push({ type: 'label', label: 'Daily Habits' });
      incompleteHabits.forEach((h) =>
        items.push({ type: 'habit', habit: h, state: 'incomplete' })
      );
    } else if (allDone && snoozedHabits.length === 0) {
      items.push({ type: 'label', label: 'All Done! \u{1F389}' });
    } else if (incompleteHabits.length === 0 && snoozedHabits.length > 0 && !top3Enabled && !journalEnabled) {
      items.push({ type: 'label', label: 'All Done! \u{1F389}' });
    }

    // Daily Journal section (incomplete) — below habits, above completed
    if (journalEnabled && !journalCompleted) {
      items.push({ type: 'journalSection' });
    }

    // Completed section
    if (completedHabits.length > 0 || journalCompleted) {
      items.push({ type: 'label', label: 'Completed' });
      completedHabits.forEach((h) =>
        items.push({ type: 'habit', habit: h, state: 'completed' })
      );
      if (journalCompleted) {
        items.push({ type: 'completedJournal' });
      }
    }

    // Snoozed section
    if (snoozedHabits.length > 0) {
      items.push({ type: 'label', label: 'Snoozed' });
      snoozedHabits.forEach((h) =>
        items.push({ type: 'habit', habit: h, state: 'snoozed' })
      );
    }

    return items;
  };

  const listData = buildListData();

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'label') {
      return <Text style={styles.sectionLabel}>{item.label}</Text>;
    }

    if (item.type === 'todosSection') {
      return (
        <Top3TodosSection
          todos={dailyTodos}
          onSave={handleSaveTodo}
          onToggle={handleToggleTodo}
          onDelete={handleDeleteTodo}
        />
      );
    }

    if (item.type === 'journalSection') {
      return (
        <DailyJournalSection
          entry={journalEntry}
          onSubmit={handleSubmitJournal}
        />
      );
    }

    if (item.type === 'completedJournal') {
      return (
        <DailyJournalSection
          entry={journalEntry}
          onSubmit={handleSubmitJournal}
        />
      );
    }

    const { habit, state } = item;
    const isCompleted = state === 'completed';
    const isSnoozed = state === 'snoozed';

    return (
      <View style={styles.itemWrapper}>
        <PriorityItem
          habit={habit}
          isCompleted={isCompleted}
          isSnoozed={isSnoozed}
          isRequired={getIsRequired(habit)}
          weeklyProgress={getWeeklyProgress(habit)}
          onToggle={() => handleToggle(habit)}
          onSnooze={() => handleSnooze(habit)}
          onUnsnooze={() => handleUnsnooze(habit)}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top row: wordmark + streak badge */}
      <View style={styles.topRow}>
        <View style={styles.wordmarkContainer}>
          <View style={styles.wordmarkRow}>
            <ThriveLogo size={28} style={{ marginRight: 8 }} />
            <Text style={styles.wordmark}>Thrive</Text>
          </View>
          <Text style={styles.wordmarkSubtext}>Win your day</Text>
        </View>
        <View
          style={[
            styles.streakBadge,
            streak.earnedToday ? styles.streakBadgeActive : styles.streakBadgeInactive,
          ]}
        >
          <Text
            style={[
              styles.streakEmoji,
              !streak.earnedToday && styles.streakEmojiInactive,
            ]}
          >
            🔥
          </Text>
          <Text
            style={[
              styles.streakCount,
              streak.earnedToday ? styles.streakCountActive : styles.streakCountInactive,
            ]}
          >
            {streak.streakCount}
          </Text>
        </View>
      </View>

      {/* Calendar strip */}
      <CalendarStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        dayProgress={dayProgress}
      />


      {selectedDayHabits.length === 0 && !top3Enabled && !journalEnabled ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🌟</Text>
          <Text style={styles.emptyTitle}>No habits for this day</Text>
          <Text style={styles.emptySubtitle}>
            Go to "My Habits" to add habits to your schedule
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, index) => {
            if (item.type === 'label') return `label-${item.label}-${index}`;
            if (item.type === 'todosSection') return 'todos-section';
            if (item.type === 'journalSection') return 'journal-section';
            if (item.type === 'completedJournal') return 'completed-journal';
            return `habit-${item.habit.id}`;
          }}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  wordmarkContainer: {
    flexDirection: 'column',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  wordmarkSubtext: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textMuted,
    marginTop: -2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  streakBadgeActive: {
    backgroundColor: '#FFF3E0',
  },
  streakBadgeInactive: {
    backgroundColor: theme.colors.borderLight,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakEmojiInactive: {
    opacity: 0.35,
  },
  streakCount: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  streakCountActive: {
    color: '#E65100',
  },
  streakCountInactive: {
    color: theme.colors.textMuted,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.tabBarClearance,
  },
  sectionLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  itemWrapper: {
    marginBottom: theme.spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
