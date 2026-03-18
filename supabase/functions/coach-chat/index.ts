import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/utils.ts";
import { buildCoachSystemPrompt } from "../_shared/coach-persona.ts";
import { assembleCoachContext } from "../_shared/coach-context.ts";

interface ChatRequest {
  conversation_id?: string;
  message?: string;
  /** Send without a message to get a coach-initiated greeting */
  start?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
      return jsonResponse({ error: "Missing env vars" }, 500);
    }

    // Authenticate caller
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !caller) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userId = caller.id;
    const body: ChatRequest = await req.json();

    if (!body.message && !body.start) {
      return jsonResponse({ error: "message or start flag required" }, 400);
    }

    // Get user profile for timezone + name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, timezone")
      .eq("user_id", userId)
      .single();

    const timezone = profile?.timezone || "America/New_York";
    const fullName = profile?.full_name || "";

    // Resolve or create conversation
    let conversationId = body.conversation_id;
    if (!conversationId) {
      // Auto-title based on how the conversation started
      let title: string;
      if (body.start) {
        const now = new Date();
        const monthDay = now.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: timezone,
        });
        title = `${monthDay} check-in`;
      } else if (body.message) {
        title = body.message.length > 50
          ? body.message.slice(0, 50).trim() + "…"
          : body.message;
      } else {
        title = "Coach chat";
      }

      const { data: newConvo, error: convoError } = await supabase
        .from("coach_conversations")
        .insert({ user_id: userId, title })
        .select("id")
        .single();

      if (convoError) {
        console.error("Error creating conversation:", convoError);
        return jsonResponse({ error: "Failed to create conversation" }, 500);
      }
      conversationId = newConvo.id;
    }

    // Persist user message (if not a start signal)
    if (body.message) {
      await supabase.from("coach_messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: body.message,
      });
    }

    // Fetch recent conversation history (last 20 messages)
    const { data: history } = await supabase
      .from("coach_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Assemble coach context
    const coachContext = await assembleCoachContext(supabase, userId, timezone);

    // Build system prompt
    const systemPrompt = buildCoachSystemPrompt({
      userName: fullName,
      userContext: coachContext.formatted,
      surfaceInstructions: body.start
        ? "The user just opened the coach chat. Greet them with something context-aware and energizing based on their current data. Don't ask what they need — lead with an observation about their habits or identity."
        : undefined,
    });

    // Build messages array for Claude
    const messages: Array<{ role: string; content: string }> = [];

    if (history && history.length > 0) {
      for (const msg of history) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // If start signal with no user message, add a synthetic user message
    if (body.start && !body.message && messages.length === 0) {
      messages.push({
        role: "user",
        content: "[User opened the coach chat]",
      });
    }

    // Call Anthropic API with streaming
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
          max_tokens: 1024,
          stream: true,
          system: systemPrompt,
          messages,
        }),
      },
    );

    if (!anthropicResponse.ok) {
      const errorBody = await anthropicResponse.text();
      console.error("Claude API error:", anthropicResponse.status, errorBody);
      return jsonResponse({ error: "AI generation failed" }, 500);
    }

    // Stream the response back to the client as SSE, collecting full text
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);

                if (
                  parsed.type === "content_block_delta" &&
                  parsed.delta?.type === "text_delta"
                ) {
                  const text = parsed.delta.text;
                  fullResponse += text;
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({ type: "text", text })}\n\n`,
                    ),
                  );
                }

                if (parsed.type === "message_stop") {
                  // Persist the assistant response
                  await supabase.from("coach_messages").insert({
                    conversation_id: conversationId,
                    role: "assistant",
                    content: fullResponse,
                  });

                  // Update conversation timestamp
                  await supabase
                    .from("coach_conversations")
                    .update({ updated_at: new Date().toISOString() })
                    .eq("id", conversationId);

                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: "done",
                        conversation_id: conversationId,
                      })}\n\n`,
                    ),
                  );
                }
              } catch {
                // Skip unparseable lines
              }
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders(),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
