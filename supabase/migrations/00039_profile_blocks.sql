/*
 * This migration lets people block other users and enforces it for messages.
 */

-- A block hides the blocked person's messages and comments from the blocker and
-- stops direct messages in either direction.
CREATE TABLE IF NOT EXISTS public.profile_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_blocks_blocked ON public.profile_blocks (blocked_id);

ALTER TABLE public.profile_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own blocks" ON public.profile_blocks;
CREATE POLICY "Users can see their own blocks"
  ON public.profile_blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can block others" ON public.profile_blocks;
CREATE POLICY "Users can block others"
  ON public.profile_blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can unblock" ON public.profile_blocks;
CREATE POLICY "Users can unblock"
  ON public.profile_blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.profile_blocks TO authenticated;
GRANT ALL PRIVILEGES ON public.profile_blocks TO service_role;

-- True when either person has blocked the other. Security definer so the check can
-- see blocks made by the other person, which RLS hides from the caller.
CREATE OR REPLACE FUNCTION public.is_blocked_between(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profile_blocks
    WHERE (blocker_id = a AND blocked_id = b)
       OR (blocker_id = b AND blocked_id = a)
  );
$$;

REVOKE ALL ON FUNCTION public.is_blocked_between(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) TO authenticated, service_role;

-- Group chat messages require active membership; direct messages are refused when
-- either person has blocked the other.
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
CREATE POLICY "Members can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_profile_id = auth.uid()
    AND (
      (message_type = 'group_chat' AND public.is_competition_member(competition_id))
      OR (
        message_type = 'direct_message'
        AND recipient_profile_id IS NOT NULL
        AND recipient_profile_id <> auth.uid()
        AND NOT public.is_blocked_between(auth.uid(), recipient_profile_id)
      )
    )
  );
