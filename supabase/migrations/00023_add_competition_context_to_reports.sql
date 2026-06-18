-- Migration 00023: add competition context to moderation reports

ALTER TYPE report_target_type ADD VALUE IF NOT EXISTS 'feed_item';

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS competition_id uuid REFERENCES public.competitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolution_action text;

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reason_length,
  ADD CONSTRAINT reason_length CHECK (char_length(reason) >= 5);

CREATE INDEX IF NOT EXISTS idx_reports_competition_id
  ON public.reports(competition_id);
