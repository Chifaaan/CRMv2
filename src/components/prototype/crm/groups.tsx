"use client";

import { useEffect, useState } from "react";
import { FolderKanban, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  completionStats,
  groupCompleted,
  isGroupableProject,
  userById,
  visibleProjects,
} from "@/lib/prototype/domain";
import { EmptyState, NativeSelect, PageHeader, ProgressBar, SectionCard } from "../ui";
import { GroupDialog } from "../dialogs";
import { GroupMemberRow } from "../group-member-row";

export function CrmGroups() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const projects = visibleProjects(store);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addProjectId, setAddProjectId] = useState<Record<string, string>>({});

  useEffect(() => {
    const groupId = new URLSearchParams(window.location.search).get("group");
    if (!groupId) return;
    const target = document.getElementById(`group-${groupId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
            const stats = completionStats(members);
            const completed = groupCompleted(store, group.id);
            const allCancelled =
              members.length > 0 && members.every((project) => project.status === "cancelled");
            const status = allCancelled ? "cancelled" : completed ? "completed" : group.status;
            const owner = userById(store, group.createdById);
            return (
              <div
                key={group.id}
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
                        canManage && status === "active"
                          ? () => {
                              if (members.length <= 2) {
                                toast.error(
                                  "Group minimal 2 proyek. Bubarkan group jika ingin mengosongkan.",
                                );
                                return;
                              }
                              store.removeProjectFromGroup(project.id);
                              toast.success("Proyek dikeluarkan dari group.");
                            }
                          : undefined
                      }
                    />
                  ))}
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
              </div>
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
