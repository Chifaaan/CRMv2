"use client";

import { create } from "zustand";

type LetterDetailStore = {
  reviewNote: string;
  setReviewNote: (reviewNote: string) => void;
};

export const useLetterDetailStore = create<LetterDetailStore>((set) => ({
  reviewNote: "",
  setReviewNote: (reviewNote) => set({ reviewNote }),
}));
