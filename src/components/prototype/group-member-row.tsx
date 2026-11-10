"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  calculateJourneyProgress,
  formatDate,
} from "@/lib/prototype/domain";
import type { Project } from "@/lib/prototype/types";
import { PHASE_LABEL } from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./ui";

export function GroupMemberRow({
  project,
  onRemove,
  highlighted = false,
  muted = false,
}: {
  project: Project;
  onRemove?: () => void;
  highlighted?: boolean;
  muted?: boolean;
}) {
  const store = usePrototypeStore();
  const journey = calculateJourneyProgress(store, project.id);
  const phase = store.steps.find(
    (step) => step.projectId === project.id && step.status === "active",
  )?.phase;

  return (
    <div
      className={cn(
        "flex min-h-11 flex-wrap items-center gap-2 border-b px-3 py-2 transition-colors last:border-0 sm:flex-nowrap sm:gap-3",
        highlighted && "bg-primary/5",
        muted && "opacity-45",
      )}
    >
      <span
        className="size-8 shrink-0 rounded-md"
        style={{ backgroundColor: project.coverColor }}
      />

      <Link
        href={`/crm/projects/${project.id}`}
        className="min-w-0 flex-1 basis-full sm:basis-auto"
      >
        <span className="block truncate text-xs font-semibold">
          {project.name}
        </span>
        <span className="text-muted-foreground block truncate text-[10px]">
          {project.code} · {formatDate(project.targetEndDate)}
        </span>
      </Link>

      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize",
          project.status === "completed"
            ? "bg-emerald-100 text-emerald-700"
            : project.status === "cancelled"
              ? "bg-slate-100 text-slate-600"
              : "bg-sky-100 text-sky-700",
        )}
      >
        {project.status === "active" && phase ? PHASE_LABEL[phase] : project.status}
      </span>

      <span className="hidden w-28 sm:block">
        <ProgressBar value={journey} className="h-1.5" />
        <span className="text-muted-foreground mt-1 block text-right text-[9px]">
          {journey}%
        </span>
      </span>
      <span className="text-muted-foreground text-[10px] font-medium sm:hidden">
        {journey}%
      </span>

      {onRemove ? (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Keluarkan ${project.name} dari Umbrella Project`}
          onClick={onRemove}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
