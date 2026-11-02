"use client";

import { create } from "zustand";

type LetterListStore = {
  pending: boolean;
  setPending: (pending: boolean) => void;
};

export const useLetterListStore = create<LetterListStore>((set) => ({
  pending: false,
  setPending: (pending) => set({ pending }),
}));
