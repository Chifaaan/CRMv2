"use client";

import Link from "next/link";
import { ArrowLeft, FolderKanban, Users } from "lucide-react";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  calculateJourneyProgress,
  completionStats,
  formatCurrency,
  formatDate,
  isCommercialProjectClosed,
  projectCommercialTotals,
  projectPhase,
  roleCanViewUmbrella,
  umbrellaCommercialTotals,
  userById,
} from "@/lib/prototype/domain";
import { PHASE_LABEL } from "@/lib/prototype/types";
import {
  EmptyState,
  PageHeader,
  ProgressBar,
  SectionCard,
} from "../ui";

export function UmbrellaDetail({ umbrellaId }: { umbrellaId: string }) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const umbrella = store.groups.find((group) => group.id === umbrellaId);

  if (!currentUser || !roleCanViewUmbrella(currentUser.role)) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Akses ditolak"
        description="Umbrella Project hanya untuk Admin, Manager, PM, dan Finance."
      />
    );
  }
  if (!umbrella) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Umbrella Project tidak ditemukan"
        description="Umbrella Project mungkin sudah dibubarkan."
      />
    );
  }

  const members = store.projects.filter(
    (project) => project.groupId === umbrella.id,
  );
  const progress = completionStats(members);
  const commercial = umbrellaCommercialTotals(store, umbrella.id);
  const owner = userById(store, umbrella.createdById);
  const visibleMemberIds = new Set(
    currentUser.role === "pm"
      ? store.projects
          .filter((project) => project.createdById === currentUser.id)
          .map((project) => project.id)
      : store.projects.map((project) => project.id),
  );

  return (
    <div className="space-y-4">
      <Link
        href="/crm/umbrella-projects"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="size-3.5" /> Kembali ke Umbrella Projects
      </Link>

      <PageHeader
        title={umbrella.name}
        description={umbrella.description || "Tanpa deskripsi"}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Status
          </p>
          <p className="mt-1 text-lg font-semibold capitalize">{umbrella.status}</p>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Dibuat {formatDate(umbrella.createdAt)}
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Proyek terkait
          </p>
          <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
            <Users className="size-4" /> {members.length}
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Dikelola oleh {owner?.name ?? "—"}
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Akumulatif RAB
          </p>
          <p className="mt-1 text-lg font-semibold">
            {commercial.rab > 0 ? formatCurrency(commercial.rab) : "Belum ada"}
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">
            RAB approved dari proyek anggota
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Akumulatif MO
          </p>
          <p className="mt-1 text-lg font-semibold">
            {commercial.mo > 0 ? formatCurrency(commercial.mo) : "Belum ada"}
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Revenue MO non-cancelled
          </p>
        </div>
      </div>

      <SectionCard
        title="Progress umbrella"
        description={`${progress.completed} dari ${progress.total} proyek selesai.`}
      >
        <ProgressBar value={progress.percent} />
        <p className="text-muted-foreground mt-2 text-[11px]">
          {progress.percent}% proyek selesai. Proyek batal tidak dihitung.
        </p>
        {commercial.unmappedRab + commercial.unmappedMo > 0 ? (
          <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
            {commercial.unmappedRab + commercial.unmappedMo} item belum punya unit bisnis
            dan tidak masuk akumulasi.
          </p>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Proyek terkait"
        description="Rincian RAB dan MO setiap proyek anggota."
      >
        {members.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Belum ada proyek"
            description="Tambahkan proyek ke Umbrella Project dari halaman daftar."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="text-muted-foreground border-b bg-muted/30 text-[10px] uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2">Proyek</th>
                  <th className="px-3 py-2">Status / Fase</th>
                  <th className="px-3 py-2">Progress</th>
                  <th className="px-3 py-2">Akumulatif RAB</th>
                  <th className="px-3 py-2">Akumulatif MO</th>
                </tr>
              </thead>
              <tbody>
                {members.map((project) => {
                  const totals = projectCommercialTotals(store, project.id);
                  const phase = projectPhase(project, store.steps);
                  const journey = calculateJourneyProgress(store, project.id);
                  const canOpen = visibleMemberIds.has(project.id);
                  return (
                    <tr key={project.id} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        {canOpen ? (
                          <Link
                            href={`/crm/projects/${project.id}`}
                            className="font-medium hover:underline"
                          >
                            {project.name}
                          </Link>
                        ) : (
                          <span className="font-medium">{project.name}</span>
                        )}
                        <p className="text-muted-foreground text-[10px]">
                          {project.code}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        {project.status === "active"
                          ? PHASE_LABEL[phase]
                          : project.status}
                      </td>
                      <td className="w-[140px] px-3 py-2">
                        <ProgressBar value={journey} className="h-1.5" />
                        <p className="text-muted-foreground mt-1 text-right text-[9px]">
                          {journey}%
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        {isCommercialProjectClosed(project)
                          ? "—"
                          : totals.rab > 0
                            ? formatCurrency(totals.rab)
                            : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {isCommercialProjectClosed(project)
                          ? "—"
                          : totals.mo > 0
                            ? formatCurrency(totals.mo)
                            : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
