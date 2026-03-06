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

interface ScheduleRequest {
  user_id?: string;
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

function getTodayInTimezone(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
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

function getCurrentTimeInTimezone(tz: string): { hours: number; minutes: number } {
  const timeStr = new Date().toLocaleTimeString("en-US", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const [hours, minutes] = timeStr.split(":").map(Number);
  return { hours, minutes };
}

function parseCallTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return { hours, minutes };
}

function isWithinCallWindow(
  currentH: number,
  currentM: number,
  callH: number,
  callM: number,
  windowMinutes = 15,
): boolean {
  const current = currentH * 60 + currentM;
  const call = callH * 60 + callM;
  return current >= call && current < call + windowMinutes;
}

function buildSystemPrompt(
  userName: string,
  habits: Array<{ id: string; name: string }>,
  todos: Array<{ id: string; text: string; position: number }>,
): string {
  const todosSection =
    todos.length > 0
      ? `### Top 3 Priorities
Today's remaining priorities:
${todos.map((t) => `- ${t.text} (id: ${t.id}, position: ${t.position})`).join("\n")}

Ask about each one. For each completed todo, call the complete_todo function with the todo_id.
If they didn't finish a todo, acknowledge and move on.`
      : "### Top 3 Priorities\nNo remaining priorities for today — skip this section or mention they're all done.";

  const habitsSection =
    habits.length > 0
      ? `### Habits
Today's remaining habits:
${habits.map((h) => `- ${h.name} (id: ${h.id})`).join("\n")}

Go through each habit naturally. Example: "How about your ${habits[0].name} — did you get that done today?"
For each completed habit, call the complete_habit function with the habit_id.
If the user says they didn't do a habit but want to skip it for today, call snooze_habit with the habit_id.
If they simply didn't do it and don't mention skipping, just acknowledge warmly and move on without calling any function.`
      : "### Habits\nAll habits are done for today — skip this section or congratulate them.";

  const firstName = userName?.split(" ")[0] || "the user";
  return `You are a friendly evening check-in assistant for Thrive, a habit tracking app. You're calling ${firstName} for their nightly reflection.

Your job is to have a warm, natural conversation covering three topics in order:
1. Daily Journal (win, tension, gratitude)
2. Top 3 priorities for the day
3. Habit check-in

## Conversation Flow

Start with a brief, warm greeting using their name, then transition naturally through each section.

### Journal
Ask conversationally:
- First, their win — what went well today, what they're proud of.
- Then tensions — anything challenging or stressful.
- Then gratitude — what they're thankful for.

After getting all three, call save_journal with concise but faithful 1-3 sentence summaries of each. This will overwrite any existing journal entry for today.

${todosSection}

${habitsSection}

### Wrap Up
End with brief, genuine encouragement. Keep the whole call to 3-5 minutes.

## Guidelines
- Be conversational and warm, not robotic or scripted.
- If the user gives a short answer, don't push for more.
- If they want to skip a section, respect that immediately.
- Don't repeat back exactly what they said — paraphrase naturally.
- Call tool functions as you go through the conversation, not all at the end.
- NEVER fabricate habit names or todo items beyond the specific ones listed above.`;
}

function buildTools(serverUrl: string) {
  return [
    {
      type: "function",
      function: {
        name: "save_journal",
        description:
          "Save the user's journal entry with their win, tension, and gratitude for today.",
        parameters: {
          type: "object",
          properties: {
            win: {
              type: "string",
              description: "Summary of the user's win for today",
            },
            tension: {
              type: "string",
              description: "Summary of the user's tension or challenge",
            },
            gratitude: {
              type: "string",
              description: "What the user is grateful for today",
            },
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
        description: "Mark a specific habit as completed for today.",
        parameters: {
          type: "object",
          properties: {
            habit_id: {
              type: "string",
              description: "The ID of the habit to mark as completed",
            },
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
        description: "Mark a specific todo as completed for today.",
        parameters: {
          type: "object",
          properties: {
            todo_id: {
              type: "string",
              description: "The ID of the todo to mark as completed",
            },
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
        description:
          "Snooze a habit for today when the user wants to skip it.",
        parameters: {
          type: "object",
          properties: {
            habit_id: {
              type: "string",
              description: "The ID of the habit to snooze for today",
            },
          },
          required: ["habit_id"],
        },
      },
      server: { url: serverUrl },
    },
  ];
}

interface UserRow {
  user_id: string;
  full_name: string | null;
  phone_number: string;
  timezone: string;
  evening_call_time?: string;
}

async function initiateCall(
  supabase: ReturnType<typeof createClient>,
  user: UserRow,
  vapiApiKey: string,
  vapiPhoneNumberId: string,
  serverUrl: string,
): Promise<{ success: boolean; vapiCallId?: string; error?: string }> {
  const today = getTodayInTimezone(user.timezone);
  const dayOfWeek = getDayOfWeekInTimezone(user.timezone);

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

  const systemPrompt = buildSystemPrompt(
    user.full_name || "",
    uncompletedHabits.map((h: any) => ({ id: h.id, name: h.name })),
    uncompletedTodos.map((t: any) => ({
      id: t.id,
      text: t.text,
      position: t.position,
    })),
  );

  const tools = buildTools(serverUrl);

  const vapiResponse = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vapiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumberId: vapiPhoneNumberId,
      customer: { number: user.phone_number },
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
        firstMessage: `Hey ${user.full_name?.split(" ")[0] || "there"}, it's your evening check-in from Thrive. How was your day?`,
        transcriber: {
          provider: "deepgram",
          model: "nova-3",
          language: "en",
        },
        maxDurationSeconds: 600,
      },
      metadata: {
        user_id: user.user_id,
        call_date: today,
      },
    }),
  });

  if (!vapiResponse.ok) {
    const errorBody = await vapiResponse.text();
    console.error("Vapi API error:", vapiResponse.status, errorBody);
    return {
      success: false,
      error: `Vapi returned ${vapiResponse.status}: ${errorBody}`,
    };
  }

  const vapiCall = await vapiResponse.json();
  return { success: true, vapiCallId: vapiCall.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY");
    const VAPI_PHONE_NUMBER_ID = Deno.env.get("VAPI_PHONE_NUMBER_ID");
    const POSTHOG_API_KEY = Deno.env.get("POSTHOG_API_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Missing Supabase env vars" }, 500);
    }
    if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID) {
      return jsonResponse({ error: "Missing Vapi env vars" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const serverUrl = `${SUPABASE_URL}/functions/v1/vapi-server`;

    let body: ScheduleRequest = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine for scheduled invocations
    }

    // ── On-demand call for a specific user ("Call Me Now") ──
    // Authenticate via JWT so users can only trigger calls for themselves.

    if (body.user_id) {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      const token = authHeader.replace("Bearer ", "");
      const { data, error: authError } = await supabase.auth.getUser(token);
      const caller = data?.user;
      if (authError || !caller) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      if (caller.id !== body.user_id) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone_number, timezone")
        .eq("user_id", caller.id)
        .single();

      if (userError || !user) {
        return jsonResponse({ error: "User not found" }, 404);
      }
      if (!user.phone_number) {
        return jsonResponse({ error: "No phone number configured" }, 400);
      }

      const result = await initiateCall(
        supabase,
        user,
        VAPI_API_KEY,
        VAPI_PHONE_NUMBER_ID,
        serverUrl,
      );

      if (result.success) {
        await supabase.from("evening_call_log").insert({
          user_id: user.user_id,
          call_date: getTodayInTimezone(user.timezone),
          vapi_call_id: result.vapiCallId,
          status: "scheduled",
          direction: "outbound",
        });
        capturePosthogEvent(POSTHOG_API_KEY, user.user_id, "evening_call_placed", {
          trigger: "on_demand",
        });
      }

      return jsonResponse({ success: result.success, error: result.error });
    }

    // ── Scheduled batch: find all users due for a call ──
    // Only allow service-role callers (pg_cron) to trigger the batch.

    const batchAuthHeader = req.headers.get("authorization");
    if (batchAuthHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
      return jsonResponse({ error: "Forbidden: service role required" }, 403);
    }

    const { data: enabledUsers, error: usersError } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone_number, evening_call_time, timezone")
      .eq("evening_call_enabled", true)
      .not("phone_number", "is", null);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return jsonResponse({ error: "Failed to fetch users" }, 500);
    }

    if (!enabledUsers || enabledUsers.length === 0) {
      return jsonResponse({
        message: "No users with evening calls enabled",
        calls_initiated: 0,
      });
    }

    const usersToCall = enabledUsers.filter((user: any) => {
      try {
        const { hours, minutes } = getCurrentTimeInTimezone(user.timezone);
        const callTime = parseCallTime(user.evening_call_time);
        return isWithinCallWindow(hours, minutes, callTime.hours, callTime.minutes);
      } catch (e) {
        console.error(`Error checking time for user ${user.user_id}:`, e);
        return false;
      }
    });

    const results = [];
    for (const user of usersToCall) {
      const today = getTodayInTimezone(user.timezone);

      // Skip if already called today
      const { data: existingCall } = await supabase
        .from("evening_call_log")
        .select("id")
        .eq("user_id", user.user_id)
        .eq("call_date", today)
        .eq("direction", "outbound")
        .maybeSingle();

      if (existingCall) continue;

      const result = await initiateCall(
        supabase,
        user,
        VAPI_API_KEY,
        VAPI_PHONE_NUMBER_ID,
        serverUrl,
      );

      if (result.success) {
        await supabase.from("evening_call_log").insert({
          user_id: user.user_id,
          call_date: today,
          vapi_call_id: result.vapiCallId,
          status: "scheduled",
          direction: "outbound",
        });
        capturePosthogEvent(POSTHOG_API_KEY, user.user_id, "evening_call_placed", {
          trigger: "scheduled",
        });
      }

      results.push({
        user_id: user.user_id,
        success: result.success,
        error: result.error,
      });
    }

    return jsonResponse({
      calls_initiated: results.filter((r) => r.success).length,
      calls_failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
