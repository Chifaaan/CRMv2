import { create } from "zustand";

/**
 * Phase 1 shell UI state: sidebar + optional global modal key for shared overlays.
 */
type UiState = {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;
  /** Single active shell modal id (e.g. `confirm-delete`); null = none */
  modalKey: string | null;
  modalPayload: unknown;
  openModal: (key: string, payload?: unknown) => void;
  closeModal: () => void;
};

export const useUiStore = create<UiState>((set, get) => ({
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  modalKey: null,
  modalPayload: undefined,
  openModal: (modalKey, modalPayload) => set({ modalKey, modalPayload }),
  closeModal: () => set({ modalKey: null, modalPayload: undefined }),
}));
