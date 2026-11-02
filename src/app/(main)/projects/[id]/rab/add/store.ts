import { create } from "zustand";
import {
  type RabAddDetailGroup,
  type RabAddDetailItem,
} from "./_components/rab-add-data";
import type { RabWorkItem } from "../types";

type RabDetailItemField = Exclude<keyof RabAddDetailItem, "id">;

type RabAddPageState = {
  addDetailGroup: () => void;
  addDetailItem: (groupId: string) => void;
  rabAmount: string;
  detailGroups: RabAddDetailGroup[];
  name: string;
  rapAmount: string;
  removeDetailGroup: (groupId: string) => void;
  removeDetailItem: (groupId: string, itemId: string) => void;
  resetItem: () => void;
  seedItem: (item: RabWorkItem) => void;
  rapOnly: boolean;
  setRapOnly: (rapOnly: boolean) => void;
  setConvertedAmount: (rabAmount: string) => void;
  setName: (name: string) => void;
  setRapAmount: (rapAmount: string) => void;
  setUseDetails: (useDetails: boolean) => void;
  useDetails: boolean;
  updateDetailGroupName: (groupId: string, name: string) => void;
  updateDetailItem: (
    groupId: string,
    itemId: string,
    field: RabDetailItemField,
    value: string,
  ) => void;
};

const createEmptyDetailItem = (id: string): RabAddDetailItem => ({
  id,
  name: "",
  volume: "",
  unit: "meter",
  rabUnitPrice: "",
  rabTotalPrice: "",
  rapUnitPrice: "",
  rapTotalPrice: "",
});

const createDetailId = (prefix: string) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;

const createEmptyDetailGroup = (): RabAddDetailGroup => ({
  id: createDetailId("group"),
  items: [],
  name: "",
});

export const useRabAddPageStore = create<RabAddPageState>((set) => ({
  addDetailGroup: () =>
    set((state) => ({
      detailGroups: [
        ...state.detailGroups,
        createEmptyDetailGroup(),
      ],
    })),
  addDetailItem: (groupId) =>
    set((state) => ({
      detailGroups: state.detailGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              items: [
                ...group.items,
                createEmptyDetailItem(createDetailId("item")),
              ],
            }
          : group,
      ),
    })),
  rabAmount: "",
  detailGroups: [createEmptyDetailGroup()],
  name: "",
  rapAmount: "",
  removeDetailGroup: (groupId) =>
    set((state) => ({
      detailGroups: state.detailGroups.filter((group) => group.id !== groupId),
    })),
  removeDetailItem: (groupId, itemId) =>
    set((state) => ({
      detailGroups: state.detailGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              items: group.items.filter((item) => item.id !== itemId),
            }
          : group,
      ),
    })),
  resetItem: () =>
    set({
      rabAmount: "",
      detailGroups: [createEmptyDetailGroup()],
      name: "",
      rapAmount: "",
      useDetails: true,
    }),
  seedItem: (item) =>
    set({
      rabAmount: String(item.rabAmount ?? ""),
      detailGroups: item.groups.map((group) => ({
        id: createDetailId("group"),
        name: group.name,
        items: group.details.map((detail) => ({
          id: createDetailId("item"),
          name: detail.name,
          volume: String(detail.volume ?? ""),
          unit: detail.unit ?? "",
          rabUnitPrice: String(detail.rabUnitPrice ?? ""),
          rapUnitPrice: String(detail.rapUnitPrice ?? ""),
          rapTotalPrice: String(detail.rapTotalPrice ?? ""),
          rabTotalPrice: String(detail.rabTotalPrice ?? ""),
        })),
      })),
      name: item.name,
      rapAmount: String(item.rapAmount ?? ""),
      useDetails: item.useDetails,
    }),
  setConvertedAmount: (rabAmount) => set({ rabAmount }),
  setName: (name) => set({ name }),
  setRapAmount: (rapAmount) => set({ rapAmount }),
  rapOnly: false,
  setRapOnly: (rapOnly) => set({ rapOnly }),
  setUseDetails: (useDetails) => set({ useDetails }),
  useDetails: true,
  updateDetailGroupName: (groupId, name) =>
    set((state) => ({
      detailGroups: state.detailGroups.map((group) =>
        group.id === groupId ? { ...group, name } : group,
      ),
    })),
  updateDetailItem: (groupId, itemId, field, value) =>
    set((state) => ({
      detailGroups: state.detailGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              items: group.items.map((item) =>
                item.id === itemId ? { ...item, [field]: value } : item,
              ),
            }
          : group,
      ),
    })),
}));
