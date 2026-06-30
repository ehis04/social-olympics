// Integration tests for event queries against local Supabase.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getCompetitionEvents } from '../../src/queries/events/get-competition-events';
import { getCompetitionEvent } from '../../src/queries/events/get-competition-event';
import { getEventsLibrary } from '../../src/queries/events/get-events-library';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';

const admin = createTestAdminClient();

let hostId: string;
let competitionId: string;
let competitionEventId: string;
let eventId: string;

beforeAll(async () => {
  hostId = await createTestAuthUser(admin, `events-q-host-${Date.now()}`);

  const { data: comp } = await admin
    .from('competitions')
    .insert({ name: `Events Query ${Date.now()}`, host_id: hostId, is_public: false, status: 'setup', min_events_required: 1 })
    .select()
    .single();
  competitionId = (comp as { id: string }).id;

  const { data: ev } = await admin.from('events').select('id').eq('is_active', true).limit(1).single();
  eventId = (ev as { id: string }).id;

  const { data: ce } = await admin
    .from('competition_events')
    .insert({ competition_id: competitionId, event_id: eventId, sequence_order: 1, status: 'pending', weight_multiplier: 1.5 })
    .select()
    .single();
  competitionEventId = (ce as { id: string }).id;
});

afterAll(async () => {
  await admin.from('competition_events').delete().eq('competition_id', competitionId);
  await admin.from('competitions').delete().eq('id', competitionId);
  await deleteTestAuthUser(admin, hostId);
});

describe('getCompetitionEvents', () => {
  it('returns events ordered by sequence_order ascending', async () => {
    const { data: ce2 } = await admin
      .from('competition_events')
      .insert({ competition_id: competitionId, event_id: eventId, sequence_order: 2, status: 'pending' })
      .select()
      .single();

    const result = await getCompetitionEvents(admin, competitionId);
    expect(result.error).toBeNull();
    const events = result.data ?? [];
    expect(events.length).toBeGreaterThanOrEqual(2);

    const orders = events.map((e: unknown) => (e as { sequence_order: number }).sequence_order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));

    await admin.from('competition_events').delete().eq('id', (ce2 as { id: string }).id);
  });

  it('embeds event and category info', async () => {
    const result = await getCompetitionEvents(admin, competitionId);
    const ce = (result.data ?? [])[0] as { events: { name: string; event_categories: { slug: string } } } | undefined;
    expect(ce?.events?.name).toBeTruthy();
    expect(ce?.events?.event_categories?.slug).toBeTruthy();
  });

  it('returns empty array for competition with no events', async () => {
    const { data: emptyComp } = await admin
      .from('competitions')
      .insert({ name: `No Events ${Date.now()}`, host_id: hostId, is_public: false, status: 'setup', min_events_required: 1 })
      .select()
      .single();

    const result = await getCompetitionEvents(admin, (emptyComp as { id: string }).id);
    expect(result.data?.length).toBe(0);

    await admin.from('competitions').delete().eq('id', (emptyComp as { id: string }).id);
  });
});

describe('getCompetitionEvent', () => {
  it('returns the correct event by id with nested event data', async () => {
    const result = await getCompetitionEvent(admin, competitionEventId);
    expect(result.error).toBeNull();
    const ce = result.data as { id: string; events: { id: string } } | null;
    expect(ce?.id).toBe(competitionEventId);
    expect(ce?.events?.id).toBe(eventId);
  });

  it('returns an error for a non-existent event id', async () => {
    const result = await getCompetitionEvent(admin, '00000000-0000-0000-0000-000000000000');
    expect(result.error).not.toBeNull();
  });
});

describe('getEventsLibrary', () => {
  it('returns only active events', async () => {
    const result = await getEventsLibrary(admin);
    expect(result.error).toBeNull();
    const events = result.data ?? [];
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e: unknown) => (e as { is_active: boolean }).is_active)).toBe(true);
  });

  it('filters by category slug when provided', async () => {
    const result = await getEventsLibrary(admin, 'track');
    expect(result.error).toBeNull();
    const events = result.data ?? [];
    expect(events.every((e: unknown) => {
      const cats = (e as { event_categories: { slug: string } }).event_categories;
      return cats?.slug === 'track';
    })).toBe(true);
  });

  it('returns empty array for an unknown category slug', async () => {
    const result = await getEventsLibrary(admin, 'nonexistent-category-xyz');
    expect(result.error).toBeNull();
    expect(result.data?.length).toBe(0);
  });
});
