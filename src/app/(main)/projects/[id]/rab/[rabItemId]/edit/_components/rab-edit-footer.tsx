"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useProjectDetail } from "../../../../project-detail-context";
import type { RabWorkItem } from "../../../types";
import {
  createRabDetail,
  createRabGroup,
  deleteRabDetail,
  deleteRabGroup,
  updateRabDetail,
  updateRabGroup,
  updateRabItem,
} from "../action";
import { useRabEditStore } from "../store";

const isLocalId = (id: string) => id.startsWith("group-") || id.startsWith("item-");

export const RabEditFooter = ({ item }: { item: RabWorkItem }) => {
  const { project } = useProjectDetail();
  const { rabItemId = "01" } = useParams<{ rabItemId?: string }>();
  const {
    rabAmount,
    detailGroups,
    name,
    rapAmount,
    useDetails,
  } = useRabEditStore();
  const saveChanges = async () => {
    if (!name.trim()) return;
    await updateRabItem(project.id, item.id, {
      name: name.trim(),
      rapAmount,
      rabAmount,
      useDetails,
    });

    const savedGroupIds = new Set(detailGroups.map((group) => group.id));
    await Promise.all(
      item.groups
        .filter((group) => !savedGroupIds.has(group.id))
        .map((group) => deleteRabGroup(project.id, item.id, group.id)),
    );

    for (const [groupIndex, group] of detailGroups.entries()) {
      if (!group.name.trim()) continue;
      const savedGroup = isLocalId(group.id)
        ? await createRabGroup(project.id, item.id, {
            name: group.name.trim(),
            sortOrder: groupIndex,
          })
        : await updateRabGroup(project.id, item.id, group.id, {
            name: group.name.trim(),
            sortOrder: groupIndex,
          });
      const groupId = (savedGroup as { id: string }).id;
      const previousGroup = item.groups.find((row) => row.id === group.id);
      const savedDetailIds = new Set(group.items.map((detail) => detail.id));

      await Promise.all(
        (previousGroup?.details ?? [])
          .filter((detail) => !savedDetailIds.has(detail.id))
          .map((detail) =>
            deleteRabDetail(project.id, item.id, previousGroup?.id ?? groupId, detail.id),
          ),
      );

      await Promise.all(
        group.items
          .filter((detail) => detail.name.trim())
          .map((detail, detailIndex) => {
            const input = {
              name: detail.name.trim(),
              volume: detail.volume,
              unit: detail.unit,
              rabUnitPrice: detail.rabUnitPrice,
              rabTotalPrice: detail.rabTotalPrice,
              sortOrder: detailIndex,
            };
            return isLocalId(detail.id)
              ? createRabDetail(project.id, item.id, groupId, input)
              : updateRabDetail(project.id, item.id, groupId, detail.id, input);
          }),
      );
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="size-2 rounded-full bg-blue-600" />
          Perubahan disimpan ke RAB proyek
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/projects/${project.id}/rab/${rabItemId}`}
            className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
          >
            Batal
          </Link>
          <Button type="button" variant="outline" onClick={saveChanges}>
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </div>
  );
};
