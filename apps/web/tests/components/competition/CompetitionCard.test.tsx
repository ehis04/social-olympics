// Tests for CompetitionCard component
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CompetitionCard from '@/components/competition/CompetitionCard';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

function makeCompetition(overrides: Partial<CompetitionRow> = {}): CompetitionRow {
  return {
    id: 'comp-1',
    name: 'Test Olympics',
    description: null,
    is_public: true,
    status: 'open',
    host_id: 'user-1',
    cohost_id: null,
    min_events_required: 3,
    total_events: 5,
    mvp_voting_enabled: true,
    worst_performer_enabled: true,
    voting_locked: false,
    prize_pot_per_person: null,
    invite_code: 'ABCD1234',
    season_number: null,
    parent_competition_id: null,
    country_code: null,
    city: null,
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    ...overrides,
  } as CompetitionRow;
}

describe('CompetitionCard', () => {
  it('renders the competition name', () => {
    render(<CompetitionCard competition={makeCompetition()} />);
    expect(screen.getByText('Test Olympics')).toBeDefined();
  });

  it('shows the correct status badge', () => {
    render(<CompetitionCard competition={makeCompetition({ status: 'active' })} />);
    expect(screen.getByText('active')).toBeDefined();
  });

  it('link points to the correct competition feed URL', () => {
    render(<CompetitionCard competition={makeCompetition({ id: 'comp-abc' })} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/competitions/comp-abc/feed');
  });

  it('shows member count when provided', () => {
    render(<CompetitionCard competition={makeCompetition()} memberCount={8} />);
    expect(screen.getByText('8 members')).toBeDefined();
  });

  it('shows join button when showJoinButton is true', () => {
    const onJoin = () => {};
    render(<CompetitionCard competition={makeCompetition()} showJoinButton onJoin={onJoin} />);
    expect(screen.getByRole('button', { name: /join/i })).toBeDefined();
  });
});
