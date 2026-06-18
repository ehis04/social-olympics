// UI store — keyboard height, bottom sheet state, active modal.
import { create } from 'zustand';

interface UIState {
  keyboardHeight: number;
  bottomSheetOpen: boolean;
  activeModal: string | null;
  setKeyboardHeight: (height: number) => void;
  setBottomSheetOpen: (open: boolean) => void;
  setActiveModal: (modal: string | null) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  keyboardHeight: 0,
  bottomSheetOpen: false,
  activeModal: null,
  setKeyboardHeight: (height) => set({ keyboardHeight: height }),
  setBottomSheetOpen: (open) => set({ bottomSheetOpen: open }),
  setActiveModal: (modal) => set({ activeModal: modal }),
}));
