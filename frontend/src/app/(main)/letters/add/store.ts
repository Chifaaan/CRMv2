"use client";

import { create } from "zustand";

type AddLetterStore = {
  draftId: string | null;
  setDraftId: (draftId: string | null) => void;
};

export const useAddLetterStore = create<AddLetterStore>((set) => ({
  draftId: null,
  setDraftId: (draftId) => set({ draftId }),
}));
