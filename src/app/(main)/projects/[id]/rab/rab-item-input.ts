import type { RabItemMutationInput, RabWorkItem } from "./types";
import type { RabAddDetailGroup } from "./add/_components/rab-add-data";

type RabItemSubmitInput = {
  rabAmount: string;
  detailGroups: RabAddDetailGroup[];
  name: string;
  rapAmount: string;
  useDetails: boolean;
  rapOnly?: boolean;
};

export const createRabItemInput = (
  input: RabItemSubmitInput,
  namePrefix = "",
): RabItemMutationInput | null => {
  const name = input.name.trim();

  if (!name) return null;

  return {
    name: `${namePrefix}${name}`,
    rapAmount: input.rapAmount,
    rabAmount: input.rabAmount,
    useDetails: input.useDetails,
    rapUseDetails: input.useDetails,
    rapOnly: input.rapOnly ?? false,
    groups: input.useDetails
      ? input.detailGroups
          .filter((group) => group.name.trim())
          .map((group, groupIndex) => ({
            name: group.name.trim(),
            sortOrder: groupIndex,
            details: group.items
              .filter((item) => item.name.trim())
              .map((item, itemIndex) => ({
                name: item.name.trim(),
                volume: item.volume,
                unit: item.unit,
                rabUnitPrice: item.rabUnitPrice,
                rabTotalPrice: item.rabTotalPrice,
                rapUnitPrice: item.rapUnitPrice,
                rapTotalPrice: item.rapTotalPrice,
                sortOrder: itemIndex,
              })),
          }))
      : [],
  };
};

export const createRabItemDuplicateInput = (
  item: RabWorkItem,
  namePrefix = "",
): RabItemMutationInput => ({
  name: `${namePrefix}${item.name.trim()}`,
  rapAmount: item.rapAmount,
  rabAmount: item.rabAmount,
  useDetails: item.useDetails,
  groups: item.useDetails
    ? item.groups
        .filter((group) => group.name.trim())
        .map((group, groupIndex) => ({
          name: group.name.trim(),
          sortOrder: groupIndex,
          details: group.details
            .filter((detail) => detail.name.trim())
            .map((detail, detailIndex) => ({
              name: detail.name.trim(),
              volume: detail.volume,
              unit: detail.unit,
              rabUnitPrice: detail.rabUnitPrice,
              rabTotalPrice: detail.rabTotalPrice,
              sortOrder: detailIndex,
            })),
        }))
    : [],
});
