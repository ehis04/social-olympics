import { create } from 'zustand';

interface CompetitionState {
  activeCompetitionId: string | null;
  setActiveCompetitionId: (id: string | null) => void;
}

export const useCompetitionStore = create<CompetitionState>((set) => ({
  activeCompetitionId: null,
  setActiveCompetitionId: (id) => set({ activeCompetitionId: id }),
}));
