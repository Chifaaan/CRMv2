"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  FolderKanban,
  Gauge,
  PlayCircle,
  Wallet,
} from "lucide-react";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  activeSteps,
  calculateJourneyProgress,
  formatDate,
  groupProgress,
  userById,
  visibleProjects,
} from "@/lib/prototype/domain";
import { PHASE_LABEL, PHASE_ORDER, type Phase } from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  PageHeader,
  PhaseBadge,
  ProgressBar,
  SectionCard,
  StatCard,
  UserAvatar,
} from "../ui";

const PHASES: Phase[] = PHASE_ORDER;

export function CrmDashboard() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const projects = visibleProjects(store);
  const active = projects.filter((project) => project.status === "active");

  if (!currentUser) return null;

  const phaseCounts = PHASE_ORDER.reduce(
    (counts, phase) => {
      counts[phase] = active.filter((project) =>
        activeSteps(store, project.id).some((step) => step.phase === phase),
      ).length;
      return counts;
    },
    {} as Record<Phase, number>,
  );

  const actions = (() => {
    const items: { title: string; description: string; href: string; tone: string }[] = [];
    if (currentUser.role === "pm" || currentUser.role === "admin") {
      const drafts = store.pitchings.filter(
        (pitching) =>
          pitching.status === "draft" &&
          projects.some((project) => project.id === pitching.projectId),
      );
      for (const pitching of drafts.slice(0, 3)) {
        const project = store.projects.find((item) => item.id === pitching.projectId);
        items.push({
          title: `Pitching ${pitching.title} belum diputuskan`,
          description: project?.name ?? "",
          href: `/crm/projects/${pitching.projectId}`,
          tone: "bg-violet-100 text-violet-700",
        });
      }
      const submitted = store.forms.filter(
        (form) =>
          form.status === "submitted" &&
          projects.some((project) => project.id === form.projectId),
      );
      for (const form of submitted.slice(0, 3)) {
        const project = store.projects.find((item) => item.id === form.projectId);
        items.push({
          title: `${form.type.toUpperCase()} menunggu review`,
          description: project?.name ?? "",
          href: `/crm/projects/${form.projectId}`,
          tone: "bg-sky-100 text-sky-700",
        });
      }
    }
    if (currentUser.role === "manager" || currentUser.role === "admin") {
      const unassigned = store.tasks.filter(
        (task) =>
          !task.archivedAt &&
          task.status === "backlog" &&
          !task.assigneeId &&
          projects.some((project) => project.id === task.projectId),
      );
      for (const task of unassigned.slice(0, 3)) {
        items.push({
          title: `${task.code} belum di-assign`,
          description: task.title,
          href: `/projects/${task.projectId}/board`,
          tone: "bg-amber-100 text-amber-800",
        });
      }
      const unassignedForms = store.forms.filter(
        (form) =>
          form.status === "unassigned" &&
          projects.some((project) => project.id === form.projectId),
      );
      for (const form of unassignedForms.slice(0, 2)) {
        const project = store.projects.find((item) => item.id === form.projectId);
        items.push({
          title: `${form.type.toUpperCase()} belum di-assign`,
          description: project?.name ?? "",
          href: `/crm/projects/${form.projectId}`,
          tone: "bg-rose-100 text-rose-700",
        });
      }
    }
    if (currentUser.role === "finance" || currentUser.role === "admin") {
      const financeForms = store.forms.filter(
        (form) =>
          form.assigneeId === currentUser.id &&
          (form.status === "assigned" || form.status === "draft") &&
          projects.some((project) => project.id === form.projectId),
      );
      for (const form of financeForms.slice(0, 4)) {
        const project = store.projects.find((item) => item.id === form.projectId);
        items.push({
          title: `${form.type.toUpperCase()} perlu diisi`,
          description: project?.name ?? "",
          href: `/crm/projects/${form.projectId}`,
          tone: "bg-emerald-100 text-emerald-700",
        });
      }
    }
    return items.slice(0, 8);
  })();

  const groups = store.groups.filter((group) =>
    projects.some((project) => project.groupId === group.id),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Selamat datang, ${currentUser.name.split(" ")[0]}`}
        description="Pantau journey proyek, pitching, form, dan pekerjaan yang menunggu tindakan."
        actions={
          <Link
            href="/crm/projects"
            className="text-primary inline-flex items-center gap-1 text-xs font-medium"
          >
            Lihat semua proyek <ArrowRight className="size-3.5" />
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Proyek aktif" value={active.length} sub={`${projects.length} total terlihat`} icon={FolderKanban} />
        <StatCard label="Prospek" value={phaseCounts.prospek} sub="Brief sampai menang" icon={ClipboardCheck} accent="from-amber-500 to-orange-600" />
        <StatCard label="Planning" value={phaseCounts.planning} sub="Komitmen vendor & venue" icon={ClipboardCheck} accent="from-violet-500 to-indigo-600" />
        <StatCard label="Running" value={phaseCounts.running} sub="Eksekusi di SIMPRO" icon={PlayCircle} accent="from-sky-500 to-blue-600" />
        <StatCard label="Closing" value={phaseCounts.closing} sub="BAST, Invoice, evaluasi" icon={Wallet} accent="from-emerald-500 to-teal-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Pipeline proyek"
          description="Proyek aktif berdasarkan fase yang sedang berjalan."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {PHASES.map((phase) => {
              const list = active.filter((project) =>
                activeSteps(store, project.id).some((step) => step.phase === phase),
              );
              return (
                <div key={phase} className="rounded-xl border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <PhaseBadge phase={phase} />
                    <span className="text-muted-foreground text-xs">{list.length}</span>
                  </div>
                  <div className="space-y-2">
                    {list.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-center text-[11px]">
                        Tidak ada proyek.
                      </p>
                    ) : (
                      list.map((project) => {
                        const progress = calculateJourneyProgress(store, project.id);
                        const step = activeSteps(store, project.id)[0];
                        return (
                          <Link
                            key={project.id}
                            href={`/crm/projects/${project.id}`}
                            className="bg-card hover:ring-primary/40 block rounded-lg p-2.5 ring-1 ring-foreground/10 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold">{project.name}</p>
                                <p className="text-muted-foreground truncate text-[10px]">
                                  {step?.name ?? PHASE_LABEL[phase]}
                                </p>
                              </div>
                              <span className="text-[10px] font-semibold">{progress}%</span>
                            </div>
                            <ProgressBar value={progress} className="mt-2 h-1.5" />
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Perlu tindakan"
          description="Item yang menunggu role Anda."
        >
          {actions.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Tidak ada tindakan mendesak"
              description="Semua pekerjaan untuk role ini sedang kosong."
            />
          ) : (
            <div className="space-y-2">
              {actions.map((action, index) => (
                <Link
                  key={`${action.href}-${index}`}
                  href={action.href}
                  className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors"
                >
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", action.tone)}>
                    <AlertCircle className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{action.title}</span>
                    <span className="text-muted-foreground block truncate text-[10px]">
                      {action.description}
                    </span>
                  </span>
                  <ArrowRight className="text-muted-foreground size-3.5" />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Proyek terbaru" description="Urut berdasarkan aktivitas terakhir.">
          <div className="space-y-2">
            {projects.slice(0, 5).map((project) => {
              const progress = calculateJourneyProgress(store, project.id);
              const step = activeSteps(store, project.id)[0];
              const owner = userById(store, project.createdById);
              return (
                <Link
                  key={project.id}
                  href={`/crm/projects/${project.id}`}
                  className="hover:bg-muted/40 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
                >
                  <div
                    className="size-9 shrink-0 rounded-lg"
                    style={{ backgroundColor: project.coverColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{project.name}</p>
                    <p className="text-muted-foreground truncate text-[10px]">
                      {project.code} · {step?.name ?? project.status}
                    </p>
                  </div>
                  <div className="hidden w-24 sm:block">
                    <ProgressBar value={progress} className="h-1.5" />
                    <p className="text-muted-foreground mt-1 text-right text-[9px]">{progress}%</p>
                  </div>
                  <UserAvatar user={owner} size="sm" />
                </Link>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Group" description="Rollup proyek yang dikelompokkan.">
          {groups.length === 0 ? (
            <EmptyState
              icon={BriefcaseBusiness}
              title="Belum ada group"
              description="Manager dapat mengelompokkan minimal 2 proyek."
            />
          ) : (
            <div className="space-y-2">
              {groups.map((group) => {
                const members = projects.filter((project) => project.groupId === group.id);
                const progress = groupProgress(store, group.id);
                return (
                  <Link
                    key={group.id}
                    href="/crm/groups"
                    className="hover:bg-muted/40 flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors"
                  >
                    <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                      <Gauge className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{group.name}</p>
                      <p className="text-muted-foreground text-[10px]">
                        {members.length} proyek · {formatDate(group.createdAt)}
                      </p>
                    </div>
                    <div className="w-20">
                      <ProgressBar value={progress} className="h-1.5" />
                      <p className="text-muted-foreground mt-1 text-right text-[9px]">{progress}%</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
