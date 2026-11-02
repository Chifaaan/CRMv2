import { create } from "zustand";

type RabPageState = {
  importFile: File | null;
  importOpen: boolean;
  search: string;
  setImportFile: (importFile: File | null) => void;
  setImportOpen: (importOpen: boolean) => void;
  setSearch: (search: string) => void;
};

export const useRabPageStore = create<RabPageState>((set) => ({
  importFile: null,
  importOpen: false,
  search: "",
  setImportFile: (importFile) => set({ importFile }),
  setImportOpen: (importOpen) => set({ importOpen }),
  setSearch: (search) => set({ search }),
}));
