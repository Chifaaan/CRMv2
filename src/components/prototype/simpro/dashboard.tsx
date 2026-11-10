"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  ListTodo,
  Users,
} from "lucide-react";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  calculateJourneyProgress,
  formatDate,
  isOverdue,
  userById,
  visibleProjects,
  workloadRows,
} from "@/lib/prototype/domain";
import {
  EmptyState,
  ProgressBar,
  SectionCard,
  StatCard,
  TaskStatusBadge,
  UserAvatar,
} from "../ui";
import { TaskProgressPanels } from "./task-progress";

export function SimproDashboard() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const projects = visibleProjects(store);
  const activeProjects = projects.filter((project) => project.status === "active");
  const projectIds = new Set(projects.map((project) => project.id));
  const tasks = store.tasks.filter(
    (task) =>
      !task.archivedAt &&
      projectIds.has(task.projectId) &&
      (currentUser?.role !== "assignee" && currentUser?.role !== "media" ||
        task.assigneeId === currentUser.id),
  );
  const completed = tasks.filter((task) => task.status === "completed").length;
  const openTasks = tasks.length - completed;
  const myTasks = tasks
    .filter(
      (task) =>
        task.assigneeId === store.currentUserId &&
        task.status !== "completed",
    )
    .slice(0, 5);
  const upcoming = [...tasks]
    .filter((task) => task.dueDate && task.status !== "completed")
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 5);
  const workload = workloadRows(store);

  if (!currentUser) return null;
  const canSeeWorkload =
    currentUser.role === "admin" || currentUser.role === "manager";

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/75">Selamat datang, {currentUser.name}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Ringkasan kerja hari ini
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/75">
              Pantau proyek, task, dan beban tim dari satu tempat.
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/20">
            <p className="text-white/70">Hari ini</p>
            <p className="mt-1 font-semibold">{formatDate(new Date().toISOString())}</p>
            <p className="text-xs text-white/60">Asia/Jakarta</p>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-20 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -top-16 right-24 size-40 rounded-full bg-violet-300/20 blur-2xl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total proyek" value={projects.length} sub={`${activeProjects.length} proyek aktif`} icon={FolderKanban} />
        <StatCard label="Klien" value={new Set(projects.map((project) => project.client)).size} sub="Klien dengan proyek" icon={Users} accent="from-sky-500 to-blue-600" />
        <StatCard label="Anggota tim" value={store.users.filter((user) => user.role !== "finance").length} sub="PM, Manager, Assignee" icon={Users} accent="from-amber-500 to-orange-600" />
        <StatCard label="Total task" value={tasks.length} sub={`${openTasks} task belum selesai`} icon={ListTodo} accent="from-emerald-500 to-teal-600" />
      </div>

      <TaskProgressPanels
        tasks={tasks}
        distributionDescription="Status task di proyek yang Anda akses."
        progressDescription="Ringkasan penyelesaian task."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Task saya" description="Task aktif yang di-assign ke Anda.">
          {myTasks.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Tidak ada task aktif" description="Semua task Anda sudah selesai." />
          ) : (
            <div className="space-y-2">
              {myTasks.map((task) => {
                const project = store.projects.find((item) => item.id === task.projectId);
                return (
                  <Link
                    key={task.id}
                    href="/my-tasks"
                    className="hover:bg-muted/40 flex items-center gap-3 rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{task.title}</p>
                      <p className="text-muted-foreground text-[10px]">
                        {project?.name} · {task.code}
                      </p>
                    </div>
                    <TaskStatusBadge status={task.status} />
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent projects" description="Proyek yang paling baru diperbarui.">
          <div className="space-y-2">
            {projects.slice(0, 5).map((project) => {
              const progress = calculateJourneyProgress(store, project.id);
              return (
                <Link
                  key={project.id}
                  href={
                    currentUser.role === "assignee" ||
                    currentUser.role === "media"
                      ? "/my-tasks"
                      : `/projects/${project.id}`
                  }
                  className="hover:bg-muted/40 flex items-center gap-3 rounded-lg px-2 py-2"
                >
                  <div className="size-8 shrink-0 rounded-md" style={{ backgroundColor: project.coverColor }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{project.name}</p>
                    <p className="text-muted-foreground text-[10px]">{project.code}</p>
                  </div>
                  <div className="w-20">
                    <ProgressBar value={progress} className="h-1.5" />
                    <p className="text-muted-foreground mt-1 text-right text-[9px]">{progress}%</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {canSeeWorkload ? (
          <SectionCard title="Team workload" description="Task aktif per assignee.">
            {workload.length === 0 ? (
              <EmptyState icon={Users} title="Belum ada assignee" />
            ) : (
              <div className="space-y-3">
                {workload.slice(0, 5).map((row) => (
                  <div key={row.user.id} className="flex items-center gap-3">
                    <UserAvatar user={row.user} size="sm" showName />
                    <ProgressBar
                      value={Math.min(100, row.activeCount * 12)}
                      className="flex-1"
                    />
                    <span className="w-16 text-right text-xs">{row.activeCount} task</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        ) : null}

        <SectionCard title="Upcoming deadlines" description="Task dengan due date terdekat.">
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Tidak ada deadline" />
          ) : (
            <div className="space-y-2">
              {upcoming.map((task) => (
                <div key={task.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                  <AlertTriangle className={task.dueDate && isOverdue(task) ? "size-3.5 text-rose-500" : "size-3.5 text-amber-500"} />
                  <span className="min-w-0 flex-1 truncate">{task.title}</span>
                  <span className="text-muted-foreground">{formatDate(task.dueDate)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
