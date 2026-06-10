-- Migration 00018: core database functions

-- Recalculates total_points and medal counts for one member in one competition
CREATE OR REPLACE FUNCTION public.recalculate_member_score(
  p_profile_id    uuid,
  p_competition_id uuid
)
RETURNS void AS $$
DECLARE
  v_min_events   integer;
  v_total_points numeric := 0;
  v_events_done  integer := 0;
  v_gold         integer := 0;
  v_silver       integer := 0;
  v_bronze       integer := 0;
  v_row          record;
  v_counter      integer := 0;
BEGIN
  SELECT min_events_required INTO v_min_events
  FROM public.competitions
  WHERE id = p_competition_id;

  -- Collect all confirmed results with weighted points, sorted best first
  FOR v_row IN
    SELECT
      (COALESCE(r.points_awarded, 0) + COALESCE(r.participation_points, 0))
        * ce.weight_multiplier
        + COALESCE(pvr_mvp.bonus_points, 0)
        + COALESCE(pvr_wp.bonus_points, 0) AS event_points,
      r.finishing_place,
      r.is_dnf
    FROM public.results r
    JOIN public.competition_events ce ON r.competition_event_id = ce.id
    LEFT JOIN public.performance_vote_results pvr_mvp
      ON pvr_mvp.competition_event_id = ce.id
      AND pvr_mvp.winner_profile_id = r.profile_id
      AND pvr_mvp.vote_type = 'mvp'
    LEFT JOIN public.performance_vote_results pvr_wp
      ON pvr_wp.competition_event_id = ce.id
      AND pvr_wp.winner_profile_id = r.profile_id
      AND pvr_wp.vote_type = 'worst_performer'
    WHERE r.profile_id = p_profile_id
      AND ce.competition_id = p_competition_id
      AND r.confirmed_at IS NOT NULL
    ORDER BY event_points DESC
  LOOP
    v_events_done := v_events_done + 1;

    IF NOT v_row.is_dnf THEN
      IF v_row.finishing_place = 1 THEN v_gold   := v_gold   + 1; END IF;
      IF v_row.finishing_place = 2 THEN v_silver := v_silver + 1; END IF;
      IF v_row.finishing_place = 3 THEN v_bronze := v_bronze + 1; END IF;
    END IF;

    -- Apply best-of-N: only sum the top N results
    IF v_counter < v_min_events THEN
      v_total_points := v_total_points + v_row.event_points;
      v_counter := v_counter + 1;
    END IF;
  END LOOP;

  UPDATE public.competition_members
  SET
    total_points     = v_total_points,
    events_completed = v_events_done,
    gold_count       = v_gold,
    silver_count     = v_silver,
    bronze_count     = v_bronze
  WHERE competition_id = p_competition_id
    AND profile_id = p_profile_id;

  PERFORM public.update_career_stats(p_profile_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aggregates lifetime stats for a profile from all competitions
CREATE OR REPLACE FUNCTION public.update_career_stats(p_profile_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.career_stats
  SET
    total_points       = (
      SELECT COALESCE(SUM(total_points), 0)
      FROM public.competition_members
      WHERE profile_id = p_profile_id AND status = 'active'
    ),
    gold_count         = (
      SELECT COALESCE(SUM(gold_count), 0)
      FROM public.competition_members
      WHERE profile_id = p_profile_id AND status = 'active'
    ),
    silver_count       = (
      SELECT COALESCE(SUM(silver_count), 0)
      FROM public.competition_members
      WHERE profile_id = p_profile_id AND status = 'active'
    ),
    bronze_count       = (
      SELECT COALESCE(SUM(bronze_count), 0)
      FROM public.competition_members
      WHERE profile_id = p_profile_id AND status = 'active'
    ),
    total_events       = (
      SELECT COALESCE(SUM(events_completed), 0)
      FROM public.competition_members
      WHERE profile_id = p_profile_id AND status = 'active'
    ),
    total_competitions = (
      SELECT COUNT(DISTINCT competition_id)
      FROM public.competition_members
      WHERE profile_id = p_profile_id AND status = 'active'
    ),
    mvp_count          = (
      SELECT COUNT(*)
      FROM public.performance_vote_results pvr
      JOIN public.competition_events ce ON pvr.competition_event_id = ce.id
      JOIN public.competition_members cm ON cm.competition_id = ce.competition_id
        AND cm.profile_id = p_profile_id
      WHERE pvr.winner_profile_id = p_profile_id
        AND pvr.vote_type = 'mvp'
    ),
    updated_at         = now()
  WHERE profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updates or inserts a personal best if the new result is better
CREATE OR REPLACE FUNCTION public.update_personal_best(
  p_profile_id             uuid,
  p_event_id               uuid,
  p_result_value_primary   numeric,
  p_result_value_secondary numeric,
  p_competition_event_id   uuid,
  p_result_type            text
)
RETURNS void AS $$
DECLARE
  v_existing record;
  v_is_better boolean := false;
BEGIN
  SELECT * INTO v_existing
  FROM public.personal_bests
  WHERE profile_id = p_profile_id AND event_id = p_event_id;

  IF NOT FOUND THEN
    INSERT INTO public.personal_bests (
      profile_id, event_id, result_value_primary,
      result_value_secondary, achieved_at, competition_event_id
    ) VALUES (
      p_profile_id, p_event_id, p_result_value_primary,
      p_result_value_secondary, now(), p_competition_event_id
    );
    RETURN;
  END IF;

  -- Lower is better for time and inverted_score; higher is better otherwise
  IF p_result_type IN ('time', 'inverted_score') THEN
    v_is_better := p_result_value_primary < v_existing.result_value_primary;
  ELSE
    v_is_better := p_result_value_primary > v_existing.result_value_primary;
  END IF;

  IF v_is_better THEN
    UPDATE public.personal_bests
    SET
      result_value_primary   = p_result_value_primary,
      result_value_secondary = p_result_value_secondary,
      achieved_at            = now(),
      competition_event_id   = p_competition_event_id
    WHERE profile_id = p_profile_id AND event_id = p_event_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increments competitions.total_events by 1
CREATE OR REPLACE FUNCTION public.increment_competition_total_events(p_competition_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.competitions
  SET total_events = total_events + 1
  WHERE id = p_competition_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrements competitions.total_events by 1, minimum 0
CREATE OR REPLACE FUNCTION public.decrement_competition_total_events(p_competition_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.competitions
  SET total_events = GREATEST(total_events - 1, 0)
  WHERE id = p_competition_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;