import { describe, it, expect } from 'vitest';
import {
  isCompetitionActive,
  isCompetitionEditable,
  canHostEdit,
  getCompetitionStatusLabel,
} from '@/utils/helpers/competition';
import type { Database } from '@repo/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

const mockProfile = (id: string) => ({ id } as ProfileRow);
const mockCompetition = (hostId: string, cohostId?: string | null) =>
  ({ host_id: hostId, cohost_id: cohostId ?? null } as CompetitionRow);

describe('isCompetitionActive', () => {
  it('returns true for active status', () => {
    expect(isCompetitionActive('active')).toBe(true);
  });

  it('returns false for setup status', () => {
    expect(isCompetitionActive('setup')).toBe(false);
  });

  it('returns false for complete status', () => {
    expect(isCompetitionActive('complete')).toBe(false);
  });
});

describe('isCompetitionEditable', () => {
  it('returns true for setup', () => {
    expect(isCompetitionEditable('setup')).toBe(true);
  });

  it('returns true for open', () => {
    expect(isCompetitionEditable('open')).toBe(true);
  });

  it('returns false for active', () => {
    expect(isCompetitionEditable('active')).toBe(false);
  });
});

describe('canHostEdit', () => {
  it('returns true when profile is host', () => {
    expect(canHostEdit(mockProfile('host-1'), mockCompetition('host-1'))).toBe(true);
  });

  it('returns true when profile is cohost', () => {
    expect(canHostEdit(mockProfile('cohost-1'), mockCompetition('host-1', 'cohost-1'))).toBe(true);
  });

  it('returns false for non-host member', () => {
    expect(canHostEdit(mockProfile('other-id'), mockCompetition('host-1'))).toBe(false);
  });
});

describe('getCompetitionStatusLabel', () => {
  it('returns human-readable label for setup', () => {
    expect(getCompetitionStatusLabel('setup')).toBe('Setting up');
  });

  it('returns human-readable label for active', () => {
    expect(getCompetitionStatusLabel('active')).toBe('Active');
  });

  it('falls back to raw status for unknown value', () => {
    expect(getCompetitionStatusLabel('unknown')).toBe('unknown');
  });
});
