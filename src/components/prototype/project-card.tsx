"use client";

import Link from "next/link";
import { CalendarDays, FolderKanban, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  formatDate,
  isNewLifecycleProject,
  projectProgress,
  userById,
  workProgressForProject,
} from "@/lib/prototype/domain";
import { PHASE_LABEL, type AppState, type Project } from "@/lib/prototype/types";
import { AvatarStack, PhaseBadge, PriorityBadge, ProgressBar } from "./ui";

export function projectTeam(
  projectId: string,
  store: AppState,
  includeFinance = true,
) {
  const ids = new Set<string>();
  const project = store.projects.find((item) => item.id === projectId);
  if (project) {
    ids.add(project.createdById);
    if (project.managerId) ids.add(project.managerId);
  }
  for (const task of store.tasks) {
    if (task.projectId === projectId && task.assigneeId && !task.archivedAt) {
      ids.add(task.assigneeId);
    }
  }
  for (const form of store.forms) {
    if (form.projectId === projectId && form.assigneeId) ids.add(form.assigneeId);
  }
  return [...ids]
    .map((id) => userById(store, id))
    .filter((user): user is NonNullable<typeof user> => Boolean(user))
    .filter((user) => includeFinance || user.role !== "finance");
}

export function ProjectCard({
  project,
  href,
  showGroup = false,
  includeFinance = true,
  draggable = true,
}: {
  project: Project;
  href: string;
  showGroup?: boolean;
  includeFinance?: boolean;
  draggable?: boolean;
}) {
  const store = usePrototypeStore();
  const progress = projectProgress(store, project.id);
  const newProject = isNewLifecycleProject(project) && !project.startedAt;
  const work = workProgressForProject(store, project.id);
  const team = projectTeam(project.id, store, includeFinance);
  const group = project.groupId
    ? store.groups.find((item) => item.id === project.groupId)
    : undefined;
  const attribution = group
    ? { label: "Umbrella", name: group.name, icon: Users }
    : null;
  const AttributionIcon = attribution?.icon;
  const template = project.templateId
    ? store.templates.find((item) => item.id === project.templateId)
    : undefined;
  const activeSteps = store.steps.filter(
    (step) => step.projectId === project.id && step.status === "active",
  );
  const phase = activeSteps[0]?.phase;
  const closedLabel =
    project.status === "completed"
      ? "Completed"
      : project.status === "cancelled"
        ? "Cancelled"
        : null;

  return (
    <Link
      href={href}
      draggable={draggable}
      className={cn(
        "group bg-card ring-foreground/10 hover:ring-primary/40 block overflow-hidden rounded-xl shadow-sm ring-1 transition-all hover:-translate-y-0.5 hover:shadow-md",
        project.status === "cancelled" && "opacity-75",
      )}
    >
      <div
        className="relative h-20"
        style={{
          background: `linear-gradient(135deg, ${project.coverColor}, ${project.coverColor}cc)`,
        }}
      >
        <div className="absolute top-2 right-2 flex gap-1">
          {newProject ? (
            <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
              NEW Project
            </span>
          ) : null}
          {closedLabel ? (
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1",
                project.status === "completed"
                  ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                  : "bg-slate-100 text-slate-600 ring-slate-200",
              )}
            >
              {closedLabel}
            </span>
          ) : (
            <PhaseBadge phase={phase ?? "planning"} />
          )}
          <PriorityBadge priority={project.priority} />
        </div>
        <div className="absolute bottom-2 left-3 text-[10px] font-bold uppercase tracking-wider text-white/80">
          {project.code}
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          {attribution && AttributionIcon ? (
            <span className="bg-primary/10 text-primary mb-1.5 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
              <AttributionIcon className="size-3 shrink-0" />
              <span className="truncate">
                {attribution.label} · {attribution.name}
              </span>
            </span>
          ) : null}
          <h3 className="line-clamp-1 text-sm font-semibold">{project.name}</h3>
          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
            {project.client || "Tanpa klien"}
          </p>
          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[10px]">
            {template?.name ?? "Umum"} · v{project.templateVersion ?? 1}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">{progress.label}</span>
          </div>
          <ProgressBar value={progress.mode === "percent" ? progress.value : 0} />
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Work</span>
            <span className="font-semibold">{work}%</span>
          </div>
          <ProgressBar value={work} tone="bg-sky-500" />
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-[10px]">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3" />
            {formatDate(project.targetEndDate)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" />
            {team.length} anggota
          </span>
          {showGroup && group ? (
            <span className="inline-flex items-center gap-1">
              <FolderKanban className="size-3" />
              {group.name}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between">
          <AvatarStack users={team} />
          <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
            {closedLabel ?? PHASE_LABEL[phase ?? "planning"]}
          </span>
        </div>
      </div>
    </Link>
  );
}
