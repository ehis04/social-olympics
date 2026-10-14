/*
 * This migration marks profiles whose owners deleted their account.
 */

-- Deleted accounts keep an anonymised profile row so past results and standings stay
-- intact for everyone else. deleted_at lets the app hide them from search and social actions.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
