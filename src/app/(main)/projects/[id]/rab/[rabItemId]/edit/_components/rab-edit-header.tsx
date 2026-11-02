"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectDetail } from "../../../../project-detail-context";
import type { RabWorkItem } from "../../../types";
import { createRabItemDuplicateInput } from "../../../rab-item-input";
import { createRabItem } from "../action";

export const RabEditHeader = ({ item }: { item: RabWorkItem }) => {
  const { project } = useProjectDetail();
  const router = useRouter();
  const { rabItemId = "01" } = useParams<{ rabItemId?: string }>();
  const duplicateItem = async () => {
    const duplicate = await createRabItem(
      project.id,
      createRabItemDuplicateInput(item, "Salinan "),
    );
    router.push(`/projects/${project.id}/rab/${duplicate.id}/edit`);
  };

  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <Link
          href={`/projects/${project.id}/rab/${rabItemId}`}
          aria-label="Kembali ke detail item RAB"
          className="inline-flex size-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-950"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Edit Item RAB #{rabItemId}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl">
            {item.name}
          </h2>
        </div>
      </div>
      <Button type="button" variant="outline" onClick={duplicateItem}>
        <Copy className="size-4" />
        Duplikat
      </Button>
    </div>
  );
};
