import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MIN_ACTIVE_DAYS = 4;

interface RecapRequest {
  user_id: string;
  week_start: string; // YYYY-MM-DD (Sunday)
  week_end: string; // YYYY-MM-DD (Saturday)
}

const RECAP_SYSTEM_PROMPT = `You are the user's personal life coach inside a habit-tracking app called Thrive. You write their weekly recap — a motivational, inspiring, and encouraging summary of their week.

Your voice is that of a coach who genuinely believes in the person reading this. You celebrate their wins with real enthusiasm. When things didn't go perfectly, you give gentle nudges — never guilt or criticism. You reframe setbacks as stepping stones. You push them forward with energy and optimism while staying grounded in their actual data.

Think: "I see you, I'm proud of you, and here's how we keep the momentum going."

You will receive structured data about the user's week: habit completions, goal progress, and (optionally) journal entries. Synthesise this into a recap that follows the exact JSON schema below. Do NOT include any text outside the JSON object.

Output JSON schema:
{
  "week_summary": "<2-3 sentence overall summary of the week. Be specific — reference numbers, habit names, and trends. Lead with what went well. Tone: warm, motivational, personal.>",
  "habit_review": {
    "overall_adherence_pct": <integer 0-100>,
    "narrative": "<2-3 sentences about habit performance this week. Celebrate consistency and effort. Reference specific habit names and completion counts. If some habits slipped, frame it as an area to channel energy into — never as failure.>",
    "standout_habit": "<1 sentence celebrating the best-performing habit with genuine enthusiasm. Include name and stats.>",
    "needs_attention": "<1 sentence gently nudging toward the lowest-performing habit — frame it as an opportunity to recommit, not a shortcoming. null if all were strong.>"
  },
  "goal_progress": [
    {
      "title": "<goal title>",
      "narrative": "<1-2 sentences about movement this week — include numbers where available. Acknowledge even small progress as meaningful.>"
    }
  ],
  "reflection_themes": {
    "narrative": "<2-3 sentences synthesising themes from journal entries. Highlight the user's self-awareness as a strength. null if no journal data.>",
    "wins": ["<a win worth celebrating from this week — be specific and enthusiastic>", "...more if applicable"],
    "growth_opportunity": "<reframe a recurring tension or challenge as an exciting opportunity for growth — be specific and optimistic, e.g. 'Your sleep struggles are a clear signal that a wind-down routine could unlock better energy and focus.' null if nothing stands out.>",
    "gratitude_highlight": "<a meaningful gratitude theme or specific entry that stood out, or null>"
  },
  "looking_ahead": "<2-3 sentences of actionable, specific encouragement for next week. Tie back to any growth opportunities surfaced in reflections — the purpose of reflection is awareness and mindful attention, so inspire the user to focus on areas that deserve it. End on an energising, forward-looking note that makes them excited for the week ahead.>"
}

Rules:
- Be specific. Use habit names, goal titles, and real numbers.
- Always lead with positivity. Celebrate effort and progress, not just perfection.
- When addressing missed targets, be gentle and reframe as opportunity — never use words like "failed," "poor," or "disappointing."
- Write like you're talking directly to the person — use "you" and "your."
- If no journal data is provided, set reflection_themes fields to null (wins to empty array).
- If no goals exist, return an empty array for goal_progress.
- Keep the total response under 500 words.
- Return ONLY the JSON object, no markdown fencing.`;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    console.log("ENV check:", {
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      hasAnthropicKey: !!ANTHROPIC_API_KEY,
    });

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(
        { error: "server_config_error", retryable: false, detail: "Missing Supabase env vars" },
        500,
      );
    }

    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "server_config_error", retryable: false, detail: "Missing ANTHROPIC_API_KEY" },
        500,
      );
    }

    // Authenticate caller via JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !caller) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { week_start, week_end }: Omit<RecapRequest, "user_id"> = await req.json();
    const user_id = caller.id;
    console.log("Request:", { user_id, week_start, week_end });

    if (!week_start || !week_end) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const supabase = supabaseAuth;

    // Check if recap already exists
    const { data: existing } = await supabase
      .from("weekly_recaps")
      .select("id, content, is_read")
      .eq("user_id", user_id)
      .eq("week_start", week_start)
      .maybeSingle();

    if (existing) {
      console.log("Recap already exists for", week_start);
      return jsonResponse({ recap: existing, already_existed: true });
    }

    console.log("Fetching week data...");

    // Fetch all data for the week in parallel
    const [
      habitsResult,
      completionsResult,
      goalsResult,
      goalEntriesResult,
      journalResult,
      identityResult,
    ] = await Promise.all([
      supabase
        .from("habits")
        .select("id, name, frequency_per_week, specific_days, identity_statement_id")
        .eq("user_id", user_id)
        .eq("is_active", true),
      supabase
        .from("habit_completions")
        .select("habit_id, completed_date")
        .eq("user_id", user_id)
        .gte("completed_date", week_start)
        .lte("completed_date", week_end),
      supabase
        .from("goals")
        .select("id, title, goal_type, target_value, unit, start_value, data_source")
        .eq("user_id", user_id)
        .eq("is_active", true),
      supabase
        .from("goal_entries")
        .select("goal_id, value, recorded_date")
        .eq("user_id", user_id)
        .gte("recorded_date", week_start)
        .lte("recorded_date", week_end),
      supabase
        .from("daily_journal_entries")
        .select("journal_date, win, tension, gratitude")
        .eq("user_id", user_id)
        .gte("journal_date", week_start)
        .lte("journal_date", week_end),
      supabase
        .from("identity_statements")
        .select("id, statement, emoji")
        .eq("user_id", user_id)
        .eq("is_active", true),
    ]);

    const habits = habitsResult.data ?? [];
    const completions = completionsResult.data ?? [];
    const goals = goalsResult.data ?? [];
    const goalEntries = goalEntriesResult.data ?? [];
    const journalEntries = journalResult.data ?? [];
    const identityStatements = identityResult.data ?? [];

    console.log("Data fetched:", {
      habits: habits.length,
      completions: completions.length,
      goals: goals.length,
      goalEntries: goalEntries.length,
      journalEntries: journalEntries.length,
      identityStatements: identityStatements.length,
    });

    // Count distinct active days (4-day minimum threshold)
    const activeDays = new Set<string>();
    for (const c of completions) activeDays.add(c.completed_date);
    for (const e of goalEntries) activeDays.add(e.recorded_date);
    for (const j of journalEntries) activeDays.add(j.journal_date);

    if (activeDays.size < MIN_ACTIVE_DAYS) {
      console.log("Insufficient data:", activeDays.size, "active days");
      return jsonResponse({ skipped: true, reason: "insufficient_data", active_days: activeDays.size });
    }

    // Build structured data for the prompt
    const habitSummaries = habits.map((habit) => {
      const habitCompletions = completions.filter(
        (c) => c.habit_id === habit.id,
      );
      return {
        name: habit.name,
        target_days: habit.frequency_per_week,
        completed_days: habitCompletions.length,
        completed_dates: habitCompletions.map((c) => c.completed_date),
      };
    });

    const totalTarget = habitSummaries.reduce((sum, h) => sum + h.target_days, 0);
    const totalCompleted = habitSummaries.reduce((sum, h) => sum + h.completed_days, 0);
    const overallAdherence = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

    const goalSummaries = goals.map((goal) => {
      const entries = goalEntries.filter((e) => e.goal_id === goal.id);
      return {
        title: goal.title,
        goal_type: goal.goal_type,
        target_value: goal.target_value,
        unit: goal.unit,
        start_value: goal.start_value,
        entries_this_week: entries.map((e) => ({
          date: e.recorded_date,
          value: e.value,
        })),
      };
    });

    // Build identity context only when the user has identity statements
    let identityContext = null;
    if (identityStatements.length > 0) {
      identityContext = identityStatements.map((identity) => {
        const mappedHabits = habits.filter(
          (h) => h.identity_statement_id === identity.id,
        );
        const totalTarget = mappedHabits.reduce(
          (sum, h) => sum + h.frequency_per_week,
          0,
        );
        const totalCompleted = mappedHabits.reduce((sum, h) => {
          return (
            sum +
            completions.filter((c) => c.habit_id === h.id).length
          );
        }, 0);
        return {
          statement: identity.statement,
          emoji: identity.emoji,
          habits: mappedHabits.map((h) => h.name),
          adherence_pct:
            totalTarget > 0
              ? Math.round((totalCompleted / totalTarget) * 100)
              : 0,
        };
      });
    }

    const userPrompt = JSON.stringify(
      {
        week: { start: week_start, end: week_end },
        overall_adherence_pct: overallAdherence,
        habits: habitSummaries,
        goals: goalSummaries,
        journal_entries: journalEntries.length > 0 ? journalEntries : null,
        ...(identityContext ? { identities: identityContext } : {}),
      },
      null,
      2,
    );

    // Build system prompt with optional identity instructions
    let systemPrompt = RECAP_SYSTEM_PROMPT;
    if (identityContext && identityContext.length > 0) {
      systemPrompt += `\n\nThe user has defined identity statements — "I am ___" declarations that represent who they want to become. Habits are mapped to these identities. When identities are present in the data:\n- Include an "identity_review" field in your JSON output with this schema:\n  "identity_review": {\n    "identities": [{ "statement": "<identity>", "emoji": "<emoji>", "adherence_pct": <number>, "mapped_habit_count": <number> }],\n    "narrative": "<2-3 sentences weaving identity progress into the motivational narrative. Celebrate identities where adherence is high — 'You really showed up as [identity] this week.' Gently encourage identities that slipped — 'Next week, let's channel more energy into being [identity].' Use their emojis.>"\n  }\n- Reference their identities in week_summary and looking_ahead naturally.\n- If no identities are in the data, omit identity_review entirely.`;
    }

    // Call Claude API
    console.log("Calling Claude API...");
    const startTime = Date.now();
    const anthropicResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `Here is the user's data for the week of ${week_start} to ${week_end}:\n\n${userPrompt}`,
            },
          ],
        }),
      },
    );

    if (!anthropicResponse.ok) {
      const errorBody = await anthropicResponse.text();
      console.error("Claude API error:", anthropicResponse.status, errorBody);
      return jsonResponse(
        {
          error: "ai_generation_failed",
          retryable: true,
          detail: `Claude API returned ${anthropicResponse.status}`,
        },
        500,
      );
    }

    const aiResult = await anthropicResponse.json();
    const generationTimeMs = Date.now() - startTime;
    console.log("Claude response received in", generationTimeMs, "ms");

    const rawText = aiResult.content?.[0]?.text ?? "";
    let recapContent;
    try {
      recapContent = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse Claude response as JSON:", rawText.slice(0, 500));
      return jsonResponse(
        { error: "ai_parse_failed", retryable: true, detail: "Claude returned invalid JSON" },
        500,
      );
    }

    // Insert the recap
    console.log("Inserting recap into database...");
    const { data: recap, error: insertError } = await supabase
      .from("weekly_recaps")
      .insert({
        user_id,
        week_start,
        week_end,
        content: recapContent,
      })
      .select("id, content, is_read, week_start, week_end, created_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: raceRecap } = await supabase
          .from("weekly_recaps")
          .select("id, content, is_read")
          .eq("user_id", user_id)
          .eq("week_start", week_start)
          .single();
        return jsonResponse({ recap: raceRecap, already_existed: true });
      }
      console.error("Insert error:", insertError);
      throw insertError;
    }

    console.log("Recap created successfully for", week_start);
    return jsonResponse({ recap, generation_time_ms: generationTimeMs });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse(
      { error: "internal_error", retryable: true },
      500,
    );
  }
});
