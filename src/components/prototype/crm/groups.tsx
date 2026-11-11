"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FolderKanban, Plus, Users } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canAddProjectToGroup,
  canCreateGroup,
  canManageGroup,
  completionStats,
  groupCompleted,
  groupProgress,
  groupsForUser,
  isGroupableProject,
  userById,
  visibleProjects,
} from "@/lib/prototype/domain";
import type { Project } from "@/lib/prototype/types";
import { EmptyState, NativeSelect, PageHeader, ProgressBar, SectionCard } from "../ui";
import { GroupDialog } from "../dialogs";
import { GroupMemberRow } from "../group-member-row";
import { useViewPreference, ViewToggle } from "../view-toggle";

function AvailableProjectChip({ project }: { project: Project }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `available-${project.id}` });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      type="button"
      className={`bg-card rounded-md border px-2 py-1 text-[10px] shadow-sm ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      {project.code} · {project.name}
    </button>
  );
}

function UmbrellaDrop({
  groupId,
  children,
}: {
  groupId: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `umbrella-${groupId}` });
  return (
    <div
      ref={setNodeRef}
      className={isOver ? "rounded-xl ring-2 ring-primary/40 ring-offset-2" : undefined}
    >
      {children}
    </div>
  );
}

export function CrmGroups() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const projects = visibleProjects(store);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addProjectId, setAddProjectId] = useState<Record<string, string>>({});
  const [view, setView] = useViewPreference("crm-groups");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    const groupId = new URLSearchParams(window.location.search).get("group");
    if (!groupId) return;
    const target = document.getElementById(`group-${groupId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (!currentUser) return null;
  const canCreate = canCreateGroup(currentUser);
  const groups = groupsForUser(store, currentUser);
  const availableProjects = projects.filter(
    (project) =>
      isGroupableProject(project) &&
      (currentUser.role !== "pm" || project.createdById === currentUser.id),
  );

  const onDragEnd = (event: DragEndEvent) => {
    if (!event.over || !currentUser) return;
    const projectId = String(event.active.id).replace("available-", "");
    const groupId = String(event.over.id).replace("umbrella-", "");
    const project = store.projects.find((item) => item.id === projectId);
    const group = store.groups.find((item) => item.id === groupId);
    if (!project || !group) return;
    if (!canAddProjectToGroup(currentUser, group, project)) {
      toast.error("Anda tidak dapat menambahkan proyek ini.");
      return;
    }
    store.addProjectToGroup(groupId, projectId);
    toast.success("Proyek ditambahkan ke Umbrella.");
  };

  const addMember = (groupId: string) => {
    const projectId = addProjectId[groupId];
    if (!projectId) return;
    store.addProjectToGroup(groupId, projectId);
    setAddProjectId((current) => ({ ...current, [groupId]: "" }));
    toast.success("Proyek ditambahkan ke Umbrella.");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Umbrella"
        description="Kelompokkan proyek untuk melihat rollup dan penyelesaian program."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle value={view} onChange={setView} />
            {canCreate ? (
              <Button
                onClick={() => {
                  setEditingId(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="size-4" /> Umbrella baru
              </Button>
            ) : null}
          </div>
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada Umbrella"
          description="Umbrella minimal berisi 2 proyek. PM dapat membuat Umbrella untuk proyeknya sendiri."
        />
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="text-muted-foreground border-b bg-muted/30 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Umbrella</th>
                <th className="px-3 py-2">Deskripsi</th>
                <th className="px-3 py-2">Proyek</th>
                <th className="px-3 py-2">Progress</th>
                <th className="px-3 py-2">Selesai</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const members = projects.filter(
                  (project) => project.groupId === group.id,
                );
                const progress = groupProgress(store, group.id);
                const stats = completionStats(members);
                return (
                  <tr key={group.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <a
                        href={`#group-${group.id}`}
                        className="font-medium hover:underline"
                      >
                        {group.name}
                      </a>
                    </td>
                    <td className="px-3 py-2">
                      {group.description || "—"}
                    </td>
                    <td className="px-3 py-2">{members.length}</td>
                    <td className="w-[160px] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={progress} className="flex-1" />
                        <span className="tabular-nums">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {stats.completed}/{stats.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid gap-4">
            {availableProjects.length > 0 ? (
              <div className="bg-muted/30 rounded-lg border p-3">
                <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
                  Tarik proyek ke Umbrella
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableProjects.map((project) => (
                    <AvailableProjectChip key={project.id} project={project} />
                  ))}
                </div>
              </div>
            ) : null}
          {groups.map((group) => {
            const members = projects.filter((project) => project.groupId === group.id);
            const memberIds = new Set(members.map((project) => project.id));
            const candidates = projects.filter(
              (project) =>
                isGroupableProject(project) &&
                !memberIds.has(project.id) &&
                canAddProjectToGroup(currentUser, group, project),
            );
            const groupManage = canManageGroup(currentUser, group);
            const stats = completionStats(members);
            const completed = groupCompleted(store, group.id);
            const allCancelled =
              members.length > 0 && members.every((project) => project.status === "cancelled");
            const status = allCancelled ? "cancelled" : completed ? "completed" : group.status;
            const owner = userById(store, group.createdById);
            return (
              <UmbrellaDrop key={group.id} groupId={group.id}>
              <div
                id={`group-${group.id}`}
                className="scroll-mt-4"
              >
                <SectionCard
                title={group.name}
                description={`${members.length} proyek · dibuat oleh ${owner?.name ?? "—"}`}
                actions={
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        status === "completed"
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                          : status === "cancelled"
                            ? "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                            : "rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700"
                      }
                    >
                      {status}
                    </span>
                    {groupManage ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(group.id);
                            setDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (!window.confirm("Bubarkan Umbrella ini?")) return;
                            store.disbandGroup(group.id);
                            toast.success("Umbrella dibubarkan.");
                          }}
                        >
                          Bubarkan
                        </Button>
                      </>
                    ) : null}
                  </div>
                }
              >
                <div className="mb-3 flex items-center gap-3">
                  <ProgressBar value={stats.percent} className="flex-1" />
                  <span className="text-xs font-semibold">
                    {stats.completed} dari {stats.total} selesai
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  {members.map((project) => (
                    <GroupMemberRow
                      key={project.id}
                      project={project}
                      onRemove={
                        groupManage && status === "active"
                          ? () => {
                              store.removeProjectFromGroup(project.id);
                              toast.success("Proyek dikeluarkan dari Umbrella.");
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>

                {groupManage && status === "active" && candidates.length > 0 ? (
                  <div className="mt-3 flex items-center gap-2">
                    <NativeSelect
                      value={addProjectId[group.id] ?? ""}
                      onChange={(value) =>
                        setAddProjectId((current) => ({ ...current, [group.id]: value }))
                      }
                      className="h-8 max-w-xs text-xs"
                    >
                      <option value="">Tambah proyek…</option>
                      {candidates.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.code} · {project.name}
                        </option>
                      ))}
                    </NativeSelect>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!addProjectId[group.id]}
                      onClick={() => addMember(group.id)}
                    >
                      <FolderKanban className="size-3.5" /> Tambah
                    </Button>
                  </div>
                ) : null}
              </SectionCard>
              </div>
              </UmbrellaDrop>
            );
          })}
          </div>
        </DndContext>
      )}

      <GroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        group={editingId ? store.groups.find((group) => group.id === editingId) : undefined}
      />
    </div>
  );
}
