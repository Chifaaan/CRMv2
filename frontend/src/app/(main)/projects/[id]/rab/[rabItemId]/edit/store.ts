import { create } from "zustand";
import {
  type RabAddDetailGroup,
  type RabAddDetailItem,
} from "../../add/_components/rab-add-data";
import type { RabWorkItem } from "../../types";

type RabDetailItemField = Exclude<keyof RabAddDetailItem, "id">;

type RabEditState = {
  addDetailGroup: () => void;
  addDetailItem: (groupId: string) => void;
  rabAmount: string;
  detailGroups: RabAddDetailGroup[];
  name: string;
  rapAmount: string;
  removeDetailGroup: (groupId: string) => void;
  removeDetailItem: (groupId: string, itemId: string) => void;
  seedItem: (item: RabWorkItem) => void;
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

export const useRabEditStore = create<RabEditState>((set) => ({
  addDetailGroup: () =>
    set((state) => ({
      detailGroups: [
        ...state.detailGroups,
        {
          id: createDetailId("group"),
          items: [],
          name: "",
        },
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
  detailGroups: [],
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
  seedItem: (item) =>
    set({
      rabAmount: String(item.rabAmount ?? ""),
      detailGroups: item.groups.map((group) => ({
        id: group.id,
        name: group.name,
        items: group.details.map((detail) => ({
          id: detail.id,
          name: detail.name,
          volume: String(detail.volume ?? ""),
          unit: detail.unit ?? "",
          rabUnitPrice: String(detail.rabUnitPrice ?? ""),
          rabTotalPrice: String(detail.rabTotalPrice ?? ""),
          rapUnitPrice: "",
          rapTotalPrice: "",
        })),
      })),
      name: item.name,
      rapAmount: String(item.rapAmount ?? ""),
      useDetails: item.useDetails,
    }),
  setConvertedAmount: (rabAmount) => set({ rabAmount }),
  setName: (name) => set({ name }),
  setRapAmount: (rapAmount) => set({ rapAmount }),
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
