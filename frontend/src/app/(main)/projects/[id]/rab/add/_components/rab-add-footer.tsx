"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useProjectDetail } from "../../../project-detail-context";
import { createRabItemInput } from "../../rab-item-input";
import { createRabItem } from "../action";
import { useRabAddPageStore } from "../store";

export const RabAddFooter = ({
  mode = "rab",
}: {
  mode?: "rab" | "rap";
}) => {
  const { project } = useProjectDetail();
  const router = useRouter();
  const {
    rabAmount,
    detailGroups,
    name,
    rapAmount,
    rapOnly,
    useDetails,
  } = useRabAddPageStore();
  const saveItem = async () => {
    const input = createRabItemInput({
      rabAmount,
      detailGroups,
      name,
      rapAmount,
      useDetails,
      rapOnly: mode === "rap" ? rapOnly : false,
    });

    if (!input) return;

    await createRabItem(project.id, input);
    router.push(`/projects/${project.id}/${mode}`);
  };

  return (
    <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="size-2 rounded-full bg-blue-600" />
          Tersimpan otomatis pada 14:32
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/projects/${project.id}/rab`}
            className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
          >
            Batal
          </Link>
          <Button type="button" onClick={saveItem} disabled={!name.trim()}>
            Simpan Item
          </Button>
        </div>
      </div>
    </div>
  );
};
