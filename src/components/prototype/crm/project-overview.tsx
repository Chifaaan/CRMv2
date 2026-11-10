"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  History,
  type LucideIcon,
} from "lucide-react";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  formatDateTime,
  projectOverview,
  userById,
} from "@/lib/prototype/domain";
import {
  TASK_STATUS_LABEL,
  type Project,
} from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import { EmptyState, ProgressBar, SectionCard } from "../ui";

export function ProjectOverview({ project }: { project: Project }) {
  const store = usePrototypeStore();
  const overview = projectOverview(store, project.id);

  return (
    <div className="space-y-4">
      <SectionCard
        title="Penyelesaian Tahap"
        description="Ringkasan step selesai, dilewati, dan belum selesai."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Selesai" value={overview.stageCompletion.completed} />
          <Stat label="Dilewati" value={overview.stageCompletion.skipped} />
          <Stat
            label="Belum selesai"
            value={overview.stageCompletion.notCompleted}
          />
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Distribusi task"
          description="Status task SIMPRO proyek ini."
        >
          <div className="space-y-3">
            {overview.taskDistribution.map((row) => (
              <div key={row.status} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-medium",
                      statusTone(row.status),
                    )}
                  >
                    {TASK_STATUS_LABEL[row.status]}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {row.count} ({row.percent}%)
                  </span>
                </div>
                <ProgressBar value={row.percent} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Progress overview"
          description="Ringkasan penyelesaian task proyek ini."
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <Metric
              label="Completed"
              value={overview.progress.completed}
              icon={CheckCircle2}
              tone="text-emerald-600"
            />
            <Metric
              label="Open"
              value={overview.progress.open}
              icon={Clock3}
              tone="text-sky-600"
            />
            <Metric
              label="Overdue"
              value={overview.progress.overdue}
              icon={AlertTriangle}
              tone="text-rose-600"
            />
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Task selesai</span>
              <span className="font-semibold">{overview.progress.percent}%</span>
            </div>
            <ProgressBar value={overview.progress.percent} />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Riwayat Aktivitas"
        description="Event proyek terbaru."
      >
        {overview.recentEvents.length === 0 ? (
          <EmptyState
            icon={History}
            title="Belum ada aktivitas"
            description="Event audit trail proyek ini akan muncul di sini."
          />
        ) : (
          <div className="space-y-2">
            {overview.recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-start gap-2 rounded-lg border px-3 py-2 text-xs"
              >
                <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium">
                  {event.eventType}
                </span>
                <span className="text-muted-foreground">
                  {formatDateTime(event.occurredAt)}
                </span>
                <span className="font-medium">
                  {userById(store, event.actorId)?.name ?? "User"}
                </span>
                <span className="min-w-0 flex-1">{event.summary}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}:</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          {label}
        </span>
        <Icon className={cn("size-4", tone)} />
      </div>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone)}>
        {value}
      </p>
    </div>
  );
}

function statusTone(status: keyof typeof TASK_STATUS_LABEL): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "awaiting_approval") return "bg-amber-100 text-amber-800";
  if (status === "need_revision") return "bg-rose-100 text-rose-700";
  if (status === "in_progress") return "bg-violet-100 text-violet-700";
  if (status === "todo") return "bg-sky-100 text-sky-700";
  return "bg-slate-100 text-slate-700";
}
