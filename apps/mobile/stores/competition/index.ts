// Active competition store — tracks the currently viewed competition.
import { create } from 'zustand';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface CompetitionState {
  activeCompetition: CompetitionRow | null;
  setActiveCompetition: (competition: CompetitionRow | null) => void;
  clearActiveCompetition: () => void;
}

export const useCompetitionStore = create<CompetitionState>()((set) => ({
  activeCompetition: null,
  setActiveCompetition: (competition) => set({ activeCompetition: competition }),
  clearActiveCompetition: () => set({ activeCompetition: null }),
}));
