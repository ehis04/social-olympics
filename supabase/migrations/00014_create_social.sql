-- Migration 00014: messages, activity_feed, reactions, and feed_comments tables

CREATE TABLE public.messages (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id       uuid REFERENCES public.competitions(id) ON DELETE CASCADE,
  sender_profile_id    uuid NOT NULL REFERENCES public.profiles(id),
  recipient_profile_id uuid REFERENCES public.profiles(id),
  message_type         message_type NOT NULL,
  content              text NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  edited_at            timestamptz,
  deleted_at           timestamptz,
  CONSTRAINT message_routing CHECK (
    (message_type = 'group_chat' AND competition_id IS NOT NULL AND recipient_profile_id IS NULL)
    OR
    (message_type = 'direct_message' AND recipient_profile_id IS NOT NULL)
  )
);

/*
  activity_feed metadata shapes by event_type:

  result_confirmed:       { finishing_place, points_awarded, event_name, event_slug,
                            result_value_primary, result_value_secondary, result_type, is_dnf }
  event_started:          { event_name, event_slug, competition_event_id }
  competition_complete:   { final_rank_count, top_3_profile_ids }
  podium_generated:       { first: ProfileSummary, second: ProfileSummary, third: ProfileSummary }
  member_joined:          { member_display_name, member_country_code }
  dispute_raised:         { event_name, result_value_primary }
  mvp_awarded:            { event_name, bonus_points: 1 }
  worst_performer_awarded:{ event_name, penalty_points: -1 }
*/
CREATE TABLE public.activity_feed (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id       uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  event_type           text NOT NULL,
  actor_profile_id     uuid REFERENCES public.profiles(id),
  subject_profile_id   uuid REFERENCES public.profiles(id),
  competition_event_id uuid REFERENCES public.competition_events(id),
  result_id            uuid REFERENCES public.results(id),
  metadata             jsonb,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id),
  target_type reaction_target_type NOT NULL,
  target_id   uuid NOT NULL,
  emoji       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, target_type, target_id, emoji)
);

CREATE TABLE public.feed_comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id uuid NOT NULL REFERENCES public.activity_feed(id) ON DELETE CASCADE,
  profile_id   uuid NOT NULL REFERENCES public.profiles(id),
  content      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);