"use client";

import Link from "next/link";
import { useState } from "react";
import { FolderKanban, Plus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  calculateJourneyProgress,
  groupCompleted,
  groupProgress,
  isGroupableProject,
  userById,
  visibleProjects,
} from "@/lib/prototype/domain";
import { EmptyState, NativeSelect, PageHeader, ProgressBar, SectionCard } from "../ui";
import { GroupDialog } from "../dialogs";

export function CrmGroups() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const projects = visibleProjects(store);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addProjectId, setAddProjectId] = useState<Record<string, string>>({});

  if (!currentUser) return null;
  const canManage = currentUser.role === "admin" || currentUser.role === "manager";
  const groups = store.groups.filter(
    (group) =>
      canManage || projects.some((project) => project.groupId === group.id),
  );

  const addMember = (groupId: string) => {
    const projectId = addProjectId[groupId];
    if (!projectId) return;
    store.addProjectToGroup(groupId, projectId);
    setAddProjectId((current) => ({ ...current, [groupId]: "" }));
    toast.success("Proyek ditambahkan ke group.");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Groups"
        description="Kelompokkan proyek untuk melihat rollup dan penyelesaian program."
        actions={
          canManage ? (
            <Button
              onClick={() => {
                setEditingId(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" /> Group baru
            </Button>
          ) : null
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada group"
          description="Group minimal berisi 2 proyek. Hanya Manager/Admin yang dapat mengelola."
        />
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => {
            const members = projects.filter((project) => project.groupId === group.id);
            const memberIds = new Set(members.map((project) => project.id));
            const candidates = projects.filter(
              (project) =>
                isGroupableProject(project) && !memberIds.has(project.id),
            );
            const progress = groupProgress(store, group.id);
            const completed = groupCompleted(store, group.id);
            const allCancelled =
              members.length > 0 && members.every((project) => project.status === "cancelled");
            const status = allCancelled ? "cancelled" : completed ? "completed" : group.status;
            const owner = userById(store, group.createdById);
            return (
              <SectionCard
                key={group.id}
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
                    {canManage ? (
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
                            if (!window.confirm("Bubarkan group ini?")) return;
                            store.disbandGroup(group.id);
                            toast.success("Group dibubarkan.");
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
                  <ProgressBar value={progress} className="flex-1" />
                  <span className="text-xs font-semibold">{progress}%</span>
                </div>
                <div className="space-y-2">
                  {members.map((project) => {
                    const journey = calculateJourneyProgress(store, project.id);
                    return (
                      <div
                        key={project.id}
                        className="flex items-center gap-3 rounded-lg border px-3 py-2"
                      >
                        <div
                          className="size-8 shrink-0 rounded-md"
                          style={{ backgroundColor: project.coverColor }}
                        />
                        <Link
                          href={`/crm/projects/${project.id}`}
                          className="min-w-0 flex-1"
                        >
                          <p className="truncate text-xs font-semibold">{project.name}</p>
                          <p className="text-muted-foreground text-[10px]">
                            {project.code} · {project.status}
                          </p>
                        </Link>
                        <div className="w-24">
                          <ProgressBar value={journey} className="h-1.5" />
                          <p className="text-muted-foreground mt-1 text-right text-[9px]">
                            {journey}%
                          </p>
                        </div>
                        {canManage && status === "active" ? (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Keluarkan dari group"
                            onClick={() => {
                              if (members.length <= 2) {
                                toast.error(
                                  "Group minimal 2 proyek. Bubarkan group jika ingin mengosongkan.",
                                );
                                return;
                              }
                              store.removeProjectFromGroup(project.id);
                              toast.success("Proyek dikeluarkan dari group.");
                            }}
                          >
                            <X className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {canManage && status === "active" && candidates.length > 0 ? (
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
            );
          })}
        </div>
      )}

      <GroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        group={editingId ? store.groups.find((group) => group.id === editingId) : undefined}
      />
    </div>
  );
}
