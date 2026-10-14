-- Claiming a guest is atomic: preserve existing results and transfer ownership
-- of competition history before marking the guest profile as claimed.
CREATE OR REPLACE FUNCTION public.claim_guest_history(guest_id uuid, claimant_id uuid)
RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  guest public.profiles;
  membership record;
  best record;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = claimant_id AND is_ghost = false FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claiming profile not found'; END IF;
  SELECT * INTO guest FROM public.profiles WHERE id = guest_id FOR UPDATE;
  IF NOT FOUND OR NOT guest.is_ghost OR guest.claimed_by IS NOT NULL THEN
    RAISE EXCEPTION 'Profile is not a ghost profile';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE claimed_by = claimant_id) THEN
    RAISE EXCEPTION 'You have already claimed a guest profile';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.results a JOIN public.results b USING (competition_event_id)
    WHERE a.profile_id = guest_id AND b.profile_id = claimant_id
  ) OR EXISTS (
    SELECT 1 FROM public.team_members a JOIN public.team_members b USING (team_id)
    WHERE a.profile_id = guest_id AND b.profile_id = claimant_id
  ) THEN
    RAISE EXCEPTION 'Your account already has overlapping results or team assignments';
  END IF;

  UPDATE public.performance_vote_results SET winner_profile_id = claimant_id WHERE winner_profile_id = guest_id;
  UPDATE public.results SET profile_id = claimant_id WHERE profile_id = guest_id;
  UPDATE public.team_members SET profile_id = claimant_id WHERE profile_id = guest_id;
  INSERT INTO public.competition_event_participants(competition_event_id, profile_id, assigned_by, assigned_at)
    SELECT competition_event_id, claimant_id, assigned_by, assigned_at
    FROM public.competition_event_participants WHERE profile_id = guest_id
    ON CONFLICT DO NOTHING;
  DELETE FROM public.competition_event_participants WHERE profile_id = guest_id;

  FOR membership IN SELECT * FROM public.competition_members WHERE profile_id = guest_id LOOP
    IF EXISTS (SELECT 1 FROM public.competition_members
      WHERE competition_id = membership.competition_id AND profile_id = claimant_id) THEN
      DELETE FROM public.competition_members WHERE id = membership.id;
    ELSE
      UPDATE public.competition_members SET profile_id = claimant_id WHERE id = membership.id;
    END IF;
    PERFORM public.recalculate_member_score(claimant_id, membership.competition_id);
  END LOOP;
  FOR best IN SELECT pb.*, e.result_type FROM public.personal_bests pb
    JOIN public.events e ON e.id = pb.event_id WHERE pb.profile_id = guest_id LOOP
    PERFORM public.update_personal_best(claimant_id, best.event_id, best.result_value_primary,
      best.result_value_secondary, best.competition_event_id, best.result_type::text);
  END LOOP;
  DELETE FROM public.personal_bests WHERE profile_id = guest_id;
  UPDATE public.tiebreakers SET profile_id_a = claimant_id WHERE profile_id_a = guest_id;
  UPDATE public.tiebreakers SET profile_id_b = claimant_id WHERE profile_id_b = guest_id;
  PERFORM public.update_career_stats(claimant_id);
  PERFORM public.update_career_stats(guest_id);
  UPDATE public.profiles SET claimed_by = claimant_id, claimed_at = now(), is_ghost = false
    WHERE id = guest_id RETURNING * INTO guest;
  RETURN guest;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_guest_history(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_guest_history(uuid, uuid) TO service_role;
