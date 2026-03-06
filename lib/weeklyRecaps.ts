import { supabase } from './supabase';
import type { WeeklyRecap, QualifyingWeek } from './types';

const MIN_ACTIVE_DAYS = 4;

export async function getWeeklyRecaps(): Promise<WeeklyRecap[]> {
  const { data, error } = await supabase
    .from('weekly_recaps')
    .select('*')
    .order('week_start', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getLatestUnreadRecap(): Promise<WeeklyRecap | null> {
  const { data, error } = await supabase
    .from('weekly_recaps')
    .select('*')
    .eq('is_read', false)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function markRecapAsRead(recapId: string): Promise<void> {
  const { error } = await supabase
    .from('weekly_recaps')
    .update({ is_read: true })
    .eq('id', recapId);

  if (error) throw error;
}

export async function deleteRecap(recapId: string): Promise<void> {
  const { error } = await supabase
    .from('weekly_recaps')
    .delete()
    .eq('id', recapId);

  if (error) throw error;
}

export async function getRecapForWeek(
  weekStart: string,
): Promise<WeeklyRecap | null> {
  const { data, error } = await supabase
    .from('weekly_recaps')
    .select('*')
    .eq('week_start', weekStart)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function triggerRecapGeneration(
  _userId: string,
  weekStart: string,
  weekEnd: string,
): Promise<{
  recap?: WeeklyRecap;
  skipped?: boolean;
  reason?: string;
  error?: string;
  retryable?: boolean;
  generation_time_ms?: number;
}> {
  const { data, error } = await supabase.functions.invoke(
    'generate-weekly-recap',
    {
      body: { week_start: weekStart, week_end: weekEnd },
    },
  );

  if (error) {
    return { error: error.message, retryable: true };
  }

  return data;
}

/**
 * Computes which past weeks qualify for a recap (>= 4 active days)
 * by checking habit_completions, goal_entries, and daily_journal_entries.
 * Merges with existing recaps so the UI knows the generation state.
 */
export async function getQualifyingWeeks(
  sinceDate: string,
): Promise<QualifyingWeek[]> {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const dayOfWeek = today.getDay();

  // Current week's Sunday
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - dayOfWeek);
  const currentWeekStartStr = formatDate(currentWeekStart);

  // Fetch activity data and existing recaps in parallel
  const [completionsResult, goalEntriesResult, journalResult, recapsResult] =
    await Promise.all([
      supabase
        .from('habit_completions')
        .select('completed_date')
        .gte('completed_date', sinceDate)
        .lt('completed_date', currentWeekStartStr),
      supabase
        .from('goal_entries')
        .select('recorded_date')
        .gte('recorded_date', sinceDate)
        .lt('recorded_date', currentWeekStartStr),
      supabase
        .from('daily_journal_entries')
        .select('journal_date')
        .gte('journal_date', sinceDate)
        .lt('journal_date', currentWeekStartStr),
      supabase
        .from('weekly_recaps')
        .select('*')
        .gte('week_start', sinceDate)
        .order('week_start', { ascending: false }),
    ]);

  const completions = completionsResult.data ?? [];
  const goalEntries = goalEntriesResult.data ?? [];
  const journalEntries = journalResult.data ?? [];
  const existingRecaps = (recapsResult.data ?? []) as WeeklyRecap[];

  // Build a map of date -> set of active dates per week
  const weekActivityMap = new Map<string, Set<string>>();

  function addActivityDate(dateStr: string) {
    const weekStart = getWeekStartForDate(dateStr);
    if (weekStart >= currentWeekStartStr) return; // skip current week
    if (!weekActivityMap.has(weekStart)) {
      weekActivityMap.set(weekStart, new Set());
    }
    weekActivityMap.get(weekStart)!.add(dateStr);
  }

  for (const c of completions) addActivityDate(c.completed_date);
  for (const e of goalEntries) addActivityDate(e.recorded_date);
  for (const j of journalEntries) addActivityDate(j.journal_date);

  // Also include weeks that already have recaps (they qualified when generated)
  const recapMap = new Map<string, WeeklyRecap>();
  for (const recap of existingRecaps) {
    recapMap.set(recap.week_start, recap);
    if (!weekActivityMap.has(recap.week_start)) {
      weekActivityMap.set(recap.week_start, new Set());
    }
  }

  // Build qualifying weeks list
  const qualifyingWeeks: QualifyingWeek[] = [];

  for (const [weekStart, activeDates] of weekActivityMap) {
    const recap = recapMap.get(weekStart) ?? null;
    const activeDays = activeDates.size;

    // Include if meets threshold OR already has a recap
    if (activeDays >= MIN_ACTIVE_DAYS || recap) {
      const weekEnd = getWeekEndForStart(weekStart);
      qualifyingWeeks.push({
        week_start: weekStart,
        week_end: weekEnd,
        active_days: activeDays,
        recap,
      });
    }
  }

  // Sort by week_start descending (most recent first)
  qualifyingWeeks.sort((a, b) => b.week_start.localeCompare(a.week_start));

  return qualifyingWeeks;
}

function getWeekStartForDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = date.getDay();
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - dayOfWeek);
  return formatDate(sunday);
}

function getWeekEndForStart(weekStartStr: string): string {
  const start = new Date(weekStartStr + 'T12:00:00');
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return formatDate(end);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + 'T12:00:00');
  const end = new Date(weekEnd + 'T12:00:00');
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}
