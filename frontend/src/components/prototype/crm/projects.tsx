"use client";

import Link from "next/link";
import { useMemo, useState, type DragEvent } from "react";
import {
  ChevronDown,
  FolderKanban,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  calculateJourneyProgress,
  canCreateProject,
  completionStats,
  isGroupableProject,
  userById,
  visibleProjects,
} from "@/lib/prototype/domain";
import {
  PHASE_LABEL,
  PRIORITY_LABEL,
  type Project,
} from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  NativeSelect,
  PageHeader,
  ProgressBar,
} from "../ui";
import { ProjectCard } from "../project-card";
import { GroupDialog, ProjectDialog } from "../dialogs";

function ProjectGroupCard({
  groupId,
  members,
}: {
  groupId: string;
  members: Project[];
}) {
  const store = usePrototypeStore();
  const group = store.groups.find((item) => item.id === groupId);
  const [open, setOpen] = useState(false);
  const panelId = `project-group-${groupId}`;

  if (!group) return null;
  const stats = completionStats(members);

  return (
    <div className="bg-card ring-foreground/10 flex flex-col overflow-hidden rounded-xl shadow-sm ring-1">
      <div className="flex items-start gap-3 p-4">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <FolderKanban className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
              Group
            </span>
            <span className="text-muted-foreground text-[10px]">
              {members.length} proyek
            </span>
          </div>
          <h3 className="mt-1 truncate text-sm font-semibold">{group.name}</h3>
          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
            {group.description || "Tanpa deskripsi"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <ProgressBar value={stats.percent} className="h-1.5 flex-1" />
            <span className="text-muted-foreground shrink-0 text-[10px]">
              {stats.completed} dari {stats.total} selesai
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="hover:bg-muted/50 focus-visible:ring-ring/50 flex items-center justify-between border-t px-4 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <span>{open ? "Tutup daftar proyek" : "Lihat daftar proyek"}</span>
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div id={panelId} className="border-t">
          {members.map((project) => {
            const journey = calculateJourneyProgress(store, project.id);
            return (
              <Link
                key={project.id}
                href={`/crm/projects/${project.id}`}
                className="hover:bg-muted/50 flex items-center gap-2 border-b px-4 py-2 last:border-0"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: project.coverColor }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    {project.name}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    {project.code}
                  </span>
                </span>
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
                  {project.status}
                </span>
                <span className="hidden w-16 sm:block">
                  <ProgressBar value={journey} className="h-1" />
                </span>
                <span className="text-muted-foreground w-8 text-right text-[10px]">
                  {journey}%
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function CrmProjects() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const projects = visibleProjects(store);
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupInitialProjects, setGroupInitialProjects] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (query) {
        const haystack = `${project.name} ${project.code} ${project.client}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (status && project.status !== status) return false;
      if (priority && project.priority !== priority) return false;
      if (phase) {
        const active = store.steps.filter(
          (step) => step.projectId === project.id && step.status === "active",
        );
        if (!active.some((step) => step.phase === phase)) return false;
      }
      return true;
    });
  }, [projects, search, status, priority, phase, store.steps]);

  if (!currentUser) return null;
  const canManageGroups =
    currentUser.role === "admin" || currentUser.role === "manager";

  const ungrouped = filtered.filter((project) => !project.groupId);
  const filteredIds = new Set(filtered.map((project) => project.id));
  const groupCards = store.groups
    .map((group) => ({
      group,
      members: projects.filter((project) => project.groupId === group.id),
    }))
    .filter(
      ({ members }) =>
        members.length > 0 &&
        members.some((project) => filteredIds.has(project.id)),
    );

  const openGroupDialog = (projectIds: string[]) => {
    setGroupInitialProjects(projectIds);
    setGroupDialogOpen(true);
  };

  const onDragStart = (
    event: DragEvent<HTMLDivElement>,
    project: Project,
  ) => {
    if (!canManageGroups || !isGroupableProject(project)) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", project.id);
    setDraggingId(project.id);
  };

  const onDragOver = (
    event: DragEvent<HTMLDivElement>,
    project: Project,
  ) => {
    if (
      !canManageGroups ||
      !draggingId ||
      draggingId === project.id ||
      !isGroupableProject(project)
    ) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverId(project.id);
  };

  const onDrop = (
    event: DragEvent<HTMLDivElement>,
    target: Project,
  ) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain");
    const source = projects.find((project) => project.id === sourceId);
    setDraggingId(null);
    setDragOverId(null);

    if (
      !source ||
      source.id === target.id ||
      !canManageGroups ||
      !isGroupableProject(source) ||
      !isGroupableProject(target)
    ) {
      return;
    }
    openGroupDialog([source.id, target.id]);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setDragOverId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        description={
          canManageGroups
            ? "Semua proyek yang dapat Anda akses. Tarik kartu proyek ke kartu lain untuk membuat group."
            : "Semua proyek yang dapat Anda akses, lengkap dengan journey dan progress pekerjaan."
        }
        actions={
          canCreateProject(currentUser) ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" /> Proyek baru
            </Button>
          ) : null
        }
      />

      <div className="grid gap-2 md:grid-cols-[1fr_160px_160px_160px]">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama, kode, atau klien…"
            className="pl-8"
          />
        </div>
        <NativeSelect value={phase} onChange={setPhase}>
          <option value="">Semua fase</option>
          {Object.entries(PHASE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={status} onChange={setStatus}>
          <option value="">Semua status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </NativeSelect>
        <NativeSelect value={priority} onChange={setPriority}>
          <option value="">Semua prioritas</option>
          {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {groupCards.length === 0 && ungrouped.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Tidak ada proyek"
          description="Ubah filter atau buat proyek baru."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groupCards.map(({ group, members }) => (
            <ProjectGroupCard
              key={group.id}
              groupId={group.id}
              members={members}
            />
          ))}

          {ungrouped.map((project) => (
            <div
              key={project.id}
              className={cn(
                "group/card relative rounded-xl transition-all",
                draggingId === project.id && "opacity-50",
                dragOverId === project.id &&
                  "ring-primary ring-offset-background ring-2 ring-offset-2",
              )}
              draggable={canManageGroups && isGroupableProject(project)}
              onDragStart={(event) => onDragStart(event, project)}
              onDragOver={(event) => onDragOver(event, project)}
              onDragLeave={onDragLeave}
              onDrop={(event) => onDrop(event, project)}
              onDragEnd={() => {
                setDraggingId(null);
                setDragOverId(null);
              }}
            >
              <ProjectCard
                project={project}
                href={`/crm/projects/${project.id}`}
                showGroup
                draggable={false}
              />
              {canManageGroups && isGroupableProject(project) ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  title="Gabungkan ke group"
                  aria-label={`Gabungkan ${project.name} ke group`}
                  className="absolute top-2 left-2 z-20 opacity-100 shadow-sm transition-opacity focus-visible:opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100"
                  onClick={() => openGroupDialog([project.id])}
                >
                  <Users className="size-3.5" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <GroupDialog
        open={groupDialogOpen}
        onOpenChange={(open) => {
          setGroupDialogOpen(open);
          if (!open) setGroupInitialProjects([]);
        }}
        initialProjectIds={groupInitialProjects}
      />
    </div>
  );
}

