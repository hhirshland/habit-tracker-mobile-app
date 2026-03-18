// Assembles all relevant user data into a structured text block for the coach LLM.
// Used by: coach-chat, coach-nudge, schedule-evening-calls, vapi-server.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CoachContext {
  /** Pre-formatted text block to inject into the system prompt */
  formatted: string;
  /** Raw data for programmatic access (nudge triggers, etc.) */
  raw: CoachContextRaw;
}

export interface CoachContextRaw {
  todayDate: string;
  dayOfWeekLabel: string;
  weekStartDate: string;
  daysElapsedThisWeek: number;
  firstName: string;
  identities: Array<{ statement: string; emoji: string; habitNames: string[] }>;
  habits: Array<{
    name: string;
    identityStatement: string | null;
    targetDays: number;
    completedThisWeek: number;
    completedLast30: number;
    currentStreak: number;
    isCompletedToday: boolean;
  }>;
  overallAdherenceThisWeek: number;
  overallAdherence30Day: number;
  todayState: {
    habitsCompleted: number;
    habitsRemaining: number;
    intentionsCompleted: number;
    intentionsTotal: number;
  };
  dailyPractices: {
    journalDaysThisWeek: number;
    journalCompletedToday: boolean;
    intentionDaysThisWeek: number;
    intentionsSetToday: boolean;
  };
  recentIntentions: Array<{
    date: string;
    items: Array<{ text: string; completed: boolean }>;
  }>;
  recentJournal: Array<{
    date: string;
    win: string;
    tension: string;
    gratitude: string;
  }>;
  goals: Array<{
    title: string;
    progressPct: number;
    trajectory: "on_track" | "behind" | "ahead" | "unknown";
  }>;
  recentCallActivity: {
    callsLast7Days: number;
    callsCompleted: number;
    callsMissed: number;
  };
}

function getTodayInTimezone(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

function getDaysAgoDate(today: string, days: number): string {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDayOfWeekInTimezone(tz: string): number {
  const dateStr = new Date().toLocaleDateString("en-US", {
    timeZone: tz,
    weekday: "short",
  });
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[dateStr] ?? new Date().getDay();
}

function getDayOfWeekLabel(tz: string): string {
  return new Date().toLocaleDateString("en-US", {
    timeZone: tz,
    weekday: "long",
  });
}

/** Returns the Monday of the current week (ISO standard). */
function getWeekStartDate(today: string): string {
  const d = new Date(`${today}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Number of days from weekStart through today (inclusive). */
function daysElapsed(weekStart: string, today: string): number {
  const start = new Date(`${weekStart}T12:00:00`).getTime();
  const end = new Date(`${today}T12:00:00`).getTime();
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Assemble all user context for the coach.
 * Designed to be called from any edge function that has a service-role supabase client.
 */
export async function assembleCoachContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  timezone: string = "America/New_York",
): Promise<CoachContext> {
  const today = getTodayInTimezone(timezone);
  const weekStart = getWeekStartDate(today);
  const thirtyDaysAgo = getDaysAgoDate(today, 30);
  const sevenDaysAgo = getDaysAgoDate(today, 7);
  const dayOfWeek = getDayOfWeekInTimezone(timezone);
  const dayOfWeekLabel = getDayOfWeekLabel(timezone);
  const daysThisWeek = daysElapsed(weekStart, today);

  // Parallel fetch all data
  const [
    profileResult,
    habitsResult,
    completions30Result,
    identityResult,
    journalResult,
    journalWeekResult,
    goalsResult,
    goalEntriesResult,
    todosResult,
    todosWeekResult,
    callLogResult,
    snoozesResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("habits")
      .select("id, name, frequency_per_week, specific_days, identity_statement_id")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase
      .from("habit_completions")
      .select("habit_id, completed_date")
      .eq("user_id", userId)
      .gte("completed_date", thirtyDaysAgo)
      .lte("completed_date", today),
    supabase
      .from("identity_statements")
      .select("id, statement, emoji")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase
      .from("daily_journal_entries")
      .select("journal_date, win, tension, gratitude")
      .eq("user_id", userId)
      .gte("journal_date", sevenDaysAgo)
      .lte("journal_date", today)
      .order("journal_date", { ascending: false }),
    supabase
      .from("daily_journal_entries")
      .select("journal_date")
      .eq("user_id", userId)
      .gte("journal_date", weekStart)
      .lte("journal_date", today),
    supabase
      .from("goals")
      .select("id, title, target_value, start_value, data_source")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase
      .from("goal_entries")
      .select("goal_id, value, recorded_date")
      .eq("user_id", userId)
      .gte("recorded_date", thirtyDaysAgo)
      .lte("recorded_date", today)
      .order("recorded_date", { ascending: false }),
    supabase
      .from("daily_todos")
      .select("id, text, is_completed, position")
      .eq("user_id", userId)
      .eq("todo_date", today)
      .order("position", { ascending: true }),
    supabase
      .from("daily_todos")
      .select("todo_date, text, is_completed")
      .eq("user_id", userId)
      .gte("todo_date", weekStart)
      .lte("todo_date", today)
      .order("todo_date", { ascending: false })
      .order("position", { ascending: true }),
    supabase
      .from("evening_call_log")
      .select("call_date, status")
      .eq("user_id", userId)
      .gte("call_date", sevenDaysAgo)
      .lte("call_date", today),
    supabase
      .from("habit_snoozes")
      .select("habit_id, snoozed_date")
      .eq("user_id", userId)
      .eq("snoozed_date", today),
  ]);

  const fullName = profileResult.data?.full_name || "";
  const firstName = fullName.split(" ")[0] || "there";
  const habits = habitsResult.data ?? [];
  const completions = completions30Result.data ?? [];
  const identities = identityResult.data ?? [];
  const journalEntries = journalResult.data ?? [];
  const journalWeekDates = new Set(
    (journalWeekResult.data ?? []).map((j: any) => j.journal_date),
  );
  const goals = goalsResult.data ?? [];
  const goalEntries = goalEntriesResult.data ?? [];
  const todos = todosResult.data ?? [];
  const todosWeekRows = todosWeekResult.data ?? [];
  const todosWeekDates = new Set(todosWeekRows.map((t: any) => t.todo_date));

  // Group intentions by date for recent display
  const intentionsByDate = new Map<string, Array<{ text: string; completed: boolean }>>();
  for (const t of todosWeekRows as any[]) {
    if (!intentionsByDate.has(t.todo_date)) intentionsByDate.set(t.todo_date, []);
    intentionsByDate.get(t.todo_date)!.push({ text: t.text, completed: t.is_completed });
  }
  const recentIntentions = Array.from(intentionsByDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
  const callLogs = callLogResult.data ?? [];
  const todaySnoozes = new Set((snoozesResult.data ?? []).map((s: any) => s.habit_id));

  // Build identity map
  const identityMap = new Map<string, { statement: string; emoji: string }>();
  for (const id of identities) {
    identityMap.set(id.id, { statement: id.statement, emoji: id.emoji });
  }

  // Completions by habit
  const completionsByHabit = new Map<string, string[]>();
  for (const c of completions) {
    if (!completionsByHabit.has(c.habit_id)) completionsByHabit.set(c.habit_id, []);
    completionsByHabit.get(c.habit_id)!.push(c.completed_date);
  }

  // Build habit stats
  const todaysHabits = habits.filter((h: any) => {
    if (h.specific_days && h.specific_days.length > 0) {
      return h.specific_days.includes(dayOfWeek);
    }
    return true;
  });

  const habitStats = habits.map((h: any) => {
    const dates = completionsByHabit.get(h.id) ?? [];
    const thisWeek = dates.filter((d) => d >= weekStart).length;
    const last30 = dates.length;

    // Simple streak: consecutive days counting back from today
    const dateSet = new Set(dates);
    let streak = 0;
    const checkDate = new Date(`${today}T12:00:00`);
    if (!dateSet.has(today)) checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
      const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
      if (dateSet.has(ds)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const identity = h.identity_statement_id
      ? identityMap.get(h.identity_statement_id)
      : null;

    return {
      name: h.name,
      identityStatement: identity ? `${identity.emoji} ${identity.statement}` : null,
      targetDays: h.specific_days?.length || h.frequency_per_week,
      completedThisWeek: thisWeek,
      completedLast30: last30,
      currentStreak: streak,
      isCompletedToday: dateSet.has(today),
    };
  });

  // Overall adherence — this week (based on days elapsed, not full 7)
  const totalCompletedThisWeek = habitStats.reduce((sum, h) => sum + h.completedThisWeek, 0);
  const totalPossibleThisWeek = habits.reduce((sum: number, h: any) => {
    if (h.specific_days && h.specific_days.length > 0) {
      let count = 0;
      const d = new Date(`${weekStart}T12:00:00`);
      for (let i = 0; i < daysThisWeek; i++) {
        if (h.specific_days.includes(d.getDay())) count++;
        d.setDate(d.getDate() + 1);
      }
      return sum + count;
    }
    return sum + daysThisWeek;
  }, 0);
  const overallAdherenceThisWeek = totalPossibleThisWeek > 0
    ? Math.round((totalCompletedThisWeek / totalPossibleThisWeek) * 100)
    : 0;

  const totalTarget30 = habits.reduce((sum: number, h: any) => {
    return sum + (h.specific_days?.length || h.frequency_per_week);
  }, 0) * 4;
  const totalCompleted30 = habitStats.reduce((sum, h) => sum + h.completedLast30, 0);
  const overallAdherence30 = totalTarget30 > 0 ? Math.round((totalCompleted30 / totalTarget30) * 100) : 0;

  // Today's state
  const todayCompletedIds = new Set(
    completions.filter((c) => c.completed_date === today).map((c) => c.habit_id),
  );
  const todaysActiveHabits = todaysHabits.filter((h: any) => !todaySnoozes.has(h.id));
  const habitsCompleted = todaysActiveHabits.filter((h: any) => todayCompletedIds.has(h.id)).length;
  const habitsRemaining = todaysActiveHabits.length - habitsCompleted;

  const intentionsCompleted = todos.filter((t: any) => t.is_completed).length;
  const intentionsTotal = todos.length;

  // Daily practices (journal + intentions) adherence this week
  const journalDaysThisWeek = journalWeekDates.size;
  const journalCompletedToday = journalWeekDates.has(today);
  const intentionDaysThisWeek = todosWeekDates.size;
  const intentionsSetToday = todosWeekDates.has(today);

  // Goals with progress
  const goalStats = goals.map((g: any) => {
    const entries = goalEntries.filter((e: any) => e.goal_id === g.id);
    const latestValue = entries.length > 0 ? entries[0].value : g.start_value;
    const startVal = g.start_value ?? g.target_value;
    const totalChange = g.target_value - startVal;
    let progressPct = 0;
    if (totalChange !== 0 && latestValue !== null) {
      progressPct = Math.max(0, Math.min(100, Math.round(((latestValue - startVal) / totalChange) * 100)));
    }

    let trajectory: "on_track" | "behind" | "ahead" | "unknown" = "unknown";
    if (entries.length >= 2) {
      const recent = entries[0].value;
      const older = entries[entries.length - 1].value;
      const direction = g.target_value > startVal ? 1 : -1;
      const trend = (recent - older) * direction;
      trajectory = trend > 0 ? "on_track" : trend < 0 ? "behind" : "on_track";
    }

    return {
      title: g.title,
      progressPct,
      trajectory,
    };
  });

  // Call activity
  const callsCompleted = callLogs.filter((c: any) => c.status === "completed").length;
  const callsMissed = callLogs.filter((c: any) => c.status === "missed").length;

  // Identity with linked habits
  const identityWithHabits = identities.map((id: any) => ({
    statement: id.statement,
    emoji: id.emoji,
    habitNames: habits
      .filter((h: any) => h.identity_statement_id === id.id)
      .map((h: any) => h.name),
  }));

  const raw: CoachContextRaw = {
    todayDate: today,
    dayOfWeekLabel,
    weekStartDate: weekStart,
    daysElapsedThisWeek: daysThisWeek,
    firstName,
    identities: identityWithHabits,
    habits: habitStats,
    overallAdherenceThisWeek,
    overallAdherence30Day: overallAdherence30,
    todayState: {
      habitsCompleted,
      habitsRemaining,
      intentionsCompleted,
      intentionsTotal,
    },
    dailyPractices: {
      journalDaysThisWeek,
      journalCompletedToday,
      intentionDaysThisWeek,
      intentionsSetToday,
    },
    recentIntentions,
    recentJournal: journalEntries.map((j: any) => ({
      date: j.journal_date,
      win: j.win,
      tension: j.tension,
      gratitude: j.gratitude,
    })),
    goals: goalStats,
    recentCallActivity: {
      callsLast7Days: callLogs.length,
      callsCompleted,
      callsMissed,
    },
  };

  return {
    formatted: formatContext(raw),
    raw,
  };
}

// ─── Format raw context into a human-readable text block ───

function formatContext(ctx: CoachContextRaw): string {
  const sections: string[] = [];

  // Temporal anchor so the LLM knows what "today" and "this week" mean
  sections.push(
    `### Date & Time\nToday: ${ctx.dayOfWeekLabel}, ${ctx.todayDate}\nThis week: ${ctx.weekStartDate} (Monday) through today (${ctx.daysElapsedThisWeek} day${ctx.daysElapsedThisWeek !== 1 ? "s" : ""} so far)`,
  );

  // Identity
  if (ctx.identities.length > 0) {
    const lines = ctx.identities.map(
      (id) =>
        `- ${id.emoji} "${id.statement}"${id.habitNames.length > 0 ? ` → Habits: ${id.habitNames.join(", ")}` : ""}`,
    );
    sections.push(`### Identity Statements\n${lines.join("\n")}`);
  }

  // Habits
  if (ctx.habits.length > 0) {
    const lines = ctx.habits.map((h) => {
      const parts = [`- **${h.name}**`];
      if (h.identityStatement) parts.push(`(${h.identityStatement})`);
      parts.push(`| This week: ${h.completedThisWeek} days`);
      parts.push(`| Streak: ${h.currentStreak} day${h.currentStreak !== 1 ? "s" : ""}`);
      parts.push(`| Today: ${h.isCompletedToday ? "Done ✓" : "Not yet"}`);
      return parts.join(" ");
    });
    sections.push(
      `### Habit Performance\nOverall adherence: ${ctx.overallAdherenceThisWeek}% (this week) / ${ctx.overallAdherence30Day}% (30-day)\n${lines.join("\n")}`,
    );
  }

  // Daily practices — journal & intentions as first-class disciplines
  const dp = ctx.dailyPractices;
  const practiceLines: string[] = [];
  practiceLines.push(
    `- **Evening Reflection**: ${dp.journalDaysThisWeek}/${ctx.daysElapsedThisWeek} days this week | Today: ${dp.journalCompletedToday ? "Done ✓" : "Not yet"}`,
  );
  practiceLines.push(
    `- **Daily Intentions**: ${dp.intentionDaysThisWeek}/${ctx.daysElapsedThisWeek} days this week | Today: ${dp.intentionsSetToday ? "Set ✓" : "Not yet"}`,
  );
  const missedPractices: string[] = [];
  if (dp.journalDaysThisWeek < ctx.daysElapsedThisWeek) {
    missedPractices.push(`journal (missed ${ctx.daysElapsedThisWeek - dp.journalDaysThisWeek} day${ctx.daysElapsedThisWeek - dp.journalDaysThisWeek !== 1 ? "s" : ""})`);
  }
  if (dp.intentionDaysThisWeek < ctx.daysElapsedThisWeek) {
    missedPractices.push(`intentions (missed ${ctx.daysElapsedThisWeek - dp.intentionDaysThisWeek} day${ctx.daysElapsedThisWeek - dp.intentionDaysThisWeek !== 1 ? "s" : ""})`);
  }
  if (missedPractices.length > 0) {
    practiceLines.push(`\n⚠️ GAPS: ${missedPractices.join(", ")}. These are daily disciplines — skipping them is a gap in the routine just like skipping a habit.`);
  }
  sections.push(`### Daily Practices\n${practiceLines.join("\n")}`);

  // Today's state
  sections.push(
    `### Today\nHabits: ${ctx.todayState.habitsCompleted} done, ${ctx.todayState.habitsRemaining} remaining${ctx.todayState.intentionsTotal > 0 ? `\nIntentions: ${ctx.todayState.intentionsCompleted}/${ctx.todayState.intentionsTotal} completed` : "\nIntentions: none set yet today"}`,
  );

  // Recent intentions with actual text (so the coach can evaluate quality)
  if (ctx.recentIntentions.length > 0) {
    const lines = ctx.recentIntentions.slice(0, 5).map((day) => {
      const items = day.items
        .map((i) => `  ${i.completed ? "✓" : "○"} "${i.text}"`)
        .join("\n");
      return `- **${day.date}**:\n${items}`;
    });
    sections.push(
      `### Recent Daily Intentions (actual items)\nReview these for quality — are they high-impact choices tied to identity and goals, or just errands/busywork?\n${lines.join("\n")}`,
    );
  }

  // Journal with tension pattern detection
  if (ctx.recentJournal.length > 0) {
    const lines = ctx.recentJournal.slice(0, 5).map(
      (j) =>
        `- **${j.date}**: Win: "${j.win}" | Tension: "${j.tension}" | Gratitude: "${j.gratitude}"`,
    );

    // Surface recurring tensions
    const tensions = ctx.recentJournal
      .filter((j) => j.tension && j.tension.trim().length > 0)
      .map((j) => j.tension.toLowerCase().trim());
    let tensionNote = "";
    if (tensions.length >= 2) {
      tensionNote = `\n\n📌 This user has logged ${tensions.length} tensions recently. Look for recurring themes — if the same issue keeps appearing, push them to take concrete action on it rather than just acknowledging it each night.`;
    }

    sections.push(`### Recent Journal Entries\n${lines.join("\n")}${tensionNote}`);
  }

  // Goals
  if (ctx.goals.length > 0) {
    const lines = ctx.goals.map(
      (g) => `- **${g.title}**: ${g.progressPct}% complete (${g.trajectory})`,
    );
    sections.push(`### Goals\n${lines.join("\n")}`);
  }

  // Call activity
  if (ctx.recentCallActivity.callsLast7Days > 0) {
    sections.push(
      `### Evening Call Activity (last 7 days)\n${ctx.recentCallActivity.callsCompleted} completed, ${ctx.recentCallActivity.callsMissed} missed out of ${ctx.recentCallActivity.callsLast7Days} total`,
    );
  }

  return sections.join("\n\n");
}
