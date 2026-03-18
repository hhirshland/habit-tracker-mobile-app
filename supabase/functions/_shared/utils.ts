// Shared utilities for Supabase edge functions.
// Eliminates duplication of CORS, JSON response, and PostHog helpers.

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

export async function capturePosthogEvent(
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
