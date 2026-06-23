-- Migration 00025: profile follow relationships

CREATE TABLE public.profile_follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT profile_follows_no_self_follow CHECK (follower_id <> following_id)
);

ALTER TABLE public.profile_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view follows"
  ON public.profile_follows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can follow profiles"
  ON public.profile_follows FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can unfollow profiles"
  ON public.profile_follows FOR DELETE
  TO authenticated
  USING (follower_id = auth.uid());
