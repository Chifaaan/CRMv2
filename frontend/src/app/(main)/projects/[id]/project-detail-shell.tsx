"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calculator,
  Wallet,
  CalendarRange,
  FileBarChart,
  Kanban,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Pencil,
  ScrollText,
  Timer,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { projectDisplayProgressPercent, projectPipelineCounts } from "@/lib/project-progress-display";
import {
  bannerImageCssUrl,
  projectBannerSurfaceStyle,
} from "@/lib/project-banner";
import { projectPathToAuditScope } from "@/lib/project-audit-scope";
import { buttonVariants } from "@/components/ui/button";
import { ProjectFormModal } from "@/components/features/projects/ProjectFormModal";
import { AuditTrailPanel } from "@/components/features/audit/AuditTrailPanel";
import type { ProjectDetailPayload } from "./project-detail-types";
import { useProjectDetail } from "./project-detail-context";
import { canViewRap, isAdminOrPmRole } from "@/lib/role-constants";

const DEFAULT_BANNER = "#2563eb";

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function formatTitleCase(value: string) {
  return value
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function projectIsOverdue(project: ProjectDetailPayload): boolean {
  if (!project.endDate) return false;
  const s = project.status.toLowerCase();
  if (
    ["completed", "cancelled", "canceled", "archived", "done"].includes(s) ||
    s.includes("completed")
  ) {
    return false;
  }
  const end = new Date(project.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return end < today;
}

function statusBannerBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (["completed", "done"].includes(s) || s.includes("completed")) {
    return "bg-emerald-500/95 text-white shadow-sm ring-1 ring-white/25";
  }
  if (
    s.includes("active") ||
    s === "in_progress" ||
    s.includes("progress") ||
    s === "ongoing"
  ) {
    return "bg-sky-500/95 text-white shadow-sm ring-1 ring-white/25";
  }
  if (s.includes("hold") || s === "on_hold") {
    return "bg-amber-500/95 text-white shadow-sm ring-1 ring-white/25";
  }
  if (s.includes("planning") || s === "draft" || s === "planned") {
    return "bg-indigo-500/95 text-white shadow-sm ring-1 ring-white/25";
  }
  if (s.includes("cancel")) {
    return "bg-zinc-700/95 text-white shadow-sm ring-1 ring-white/25";
  }
  return "bg-white/20 text-white ring-1 ring-white/40 backdrop-blur-md";
}

function priorityBannerBadgeClass(p: string | null): string | null {
  if (!p?.trim()) return null;
  const x = p.toLowerCase();
  if (x === "critical") return "bg-red-600/95 text-white ring-1 ring-white/30";
  if (x === "high") return "bg-orange-500/95 text-white ring-1 ring-white/30";
  if (x === "medium") return "bg-cyan-500/95 text-white ring-1 ring-white/30";
  if (x === "low") return "bg-slate-500/95 text-white ring-1 ring-white/30";
  return "bg-white/20 text-white ring-1 ring-white/35";
}

function phaseBannerBadgeClass() {
  return "bg-violet-500/90 text-white shadow-sm ring-1 ring-white/25";
}

function clientBannerBadgeClass() {
  return "bg-white/18 text-white ring-1 ring-white/40 backdrop-blur-md";
}

function parentBannerBadgeClass() {
  return "bg-white/12 text-white ring-1 ring-white/35 backdrop-blur-md transition-colors hover:bg-white/20";
}

function formatProjectDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export function ProjectDetailShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { project, userRole } = useProjectDetail();
  const [editOpen, setEditOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const nav = useMemo(() => {
    const base = `/projects/${project.id}`;
    const canAccessReportsAndLog = isAdminOrPmRole(userRole);
    const canAccessRap = canViewRap(userRole);
    const items: {
      href: string;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      match: (path: string) => boolean;
    }[] = [
      {
        href: base,
        label: "Overview",
        icon: LayoutDashboard,
        match: (p) => p === base || p === `${base}/`,
      },
      {
        href: `${base}/board`,
        label: "Board",
        icon: Kanban,
        match: (p) => p.startsWith(`${base}/board`),
      },
      {
        href: `${base}/backlog`,
        label: "Backlog",
        icon: ListTodo,
        match: (p) => p.startsWith(`${base}/backlog`),
      },
      {
        href: `${base}/sprint`,
        label: "Sprint",
        icon: Timer,
        match: (p) => p.startsWith(`${base}/sprint`),
      },
      {
        href: `${base}/gantt`,
        label: "Gantt",
        icon: BarChart3,
        match: (p) => p.startsWith(`${base}/gantt`),
      },
      {
        href: `${base}/rab`,
        label: "RAB",
        icon: Calculator,
        match: (p) => p.startsWith(`${base}/rab`),
      },
      ...(canAccessRap
        ? [
            {
              href: `${base}/rap`,
              label: "RAP",
              icon: Wallet,
              match: (p: string) => p.startsWith(`${base}/rap`),
            },
          ]
        : []),
      {
        href: `${base}/discussion`,
        label: "Discussion",
        icon: MessageSquare,
        match: (p) => p.startsWith(`${base}/discussion`),
      },
      // Maintenance tab hidden — feature not active for project workflow
    ];
    if (canAccessReportsAndLog) {
      items.push(
        {
          href: `${base}/reports`,
          label: "Reports",
          icon: FileBarChart,
          match: (p) => p.startsWith(`${base}/reports`),
        },
        {
          href: `${base}/log`,
          label: "Log",
          icon: ScrollText,
          match: (p) => p.startsWith(`${base}/log`),
        },
      );
    }
    return items;
  }, [project.id, userRole]);

  const canEditProjectBanner = isAdminOrPmRole(userRole);
  const canOpenAuditTrailPanel = canEditProjectBanner;

  const auditFeatureScope = useMemo(
    () => projectPathToAuditScope(pathname, project.id),
    [pathname, project.id],
  );

  const bannerColor = project.coverColor?.trim() || DEFAULT_BANNER;
  const overdue = projectIsOverdue(project);
  const progress = projectDisplayProgressPercent(project);
  const pipeline = projectPipelineCounts(project);
  const priClass = priorityBannerBadgeClass(project.priority);
  const imgCss = bannerImageCssUrl(project.coverImageUrl);
  const bannerSurfaceStyle = projectBannerSurfaceStyle(
    bannerColor,
    project.coverImageUrl,
  );

  const startLabel = formatProjectDate(project.startDate);
  const endLabel = formatProjectDate(project.endDate);

  const metaBadges: React.ReactNode[] = [];
  if (project.status?.trim()) {
    metaBadges.push(
      <span
        key="status"
        className={cn(
          "rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase",
          statusBannerBadgeClass(project.status),
        )}
      >
        {formatStatusLabel(project.status)}
      </span>,
    );
  }
  if (project.phase?.trim()) {
    metaBadges.push(
      <span
        key="phase"
        className={cn(
          "rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase",
          phaseBannerBadgeClass(),
        )}
      >
        {project.phase.trim()}
      </span>,
    );
  }
  if (project.priority?.trim() && priClass) {
    metaBadges.push(
      <span
        key="priority"
        className={cn(
          "rounded-md px-2.5 py-1 text-[11px] font-semibold",
          priClass,
        )}
      >
        {formatTitleCase(project.priority)}
      </span>,
    );
  }
  if (project.client?.companyName?.trim()) {
    metaBadges.push(
      <span
        key="client"
        className={cn(
          "rounded-md px-2.5 py-1 text-[11px] font-semibold",
          clientBannerBadgeClass(),
        )}
      >
        {project.client.companyName.trim()}
      </span>,
    );
  }
  if (project.parent?.name?.trim()) {
    metaBadges.push(
      <Link
        key="parent"
        href={`/projects/${project.parent.id}`}
        className={cn(
          "inline-flex max-w-[220px] items-center truncate rounded-md px-2.5 py-1 text-[11px] font-semibold underline-offset-2 hover:underline",
          parentBannerBadgeClass(),
        )}
        title={project.parent.name}
      >
        {project.parent.name.trim()}
      </Link>,
    );
  }

  return (
    <div className="space-y-0">
      <div
        className="project-detail-banner relative overflow-hidden border border-b-0 border-zinc-200/80 text-white shadow-md"
        style={bannerSurfaceStyle}
      >
        {imgCss ? (
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20"
            aria-hidden
          />
        ) : (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/35 via-black/20 to-black/10"
              aria-hidden
            />
            <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/4 size-48 rounded-full bg-black/15 blur-2xl" />
          </>
        )}

        <div className="relative px-4 py-7 sm:px-7 sm:py-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-4">
              <nav
                className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-white/80"
                aria-label="Breadcrumb"
              >
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Projects
                </Link>
                <span className="text-white/45">/</span>
                <span className="truncate text-white/95">{project.name}</span>
              </nav>

              {metaBadges.length > 0 || overdue ? (
                <div className="flex flex-wrap items-center gap-2">
                  {metaBadges}
                  {overdue ? (
                    <span className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/30">
                      Overdue
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-[1.75rem] lg:leading-tight">
                  {project.name}
                </h1>
                <p className="mt-1.5 font-mono text-sm text-white/75">
                  {project.code}
                </p>
              </div>

              <div className="mt-2 border-t border-white/20 pt-6">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-end justify-between gap-3">
                      <div className="flex items-center gap-2 text-white/80">
                        <Activity className="size-4 shrink-0 opacity-90" />
                        <span className="text-xs font-semibold tracking-wide uppercase">
                          Progress task
                        </span>
                      </div>
                      <span className="text-2xl font-bold tabular-nums leading-none text-white">
                        {progress}%
                      </span>
                    </div>
                    <div className="relative h-2.5 overflow-hidden rounded-full bg-black/25 shadow-inner ring-1 ring-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-300 via-white to-emerald-200 shadow-[0_0_12px_rgba(255,255,255,0.35)] transition-[width] duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/65">
                      <span className="tabular-nums text-white/90">
                        {pipeline.completed}
                      </span>
                      {" / "}
                      <span className="tabular-nums">{pipeline.total}</span>
                      <span className="text-white/55"> selesai (pipeline)</span>
                    </p>
                  </div>

                  <div
                    className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-0 lg:border-l lg:border-white/15 lg:pl-10"
                    aria-label="Jadwal proyek"
                  >
                    <div className="flex items-center gap-2 text-white/75 sm:hidden">
                      <CalendarRange className="size-4" />
                      <span className="text-xs font-semibold tracking-wide uppercase">
                        Jadwal
                      </span>
                    </div>
                    <div className="flex flex-1 flex-wrap items-stretch gap-4 sm:gap-6">
                      <div className="min-w-[120px] flex-1 sm:flex-initial">
                        <p className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
                          Mulai
                        </p>
                        <p className="mt-1 text-base font-semibold tracking-tight text-white">
                          {startLabel ?? "—"}
                        </p>
                      </div>
                      <div className="flex items-center justify-center px-1 text-white/40">
                        <ArrowRight className="size-5" aria-hidden />
                      </div>
                      <div className="min-w-[120px] flex-1 sm:flex-initial">
                        <p className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
                          Selesai
                        </p>
                        <p className="mt-1 text-base font-semibold tracking-tight text-white">
                          {endLabel ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {canEditProjectBanner ? (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "shrink-0 gap-2 border-white/40 bg-white/95 text-zinc-900 shadow-md hover:bg-white",
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit project
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0.5 border border-zinc-200 bg-zinc-50/90 px-1.5 py-1.5">
        <div className="flex flex-1 flex-wrap gap-0.5">
          {nav.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                    : "text-zinc-600 hover:bg-white/90 hover:text-zinc-900",
                )}
                style={
                  active
                    ? { boxShadow: `inset 0 -2px 0 0 ${bannerColor}` }
                    : undefined
                }
              >
                <Icon className="h-3.5 w-3.5 opacity-80" />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Audit Trail button — always visible for non-viewer/client */}
        {canOpenAuditTrailPanel && (
          <button
            type="button"
            onClick={() => setAuditOpen(true)}
            title="Audit Trail"
            className={cn(
              "ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              auditOpen
                ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                : "text-zinc-500 hover:bg-white/90 hover:text-zinc-900",
            )}
          >
            <History className="h-3.5 w-3.5 opacity-80" />
            <span className="hidden sm:inline">Audit Trail</span>
          </button>
        )}
      </div>

      <div className="rounded-b-xl border border-t-0 border-zinc-200 bg-white px-4 py-6 sm:px-6">
        {children}
      </div>

      <ProjectFormModal
        key={project.id}
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        projectId={project.id}
        excludeProjectId={project.id}
        onSuccess={() => router.refresh()}
      />

      <AuditTrailPanel
        open={auditOpen}
        onOpenChange={setAuditOpen}
        projectId={project.id}
        projectName={project.name}
        featureScope={auditFeatureScope}
      />
    </div>
  );
}
