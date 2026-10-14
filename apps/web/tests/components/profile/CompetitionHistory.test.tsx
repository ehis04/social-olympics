import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompetitionHistory } from '@/components/profile/CompetitionHistory';
import type { CompetitionHistoryEntry } from '@repo/supabase';

describe('competition history navigation', () => {
  it('takes finished history to its podium and active history to events', () => {
    const base = { competition_id: 'active', total_points: 42.6, events_completed: 4,
      final_rank: null, gold_count: 2, silver_count: 1, bronze_count: 0 };
    const history: CompetitionHistoryEntry[] = [
      { ...base, competitions: { id: 'active', name: 'Current season', status: 'active', total_events: 8, completed_at: null } },
      { ...base, competition_id: 'past', final_rank: 2, events_completed: 8,
        competitions: { id: 'past', name: 'Previous season', status: 'archived', total_events: 8, completed_at: '2026-09-01' } },
    ];
    render(<CompetitionHistory history={history} />);
    expect(screen.getByRole('link', { name: /Current season/ }).getAttribute('href')).toBe('/competitions/active/events');
    expect(screen.getByRole('link', { name: /Previous season/ }).getAttribute('href')).toBe('/competitions/past/podium');
    expect(screen.getByText(/Final place #2/)).toBeDefined();
  });
});
