// Integration tests for competition event mutations against local Supabase.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { addCompetitionEvent } from '../../src/mutations/events/add-competition-event';
import { removeCompetitionEvent } from '../../src/mutations/events/remove-competition-event';
import { startEvent } from '../../src/mutations/events/start-event';
import { updateCompetitionEvent } from '../../src/mutations/events/update-competition-event';
import { reorderEvents } from '../../src/mutations/events/reorder-events';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';

const admin = createTestAdminClient();

let hostId: string;
let competitionId: string;
let eventId: string;
let competitionEventId: string;
let secondEventId: string;

beforeAll(async () => {
  hostId = await createTestAuthUser(admin, `events-host-${Date.now()}`);

  const { data: comp } = await admin
    .from('competitions')
    .insert({ name: `Events Test ${Date.now()}`, host_id: hostId, is_public: false, status: 'setup', min_events_required: 1 })
    .select()
    .single();
  competitionId = (comp as { id: string }).id;

  const { data: ev } = await admin.from('events').select('id').limit(1).single();
  eventId = (ev as { id: string }).id;
});

afterAll(async () => {
  await admin.from('competition_events').delete().eq('competition_id', competitionId);
  await admin.from('competitions').delete().eq('id', competitionId);
  await deleteTestAuthUser(admin, hostId);
});

describe('addCompetitionEvent', () => {
  it('adds an event and triggers total_events increment', async () => {
    const result = await addCompetitionEvent(admin, {
      competition_id: competitionId,
      event_id: eventId,
      sequence_order: 1,
      status: 'pending',
      weight_tag: 'standard',
      weight_multiplier: 1.0,
    });

    expect(result.error).toBeNull();
    const ce = result.data as { id: string; status: string };
    expect(ce.status).toBe('pending');
    competitionEventId = ce.id;

    await new Promise((r) => setTimeout(r, 300));
    const { data: comp } = await admin.from('competitions').select('total_events').eq('id', competitionId).single();
    expect((comp as { total_events: number } | null)?.total_events).toBe(1);
  });

  it('sets the weight_multiplier correctly', async () => {
    const result = await addCompetitionEvent(admin, {
      competition_id: competitionId,
      event_id: eventId,
      sequence_order: 2,
      status: 'pending',
      weight_tag: 'very_important',
      weight_multiplier: 2.0,
    });

    expect(result.error).toBeNull();
    expect((result.data as { weight_multiplier: number } | null)?.weight_multiplier).toBe(2.0);
    secondEventId = (result.data as { id: string }).id;
  });

  it('rejects weight_multiplier outside 0.1–3.0 range', async () => {
    const result = await addCompetitionEvent(admin, {
      competition_id: competitionId,
      event_id: eventId,
      sequence_order: 3,
      status: 'pending',
      weight_multiplier: 5.0,
    });

    expect(result.error).not.toBeNull();
  });
});

describe('updateCompetitionEvent', () => {
  it('updates the name_override and weight_tag', async () => {
    const result = await updateCompetitionEvent(admin, competitionEventId, {
      name_override: 'Sprint Final',
      weight_tag: 'important',
    });

    expect(result.error).toBeNull();
    expect((result.data as { name_override: string } | null)?.name_override).toBe('Sprint Final');
  });
});

describe('reorderEvents', () => {
  it('assigns new sequence_order positions based on array order', async () => {
    // Pass [secondEventId, competitionEventId] → second gets order=1, first gets order=2
    const result = await reorderEvents(admin, [secondEventId, competitionEventId]);
    expect(result.error).toBeNull();

    const { data: ce1 } = await admin
      .from('competition_events')
      .select('sequence_order')
      .eq('id', secondEventId)
      .single();

    expect((ce1 as { sequence_order: number } | null)?.sequence_order).toBe(1);

    const { data: ce2 } = await admin
      .from('competition_events')
      .select('sequence_order')
      .eq('id', competitionEventId)
      .single();

    expect((ce2 as { sequence_order: number } | null)?.sequence_order).toBe(2);
  });
});

describe('startEvent', () => {
  it('sets status to active and records started_at', async () => {
    const result = await startEvent(admin, competitionEventId);
    expect(result.error).toBeNull();
    expect((result.data as { status: string } | null)?.status).toBe('active');
    expect((result.data as { started_at: string | null } | null)?.started_at).not.toBeNull();
  });

  it('does not start an already-active event (status guard)', async () => {
    const result = await startEvent(admin, competitionEventId);
    expect(result.error).not.toBeNull();
  });
});

describe('removeCompetitionEvent', () => {
  it('removes an event and decrements total_events', async () => {
    const beforeCount = await admin
      .from('competitions')
      .select('total_events')
      .eq('id', competitionId)
      .single()
      .then((r) => (r.data as { total_events: number } | null)?.total_events ?? 0);

    await removeCompetitionEvent(admin, secondEventId);

    await new Promise((r) => setTimeout(r, 300));
    const { data: comp } = await admin.from('competitions').select('total_events').eq('id', competitionId).single();
    expect((comp as { total_events: number } | null)?.total_events).toBe(beforeCount - 1);
  });
});
