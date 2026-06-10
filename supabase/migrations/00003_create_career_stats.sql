-- Migration 00003: career_stats table and auto-create trigger

CREATE TABLE public.career_stats (
  profile_id         uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_events       integer NOT NULL DEFAULT 0,
  total_competitions integer NOT NULL DEFAULT 0,
  gold_count         integer NOT NULL DEFAULT 0,
  silver_count       integer NOT NULL DEFAULT 0,
  bronze_count       integer NOT NULL DEFAULT 0,
  total_points       numeric NOT NULL DEFAULT 0,
  mvp_count          integer NOT NULL DEFAULT 0,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Auto-creates a career_stats row when a new profile is inserted
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.career_stats (profile_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();