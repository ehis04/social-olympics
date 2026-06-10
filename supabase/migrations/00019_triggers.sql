-- Migration 00019: all platform triggers

-- Trigger function: fires when a result is confirmed; recalculates scores,
-- updates personal bests, and inserts an activity feed row
CREATE OR REPLACE FUNCTION public.handle_result_confirmed()
RETURNS trigger AS $$
DECLARE
  v_competition_id   uuid;
  v_event_name       text;
  v_event_slug       text;
  v_event_result_type text;
  v_event_id         uuid;
BEGIN
  SELECT ce.competition_id, ce.event_id, e.name, e.slug, e.result_type::text
  INTO v_competition_id, v_event_id, v_event_name, v_event_slug, v_event_result_type
  FROM public.competition_events ce
  JOIN public.events e ON ce.event_id = e.id
  WHERE ce.id = NEW.competition_event_id;

  PERFORM public.recalculate_member_score(NEW.profile_id, v_competition_id);

  IF NOT NEW.is_dnf THEN
    PERFORM public.update_personal_best(
      NEW.profile_id,
      v_event_id,
      NEW.result_value_primary,
      NEW.result_value_secondary,
      NEW.competition_event_id,
      v_event_result_type
    );
  END IF;

  INSERT INTO public.activity_feed (
    competition_id,
    event_type,
    actor_profile_id,
    subject_profile_id,
    competition_event_id,
    result_id,
    metadata
  ) VALUES (
    v_competition_id,
    'result_confirmed',
    NEW.confirmed_by,
    NEW.profile_id,
    NEW.competition_event_id,
    NEW.id,
    jsonb_build_object(
      'finishing_place',        NEW.finishing_place,
      'points_awarded',         NEW.points_awarded,
      'event_name',             v_event_name,
      'event_slug',             v_event_slug,
      'result_value_primary',   NEW.result_value_primary,
      'result_value_secondary', NEW.result_value_secondary,
      'result_type',            v_event_result_type,
      'is_dnf',                 NEW.is_dnf
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_result_confirmed
  AFTER UPDATE ON public.results
  FOR EACH ROW
  WHEN (NEW.confirmed_at IS NOT NULL AND OLD.confirmed_at IS NULL)
  EXECUTE FUNCTION public.handle_result_confirmed();

-- Trigger function: increments total_events when a competition_event is added
CREATE OR REPLACE FUNCTION public.handle_competition_event_added()
RETURNS trigger AS $$
BEGIN
  PERFORM public.increment_competition_total_events(NEW.competition_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_competition_event_added
  AFTER INSERT ON public.competition_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_competition_event_added();

-- Trigger function: decrements total_events and recalculates all member scores
-- when a competition_event is removed
CREATE OR REPLACE FUNCTION public.handle_competition_event_removed()
RETURNS trigger AS $$
DECLARE
  v_member record;
BEGIN
  PERFORM public.decrement_competition_total_events(OLD.competition_id);

  FOR v_member IN
    SELECT profile_id FROM public.competition_members
    WHERE competition_id = OLD.competition_id AND status = 'active'
  LOOP
    PERFORM public.recalculate_member_score(v_member.profile_id, OLD.competition_id);
  END LOOP;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_competition_event_removed
  AFTER DELETE ON public.competition_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_competition_event_removed();

-- Trigger function: recalculates all member scores when a weight multiplier changes
CREATE OR REPLACE FUNCTION public.handle_weight_multiplier_changed()
RETURNS trigger AS $$
DECLARE
  v_member record;
BEGIN
  FOR v_member IN
    SELECT profile_id FROM public.competition_members
    WHERE competition_id = NEW.competition_id AND status = 'active'
  LOOP
    PERFORM public.recalculate_member_score(v_member.profile_id, NEW.competition_id);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_competition_event_weight_changed
  AFTER UPDATE ON public.competition_events
  FOR EACH ROW
  WHEN (NEW.weight_multiplier <> OLD.weight_multiplier)
  EXECUTE FUNCTION public.handle_weight_multiplier_changed();

-- Trigger function: sets competition to active when its first event is started
CREATE OR REPLACE FUNCTION public.handle_first_event_started()
RETURNS trigger AS $$
BEGIN
  IF (
    SELECT started_at IS NULL
    FROM public.competitions
    WHERE id = NEW.competition_id
  ) THEN
    UPDATE public.competitions
    SET
      status       = 'active',
      voting_locked = true,
      started_at   = now()
    WHERE id = NEW.competition_id;

    INSERT INTO public.activity_feed (
      competition_id,
      event_type,
      competition_event_id,
      metadata
    ) VALUES (
      NEW.competition_id,
      'event_started',
      NEW.id,
      jsonb_build_object(
        'event_name',           COALESCE(NEW.name_override,
          (SELECT name FROM public.events WHERE id = NEW.event_id)),
        'event_slug',           (SELECT slug FROM public.events WHERE id = NEW.event_id),
        'competition_event_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_first_event_started
  AFTER UPDATE ON public.competition_events
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND OLD.status = 'pending')
  EXECUTE FUNCTION public.handle_first_event_started();