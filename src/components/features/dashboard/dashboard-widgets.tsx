"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  PieChart as PieChartIcon,
  Target,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardInfiniteSentinel } from "@/components/features/dashboard/dashboard-infinite-sentinel";
import {
  flattenDashboardPages,
  useDashboardInfinite,
} from "@/lib/hooks/use-dashboard-infinite";

export type AccessibleProject = { id: string; name: string };

const DIST_COLORS: Record<string, string> = {
  backlog: "#94a3b8",
  todo: "#06b6d4",
  in_progress: "#f97316",
  in_review: "#a855f7",
  done: "#22c55e",
  other: "#64748b",
  awaiting_approval: "#c084fc",
  on_check: "#14b8a6",
  need_revision: "#fb923c",
};

const PRI_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#0891b2",
  low: "#94a3b8",
};

function projectQueryParam(projectId: string) {
  return projectId === "all" ? "all" : projectId;
}

export function DashboardProjectFilter({
  projects,
  value,
  onChange,
  id,
}: {
  projects: AccessibleProject[];
  value: string;
  onChange: (v: string) => void;
  id: string;
}) {
  const items = useMemo(
    () => [
      { value: "all", label: "Semua proyek" },
      ...projects.map((p) => ({ value: p.id, label: p.name })),
    ],
    [projects],
  );
  return (
    <Select
      value={value}
      onValueChange={(v) => v && onChange(v)}
      items={items}
    >
      <SelectTrigger id={id} className="h-8 w-[min(200px,46vw)] text-xs">
        <SelectValue placeholder="Proyek" />
      </SelectTrigger>
      <SelectContent>
        {items.map((it) => (
          <SelectItem key={it.value} value={it.value}>
            {it.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type TaskDistributionData = {
  buckets: { key: string; label: string; count: number }[];
  total: number;
};

export function TaskDistributionCard({
  projects,
}: {
  projects: AccessibleProject[];
}) {
  const [projectId, setProjectId] = useState("all");
  const q = useQuery({
    queryKey: ["dashboard", "task-distribution", projectId],
    queryFn: async () => {
      const res = await api.get<TaskDistributionData>(
        `/api/reports/dashboard/task-distribution?projectId=${encodeURIComponent(projectQueryParam(projectId))}`,
      );
      return res.data;
    },
  });

  const data = q.data;
  const chartData =
    data?.buckets
      .filter((b) => b.count > 0)
      .map((b) => ({
        name: b.label,
        value: b.count,
        key: b.key,
        fill: DIST_COLORS[b.key] ?? DIST_COLORS.other,
      })) ?? [];

  return (
    <Card className="flex h-[340px] max-h-[340px] flex-col overflow-hidden border-zinc-200/90 bg-gradient-to-br from-white via-sky-50/30 to-indigo-50/40 shadow-md ring-1 ring-sky-100/60 sm:h-[420px] sm:max-h-[420px]">
      <CardHeader className="shrink-0 flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-sky-100/80 bg-white/60 pb-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md">
            <PieChartIcon className="size-4" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Distribusi task
            </CardTitle>
            <p className="text-[11px] text-zinc-500">
              Per status pada ruang lingkup terpilih
            </p>
          </div>
        </div>
        <DashboardProjectFilter
          id="dash-filter-td"
          projects={projects}
          value={projectId}
          onChange={setProjectId}
        />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col pt-5">
        {q.isPending ? (
          <Skeleton className="h-64 w-full shrink-0 rounded-xl" />
        ) : q.isError ? (
          <p className="text-sm text-destructive">Gagal memuat data.</p>
        ) : !data || data.total === 0 ? (
          <p className="text-sm text-zinc-500">
            Belum ada task di ruang lingkup ini.
          </p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:items-stretch">
            <div className="relative mx-auto h-56 w-56 shrink-0 lg:mx-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-sky-100/80 to-violet-100/60 blur-2xl" />
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={86}
                    paddingAngle={3}
                    strokeWidth={2}
                    stroke="rgba(255,255,255,0.85)"
                  >
                    {chartData.map((e) => (
                      <Cell key={e.key} fill={e.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => {
                      const n = Number(v ?? 0);
                      return [
                        `${n} task (${data.total ? Math.round((n / data.total) * 100) : 0}%)`,
                        String(name),
                      ];
                    }}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e4e4e7",
                      fontSize: 12,
                      boxShadow: "0 10px 40px -12px rgba(0,0,0,0.15)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-bold tabular-nums tracking-tight text-zinc-900">
                  {data.total}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Total task
                </p>
              </div>
            </div>
            <ul className="min-h-0 min-w-0 flex-1 space-y-2.5 overflow-y-auto pr-0.5 [scrollbar-gutter:stable]">
              {data.buckets.map((b) => {
                const pct =
                  data.total > 0
                    ? Math.round((b.count / data.total) * 100)
                    : 0;
                return (
                  <li
                    key={b.key}
                    className="rounded-lg border border-zinc-100/80 bg-white/70 px-3 py-2 shadow-sm backdrop-blur-sm"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full ring-2 ring-white shadow"
                          style={{
                            backgroundColor:
                              DIST_COLORS[b.key] ?? DIST_COLORS.other,
                          }}
                        />
                        <span className="truncate font-medium text-zinc-800">
                          {b.label}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-sm font-bold text-zinc-900">
                        {b.count}
                        <span className="ml-1 text-xs font-semibold text-zinc-400">
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor:
                            DIST_COLORS[b.key] ?? DIST_COLORS.other,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type ProgressOverviewData = {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionPercent: number;
  byPriority: { priority: string; count: number }[];
};

export function ProgressOverviewCard({
  projects,
}: {
  projects: AccessibleProject[];
}) {
  const [projectId, setProjectId] = useState("all");
  const q = useQuery({
    queryKey: ["dashboard", "progress-overview", projectId],
    queryFn: async () => {
      const res = await api.get<ProgressOverviewData>(
        `/api/reports/dashboard/progress-overview?projectId=${encodeURIComponent(projectQueryParam(projectId))}`,
      );
      return res.data;
    },
  });
  const d = q.data;
  const maxPri =
    d?.byPriority.reduce((m, x) => Math.max(m, x.count), 0) ?? 1;

  const pct = d?.completionPercent ?? 0;
  const r = 36;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <Card className="flex h-[340px] max-h-[340px] flex-col overflow-hidden border-zinc-200/90 shadow-sm sm:h-[420px] sm:max-h-[420px]">
      <CardHeader className="shrink-0 flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-zinc-100 bg-zinc-50/50 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
            <Target className="size-4" aria-hidden />
          </div>
          <CardTitle className="text-base font-semibold">
            Progress overview
          </CardTitle>
        </div>
        <DashboardProjectFilter
          id="dash-filter-po"
          projects={projects}
          value={projectId}
          onChange={setProjectId}
        />
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto pt-4">
        {q.isPending ? (
          <Skeleton className="h-56 w-full rounded-lg" />
        ) : q.isError ? (
          <p className="text-sm text-destructive">Gagal memuat data.</p>
        ) : !d || d.total === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada task.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <svg
                  className="size-24 shrink-0 -rotate-90"
                  viewBox="0 0 88 88"
                  aria-hidden
                >
                  <circle
                    cx="44"
                    cy="44"
                    r={r}
                    fill="none"
                    className="stroke-zinc-200"
                    strokeWidth="8"
                  />
                  <circle
                    cx="44"
                    cy="44"
                    r={r}
                    fill="none"
                    className="stroke-sky-500"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${c}`}
                  />
                </svg>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-zinc-900">
                    {d.completionPercent}%
                  </p>
                  <p className="text-xs text-zinc-500">Complete</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">
                    Completed
                  </p>
                  <p className="text-lg font-bold tabular-nums text-zinc-900">
                    {d.completed}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">
                    In progress
                  </p>
                  <p className="text-lg font-bold tabular-nums text-zinc-900">
                    {d.inProgress}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">
                    Overdue
                  </p>
                  <p className="text-lg font-bold tabular-nums text-red-600">
                    {d.overdue}
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-zinc-100 pt-4">
              <p className="mb-3 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                Active tasks by priority
              </p>
              <ul className="space-y-2.5">
                {d.byPriority.map((row) => (
                  <li key={row.priority}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="capitalize text-zinc-700">
                        {row.priority}
                      </span>
                      <span className="tabular-nums font-semibold text-zinc-900">
                        {row.count}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${maxPri ? (row.count / maxPri) * 100 : 0}%`,
                          backgroundColor:
                            PRI_COLORS[row.priority.toLowerCase()] ??
                            "#64748b",
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export type UpcomingDeadlineItem = {
  id: string;
  title: string;
  dueDate: string;
  projectId: string;
  projectName: string;
  overdueDays: number | null;
};

export function UpcomingDeadlinesCard({
  projects,
  onOpenTask,
}: {
  projects: AccessibleProject[];
  /** Jika diset, klik task membuka detail inline (mis. dari Dashboard). */
  onOpenTask?: (item: UpcomingDeadlineItem) => void;
}) {
  const [projectId, setProjectId] = useState("all");
  const q = useDashboardInfinite<UpcomingDeadlineItem>({
    queryKey: ["dashboard", "upcoming-deadlines", projectId],
    path: "/api/reports/dashboard/upcoming-deadlines",
    params: { projectId: projectQueryParam(projectId) },
  });
  const items = flattenDashboardPages(q.data);

  return (
    <Card className="flex h-[340px] max-h-[340px] flex-col overflow-hidden border-zinc-200/90 shadow-sm sm:h-[420px] sm:max-h-[420px]">
      <CardHeader className="shrink-0 flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-zinc-100 bg-zinc-50/50 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <CalendarClock className="size-4" aria-hidden />
          </div>
          <CardTitle className="text-base font-semibold">
            Upcoming deadlines
          </CardTitle>
        </div>
        <DashboardProjectFilter
          id="dash-filter-ud"
          projects={projects}
          value={projectId}
          onChange={setProjectId}
        />
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
        {q.isPending ? (
          <div className="p-4">
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ) : q.isError ? (
          <p className="p-4 text-sm text-destructive">Gagal memuat data.</p>
        ) : !items.length ? (
          <p className="p-4 text-sm text-zinc-500">
            Tidak ada deadline mendatang di ruang lingkup ini.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-zinc-100">
              {items.map((t) => {
              const inner = (
                <>
                  <AlertTriangle
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      t.overdueDays != null ? "text-red-500" : "text-zinc-300",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900 group-hover:text-indigo-600">
                      {t.title}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {t.projectName}
                      {t.overdueDays != null ? (
                        <span className="text-red-600">
                          {" "}
                          · {t.overdueDays}d overdue
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <time
                    className="shrink-0 text-xs tabular-nums text-zinc-500"
                    dateTime={t.dueDate}
                  >
                    {new Date(t.dueDate).toLocaleDateString("id-ID", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </>
              );
              return onOpenTask ? (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onOpenTask(t)}
                    className="group flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50/80"
                  >
                    {inner}
                  </button>
                </li>
              ) : (
                <li key={t.id}>
                  <Link
                    href={`/projects/${t.projectId}/board`}
                    className="group flex gap-3 px-4 py-3 transition-colors hover:bg-zinc-50/80"
                  >
                    {inner}
                  </Link>
                </li>
              );
            })}
            </ul>
            <DashboardInfiniteSentinel
              hasMore={q.hasNextPage}
              isFetchingNextPage={q.isFetchingNextPage}
              onLoadMore={() => void q.fetchNextPage()}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
