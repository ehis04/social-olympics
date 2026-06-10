-- Migration 00015: reports, notifications, and push_tokens tables

CREATE TABLE public.reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  target_type         report_target_type NOT NULL,
  target_id           uuid NOT NULL,
  reason              text NOT NULL,
  status              report_status NOT NULL DEFAULT 'pending',
  reviewed_by         uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz,
  CONSTRAINT reason_length CHECK (char_length(reason) >= 20)
);

CREATE TABLE public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       text NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL,
  data       jsonb,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.push_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token        text NOT NULL,
  platform     platform_type NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  UNIQUE (profile_id, token)
);