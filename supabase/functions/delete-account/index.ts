import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(
        { error: "server_config_error", detail: "Missing Supabase env vars" },
        500,
      );
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // --- Authenticate the caller ---
    // Per Supabase best practices: create a user-scoped client with the anon
    // key and the caller's Authorization header, then call getUser() (no args).
    // This avoids the known issues with getUser(token) on a service-role client.
    const supabaseUser = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userId = user.id;

    // --- Admin client for privileged operations ---
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Clean up avatar files from storage
    try {
      const { data: avatarFiles } = await supabaseAdmin.storage
        .from("avatars")
        .list("avatars", { search: userId });

      if (avatarFiles && avatarFiles.length > 0) {
        const paths = avatarFiles.map((f) => `avatars/${f.name}`);
        await supabaseAdmin.storage.from("avatars").remove(paths);
      }
    } catch (err) {
      console.warn("Error cleaning up avatars (continuing):", err);
    }

    // Deleting the auth user cascades to all tables via ON DELETE CASCADE:
    // profiles, habits, habit_completions, habit_snoozes, goals, goal_entries,
    // daily_todos, daily_journal_entries, weekly_recaps, subscriptions,
    // discount_redemptions, evening_call_log
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      return jsonResponse({ error: "deletion_failed" }, 500);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("delete-account unexpected error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
});
