"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectDetail } from "../../../project-detail-context";
import type { RabWorkItem } from "../../types";
import { createRabItemInput } from "../../rab-item-input";
import { createRabItem } from "../action";
import { useRabAddPageStore } from "../store";

export const RabAddHeader = ({
  item,
  mode = "rab",
}: {
  item?: RabWorkItem;
  mode?: "rab" | "rap";
}) => {
  const { project } = useProjectDetail();
  const router = useRouter();
  const {
    rabAmount,
    detailGroups,
    name,
    rapAmount,
    useDetails,
  } = useRabAddPageStore();
  const duplicateItem = async () => {
    const input = createRabItemInput(
      {
        rabAmount,
        detailGroups,
        name,
        rapAmount,
        useDetails,
      },
      "Salinan ",
    );

    if (!input) return;

    const duplicate = await createRabItem(project.id, input);
    router.push(`/projects/${project.id}/rab/${duplicate.id}/edit`);
  };

  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <Link
          href={`/projects/${project.id}/${mode}`}
          aria-label="Kembali ke RAB"
          className="inline-flex size-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-950"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl">
            Tambah Item Pekerjaan
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Tambahkan item baru untuk {mode.toUpperCase()} proyek{" "}
            {project.code || project.id}.
          </p>
        </div>
      </div>
      <Button type="button" variant="outline" onClick={duplicateItem} disabled={!name.trim()}>
        <Copy className="size-4" />
        {item ? `Duplikat dari ${item.name}` : "Duplikat"}
      </Button>
    </div>
  );
};
