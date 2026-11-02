"use client";

import { cn } from "@/lib/utils";
import { TASK_STATUS_LABELS } from "@/components/features/board/board-constants";

export function taskStatusPillClass(s: string) {
  const x = s.toLowerCase().replace(/\s+/g, "_");
  if (x === "done" || x === "completed")
    return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  if (x === "in_progress" || x === "in_review" || x === "in review")
    return "bg-orange-100 text-orange-800 ring-orange-200";
  if (x === "backlog")
    return "bg-zinc-100 text-zinc-600 ring-zinc-200";
  if (x === "cancelled" || x === "canceled")
    return "bg-zinc-100 text-zinc-600 ring-zinc-200";
  if (x === "awaiting_approval")
    return "bg-violet-100 text-violet-800 ring-violet-200";
  if (x === "on_check") return "bg-sky-100 text-sky-800 ring-sky-200";
  if (x === "need_revision")
    return "bg-amber-100 text-amber-800 ring-amber-200";
  return "bg-sky-100 text-sky-800 ring-sky-200";
}

export function priorityPillClass(p: string) {
  switch (p.toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-800 ring-red-200";
    case "high":
      return "bg-amber-100 text-amber-800 ring-amber-200";
    case "medium":
      return "bg-sky-100 text-sky-800 ring-sky-200";
    case "low":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    default:
      return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  }
}

export function TaskStatusBadge({ status }: { status: string }) {
  const label =
    TASK_STATUS_LABELS[status.toLowerCase().replace(/\s+/g, "_")] ??
    status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ring-inset",
        taskStatusPillClass(status),
      )}
    >
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ring-inset",
        priorityPillClass(priority),
      )}
    >
      {priority}
    </span>
  );
}

export function OverdueBadge({ days }: { days: number }) {
  return (
    <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-red-200 ring-inset">
      {days}d overdue
    </span>
  );
}
