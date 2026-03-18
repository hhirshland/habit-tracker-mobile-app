import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, capturePosthogEvent } from "../_shared/utils.ts";
import { buildNudgePrompt } from "../_shared/coach-persona.ts";
import { assembleCoachContext } from "../_shared/coach-context.ts";

// Nudge trigger detection + LLM nudge generation + push delivery.
// Triggered by pg_cron (~4x/day via service-role HTTP call).

interface NudgeTrigger {
  type: string;
  detail: string;
  priority: number; // lower = higher priority
}

const MAX_NUDGES_PER_DAY = 1;
const QUIET_HOUR_START = 22; // 10 PM
const QUIET_HOUR_END = 8;   // 8 AM

function getTodayInTimezone(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

function getCurrentHourInTimezone(tz: string): number {
  const timeStr = new Date().toLocaleTimeString("en-US", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
  });
  return parseInt(timeStr, 10);
}

function getDaysAgoDate(today: string, days: number): string {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: token,
        title,
        body,
        sound: "default",
        data,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Expo push error:", err);
    return false;
  }
}

async function generateNudgeMessage(
  anthropicKey: string,
  userName: string,
  userContext: string,
  trigger: NudgeTrigger,
): Promise<string> {
  const prompt = buildNudgePrompt({
    userName,
    userContext,
    triggerType: trigger.type,
    triggerDetail: trigger.detail,
  });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      system: prompt,
      messages: [{ role: "user", content: "Generate the nudge." }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  // Truncate to push notification limit
  return text.slice(0, 280);
}

/**
 * Detect nudge triggers from the user's context data.
 * Returns triggers sorted by priority (most important first).
 */
function detectTriggers(ctx: import("../_shared/coach-context.ts").CoachContextRaw): NudgeTrigger[] {
  const triggers: NudgeTrigger[] = [];

  // Missed streak: 2+ missed days on any habit this week
  for (const habit of ctx.habits) {
    if (habit.currentStreak === 0 && habit.completedThisWeek < ctx.daysElapsedThisWeek - 1) {
      const missedDays = ctx.daysElapsedThisWeek - habit.completedThisWeek;
      if (missedDays >= 2) {
        triggers.push({
          type: "missed_streak",
          detail: `${habit.name} missed for ${missedDays} days this week. ${habit.identityStatement ? `Identity: ${habit.identityStatement}` : ""}`,
          priority: 1,
        });
      }
    }
  }

  // Declining week: adherence dropped 20%+ vs 30-day average
  if (ctx.overallAdherence30Day > 0 && ctx.overallAdherenceThisWeek < ctx.overallAdherence30Day - 20) {
    triggers.push({
      type: "declining_week",
      detail: `This week adherence: ${ctx.overallAdherenceThisWeek}%, 30-day average: ${ctx.overallAdherence30Day}%`,
      priority: 2,
    });
  }

  // Missed daily practices: journal or intentions gaps this week
  if (ctx.dailyPractices) {
    const missedJournal = ctx.daysElapsedThisWeek - ctx.dailyPractices.journalDaysThisWeek;
    const missedIntentions = ctx.daysElapsedThisWeek - ctx.dailyPractices.intentionDaysThisWeek;
    if (missedJournal >= 2 || missedIntentions >= 2) {
      const gaps: string[] = [];
      if (missedJournal >= 2) gaps.push(`journal (${missedJournal} days missed)`);
      if (missedIntentions >= 2) gaps.push(`intentions (${missedIntentions} days missed)`);
      triggers.push({
        type: "missed_daily_practice",
        detail: `Daily practice gaps this week: ${gaps.join(", ")}`,
        priority: 2,
      });
    }
  }

  // Evening call skip: missed 2+ calls in last 7 days
  if (ctx.recentCallActivity.callsMissed >= 2) {
    triggers.push({
      type: "evening_call_skip",
      detail: `Missed ${ctx.recentCallActivity.callsMissed} of ${ctx.recentCallActivity.callsLast7Days} evening calls`,
      priority: 3,
    });
  }

  // Win celebration: perfect day (all habits done, all intentions done)
  if (
    ctx.todayState.habitsRemaining === 0 &&
    ctx.todayState.habitsCompleted > 0 &&
    (ctx.todayState.intentionsTotal === 0 || ctx.todayState.intentionsCompleted === ctx.todayState.intentionsTotal)
  ) {
    triggers.push({
      type: "win_celebration",
      detail: `Perfect day: ${ctx.todayState.habitsCompleted} habits completed${ctx.todayState.intentionsTotal > 0 ? `, ${ctx.todayState.intentionsCompleted} intentions completed` : ""}`,
      priority: 4,
    });
  }

  // Goal milestone: any goal at 50%, 75%, or 100%
  for (const goal of ctx.goals) {
    const milestones = [50, 75, 100];
    for (const milestone of milestones) {
      if (goal.progressPct >= milestone && goal.progressPct < milestone + 10) {
        triggers.push({
          type: "goal_milestone",
          detail: `${goal.title} at ${goal.progressPct}% (milestone: ${milestone}%)`,
          priority: 5,
        });
        break;
      }
    }
  }

  return triggers.sort((a, b) => a.priority - b.priority);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const POSTHOG_API_KEY = Deno.env.get("POSTHOG_API_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
      return jsonResponse({ error: "Missing env vars" }, 500);
    }

    // Only allow service-role callers (pg_cron)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
      return jsonResponse({ error: "Forbidden: service role required" }, 403);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users who have push tokens registered
    const { data: tokenRows, error: tokensError } = await supabase
      .from("push_tokens")
      .select("user_id, token");

    if (tokensError) {
      console.error("Error fetching push tokens:", tokensError);
      return jsonResponse({ error: "Failed to fetch tokens" }, 500);
    }

    if (!tokenRows || tokenRows.length === 0) {
      return jsonResponse({ message: "No push tokens registered", nudges_sent: 0 });
    }

    // Group tokens by user
    const tokensByUser = new Map<string, string[]>();
    for (const row of tokenRows) {
      if (!tokensByUser.has(row.user_id)) tokensByUser.set(row.user_id, []);
      tokensByUser.get(row.user_id)!.push(row.token);
    }

    const results: Array<{ user_id: string; sent: boolean; trigger?: string; error?: string }> = [];

    for (const [userId, tokens] of tokensByUser) {
      try {
        // Get user timezone
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, timezone")
          .eq("user_id", userId)
          .single();

        const tz = profile?.timezone || "America/New_York";
        const today = getTodayInTimezone(tz);
        const currentHour = getCurrentHourInTimezone(tz);

        // Respect quiet hours
        if (currentHour >= QUIET_HOUR_START || currentHour < QUIET_HOUR_END) {
          continue;
        }

        // Check if already nudged today
        const { data: todayNudges } = await supabase
          .from("coach_nudges")
          .select("id, trigger_type")
          .eq("user_id", userId)
          .gte("sent_at", `${today}T00:00:00`)
          .lte("sent_at", `${today}T23:59:59`);

        if ((todayNudges?.length ?? 0) >= MAX_NUDGES_PER_DAY) {
          continue;
        }

        // Get the last nudge's trigger to avoid repeats
        const { data: lastNudge } = await supabase
          .from("coach_nudges")
          .select("trigger_type")
          .eq("user_id", userId)
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Assemble context and detect triggers
        const coachContext = await assembleCoachContext(supabase, userId, tz);
        const triggers = detectTriggers(coachContext.raw);

        if (triggers.length === 0) continue;

        // Pick the best trigger (skip if same as last nudge)
        let selectedTrigger = triggers[0];
        if (lastNudge && selectedTrigger.type === lastNudge.trigger_type && triggers.length > 1) {
          selectedTrigger = triggers[1];
        }

        // Generate personalized nudge via LLM
        const nudgeMessage = await generateNudgeMessage(
          ANTHROPIC_API_KEY,
          profile?.full_name || "",
          coachContext.formatted,
          selectedTrigger,
        );

        if (!nudgeMessage) continue;

        // Create a titled conversation for this nudge (so tapping opens the chat)
        const triggerLabels: Record<string, string> = {
          missed_streak: "Getting back on track",
          declining_week: "Weekly check-in",
          evening_call_skip: "Evening routine",
          win_celebration: "Celebrating a win",
          goal_milestone: "Goal milestone",
          missed_daily_practice: "Daily practice reminder",
        };
        const nudgeTitle = triggerLabels[selectedTrigger.type] || "Coach nudge";

        const { data: convo } = await supabase
          .from("coach_conversations")
          .insert({ user_id: userId, title: nudgeTitle })
          .select("id")
          .single();

        const conversationId = convo?.id;

        // Save the nudge as the coach's opening message in the conversation
        if (conversationId) {
          await supabase.from("coach_messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: nudgeMessage,
          });
        }

        // Record the nudge
        await supabase.from("coach_nudges").insert({
          user_id: userId,
          trigger_type: selectedTrigger.type,
          message: nudgeMessage,
          conversation_id: conversationId,
        });

        // Send push notification to all user's devices
        const pushData = {
          route: "coach-chat",
          nudge_id: conversationId,
        };

        let sent = false;
        for (const token of tokens) {
          const ok = await sendExpoPush(
            token,
            "Your Thrive Coach",
            nudgeMessage,
            pushData,
          );
          if (ok) sent = true;
        }

        if (sent) {
          capturePosthogEvent(POSTHOG_API_KEY, userId, "coach_nudge_sent", {
            trigger_type: selectedTrigger.type,
          });
        }

        results.push({ user_id: userId, sent, trigger: selectedTrigger.type });
      } catch (err) {
        console.error(`Error processing nudge for user ${userId}:`, err);
        results.push({ user_id: userId, sent: false, error: (err as Error).message });
      }
    }

    return jsonResponse({
      nudges_sent: results.filter((r) => r.sent).length,
      users_processed: results.length,
      results,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
