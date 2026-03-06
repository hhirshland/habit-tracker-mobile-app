import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const REVENUECAT_WEBHOOK_AUTH =
  Deno.env.get("REVENUECAT_WEBHOOK_AUTH") ?? "";

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  product_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number;
  purchased_at_ms?: number;
  period_type?: string;
}

interface WebhookPayload {
  api_version: string;
  event: RevenueCatEvent;
}

function statusFromEventType(
  type: string,
  periodType?: string,
): { status: string; isActive: boolean } {
  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION":
      return {
        status: periodType === "TRIAL" ? "trialing" : "active",
        isActive: true,
      };
    case "CANCELLATION":
    case "EXPIRATION":
      return { status: "expired", isActive: false };
    case "BILLING_ISSUE":
      return { status: "grace_period", isActive: true };
    default:
      return { status: "none", isActive: false };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Validate authorization header — always required
  if (!REVENUECAT_WEBHOOK_AUTH) {
    console.error("REVENUECAT_WEBHOOK_AUTH is not configured");
    return new Response("Server misconfigured", { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${REVENUECAT_WEBHOOK_AUTH}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const event = payload.event;
  if (!event || !event.app_user_id) {
    return new Response("Missing event data", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const userId = event.app_user_id;
  const { status, isActive } = statusFromEventType(event.type, event.period_type);

  const subscriptionData: Record<string, unknown> = {
    user_id: userId,
    status,
    is_active: isActive,
    product_id: event.product_id ?? null,
    updated_at: new Date().toISOString(),
  };

  if (event.expiration_at_ms) {
    subscriptionData.expiration_date = new Date(event.expiration_at_ms).toISOString();
  }

  if (event.purchased_at_ms && (event.type === "INITIAL_PURCHASE")) {
    subscriptionData.original_purchase_date = new Date(event.purchased_at_ms).toISOString();
  }

  if (event.type === "CANCELLATION" || event.type === "EXPIRATION") {
    subscriptionData.unsubscribe_detected_at = new Date().toISOString();
  }

  // Upsert subscription record
  const { error } = await supabase
    .from("subscriptions")
    .upsert(subscriptionData, { onConflict: "user_id" });

  if (error) {
    console.error("Error upserting subscription:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
