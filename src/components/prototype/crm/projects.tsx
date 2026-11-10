"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import {
  ChevronDown,
  FolderKanban,
  Plus,
  Search,
  Settings2,
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
  prospekById,
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
  AvatarStack,
  NativeSelect,
  PageHeader,
  ProgressBar,
} from "../ui";
import { ProjectCard, projectTeam } from "../project-card";
import { GroupMemberRow } from "../group-member-row";
import { GroupDialog } from "../dialogs";
import { useViewPreference, ViewToggle } from "../view-toggle";

const OPEN_GROUP_KEY = "crm-projects-open-group";

function matchesQuery(project: Project, query: string): boolean {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return `${project.name} ${project.code} ${project.client}`
    .toLowerCase()
    .includes(value);
}

function ProjectGroupCard({
  groupId,
  members,
  open,
  onToggle,
  canManage,
  searchQuery,
}: {
  groupId: string;
  members: Project[];
  open: boolean;
  onToggle: () => void;
  canManage: boolean;
  searchQuery: string;
}) {
  const store = usePrototypeStore();
  const group = store.groups.find((item) => item.id === groupId);
  const [showAll, setShowAll] = useState(false);
  const panelId = `project-group-${groupId}`;
  const searchActive = searchQuery.trim().length > 0;

  if (!group) return null;
  const stats = completionStats(members);
  const displayedMembers =
    searchActive || showAll ? members : members.slice(0, 6);

  return (
    <div
      style={{ gridColumn: open ? "1 / -1" : undefined }}
      className={cn(
        "bg-card ring-foreground/10 flex flex-col overflow-hidden rounded-xl shadow-sm ring-1 transition-all duration-200",
        open && "shadow-md",
      )}
    >
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
            {canManage ? (
              <Link
                href={`/crm/groups?group=${groupId}#group-${groupId}`}
                className="text-primary ml-auto inline-flex items-center gap-1 text-[10px] font-medium hover:underline"
              >
                <Settings2 className="size-3" /> Kelola
              </Link>
            ) : null}
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

          {!open && members.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {members.slice(0, 3).map((member) => (
                <span
                  key={member.id}
                  title={member.name}
                  className="bg-muted text-muted-foreground max-w-24 truncate rounded px-1.5 py-0.5 text-[9px] font-medium"
                >
                  {member.code}
                </span>
              ))}
              {members.length > 3 ? (
                <span
                  title={members
                    .slice(3)
                    .map((member) => member.name)
                    .join(", ")}
                  className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[9px] font-medium"
                >
                  +{members.length - 3}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="hover:bg-muted/50 focus-visible:ring-ring/50 flex items-center justify-between border-t px-4 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <span>{open ? "Tutup daftar proyek" : "Lihat daftar proyek"}</span>
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          id={panelId}
          className="animate-in fade-in-0 border-t duration-200"
        >
          {displayedMembers.map((member) => (
            <GroupMemberRow
              key={member.id}
              project={member}
              highlighted={searchActive && matchesQuery(member, searchQuery)}
              muted={searchActive && !matchesQuery(member, searchQuery)}
            />
          ))}

          {!searchActive && members.length > 6 ? (
            <div className="px-3 py-2">
              <Button
                variant="link"
                size="xs"
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll
                  ? "Tampilkan lebih sedikit"
                  : `Lihat semua (${members.length})`}
              </Button>
            </div>
          ) : null}
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
  const [typeFilter, setTypeFilter] = useState("all");
  const [phase, setPhase] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupInitialProjects, setGroupInitialProjects] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [searchClosedIds, setSearchClosedIds] = useState<string[]>([]);
  const [view, setView] = useViewPreference("crm-projects");

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(OPEN_GROUP_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setOpenGroupId(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (openGroupId) sessionStorage.setItem(OPEN_GROUP_KEY, openGroupId);
      else sessionStorage.removeItem(OPEN_GROUP_KEY);
    } catch {
      /* ignore */
    }
  }, [openGroupId]);

  const searchActive = search.trim().length > 0;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (typeFilter === "prospek" && !project.prospekId) return false;
      if (query) {
        const parent = project.prospekId
          ? prospekById(store, project.prospekId)?.name ?? ""
          : "";
        const haystack =
          `${project.name} ${project.code} ${project.client} ${parent}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (status && project.status !== status) return false;
      if (priority && project.priority !== priority) return false;
      if (templateFilter && project.templateId !== templateFilter) return false;
      if (phase) {
        const active = store.steps.filter(
          (step) => step.projectId === project.id && step.status === "active",
        );
        if (!active.some((step) => step.phase === phase)) return false;
      }
      return true;
    });
  }, [projects, search, status, priority, phase, templateFilter, store, typeFilter]);

  if (!currentUser) return null;
  const canManageGroups =
    currentUser.role === "admin" || currentUser.role === "manager";
  const showGroups = typeFilter !== "project";
  const showProjects = typeFilter !== "group";

  const ungrouped = showProjects
    ? filtered.filter((project) => !project.groupId || project.prospekId)
    : [];
  const filteredIds = new Set(filtered.map((project) => project.id));
  const groupCards = showGroups
    ? store.groups
        .map((group) => ({
          group,
          members: projects.filter((project) => project.groupId === group.id),
        }))
        .filter(
          ({ members }) =>
            members.length > 0 &&
            members.some((project) => filteredIds.has(project.id)),
        )
    : [];
  const matchingGroupIds = groupCards.map(({ group }) => group.id);

  const isGroupOpen = (groupId: string) =>
    searchActive
      ? matchingGroupIds.includes(groupId) &&
        !searchClosedIds.includes(groupId)
      : openGroupId === groupId;

  const toggleGroup = (groupId: string) => {
    if (searchActive) {
      setSearchClosedIds((current) =>
        current.includes(groupId)
          ? current.filter((id) => id !== groupId)
          : [...current, groupId],
      );
      return;
    }
    setOpenGroupId((current) => (current === groupId ? null : groupId));
  };

  const closeAllGroups = () => {
    if (searchActive) {
      setSearchClosedIds(matchingGroupIds);
      return;
    }
    setOpenGroupId(null);
  };

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

  const hasResults =
    (showGroups && groupCards.length > 0) ||
    (showProjects && ungrouped.length > 0);

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
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle value={view} onChange={setView} />
            {canCreateProject(currentUser) ? (
              <Link href="/crm/projects/new">
                <Button>
                  <Plus className="size-4" /> Proyek baru
                </Button>
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_130px_130px_130px_130px_130px]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSearchClosedIds([]);
            }}
            placeholder="Cari proyek atau anggota group…"
            className="pl-8"
          />
        </div>
        <NativeSelect
          value={typeFilter}
          onChange={(value) => {
            setTypeFilter(value);
            setSearchClosedIds([]);
          }}
        >
          <option value="all">Semua tipe</option>
          <option value="group">Group</option>
          <option value="project">Project</option>
          <option value="prospek">Berasal dari Prospek</option>
        </NativeSelect>
        <NativeSelect value={phase} onChange={setPhase}>
          <option value="">Semua fase</option>
          {Object.entries(PHASE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={templateFilter} onChange={setTemplateFilter}>
          <option value="">Semua template</option>
          {store.templates
            .filter((template) => template.status === "active" || template.legacy)
            .map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
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

      {!hasResults ? (
        <EmptyState
          icon={FolderKanban}
          title={searchActive ? "Tidak ada hasil" : "Tidak ada proyek"}
          description={
            searchActive
              ? "Tidak ada project atau group yang cocok dengan pencarian."
              : "Ubah filter atau buat proyek baru."
          }
        />
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="text-muted-foreground border-b bg-muted/30 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Proyek</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Fase</th>
                <th className="px-3 py-2">Progress</th>
                <th className="px-3 py-2">Anggota</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => {
                const activeStep = store.steps.find(
                  (step) =>
                    step.projectId === project.id && step.status === "active",
                );
                const journey = calculateJourneyProgress(store, project.id);
                const team = projectTeam(project.id, store);
                return (
                  <tr
                    key={project.id}
                    className="hover:bg-muted/40 cursor-pointer border-b last:border-0"
                    onClick={() => {
                      window.location.href = `/crm/projects/${project.id}`;
                    }}
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium">{project.name}</p>
                      <p className="text-muted-foreground text-[10px]">
                        {project.code}
                      </p>
                    </td>
                    <td className="px-3 py-2">{project.client || "—"}</td>
                    <td className="px-3 py-2 capitalize">{project.status}</td>
                    <td className="px-3 py-2">
                      {activeStep ? PHASE_LABEL[activeStep.phase] : "—"}
                    </td>
                    <td className="w-[150px] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={journey} className="flex-1" />
                        <span className="tabular-nums">{journey}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <AvatarStack users={team} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          {showGroups && groupCards.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
                  Groups
                </h2>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={closeAllGroups}
                  disabled={
                    !groupCards.some(({ group }) => isGroupOpen(group.id))
                  }
                >
                  Tutup semua
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {groupCards.map(({ group, members }) => (
                  <ProjectGroupCard
                    key={group.id}
                    groupId={group.id}
                    members={members}
                    open={isGroupOpen(group.id)}
                    onToggle={() => toggleGroup(group.id)}
                    canManage={canManageGroups}
                    searchQuery={search}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {showProjects && ungrouped.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
                Projects
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {ungrouped.map((project) => (
                  <div
                    key={project.id}
                    className={cn(
                      "group/card relative rounded-xl transition-all",
                      draggingId === project.id && "opacity-50",
                      dragOverId === project.id &&
                        "ring-primary ring-offset-background ring-2 ring-offset-2",
                    )}
                    draggable={
                      canManageGroups && isGroupableProject(project)
                    }
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
                    {project.prospekId ? (
                      <Link
                        href={`/crm/prospek/${project.prospekId}`}
                        className="text-primary mt-1 inline-flex px-1 text-[10px] font-medium hover:underline"
                      >
                        Dari Prospek:{" "}
                        {prospekById(store, project.prospekId)?.name ??
                          project.prospekId}
                      </Link>
                    ) : null}
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
            </section>
          ) : null}
        </div>
      )}

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
