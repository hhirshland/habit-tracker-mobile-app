import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RedeemRequest {
  code: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Authenticate via Supabase JWT
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Create a user-scoped client to extract user ID
  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: RedeemRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, message: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const code = body.code?.trim();
  if (!code) {
    return new Response(JSON.stringify({ success: false, message: "Code is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Look up the discount code (case-insensitive)
  const { data: discountCode, error: lookupError } = await supabaseAdmin
    .from("discount_codes")
    .select("*")
    .ilike("code", code)
    .single();

  if (lookupError || !discountCode) {
    return new Response(JSON.stringify({ success: false, message: "Invalid code" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate: is_active
  if (!discountCode.is_active) {
    return new Response(JSON.stringify({ success: false, message: "This code is no longer active" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate: not expired
  if (discountCode.expires_at && new Date(discountCode.expires_at) < new Date()) {
    return new Response(JSON.stringify({ success: false, message: "This code has expired" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate: max_uses
  if (
    discountCode.max_uses !== null &&
    discountCode.current_uses >= discountCode.max_uses
  ) {
    return new Response(
      JSON.stringify({ success: false, message: "This code has reached its usage limit" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // Validate: user hasn't already redeemed this code
  const { data: existingRedemption } = await supabaseAdmin
    .from("discount_redemptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("discount_code_id", discountCode.id)
    .maybeSingle();

  if (existingRedemption) {
    return new Response(
      JSON.stringify({ success: false, message: "You've already used this code" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // Grant access based on grant_type
  if (discountCode.grant_type === "free_forever") {
    // Upsert subscription as active with no expiration
    const { error: subError } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: user.id,
        status: "active",
        is_active: true,
        product_id: `discount_${discountCode.code}`,
        expiration_date: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (subError) {
      console.error("Error granting subscription:", subError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to apply code" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // Record redemption
  await supabaseAdmin.from("discount_redemptions").insert({
    user_id: user.id,
    discount_code_id: discountCode.id,
  });

  // Increment current_uses
  await supabaseAdmin
    .from("discount_codes")
    .update({ current_uses: discountCode.current_uses + 1 })
    .eq("id", discountCode.id);

  return new Response(
    JSON.stringify({
      success: true,
      grant_type: discountCode.grant_type,
      message: "Code applied successfully!",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
