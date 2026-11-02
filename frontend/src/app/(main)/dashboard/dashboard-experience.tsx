"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarRange,
  CheckCircle2,
  CheckSquare,
  Clock,
  FolderKanban,
  ListTodo,
  Users,
  UserSquare2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { projectDisplayProgressPercent } from "@/lib/project-progress-display";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserProfileModal } from "@/components/features/users/user-profile-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ProgressOverviewCard,
  TaskDistributionCard,
  UpcomingDeadlinesCard,
  type UpcomingDeadlineItem,
} from "@/components/features/dashboard/dashboard-widgets";
import { DashboardInfiniteSentinel } from "@/components/features/dashboard/dashboard-infinite-sentinel";
import {
  dashboardTotalCount,
  flattenDashboardPages,
  useDashboardInfinite,
} from "@/lib/hooks/use-dashboard-infinite";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDetailSheet } from "@/components/features/tasks/TaskDetailSheet";
import { TaskFormSheet } from "@/components/features/tasks/TaskFormSheet";
import { canOpenTaskFormEditor } from "@/lib/project-detail-permissions";
import {
  MemberTasksModal,
  type MemberTaskItem,
} from "@/components/features/dashboard/member-tasks-modal";
import { ReminderModal } from "@/components/features/dashboard/reminder-modal";
import { useReminderModal } from "@/lib/hooks/use-reminder-modal";
import { useSession } from "@/lib/auth-client";
import { isAdminOrPmRole } from "@/lib/role-constants";

const DashboardGanttChart = dynamic(
  () =>
    import("@/components/features/dashboard/dashboard-gantt-chart").then(
      (m) => m.DashboardGanttChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] animate-pulse rounded-xl bg-zinc-100/90" />
    ),
  },
);

export type DashboardKpiCard = {
  id: string;
  label: string;
  value: number;
  sub: string;
};

export type DashboardExperienceData = {
  stats: {
    projects: number;
    clients: number;
    users: number;
    openTasks: number;
  };
  /** Kartu ringkas per peran (backend). */
  kpiCards: DashboardKpiCard[];
  accessibleProjects: { id: string; name: string }[];
  recentProjects: {
    id: string;
    name: string;
    status: string;
    progress: number | null;
    coverColor: string | null;
    taskDone: number;
    taskTotal: number;
  }[];
  teamWorkload: {
    userId: string;
    name: string;
    image: string | null;
    taskCount: number;
    completedCount: number;
  }[];
  myTasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    project: { id: string; name: string };
  }[];
};

type DashboardMyTaskItem = DashboardExperienceData["myTasks"][number];
type DashboardRecentProjectItem = DashboardExperienceData["recentProjects"][number];

function priorityDotClass(p: string) {
  switch (p.toLowerCase()) {
    case "critical":
      return "bg-red-500";
    case "high":
      return "bg-amber-500";
    case "medium":
      return "bg-sky-500";
    case "low":
      return "bg-slate-400";
    default:
      return "bg-zinc-400";
  }
}

function taskStatusPillClass(s: string) {
  const x = s.toLowerCase().replace(/\s+/g, "_");
  if (x === "done" || x === "completed")
    return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  if (x === "in_progress" || x === "in_review" || x === "in review")
    return "bg-orange-100 text-orange-800 ring-orange-200";
  if (x === "backlog")
    return "bg-zinc-100 text-zinc-600 ring-zinc-200";
  if (x === "cancelled" || x === "canceled")
    return "bg-zinc-100 text-zinc-600 ring-zinc-200";
  return "bg-sky-100 text-sky-800 ring-sky-200";
}

function projectStatusPillClass(s: string) {
  const x = s.toLowerCase();
  if (x.includes("active") || x === "in_progress")
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (x.includes("complete") || x.includes("done"))
    return "bg-slate-100 text-slate-600 ring-slate-200";
  if (x.includes("hold") || x.includes("plan"))
    return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-sky-50 text-sky-800 ring-sky-200";
}

const ACCENT_DOTS = ["#2563eb", "#db2777", "#dc2626", "#0d9488", "#7c3aed"];

const KPI_ICON: Record<string, LucideIcon> = {
  total_projects: FolderKanban,
  active_projects: FolderKanban,
  total_clients: Building2,
  total_users: Users,
  total_tasks: CheckSquare,
  open_tasks: ListTodo,
  need_revision: AlertTriangle,
  completed_tasks: CheckCircle2,
  team_pm_dev: UserSquare2,
  client_members: Users,
  tasks_in_progress: Clock,
};

const KPI_ACCENTS = [
  "from-violet-500 to-indigo-600",
  "from-sky-500 to-blue-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
] as const;

const KPI_RINGS = [
  "ring-violet-500/20",
  "ring-sky-500/20",
  "ring-amber-500/20",
  "ring-emerald-500/20",
  "ring-rose-500/20",
] as const;

type LocalHeroClock = {
  greeting: string;
  time: string;
  date: string;
};

/** Tinggi satu baris Team workload (px-4 py-3 + avatar size-9). */
const TEAM_WORKLOAD_ROW_PX = 60;
const TEAM_WORKLOAD_VISIBLE_ROWS = 5;

/** Tinggi baris Task saya / Recent projects (~py-3 + judul + subteks). */
const DASHBOARD_LIST_ROW_PX = 81;
const DASHBOARD_LIST_VISIBLE_ROWS = 5;
const DASHBOARD_LIST_CARD_HEADER_PX = 56;
const DASHBOARD_LIST_CARD_HEIGHT =
  DASHBOARD_LIST_CARD_HEADER_PX +
  DASHBOARD_LIST_ROW_PX * DASHBOARD_LIST_VISIBLE_ROWS;

export function DashboardExperience({
  userName,
  data,
}: {
  userName: string;
  data: DashboardExperienceData;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const roleNorm = role.trim().toLowerCase();
  const isAdminOrPm = isAdminOrPmRole(roleNorm);
  const canOpenTaskEditor = canOpenTaskFormEditor(role);

  const reminder = useReminderModal();
  const refetchReminders = reminder.refetch;
  const { openUserProfile } = useUserProfileModal();

  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createProjectId, setCreateProjectId] = useState<string | null>(null);
  const [followUpReferenceTaskIds, setFollowUpReferenceTaskIds] = useState<
    string[]
  >([]);
  const [memberTasksMember, setMemberTasksMember] = useState<
    DashboardExperienceData["teamWorkload"][number] | null
  >(null);

  const refreshDashboard = useCallback(() => {
    router.refresh();
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
    void refetchReminders();
  }, [router, qc, refetchReminders]);

  function openTaskDetail(taskId: string, projectId: string) {
    setDetailTaskId(taskId);
    setDetailProjectId(projectId);
    setDetailOpen(true);
  }

  function openMemberTaskDetail(task: MemberTaskItem) {
    openTaskDetail(task.id, task.project.id);
  }

  function openWorkloadMember(
    member: DashboardExperienceData["teamWorkload"][number],
  ) {
    if (isAdminOrPm) {
      setMemberTasksMember(member);
    } else {
      openUserProfile(member.userId);
    }
  }

  function openEditFromDetail() {
    const id = detailTaskId;
    const pid = detailProjectId;
    setDetailOpen(false);
    if (id && pid) {
      setEditTaskId(id);
      setEditProjectId(pid);
      setEditModalOpen(true);
    }
  }

  function openFollowUpTask(referenceTaskId: string, sourceProjectId: string) {
    setFollowUpReferenceTaskIds([referenceTaskId]);
    setCreateProjectId(sourceProjectId);
    setCreateModalOpen(true);
  }

  const displayName = userName?.trim() || "there";
  const [localHero, setLocalHero] = useState<LocalHeroClock | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = now.getHours();
      let greeting = "Selamat malam";
      if (h < 12) greeting = "Selamat pagi";
      else if (h < 15) greeting = "Selamat siang";
      else if (h < 19) greeting = "Selamat sore";
      setLocalHero({
        greeting,
        time: now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        date: now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      });
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const kpiCards = data.kpiCards?.length
    ? data.kpiCards
    : [
        {
          id: "total_projects",
          label: "Proyek aktif",
          value: data.stats.projects,
          sub: "Dalam cakupan Anda",
        },
        {
          id: "total_clients",
          label: "Klien",
          value: data.stats.clients,
          sub: "Organisasi dengan proyek di cakupan ini",
        },
        {
          id: "total_users",
          label: "Pengguna",
          value: data.stats.users,
          sub: "Pengguna aktif di workspace",
        },
        {
          id: "open_tasks",
          label: "Task terbuka",
          value: data.stats.openTasks,
          sub: "Belum selesai atau dibatalkan",
        },
      ];

  const myTasksQ = useDashboardInfinite<DashboardMyTaskItem>({
    queryKey: ["dashboard", "my-tasks"],
    path: "/api/reports/dashboard/my-tasks",
  });
  const myTasks = flattenDashboardPages(myTasksQ.data);
  const myTasksTotal = dashboardTotalCount(myTasksQ.data);

  const recentProjectsQ = useDashboardInfinite<DashboardRecentProjectItem>({
    queryKey: ["dashboard", "recent-projects"],
    path: "/api/reports/dashboard/recent-projects",
  });
  const recentProjects = flattenDashboardPages(recentProjectsQ.data);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 px-5 py-8 text-white shadow-lg sm:px-8">
        <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-indigo-100">
              {localHero
                ? `${localHero.greeting}, ${displayName}`
                : `Halo, ${displayName}`}
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ringkasan kerja hari ini
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-indigo-100/90">
              Ringkasan proyek dan pekerjaan yang relevan untuk peran Anda.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
            <Clock className="size-5 text-indigo-100" aria-hidden />
            <div className="text-right">
              <p className="text-xs font-medium text-indigo-200">Waktu lokal</p>
              <p className="font-mono text-lg font-semibold tabular-nums">
                {localHero?.time ?? "--:--"}
              </p>
              <p className="min-h-[14px] text-[11px] text-indigo-200/90">
                {localHero?.date ?? "\u00a0"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className={cn(
          "grid gap-4 sm:grid-cols-2",
          kpiCards.length >= 5
            ? "lg:grid-cols-3 xl:grid-cols-5"
            : "xl:grid-cols-4",
        )}
      >
        {kpiCards.map((k, i) => {
          const Icon = KPI_ICON[k.id] ?? BarChart3;
          const accent = KPI_ACCENTS[i % KPI_ACCENTS.length];
          const ring = KPI_RINGS[i % KPI_RINGS.length];
          return (
            <div
              key={k.id}
              className={cn(
                "group relative overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 transition-shadow hover:shadow-md",
                ring,
              )}
            >
              <div
                className={cn(
                  "absolute -top-6 -right-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-[0.12] transition-opacity group-hover:opacity-20",
                  accent,
                )}
              />
              <div className="relative flex items-start gap-4">
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
                    accent,
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    {k.label}
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-zinc-900">
                    {k.value}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">{k.sub}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <Card className="overflow-hidden border-zinc-200/90 shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center gap-2 border-b border-zinc-100 bg-zinc-50/50 pb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
              <CalendarRange className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-semibold">
                Gantt — proyek aktif
              </CardTitle>
              <p className="text-xs text-zinc-500">
                Pilih proyek dari yang Anda akses. PM, client, viewer, dan admin
                dapat memfilter assignee; developer melihat timeline tugas yang
                relevan untuknya tanpa filter tersebut.
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <DashboardGanttChart
              accessibleProjects={data.accessibleProjects}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TaskDistributionCard projects={data.accessibleProjects} />
        <ProgressOverviewCard projects={data.accessibleProjects} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card
          className="flex flex-col overflow-hidden border-zinc-200/90 shadow-sm"
          style={{
            height: DASHBOARD_LIST_CARD_HEIGHT,
            maxHeight: DASHBOARD_LIST_CARD_HEIGHT,
          }}
        >
          <CardHeader className="shrink-0 flex flex-row items-center justify-between space-y-0 border-b border-zinc-100 bg-zinc-50/50 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <CheckSquare className="size-4" aria-hidden />
              </div>
              <CardTitle className="text-base font-semibold">
                Task saya
              </CardTitle>
              {myTasksTotal > 0 ? (
                <span className="flex size-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-700">
                  {myTasksTotal}
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
            {myTasksQ.isPending ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: DASHBOARD_LIST_VISIBLE_ROWS }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : myTasksQ.isError ? (
              <p className="p-4 text-sm text-destructive">Gagal memuat task.</p>
            ) : myTasks.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">
                Belum ada task yang di-assign kepada Anda, atau semua sudah
                selesai.
              </p>
            ) : (
              <>
                <ul className="divide-y divide-zinc-100">
                  {myTasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-stretch gap-0 transition-colors hover:bg-zinc-50/80"
                  >
                    <div
                      className={cn(
                        "w-1 shrink-0 self-stretch",
                        priorityDotClass(t.priority),
                      )}
                      aria-hidden
                    />
                    <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 sm:px-4">
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            openTaskDetail(t.id, t.project.id)
                          }
                          className="text-left font-semibold text-zinc-900 hover:text-indigo-600"
                        >
                          {t.title}
                        </button>
                        <p className="mt-1 text-xs">
                          <Link
                            href={`/projects/${t.project.id}`}
                            className="font-medium text-indigo-600 hover:underline"
                          >
                            {t.project.name}
                          </Link>
                          {t.dueDate ? (
                            <span className="text-red-600">
                              {" "}
                              · Due{" "}
                              {new Date(t.dueDate).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ring-1 ring-inset",
                          taskStatusPillClass(t.status),
                        )}
                      >
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </li>
                ))}
                </ul>
                <DashboardInfiniteSentinel
                  hasMore={myTasksQ.hasNextPage}
                  isFetchingNextPage={myTasksQ.isFetchingNextPage}
                  onLoadMore={() => void myTasksQ.fetchNextPage()}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card
          className="flex flex-col overflow-hidden border-zinc-200/90 shadow-sm"
          style={{
            height: DASHBOARD_LIST_CARD_HEIGHT,
            maxHeight: DASHBOARD_LIST_CARD_HEIGHT,
          }}
        >
          <CardHeader className="shrink-0 flex flex-row items-center justify-between space-y-0 border-b border-zinc-100 bg-zinc-50/50 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <FolderKanban className="size-4" aria-hidden />
              </div>
              <CardTitle className="text-base font-semibold">
                Recent projects
              </CardTitle>
            </div>
            <Link
              href="/projects"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-xs font-medium text-indigo-600 hover:text-indigo-700",
              )}
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
            {recentProjectsQ.isPending ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: DASHBOARD_LIST_VISIBLE_ROWS }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : recentProjectsQ.isError ? (
              <p className="p-4 text-sm text-destructive">
                Gagal memuat proyek.
              </p>
            ) : recentProjects.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">Belum ada proyek.</p>
            ) : (
              <>
                <ul className="divide-y divide-zinc-100">
                  {recentProjects.map((p, i) => {
                  const prog = projectDisplayProgressPercent(p);
                  const dot =
                    p.coverColor?.trim() ||
                    ACCENT_DOTS[i % ACCENT_DOTS.length];
                  return (
                    <li key={p.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 gap-2">
                          <span
                            className="mt-1.5 size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: dot }}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/projects/${p.id}`}
                              className="font-semibold text-zinc-900 hover:text-indigo-600"
                            >
                              {p.name}
                            </Link>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-100">
                                <div
                                  className="h-full rounded-full bg-sky-500 transition-all"
                                  style={{ width: `${prog}%` }}
                                />
                              </div>
                              <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-600">
                                {prog}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ring-inset",
                            projectStatusPillClass(p.status),
                          )}
                        >
                          {p.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </li>
                  );
                })}
                </ul>
                <DashboardInfiniteSentinel
                  hasMore={recentProjectsQ.hasNextPage}
                  isFetchingNextPage={recentProjectsQ.isFetchingNextPage}
                  onLoadMore={() => void recentProjectsQ.fetchNextPage()}
                />
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden border-zinc-200/90 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 border-b border-zinc-100 bg-zinc-50/50 pb-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <BarChart3 className="size-4" aria-hidden />
            </div>
            <CardTitle className="text-base font-semibold">
              Team workload
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.teamWorkload.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">
                Belum ada penugasan task aktif.
              </p>
            ) : (
              <div
                className="overflow-y-auto [scrollbar-gutter:stable]"
                style={{
                  maxHeight:
                    data.teamWorkload.length > TEAM_WORKLOAD_VISIBLE_ROWS
                      ? TEAM_WORKLOAD_ROW_PX * TEAM_WORKLOAD_VISIBLE_ROWS
                      : undefined,
                }}
              >
                <ul className="divide-y divide-zinc-100">
                  {data.teamWorkload.map((w) => {
                    const prog = projectDisplayProgressPercent({
                      pipelineCompleted: w.completedCount,
                      pipelineTotal: w.taskCount,
                    });
                    return (
                      <li key={w.userId}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                          onClick={() => openWorkloadMember(w)}
                        >
                          <Avatar className="size-9 shrink-0">
                            {w.image ? (
                              <AvatarImage src={w.image} alt="" />
                            ) : null}
                            <AvatarFallback className="text-[10px]">
                              {w.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-900">
                              {w.name}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-100">
                                <div
                                  className="h-full rounded-full bg-sky-500 transition-all"
                                  style={{ width: `${prog}%` }}
                                />
                              </div>
                              <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-600">
                                {w.completedCount}/{w.taskCount}
                              </span>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <UpcomingDeadlinesCard
          projects={data.accessibleProjects}
          onOpenTask={(t: UpcomingDeadlineItem) =>
            openTaskDetail(t.id, t.projectId)
          }
        />
      </section>

      {editTaskId && editProjectId && canOpenTaskEditor ? (
        <TaskFormSheet
          mode="edit"
          open={editModalOpen}
          onOpenChange={(o) => {
            setEditModalOpen(o);
            if (!o) {
              setEditTaskId(null);
              setEditProjectId(null);
            }
          }}
          projectId={editProjectId}
          taskId={editTaskId}
          onSuccess={refreshDashboard}
        />
      ) : null}

      {createProjectId && canOpenTaskEditor ? (
        <TaskFormSheet
          mode="create"
          open={createModalOpen}
          onOpenChange={(o) => {
            setCreateModalOpen(o);
            if (!o) {
              setCreateProjectId(null);
              setFollowUpReferenceTaskIds([]);
            }
          }}
          projectId={createProjectId}
          initialReferenceTaskIds={followUpReferenceTaskIds}
          onSuccess={refreshDashboard}
        />
      ) : null}

      <MemberTasksModal
        open={memberTasksMember != null}
        onOpenChange={(o) => {
          if (!o) setMemberTasksMember(null);
        }}
        member={memberTasksMember}
        projects={data.accessibleProjects}
        onOpenTask={openMemberTaskDetail}
      />

      <ReminderModal
        isOpen={reminder.isOpen}
        onClose={reminder.onClose}
        onSnooze={reminder.onSnooze}
        deadlineTasks={reminder.deadlineTasks}
        awaitingTasks={reminder.awaitingTasks}
        isLoading={reminder.isLoading}
        onOpenTask={(t) => openTaskDetail(t.id, t.project.id)}
      />

      {detailTaskId ? (
        <TaskDetailSheet
          taskId={detailTaskId}
          projectId={detailProjectId ?? ""}
          open={detailOpen}
          onOpenChange={(o) => {
            setDetailOpen(o);
            if (!o) {
              setDetailTaskId(null);
              setDetailProjectId(null);
              void reminder.refetch();
            }
          }}
          onUpdated={refreshDashboard}
          presentation="trackly"
          onRequestEdit={canOpenTaskEditor ? openEditFromDetail : undefined}
          onRequestCreateFollowUp={
            canOpenTaskEditor ? openFollowUpTask : undefined
          }
        />
      ) : null}
    </div>
  );
}
