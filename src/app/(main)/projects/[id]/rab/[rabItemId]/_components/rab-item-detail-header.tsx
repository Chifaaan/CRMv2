"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectDetail } from "../../../project-detail-context";
import type { RabWorkItem } from "../../types";
import { useRabItemDetailStore } from "../store";

export const RabItemDetailHeader = ({ item }: { item: RabWorkItem }) => {
  const { project } = useProjectDetail();
  const { rabItemId = "01" } = useParams<{ rabItemId?: string }>();
  const { setShowAnalysis, showAnalysis } = useRabItemDetailStore();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <Link
          href={`/projects/${project.id}/rab`}
          aria-label="Kembali ke RAB"
          className="inline-flex size-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-950"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Detail Item RAB
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl">
            {item.name}
          </h2>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAnalysis(!showAnalysis)}
        >
          <TrendingUp className="size-4" />
          Analisis
        </Button>
        <Link
          href={`/projects/${project.id}/rab/${rabItemId}/edit`}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          <Pencil className="size-4" />
          Edit Item
        </Link>
      </div>
    </div>
  );
};
