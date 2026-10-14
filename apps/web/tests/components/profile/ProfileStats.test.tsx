import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { PersonalBestsList } from '@/components/profile/PersonalBestsList';
import type { ProfileWithStats } from '@/types/profile';

describe('profile database contracts', () => {
  it('displays career totals from the persisted column names', () => {
    const profile: ProfileWithStats = {
      id: 'athlete', display_name: 'Athlete', avatar_url: null, bio: null,
      city: null, claimed_at: null, claimed_by: null, country_code: null,
      created_at: '', deleted_at: null, favourite_sport: null, is_ghost: false,
      career_stats: {
        profile_id: 'athlete', total_competitions: 4, total_events: 12,
        total_points: 123.5, gold_count: 3, silver_count: 2, bronze_count: 1,
        mvp_count: 0, updated_at: '',
      },
    };
    render(<ProfileHeader profile={profile} isOwnProfile={false} />);
    for (const [label, value] of [['Competitions', '4'], ['Points', '123.5'],
      ['🥇 Gold', '3'], ['Events', '12']]) {
      const pill = screen.getByText(label!).parentElement!;
      expect(within(pill).getByText(value!)).toBeDefined();
    }
  });

  it('formats a stored distance in centimetres as metres', () => {
    render(<PersonalBestsList personalBests={[{
      id: 'best', profile_id: 'athlete', event_id: 'jump', achieved_at: '',
      result_value_primary: 250,
      events: { name: 'Long jump', slug: 'long-jump', result_type: 'distance',
        event_categories: { name: 'Athletics' } },
    }]} />);
    expect(screen.getByText('2.50m')).toBeDefined();
  });
});
