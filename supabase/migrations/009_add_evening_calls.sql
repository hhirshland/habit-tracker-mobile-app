-- ============================================
-- Evening Call Feature
-- ============================================

-- Add evening call columns to profiles
ALTER TABLE profiles ADD COLUMN phone_number text;
ALTER TABLE profiles ADD COLUMN evening_call_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN evening_call_time time NOT NULL DEFAULT '20:00';
ALTER TABLE profiles ADD COLUMN timezone text NOT NULL DEFAULT 'America/New_York';

-- Unique index for inbound call lookup by phone number
CREATE UNIQUE INDEX idx_profiles_phone_number
  ON profiles(phone_number)
  WHERE phone_number IS NOT NULL;

-- Partial index for the scheduling query
CREATE INDEX idx_profiles_evening_call
  ON profiles(evening_call_enabled, evening_call_time, timezone)
  WHERE evening_call_enabled = true;

-- ============================================
-- Evening Call Log
-- ============================================

CREATE TABLE evening_call_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  call_date date NOT NULL,
  vapi_call_id text,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'missed', 'failed')),
  direction text NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('outbound', 'inbound')),
  duration_seconds integer,
  journal_saved boolean NOT NULL DEFAULT false,
  habits_completed integer NOT NULL DEFAULT 0,
  todos_completed integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_evening_call_log_user
  ON evening_call_log(user_id, call_date DESC);

CREATE UNIQUE INDEX idx_evening_call_log_vapi
  ON evening_call_log(vapi_call_id)
  WHERE vapi_call_id IS NOT NULL;

ALTER TABLE evening_call_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own call logs"
  ON evening_call_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER evening_call_log_updated_at
  BEFORE UPDATE ON evening_call_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- pg_cron Setup (run manually in SQL editor)
-- ============================================
-- 1. Enable extensions in Supabase Dashboard → Database → Extensions:
--    - pg_cron
--    - pg_net
--
-- 2. Then run this in the SQL editor (replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY):
--
-- SELECT cron.schedule(
--   'schedule-evening-calls',
--   '*/15 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/schedule-evening-calls',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
