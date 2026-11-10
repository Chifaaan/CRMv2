"use client";

import { taskProgressSummary } from "@/lib/prototype/domain";
import { TASK_STATUSES, type Task } from "@/lib/prototype/types";
import { ProgressBar, SectionCard, TaskStatusBadge } from "../ui";

export function TaskProgressPanels({
  tasks,
  distributionDescription = "Status task pada cakupan ini.",
  progressDescription = "Ringkasan penyelesaian task.",
}: {
  tasks: Task[];
  distributionDescription?: string;
  progressDescription?: string;
}) {
  const summary = taskProgressSummary(tasks);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard
        title="Distribusi task"
        description={distributionDescription}
      >
        <div className="space-y-2">
          {TASK_STATUSES.map((status) => {
            const value = summary.counts[status];
            const percent =
              summary.total === 0
                ? 0
                : Math.round((value / summary.total) * 100);
            return (
              <div key={status} className="flex items-center gap-3">
                <span className="w-36 shrink-0">
                  <TaskStatusBadge status={status} />
                </span>
                <div className="flex-1">
                  <ProgressBar value={percent} />
                </div>
                <span className="w-16 text-right text-xs tabular-nums">
                  {value}{" "}
                  <span className="text-muted-foreground">({percent}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Progress overview" description={progressDescription}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground text-[11px] uppercase">
              Completed
            </p>
            <p className="mt-1 text-2xl font-semibold">{summary.completed}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground text-[11px] uppercase">Open</p>
            <p className="mt-1 text-2xl font-semibold">{summary.open}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground text-[11px] uppercase">
              Overdue
            </p>
            <p className="mt-1 text-2xl font-semibold text-rose-600">
              {summary.overdue}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Task selesai</span>
            <span className="font-semibold">{summary.percent}%</span>
          </div>
          <ProgressBar value={summary.percent} tone="bg-emerald-500" />
        </div>
      </SectionCard>
    </div>
  );
}
