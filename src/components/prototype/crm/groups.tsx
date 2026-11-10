"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FolderKanban, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  completionStats,
  formatCurrency,
  groupCompleted,
  groupProgress,
  isGroupableProject,
  umbrellaCommercialTotals,
  userById,
  visibleProjects,
} from "@/lib/prototype/domain";
import { EmptyState, NativeSelect, PageHeader, ProgressBar, SectionCard } from "../ui";
import { GroupDialog } from "../dialogs";
import { GroupMemberRow } from "../group-member-row";
import { useViewPreference, ViewToggle } from "../view-toggle";

export function CrmGroups() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const projects = visibleProjects(store);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addProjectId, setAddProjectId] = useState<Record<string, string>>({});
  const [view, setView] = useViewPreference("crm-groups");

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
    toast.success("Proyek ditambahkan ke Umbrella Project.");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Umbrella Projects"
        description="Kelompokkan proyek untuk melihat rollup komersial dan penyelesaian program."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle value={view} onChange={setView} />
            {canManage ? (
              <Button
                onClick={() => {
                  setEditingId(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="size-4" /> Umbrella Project baru
              </Button>
            ) : null}
          </div>
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada Umbrella Project"
          description="Umbrella Project minimal berisi 2 proyek. Hanya Manager/Admin yang dapat mengelola."
        />
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="text-muted-foreground border-b bg-muted/30 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Umbrella Project</th>
                <th className="px-3 py-2">Deskripsi</th>
                <th className="px-3 py-2">Proyek</th>
                <th className="px-3 py-2">Progress</th>
                <th className="px-3 py-2">Selesai</th>
                <th className="px-3 py-2">Akumulatif RAB</th>
                <th className="px-3 py-2">Akumulatif MO</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const members = projects.filter(
                  (project) => project.groupId === group.id,
                );
                const progress = groupProgress(store, group.id);
                const stats = completionStats(members);
                const commercial = umbrellaCommercialTotals(store, group.id);
                return (
                  <tr key={group.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        href={`/crm/umbrella-projects/${group.id}`}
                        className="font-medium hover:underline"
                      >
                        {group.name}
                      </Link>
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
                    <td className="px-3 py-2">
                      {commercial.rab > 0 ? formatCurrency(commercial.rab) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {commercial.mo > 0 ? formatCurrency(commercial.mo) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
            const commercial = umbrellaCommercialTotals(store, group.id);
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
                title={
                  <Link
                    href={`/crm/umbrella-projects/${group.id}`}
                    className="hover:underline"
                  >
                    {group.name}
                  </Link>
                }
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
                            if (!window.confirm("Bubarkan Umbrella Project ini?")) return;
                            store.disbandGroup(group.id);
                            toast.success("Umbrella Project dibubarkan.");
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
                {commercial.rab > 0 || commercial.mo > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
                    {commercial.rab > 0 ? (
                      <span className="bg-muted rounded-md px-2 py-1 font-semibold">
                        Akumulatif RAB {formatCurrency(commercial.rab)}
                      </span>
                    ) : null}
                    {commercial.mo > 0 ? (
                      <span className="bg-muted rounded-md px-2 py-1 font-semibold">
                        Akumulatif MO {formatCurrency(commercial.mo)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
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
                                  "Umbrella Project minimal 2 proyek. Bubarkan jika ingin mengosongkan.",
                                );
                                return;
                              }
                              store.removeProjectFromGroup(project.id);
                              toast.success("Proyek dikeluarkan dari Umbrella Project.");
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
