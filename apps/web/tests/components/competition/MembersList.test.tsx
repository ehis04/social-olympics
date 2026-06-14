// Tests for MembersList component
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MembersList from '@/components/competition/MembersList';
import type { Database } from '@repo/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

type MemberWithProfile = Database['public']['Tables']['competition_members']['Row'] & {
  profile: Database['public']['Tables']['profiles']['Row'] | null;
};

function makeMember(overrides: Partial<MemberWithProfile> = {}): MemberWithProfile {
  return {
    id: 'member-1',
    competition_id: 'comp-1',
    profile_id: 'user-1',
    role: 'competitor',
    status: 'active',
    joined_at: new Date().toISOString(),
    total_points: 0,
    events_completed: 0,
    gold_count: 0,
    silver_count: 0,
    bronze_count: 0,
    final_rank: null,
    profile: {
      id: 'user-1',
      display_name: 'Alice',
      is_ghost: false,
      claimed_by: null,
      claimed_at: null,
      country_code: null,
      city: null,
      bio: null,
      favourite_sport: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    },
    ...overrides,
  } as MemberWithProfile;
}

const defaultProps = {
  competitionId: 'comp-1',
  inviteCode: 'ABCD1234',
  currentMemberId: 'member-1',
  isHost: false,
  isCohost: false,
  competitionStatus: 'open',
};

describe('MembersList', () => {
  it('renders member display names', () => {
    render(<MembersList members={[makeMember()]} {...defaultProps} />);
    expect(screen.getByText('Alice')).toBeDefined();
  });

  it('does not show host controls for non-host user', () => {
    const members = [
      makeMember({ id: 'member-1', profile_id: 'user-1' }),
      makeMember({ id: 'member-2', profile_id: 'user-2', profile: { ...makeMember().profile!, id: 'user-2', display_name: 'Bob' } }),
    ];
    render(<MembersList members={members} {...defaultProps} isHost={false} isCohost={false} />);
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('shows host controls for host user', () => {
    const members = [
      makeMember({ id: 'member-1', profile_id: 'user-1' }),
      makeMember({ id: 'member-2', profile_id: 'user-2', profile: { ...makeMember().profile!, id: 'user-2', display_name: 'Bob' } }),
    ];
    render(<MembersList members={members} {...defaultProps} isHost currentMemberId="member-1" />);
    // Role dropdown should appear for the non-current member
    expect(screen.getByRole('combobox')).toBeDefined();
  });
});
