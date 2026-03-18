import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, capturePosthogEvent } from "../_shared/utils.ts";
import { buildEveningCallCoachPrompt } from "../_shared/coach-persona.ts";
import { assembleCoachContext } from "../_shared/coach-context.ts";

interface ScheduleRequest {
  user_id?: string;
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

function buildTools(serverUrl: string, top3Enabled = false) {
  const tools = [
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
      messages: [],
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
      messages: [],
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
      messages: [],
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
      messages: [],
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
            intention_1: {
              type: "string",
              description: "First intention for tomorrow",
            },
            intention_2: {
              type: "string",
              description: "Second intention for tomorrow",
            },
            intention_3: {
              type: "string",
              description: "Third intention for tomorrow",
            },
          },
          required: ["intention_1"],
        },
      },
      server: { url: serverUrl },
      messages: [],
    });
  }

  return tools;
}

interface UserRow {
  user_id: string;
  full_name: string | null;
  phone_number: string;
  timezone: string;
  evening_call_time?: string;
  settings?: Record<string, unknown> | null;
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

  // Fetch today's uncompleted habits/todos AND full coach context in parallel
  const [habitsResult, todosResult, completionsResult, snoozesResult, coachContext] = await Promise.all([
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
    supabase
      .from("habit_snoozes")
      .select("habit_id")
      .eq("user_id", user.user_id)
      .eq("snoozed_date", today),
    assembleCoachContext(supabase, user.user_id, user.timezone),
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
  const snoozedIds = new Set(
    (snoozesResult.data ?? []).map((s: any) => s.habit_id),
  );
  const uncompletedHabits = todaysHabits.filter(
    (h: any) => !completedIds.has(h.id) && !snoozedIds.has(h.id),
  );
  const uncompletedTodos = (todosResult.data ?? []).filter(
    (t: any) => !t.is_completed,
  );

  const top3Enabled = user.settings?.top3_todos_enabled === true;

  const systemPrompt = buildEveningCallCoachPrompt({
    userName: user.full_name || "",
    userContext: coachContext.formatted,
    habits: uncompletedHabits.map((h: any) => ({ id: h.id, name: h.name })),
    todos: uncompletedTodos.map((t: any) => ({
      id: t.id,
      text: t.text,
      position: t.position,
    })),
    top3Enabled,
  });

  const tools = buildTools(serverUrl, top3Enabled);
  const firstName = user.full_name?.split(" ")[0] || "there";

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
          model: "eleven_turbo_v2_5",
          stability: 0.5,
          similarityBoost: 0.75,
        },
        backgroundSound: "off",
        backgroundDenoisingEnabled: true,
        firstMessage: `Hey ${firstName}! It's your Thrive Coach. Let's close out your day strong — how'd it go today?`,
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
        .select("user_id, full_name, phone_number, timezone, settings")
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
      .select("user_id, full_name, phone_number, evening_call_time, timezone, settings")
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
