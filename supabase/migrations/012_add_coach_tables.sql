-- ============================================
-- Thrive Coach Feature
-- ============================================

-- ============================================
-- COACH CONVERSATIONS
-- ============================================
CREATE TABLE public.coach_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coach conversations"
  ON public.coach_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own coach conversations"
  ON public.coach_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coach conversations"
  ON public.coach_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coach conversations"
  ON public.coach_conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_coach_conversations_user
  ON public.coach_conversations(user_id, updated_at DESC);

CREATE TRIGGER coach_conversations_updated_at
  BEFORE UPDATE ON public.coach_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- COACH MESSAGES
-- ============================================
CREATE TABLE public.coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.coach_conversations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
  ON public.coach_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_conversations
      WHERE id = coach_messages.conversation_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON public.coach_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_conversations
      WHERE id = coach_messages.conversation_id
        AND user_id = auth.uid()
    )
  );

CREATE INDEX idx_coach_messages_conversation
  ON public.coach_messages(conversation_id, created_at ASC);

-- ============================================
-- PUSH TOKENS (for remote push notifications)
-- ============================================
CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own push tokens"
  ON public.push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push tokens"
  ON public.push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens"
  ON public.push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens"
  ON public.push_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_push_tokens_user_token
  ON public.push_tokens(user_id, token);

CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- COACH NUDGES (tracking proactive notifications)
-- ============================================
CREATE TABLE public.coach_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trigger_type text NOT NULL,
  message text NOT NULL,
  conversation_id uuid REFERENCES public.coach_conversations(id) ON DELETE SET NULL,
  sent_at timestamptz DEFAULT now() NOT NULL,
  opened_at timestamptz
);

ALTER TABLE public.coach_nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own nudges"
  ON public.coach_nudges FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_coach_nudges_user
  ON public.coach_nudges(user_id, sent_at DESC);

-- Partial index for the nudge engine to check recent nudges per user
CREATE INDEX idx_coach_nudges_recent
  ON public.coach_nudges(user_id, trigger_type, sent_at DESC);

-- ============================================
-- pg_cron Setup for Coach Nudge (run manually in SQL editor)
-- ============================================
-- Schedule the nudge engine to run 4x/day (8am, 12pm, 4pm, 8pm UTC).
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY:
--
-- SELECT cron.schedule(
--   'coach-nudge',
--   '0 8,12,16,20 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/coach-nudge',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
