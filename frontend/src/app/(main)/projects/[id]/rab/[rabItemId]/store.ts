import { create } from "zustand";

type RabItemDetailState = {
  showAnalysis: boolean;
  setShowAnalysis: (showAnalysis: boolean) => void;
};

export const useRabItemDetailStore = create<RabItemDetailState>((set) => ({
  showAnalysis: true,
  setShowAnalysis: (showAnalysis) => set({ showAnalysis }),
}));
