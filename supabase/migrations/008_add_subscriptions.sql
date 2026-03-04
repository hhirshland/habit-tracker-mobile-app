-- Add RevenueCat customer reference to profiles
ALTER TABLE profiles ADD COLUMN rc_customer_id text;

-- Subscription status synced from RevenueCat webhooks
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rc_entitlement text NOT NULL DEFAULT 'pro',
  product_id text,
  status text NOT NULL DEFAULT 'none'
    CHECK (status IN ('active', 'trialing', 'expired', 'grace_period', 'none')),
  is_active boolean NOT NULL DEFAULT false,
  original_purchase_date timestamptz,
  expiration_date timestamptz,
  unsubscribe_detected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE restricted to service role (webhooks and edge functions)

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Discount codes for granting free access
CREATE TABLE discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  grant_type text NOT NULL DEFAULT 'free_forever'
    CHECK (grant_type IN ('free_forever', 'free_trial_extension')),
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_discount_codes_code ON discount_codes(LOWER(code));

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
-- No public access; managed via service role or Supabase dashboard

-- Track which users redeemed which codes
CREATE TABLE discount_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  discount_code_id uuid REFERENCES discount_codes(id) NOT NULL,
  redeemed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, discount_code_id)
);

CREATE INDEX idx_discount_redemptions_user ON discount_redemptions(user_id);

ALTER TABLE discount_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions"
  ON discount_redemptions FOR SELECT
  USING (auth.uid() = user_id);
