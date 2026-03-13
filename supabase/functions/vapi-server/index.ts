import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function capturePosthogEvent(
  apiKey: string,
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  if (!apiKey) return;
  try {
    await fetch("https://us.i.posthog.com/capture/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties: { ...properties, $lib: "supabase-edge" },
      }),
    });
  } catch (e) {
    console.warn("PostHog capture failed:", e);
  }
}

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const POSTHOG_API_KEY = Deno.env.get("POSTHOG_API_KEY") ?? "";
    const VAPI_WEBHOOK_SECRET = Deno.env.get("VAPI_WEBHOOK_SECRET") ?? "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Missing Supabase env vars" }, 500);
    }

    // Verify Vapi webhook secret to prevent spoofed requests
    if (!VAPI_WEBHOOK_SECRET) {
      console.error("VAPI_WEBHOOK_SECRET is not configured");
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }
    const serverUrlSecret = req.headers.get("x-vapi-secret");
    if (serverUrlSecret !== VAPI_WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const message = body.message;

    if (!message || !message.type) {
      return jsonResponse({ error: "Invalid webhook payload" }, 400);
    }

    switch (message.type) {
      case "tool-calls":
        return await handleToolCalls(supabase, message, POSTHOG_API_KEY);
      case "end-of-call-report":
        return await handleEndOfCall(supabase, message, POSTHOG_API_KEY);
      case "assistant-request":
        return await handleAssistantRequest(supabase, message, SUPABASE_URL);
      default:
        return jsonResponse({ message: "OK" });
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

// ─── Resolve user from call metadata or phone number fallback ───

async function resolveCallUser(
  supabase: ReturnType<typeof createClient>,
  call: any,
): Promise<{ userId: string; callDate: string } | null> {
  const metadata = call?.metadata || {};
  if (metadata.user_id) {
    return {
      userId: metadata.user_id,
      callDate: metadata.call_date || new Date().toISOString().split("T")[0],
    };
  }

  // Inbound calls don't carry metadata — look up by caller phone number
  const callerNumber = call?.customer?.number;
  if (!callerNumber) return null;

  const { data: user } = await supabase
    .from("profiles")
    .select("user_id, timezone")
    .eq("phone_number", callerNumber)
    .maybeSingle();

  if (!user) return null;

  const tz = user.timezone || "America/New_York";
  const callDate = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  return { userId: user.user_id, callDate };
}

// ─── Tool Calls (mid-conversation function calling) ───

async function handleToolCalls(
  supabase: ReturnType<typeof createClient>,
  message: any,
  posthogKey: string,
): Promise<Response> {
  const toolCalls = message.toolCallList || [];
  const resolved = await resolveCallUser(supabase, message.call);
  const userId = resolved?.userId;
  const callDate = resolved?.callDate || new Date().toISOString().split("T")[0];

  if (!userId) {
    console.error("Could not resolve user_id from metadata or phone number. Full call object:", JSON.stringify(message.call));
    return jsonResponse({
      results: toolCalls.map((tc: any) => ({
        toolCallId: tc.id,
        result: "Error: missing user context",
      })),
    });
  }

  const results = [];

  for (const toolCall of toolCalls) {
    const fnName = toolCall.function?.name;
    let args: any = {};
    try {
      args =
        typeof toolCall.function?.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function?.arguments || {};
    } catch (e) {
      console.warn("Failed to parse tool call arguments:", toolCall.function?.arguments, e);
      args = {};
    }

    let result: string;

    try {
      switch (fnName) {
        case "save_journal": {
          const { win, tension, gratitude } = args;
          const { error } = await supabase
            .from("daily_journal_entries")
            .upsert(
              {
                user_id: userId,
                journal_date: callDate,
                win: win || "",
                tension: tension || "",
                gratitude: gratitude || "",
              },
              { onConflict: "user_id,journal_date" },
            );

          if (error) {
            console.error("Error saving journal:", JSON.stringify(error));
            result = "Had a small issue saving, but no worries.";
          } else {
            await supabase
              .from("evening_call_log")
              .update({ journal_saved: true })
              .eq("vapi_call_id", message.call?.id);
            capturePosthogEvent(posthogKey, userId, "journal_submitted", {
              is_edit: false,
              date: callDate,
              source: "evening_call",
            });
            result = "Journal entry saved successfully.";
          }
          break;
        }

        case "complete_habit": {
          const { habit_id } = args;
          const { error } = await supabase
            .from("habit_completions")
            .insert({
              habit_id,
              user_id: userId,
              completed_date: callDate,
            });

          if (error) {
            if (error.code === "23505") {
              result = "Already marked as completed.";
            } else {
              console.error("Error completing habit:", error);
              result = "Had a small issue, but no worries.";
            }
          } else {
            capturePosthogEvent(posthogKey, userId, "habit_completed", {
              habit_id,
              is_auto_complete: false,
              source: "evening_call",
            });
            result = "Habit marked as completed.";
          }
          break;
        }

        case "complete_todo": {
          const { todo_id } = args;
          const { error } = await supabase
            .from("daily_todos")
            .update({ is_completed: true })
            .eq("id", todo_id)
            .eq("user_id", userId);

          if (error) {
            console.error("Error completing todo:", error);
            result = "Had a small issue, but no worries.";
          } else {
            capturePosthogEvent(posthogKey, userId, "todo_completed", {
              todo_id,
              source: "evening_call",
            });
            result = "Todo marked as completed.";
          }
          break;
        }

        case "snooze_habit": {
          const { habit_id } = args;
          const { error } = await supabase
            .from("habit_snoozes")
            .insert({
              habit_id,
              user_id: userId,
              snoozed_date: callDate,
            });

          if (error) {
            if (error.code === "23505") {
              result = "Already snoozed for today.";
            } else {
              console.error("Error snoozing habit:", error);
              result = "Had a small issue, but no worries.";
            }
          } else {
            capturePosthogEvent(posthogKey, userId, "habit_snoozed", {
              habit_id,
              source: "evening_call",
            });
            result = "Habit snoozed for today.";
          }
          break;
        }

        case "set_tomorrow_intentions": {
          const { intention_1, intention_2, intention_3 } = args;
          const tomorrow = new Date(callDate + "T12:00:00");
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowDate = tomorrow.toISOString().split("T")[0];

          const intentions = [
            { position: 1, text: intention_1 },
            { position: 2, text: intention_2 },
            { position: 3, text: intention_3 },
          ].filter((i) => i.text);

          const rows = intentions.map((i) => ({
            user_id: userId,
            todo_date: tomorrowDate,
            position: i.position,
            text: i.text,
            is_completed: false,
          }));

          const { error } = await supabase
            .from("daily_todos")
            .upsert(rows, { onConflict: "user_id,todo_date,position" });

          if (error) {
            console.error("Error setting tomorrow's intentions:", error);
            result = "Had a small issue saving, but no worries.";
          } else {
            for (const i of intentions) {
              capturePosthogEvent(posthogKey, userId, "todo_created", {
                position: i.position,
                source: "evening_call",
                for_tomorrow: true,
              });
            }
            result = `Tomorrow's intentions are set! ${intentions.length} intention${intentions.length === 1 ? "" : "s"} saved.`;
          }
          break;
        }

        default:
          result = `Unknown function: ${fnName}`;
      }
    } catch (err) {
      console.error(`Error in tool call ${fnName}:`, err);
      result = "An error occurred, but we can continue.";
    }

    results.push({ toolCallId: toolCall.id, result });
  }

  return jsonResponse({ results });
}

// ─── End of Call Report ───

async function handleEndOfCall(
  supabase: ReturnType<typeof createClient>,
  message: any,
  posthogKey: string,
): Promise<Response> {
  const callId = message.call?.id;
  const endedReason = message.endedReason;
  const durationSeconds = message.durationSeconds ?? message.call?.duration ?? 0;
  const resolved = await resolveCallUser(supabase, message.call);
  const userId = resolved?.userId;
  const callDate = resolved?.callDate;

  if (!callId) {
    return jsonResponse({ message: "OK" });
  }

  const missedReasons = new Set([
    "customer-did-not-answer",
    "customer-busy",
    "customer-did-not-pick-up",
  ]);
  const errorReasons = new Set(["error", "pipeline-error"]);

  const status = missedReasons.has(endedReason)
    ? "missed"
    : errorReasons.has(endedReason)
      ? "failed"
      : "completed";

  const updateData: Record<string, unknown> = {
    status,
    duration_seconds: Math.round(durationSeconds),
  };

  // Count what the call actually achieved
  if (status === "completed" && userId && callDate) {
    const [journalResult, habitsResult, todosResult] = await Promise.all([
      supabase
        .from("daily_journal_entries")
        .select("id")
        .eq("user_id", userId)
        .eq("journal_date", callDate)
        .maybeSingle(),
      supabase
        .from("habit_completions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("completed_date", callDate),
      supabase
        .from("daily_todos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("todo_date", callDate)
        .eq("is_completed", true),
    ]);

    updateData.journal_saved = !!journalResult.data;
    updateData.habits_completed = habitsResult.count ?? 0;
    updateData.todos_completed = todosResult.count ?? 0;
  }

  const { error } = await supabase
    .from("evening_call_log")
    .update(updateData)
    .eq("vapi_call_id", callId);

  if (error) {
    console.error("Error updating call log:", error);
  }

  if (userId) {
    const eventName =
      status === "completed"
        ? "evening_call_completed"
        : status === "missed"
          ? "evening_call_missed"
          : "evening_call_failed";
    capturePosthogEvent(posthogKey, userId, eventName, {
      duration_seconds: Math.round(durationSeconds),
      direction: updateData.direction ?? "outbound",
      journal_saved: updateData.journal_saved,
      habits_completed: updateData.habits_completed,
      todos_completed: updateData.todos_completed,
    });
  }

  console.log(`Call ${callId} ended: ${status}, ${Math.round(durationSeconds)}s`);
  return jsonResponse({ message: "OK" });
}

// ─── Assistant Request (inbound calls) ───

async function handleAssistantRequest(
  supabase: ReturnType<typeof createClient>,
  message: any,
  supabaseUrl: string,
): Promise<Response> {
  const callerNumber = message.call?.customer?.number;

  if (!callerNumber) {
    return jsonResponse({
      assistant: buildFallbackAssistant(
        "I wasn't able to identify your number. Please make sure your phone number is registered in the Thrive app, then try again.",
      ),
    });
  }

  const { data: user } = await supabase
    .from("profiles")
    .select("user_id, full_name, phone_number, timezone, settings")
    .eq("phone_number", callerNumber)
    .maybeSingle();

  if (!user) {
    return jsonResponse({
      assistant: buildFallbackAssistant(
        "This phone number isn't registered in Thrive. Please add your number in the app under Profile, then try calling back.",
      ),
    });
  }

  const tz = user.timezone || "America/New_York";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  const dayOfWeek = (() => {
    const d = new Date().toLocaleDateString("en-US", {
      timeZone: tz,
      weekday: "short",
    });
    const m: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    return m[d] ?? new Date().getDay();
  })();

  const [habitsResult, todosResult, completionsResult] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, specific_days")
      .eq("user_id", user.user_id)
      .eq("is_active", true),
    supabase
      .from("daily_todos")
      .select("id, text, position, is_completed")
      .eq("user_id", user.user_id)
      .eq("todo_date", today)
      .order("position", { ascending: true }),
    supabase
      .from("habit_completions")
      .select("habit_id")
      .eq("user_id", user.user_id)
      .eq("completed_date", today),
  ]);

  const allHabits = habitsResult.data ?? [];
  const todaysHabits = allHabits.filter((h: any) => {
    if (h.specific_days && h.specific_days.length > 0) {
      return h.specific_days.includes(dayOfWeek);
    }
    return true;
  });
  const completedIds = new Set(
    (completionsResult.data ?? []).map((c: any) => c.habit_id),
  );
  const uncompletedHabits = todaysHabits.filter(
    (h: any) => !completedIds.has(h.id),
  );
  const uncompletedTodos = (todosResult.data ?? []).filter(
    (t: any) => !t.is_completed,
  );

  const serverUrl = `${supabaseUrl}/functions/v1/vapi-server`;

  const todosSection =
    uncompletedTodos.length > 0
      ? `### Daily Intentions
Remaining intentions:
${uncompletedTodos.map((t: any) => `- ${t.text} (id: ${t.id}, position: ${t.position})`).join("\n")}

Ask about each. For completed ones, call complete_todo.`
      : "### Daily Intentions\nAll intentions completed today — acknowledge their follow-through and move on.";

  const habitsSection =
    uncompletedHabits.length > 0
      ? `### Habits
Today's remaining habits:
${uncompletedHabits.map((h: any) => `- ${h.name} (id: ${h.id})`).join("\n")}

Go through each habit. For completed ones, call complete_habit.
If the user wants to skip a habit for today, call snooze_habit.
If they simply didn't do it, acknowledge warmly and move on.`
      : "### Habits\nAll habits done today — skip or congratulate them.";

  const top3Enabled = (user as any).settings?.top3_todos_enabled === true;

  const tomorrowIntentionsSection = top3Enabled
    ? `### Tomorrow's Intentions
After finishing the habit check-in, ask if they'd like to set their top 3 intentions for tomorrow.
If yes, ask what their 3 most important things for tomorrow are.
Once you have them, call set_tomorrow_intentions with the intentions.
If they don't want to, that's totally fine — move to wrap up.`
    : "";

  const topicsList = top3Enabled
    ? `Walk through these topics in order:
1. Daily Journal (win, tension, gratitude)
2. Daily intentions
3. Habit check-in
4. Tomorrow's intentions (optional)`
    : `Walk through three topics in order:
1. Daily Journal (win, tension, gratitude)
2. Daily intentions
3. Habit check-in`;

  const firstName = user.full_name?.split(" ")[0] || "The user";
  const systemPrompt = `You are a friendly evening check-in assistant for Thrive. ${firstName} is calling in for their nightly reflection.

${topicsList}

### Journal
Ask conversationally about their win, then tension, then gratitude.
After getting all three, call save_journal with concise 1-3 sentence summaries. This will overwrite any existing journal entry for today.

${todosSection}

${habitsSection}

${tomorrowIntentionsSection}

### Wrap Up
End with brief encouragement. Keep the call to 3-5 minutes.

## Guidelines
- Warm and conversational, not robotic.
- Short answers are fine — don't push.
- Respect requests to skip sections.
- Call tool functions as you go.
- NEVER fabricate habit or todo names.`;

  const tools = [
    {
      type: "function",
      function: {
        name: "save_journal",
        description: "Save the user's journal entry for today.",
        parameters: {
          type: "object",
          properties: {
            win: { type: "string", description: "Summary of their win" },
            tension: { type: "string", description: "Summary of their tension" },
            gratitude: { type: "string", description: "What they're grateful for" },
          },
          required: ["win", "tension", "gratitude"],
        },
      },
      server: { url: serverUrl },
    },
    {
      type: "function",
      function: {
        name: "complete_habit",
        description: "Mark a habit as completed for today.",
        parameters: {
          type: "object",
          properties: {
            habit_id: { type: "string", description: "The habit ID" },
          },
          required: ["habit_id"],
        },
      },
      server: { url: serverUrl },
    },
    {
      type: "function",
      function: {
        name: "complete_todo",
        description: "Mark a todo as completed for today.",
        parameters: {
          type: "object",
          properties: {
            todo_id: { type: "string", description: "The todo ID" },
          },
          required: ["todo_id"],
        },
      },
      server: { url: serverUrl },
    },
    {
      type: "function",
      function: {
        name: "snooze_habit",
        description: "Snooze a habit for today when the user wants to skip it.",
        parameters: {
          type: "object",
          properties: {
            habit_id: { type: "string", description: "The habit ID to snooze" },
          },
          required: ["habit_id"],
        },
      },
      server: { url: serverUrl },
    },
  ];

  if (top3Enabled) {
    tools.push({
      type: "function",
      function: {
        name: "set_tomorrow_intentions",
        description: "Set the user's top 3 intentions for tomorrow.",
        parameters: {
          type: "object",
          properties: {
            intention_1: { type: "string", description: "First intention for tomorrow" },
            intention_2: { type: "string", description: "Second intention for tomorrow" },
            intention_3: { type: "string", description: "Third intention for tomorrow" },
          },
          required: ["intention_1"],
        },
      },
      server: { url: serverUrl },
    });
  }

  // Log the inbound call
  await supabase.from("evening_call_log").insert({
    user_id: user.user_id,
    call_date: today,
    vapi_call_id: message.call?.id,
    status: "in_progress",
    direction: "inbound",
  });

  // Note: Vapi's assistant-request response does not support a top-level
  // `metadata` field. For inbound calls, resolveCallUser falls back to
  // looking up the user by phone number on subsequent tool-calls/end-of-call.
  return jsonResponse({
    assistant: {
      model: {
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "system", content: systemPrompt }],
        tools,
      },
      voice: {
        provider: "11labs",
        voiceId: "pVnrL6sighQX7hVz89cp",
      },
      backgroundSound: "off",
      backgroundDenoisingEnabled: true,
      firstMessage: `Hey ${user.full_name?.split(" ")[0] || "there"}! Thanks for calling in. Ready for your evening check-in?`,
      transcriber: {
        provider: "deepgram",
        model: "nova-3",
        language: "en",
      },
      maxDurationSeconds: 600,
    },
  });
}

function buildFallbackAssistant(firstMessage: string) {
  return {
    model: {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      messages: [
        {
          role: "system",
          content:
            "You are a brief assistant. Deliver the first message, then say goodbye if the user responds.",
        },
      ],
    },
    voice: {
      provider: "11labs",
      voiceId: "pVnrL6sighQX7hVz89cp",
    },
    backgroundSound: "off",
    backgroundDenoisingEnabled: true,
    firstMessage,
    maxDurationSeconds: 30,
  };
}
