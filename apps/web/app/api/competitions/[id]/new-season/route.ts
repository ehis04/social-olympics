/*
 * This file handles requests for the new season API route.
 */

// POST /api/competitions/[id]/new-season — start the next season of a finished competition
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createNotifications } from '@/lib/notifications/create-notification';
import { createAdminClient } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Params {
  params: Promise<{ id: string }>;
}

// Handles post. The new season copies the settings, event list, points table and active
// members of the finished competition, and starts in setup so the host can adjust it.
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData } = await adminClient.from('competitions').select('*').eq('id', id).maybeSingle();
  if (!compData) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const previous = compData as CompetitionRow;

  if (previous.host_id !== user.id) {
    return NextResponse.json({ error: 'Only the host can start a new season' }, { status: 403 });
  }
  if (!['complete', 'archived'].includes(previous.status)) {
    return NextResponse.json({ error: 'Finish this competition before starting a new season' }, { status: 409 });
  }

  const { data: existing } = await adminClient
    .from('competitions')
    .select('id')
    .eq('parent_competition_id', id)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: 'A new season has already been started', data: { id: existing.id } },
      { status: 409 },
    );
  }

  const [{ data: events }, { data: members }, { data: pointsConfig }] = await Promise.all([
    adminClient
      .from('competition_events')
      .select('event_id, name_override, weight_tag, weight_multiplier, sequence_order, location, details')
      .eq('competition_id', id)
      .neq('status', 'cancelled')
      .order('sequence_order', { ascending: true }),
    adminClient
      .from('competition_members')
      .select('profile_id, role')
      .eq('competition_id', id)
      .eq('status', 'active'),
    adminClient
      .from('event_points_config')
      .select('finishing_place, points_value')
      .eq('competition_id', id),
  ]);

  const { data: created, error: createError } = await adminClient
    .from('competitions')
    .insert({
      name: previous.name,
      description: previous.description,
      country_code: previous.country_code,
      city: previous.city,
      is_public: previous.is_public,
      host_id: previous.host_id,
      cohost_id: previous.cohost_id,
      min_events_required: previous.min_events_required,
      mvp_voting_enabled: previous.mvp_voting_enabled,
      worst_performer_enabled: previous.worst_performer_enabled,
      prize_pot_per_person: previous.prize_pot_per_person,
      season_number: (previous.season_number ?? 1) + 1,
      parent_competition_id: previous.id,
    })
    .select()
    .single();
  if (createError || !created) {
    return NextResponse.json({ error: 'The new season could not be created' }, { status: 500 });
  }
  const season = created as CompetitionRow;

  // Undo the half-made season if any copy step fails, so the host can simply try again.
  // Events, members and points rows cascade with the competition.
  const rollback = async () => {
    await adminClient.from('competitions').delete().eq('id', season.id);
  };

  const eventRows = (events ?? []).map((event, index) => ({
    competition_id: season.id,
    event_id: event.event_id,
    name_override: event.name_override,
    weight_tag: event.weight_tag,
    weight_multiplier: event.weight_multiplier,
    sequence_order: index + 1,
    location: event.location,
    details: event.details,
  }));
  if (eventRows.length > 0) {
    const { error } = await adminClient.from('competition_events').insert(eventRows);
    if (error) {
      await rollback();
      return NextResponse.json({ error: 'The event list could not be copied' }, { status: 500 });
    }
  }

  const memberRows = (members ?? []).map((member) => ({
    competition_id: season.id,
    profile_id: member.profile_id,
    role: member.role,
    status: 'active' as const,
    joined_at: new Date().toISOString(),
  }));
  if (!memberRows.some((member) => member.profile_id === user.id)) {
    memberRows.push({
      competition_id: season.id,
      profile_id: user.id,
      role: 'competitor',
      status: 'active',
      joined_at: new Date().toISOString(),
    });
  }
  const { error: memberError } = await adminClient.from('competition_members').insert(memberRows);
  if (memberError) {
    await rollback();
    return NextResponse.json({ error: 'The member list could not be copied' }, { status: 500 });
  }

  if ((pointsConfig ?? []).length > 0) {
    await adminClient.from('event_points_config').insert(
      (pointsConfig ?? []).map((row) => ({
        competition_id: season.id,
        finishing_place: row.finishing_place,
        points_value: row.points_value,
      })),
    );
  }

  await createNotifications(
    adminClient,
    memberRows
      .filter((member) => member.profile_id !== user.id)
      .map((member) => ({
        profileId: member.profile_id,
        type: 'new_season',
        title: `Season ${season.season_number} is here`,
        body: `${season.name} is starting a new season and you're already in.`,
        data: { competition_id: season.id, href: `/competitions/${season.id}/events` },
      })),
  );

  return NextResponse.json({ data: season }, { status: 201 });
}
