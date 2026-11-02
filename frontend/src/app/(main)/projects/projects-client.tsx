"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Building2,
  Calendar,
  ChevronDown,
  FolderPlus,
  History,
  Pencil,
  Trash2,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { ActiveFilterChips } from "@/components/features/crud/active-filter-chips";
import { ResourceListToolbar } from "@/components/features/crud/resource-list-toolbar";
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
import { AuditTrailPanel } from "@/components/features/audit/AuditTrailPanel";
import { ProjectFormModal } from "@/components/features/projects/ProjectFormModal";
import {
  PROJECT_PHASE_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
} from "@/components/features/projects/project-form-constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserProfileTrigger } from "@/components/features/users/UserProfileTrigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import {
  bannerImageCssUrl,
  projectBannerSurfaceStyle,
} from "@/lib/project-banner";
import {
  projectDisplayProgressPercent,
  projectPipelineCounts,
} from "@/lib/project-progress-display";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LIST_PAGE_SIZE,
  type ListPageSize,
} from "@/lib/list-pagination";
import { toast } from "sonner";
import { isAdminOrPmRole } from "@/lib/role-constants";

export type ProjectCard = {
  id: string;
  name: string;
  code: string;
  status: string;
  phase: string | null;
  priority: string | null;
  progress: number | null;
  taskDone?: number;
  taskTotal?: number;
  pipelineCompleted?: number;
  pipelineTotal?: number;
  allTotal?: number;
  coverColor: string | null;
  coverImageUrl?: string | null;
  tags: string[];
  description: string | null;
  budget: unknown;
  clientId: string | null;
  parentId: string | null;
  startDate: string | null;
  endDate: string | null;
  client: {
    id: string;
    companyName: string;
    logo: string | null;
  } | null;
  members: { user: { id: string; name: string; image: string | null } }[];
};

const DEFAULT_COVER = "#2563EB";

function dateShort(v: string | null) {
  if (!v) return "";
  try {
    return format(new Date(v), "MMM d, yyyy");
  } catch {
    return "";
  }
}

function isOverdue(end: string | null, status: string) {
  if (!end) return false;
  if (status === "completed" || status === "cancelled") return false;
  try {
    return new Date(end) < new Date(new Date().toDateString());
  } catch {
    return false;
  }
}

function truncateDesc(s: string | null, max = 80) {
  if (!s) return null;
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function filterByToolbar(
  projects: ProjectCard[],
  f: { status: string; phase: string; clientId: string; search: string },
): ProjectCard[] {
  const q = f.search.trim().toLowerCase();
  return projects.filter((p) => {
    if (f.status && p.status !== f.status) return false;
    if (f.phase && (p.phase ?? "") !== f.phase) return false;
    if (f.clientId && p.clientId !== f.clientId) return false;
    if (q) {
      const hay = `${p.name} ${p.code} ${p.client?.companyName ?? ""} ${(p.tags ?? []).join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function statusLabel(status: string) {
  return (
    PROJECT_STATUS_OPTIONS.find((s) => s.value === status)?.label ??
    status.replace(/_/g, " ")
  );
}

function priorityLabel(priority: string | null) {
  if (!priority) return "";
  return (
    PROJECT_PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ??
    priority
  );
}

function phaseLabel(phase: string | null) {
  if (!phase) return "";
  return (
    PROJECT_PHASE_OPTIONS.find((p) => p.value === phase)?.label ?? phase
  );
}

/**
 * Trackly projects (_reference/js/modules/projects.js + components.css):
 * - Flat grid (here: 3 columns on large screens); each cell is one top-level card.
 * - `tree-toggle-btn` on card wrap (top-right); click shows/hides children as a list below —
 *   only that cell grows; other columns stay aligned (`align-items: start`).
 * - Children are list rows (not full cards), matching “list” UX; deeper levels use the same pattern.
 */
type ChildProjectListBranchProps = {
  parentId: string;
  childListByParent: Map<string, ProjectCard[]>;
  expandedPanelIds: readonly string[];
  onTogglePanel: (id: string) => void;
  depth?: number;
  /** Prevents infinite recursion if parent_id graph has a cycle. */
  ancestorIds?: ReadonlySet<string>;
};

function ChildProjectListBranch({
  parentId,
  childListByParent,
  expandedPanelIds,
  onTogglePanel,
  depth = 0,
  ancestorIds: ancestorIdsProp,
}: ChildProjectListBranchProps) {
  const ancestors = ancestorIdsProp ?? new Set<string>();
  const children = (childListByParent.get(parentId) ?? []).filter(
    (c) => !ancestors.has(c.id),
  );
  if (children.length === 0) return null;

  return (
    <ul
      className={cn(
        "m-0 list-none space-y-1.5 p-0",
        depth > 0 && "mt-1.5 ml-2 border-l border-zinc-200 pl-3",
      )}
    >
      {children.map((c) => {
        const sub = (childListByParent.get(c.id) ?? []).filter(
          (x) => !ancestors.has(x.id) && x.id !== c.id,
        );
        const hasSub = sub.length > 0;
        const subOpen = expandedPanelIds.includes(c.id);
        const nextAncestors = new Set(ancestors);
        nextAncestors.add(c.id);
        return (
          <li key={`${parentId}:${c.id}`}>
            <div className="flex items-stretch overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
              {hasSub ? (
                <button
                  type="button"
                  className={cn(
                    "flex w-8 shrink-0 items-center justify-center border-r border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100",
                  )}
                  aria-expanded={subOpen}
                  aria-label="Toggle nested sub-projects"
                  title="Toggle nested sub-projects"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onTogglePanel(c.id);
                  }}
                >
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform duration-200",
                      !subOpen && "-rotate-90",
                    )}
                    aria-hidden
                  />
                </button>
              ) : (
                <span className="w-2 shrink-0 bg-zinc-50/80" aria-hidden />
              )}
              <Link
                href={`/projects/${c.id}`}
                className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2 pr-3 pl-2 no-underline transition-colors hover:bg-zinc-50"
              >
                <span className="truncate text-sm font-medium text-zinc-900">
                  {c.name}
                </span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {c.code}
                </span>
              </Link>
            </div>
            {hasSub && subOpen ? (
              <ChildProjectListBranch
                parentId={c.id}
                depth={depth + 1}
                childListByParent={childListByParent}
                expandedPanelIds={expandedPanelIds}
                onTogglePanel={onTogglePanel}
                ancestorIds={nextAncestors}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

type ProjectGridCellProps = {
  project: ProjectCard;
  childListByParent: Map<string, ProjectCard[]>;
  expandedPanelIds: readonly string[];
  onTogglePanel: (id: string) => void;
  renderCard: (p: ProjectCard) => ReactNode;
};

function ProjectGridCell({
  project,
  childListByParent,
  expandedPanelIds,
  onTogglePanel,
  renderCard,
}: ProjectGridCellProps) {
  const children = childListByParent.get(project.id) ?? [];
  const hasChildren = children.length > 0;
  const listOpen = expandedPanelIds.includes(project.id);

  return (
    <div className="flex flex-col gap-0 break-inside-avoid">
      <div className="relative">
        {hasChildren ? (
          <button
            type="button"
            className={cn(
              "absolute -top-2.5 -right-2.5 z-30 flex size-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:scale-105 hover:border-zinc-300 hover:text-zinc-800",
              !listOpen && "-rotate-90",
            )}
            aria-expanded={listOpen}
            aria-label="Toggle sub-projects"
            title="Toggle sub-projects"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTogglePanel(project.id);
            }}
          >
            <ChevronDown className="size-4" aria-hidden />
          </button>
        ) : null}
        {renderCard(project)}
      </div>
      {hasChildren && listOpen ? (
        <div className="relative mt-4 ml-1 border-l-2 border-zinc-200 pl-4 pt-0">
          <ChildProjectListBranch
            parentId={project.id}
            childListByParent={childListByParent}
            expandedPanelIds={expandedPanelIds}
            onTogglePanel={onTogglePanel}
            ancestorIds={new Set([project.id])}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ProjectsPageClient({
  initialProjects,
}: {
  initialProjects: ProjectCard[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const role =
    (session?.user as { role?: string } | undefined)?.role ?? "developer";
  const canCreate = isAdminOrPmRole(role);
  const canDelete = isAdminOrPmRole(role);
  const canAuditTrail = isAdminOrPmRole(role);

  const [createOpen, setCreateOpen] = useState(false);
  const [auditTrailOpen, setAuditTrailOpen] = useState(false);
  const [editProject, setEditProject] = useState<ProjectCard | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  /** Sub-project list panels open for these project ids (default closed). Use array — React batches updates reliably across multiple toggles. */
  const [expandedPanelIds, setExpandedPanelIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const [draftPhase, setDraftPhase] = useState("");
  const [draftClientId, setDraftClientId] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [appliedPhase, setAppliedPhase] = useState("");
  const [appliedClientId, setAppliedClientId] = useState("");

  const [gridPage, setGridPage] = useState(1);
  const [gridPageSize, setGridPageSize] = useState<ListPageSize>(
    DEFAULT_LIST_PAGE_SIZE,
  );

  const openFilterDialog = useCallback(() => {
    setDraftStatus(appliedStatus);
    setDraftPhase(appliedPhase);
    setDraftClientId(appliedClientId);
    setFilterOpen(true);
  }, [appliedStatus, appliedPhase, appliedClientId]);

  const applyFilters = useCallback(() => {
    setAppliedStatus(draftStatus);
    setAppliedPhase(draftPhase);
    setAppliedClientId(draftClientId);
    setFilterOpen(false);
  }, [draftStatus, draftPhase, draftClientId]);

  const clearAllFilters = useCallback(() => {
    setDraftStatus("");
    setDraftPhase("");
    setDraftClientId("");
    setAppliedStatus("");
    setAppliedPhase("");
    setAppliedClientId("");
    setSearch("");
  }, []);

  const filtered = useMemo(
    () =>
      filterByToolbar(initialProjects, {
        status: appliedStatus,
        phase: appliedPhase,
        clientId: appliedClientId,
        search,
      }),
    [
      initialProjects,
      appliedStatus,
      appliedPhase,
      appliedClientId,
      search,
    ],
  );

  const statusOptions = useMemo(() => {
    const s = new Set<string>();
    for (const p of initialProjects) s.add(p.status);
    return [...s].sort();
  }, [initialProjects]);

  const phaseOptions = useMemo(() => {
    const s = new Set<string>();
    for (const p of initialProjects) {
      if (p.phase) s.add(p.phase);
    }
    return [...s].sort();
  }, [initialProjects]);

  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of initialProjects) {
      if (p.client) map.set(p.client.id, p.client.companyName);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [initialProjects]);

  const filterStatusSelectItems = useMemo(
    () => [
      { value: "__all__", label: "All statuses" },
      ...statusOptions.map((s) => ({ value: s, label: statusLabel(s) })),
    ],
    [statusOptions],
  );
  const filterPhaseSelectItems = useMemo(
    () => [
      { value: "__all__", label: "All phases" },
      ...phaseOptions.map((ph) => ({ value: ph, label: phaseLabel(ph) })),
    ],
    [phaseOptions],
  );
  const filterClientSelectItems = useMemo(
    () => [
      { value: "__all__", label: "All clients" },
      ...clientOptions.map(([id, name]) => ({ value: id, label: name })),
    ],
    [clientOptions],
  );

  const activeFilterCount =
    (appliedStatus ? 1 : 0) +
    (appliedPhase ? 1 : 0) +
    (appliedClientId ? 1 : 0);

  const chipItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    if (appliedStatus) {
      items.push({
        id: "status",
        label: `Status: ${statusLabel(appliedStatus)}`,
      });
    }
    if (appliedPhase) {
      items.push({
        id: "phase",
        label: `Phase: ${phaseLabel(appliedPhase)}`,
      });
    }
    if (appliedClientId) {
      const name =
        clientOptions.find(([id]) => id === appliedClientId)?.[1] ??
        appliedClientId;
      items.push({ id: "clientId", label: `Client: ${name}` });
    }
    return items;
  }, [appliedStatus, appliedPhase, appliedClientId, clientOptions]);

  function removeChip(id: string) {
    if (id === "status") setAppliedStatus("");
    if (id === "phase") setAppliedPhase("");
    if (id === "clientId") setAppliedClientId("");
  }

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/projects/${id}`);
    },
    onSuccess: async () => {
      toast.success("Project deleted");
      setDeleteId(null);
      router.refresh();
    },
    onError: () => toast.error("Could not delete project"),
  });

  const childListByParent = useMemo(() => {
    const m = new Map<string, ProjectCard[]>();
    const seenChild = new Set<string>();
    for (const p of filtered) {
      if (!p.parentId) continue;
      if (seenChild.has(p.id)) continue;
      seenChild.add(p.id);
      if (!m.has(p.parentId)) m.set(p.parentId, []);
      m.get(p.parentId)!.push(p);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return m;
  }, [filtered]);

  /** True roots only (no parent), same as Trackly `filtered.filter(p => !p.parent_id)`. */
  const parentOnlyRoots = useMemo(
    () =>
      filtered
        .filter((p) => !p.parentId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [filtered],
  );

  /** Child projects never reached from a true root (e.g. parent hidden by filter / not in list). */
  const orphanProjects = useMemo(() => {
    const rendered = new Set<string>();
    function markSubtree(root: ProjectCard) {
      rendered.add(root.id);
      for (const c of childListByParent.get(root.id) ?? []) {
        markSubtree(c);
      }
    }
    for (const r of parentOnlyRoots) markSubtree(r);
    return filtered
      .filter((p) => p.parentId && !rendered.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered, parentOnlyRoots, childListByParent]);

  /**
   * One grid so rows fill 1→2→3 left-to-right. Previously roots and orphans used
   * two separate grids, so 1 root + 3 orphans looked like row1=[1] row2=[3].
   */
  const topLevelGridProjects = useMemo(() => {
    const seen = new Set<string>();
    const list: ProjectCard[] = [];
    for (const p of parentOnlyRoots) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      list.push(p);
    }
    for (const p of orphanProjects) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      list.push(p);
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [parentOnlyRoots, orphanProjects]);

  const gridTotal = topLevelGridProjects.length;

  const visibleTopGridProjects = useMemo(() => {
    const start = (gridPage - 1) * gridPageSize;
    return topLevelGridProjects.slice(start, start + gridPageSize);
  }, [topLevelGridProjects, gridPage, gridPageSize]);

  useEffect(() => {
    setGridPage(1);
  }, [search, appliedStatus, appliedPhase, appliedClientId, gridPageSize]);

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(gridTotal / gridPageSize) || 1);
    setGridPage((p) => (p > pages ? pages : p));
  }, [gridTotal, gridPageSize]);

  const onTogglePanel = useCallback((id: string) => {
    setExpandedPanelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  function renderCard(p: ProjectCard) {
    const cover = p.coverColor?.trim() || DEFAULT_COVER;
    const headerBannerStyle = projectBannerSurfaceStyle(cover, p.coverImageUrl);
    const hasBannerImage = Boolean(bannerImageCssUrl(p.coverImageUrl));
    const overdue = isOverdue(p.endDate, p.status);
    const progress = projectDisplayProgressPercent(p);
    const desc = truncateDesc(p.description);
    const extraMembers = Math.max(0, p.members.length - 4);

    return (
      <div
        role="link"
        tabIndex={0}
        className="group relative cursor-pointer overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm outline-none transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
        aria-label={`Open ${p.name}`}
        onClick={() => router.push(`/projects/${p.id}`)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(`/projects/${p.id}`);
          }
        }}
      >
        <div
          className="relative flex h-20 flex-col justify-between px-3 py-2"
          style={headerBannerStyle}
        >
          {hasBannerImage ? (
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
              <div className="pointer-events-none absolute -top-10 -right-8 size-28 rounded-full bg-white/10 blur-2xl" />
            </>
          )}
          <div className="relative flex items-start justify-between gap-2">
            <span className="rounded px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide text-white/90 [text-shadow:0_1px_0_rgba(0,0,0,0.15)]">
              {p.code}
            </span>
            <div className="relative z-10 flex shrink-0 items-center gap-0.5">
            {canCreate ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 text-white hover:bg-black/25 hover:text-white"
                  title="Edit project"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditProject(p);
                  }}
                >
                  <Pencil className="size-3.5" />
                </Button>
                {canDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 text-white hover:bg-black/25 hover:text-white"
                    title="Delete project"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteId(p.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </>
            ) : null}
            </div>
          </div>
          {p.client?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.client.logo}
              alt=""
              className="pointer-events-none absolute right-3 bottom-2 z-10 size-8 rounded-md border border-white/30 bg-white object-contain p-0.5 shadow-sm"
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-2 px-4 pt-3 pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="secondary"
              className="border-0 bg-zinc-100 text-xs font-normal text-zinc-800"
            >
              {statusLabel(p.status)}
            </Badge>
            {p.priority ? (
              <Badge
                variant="outline"
                className="text-xs font-normal capitalize"
              >
                {priorityLabel(p.priority)}
              </Badge>
            ) : null}
            {p.phase ? (
              <Badge
                variant="outline"
                className="text-xs font-normal text-zinc-600"
              >
                {phaseLabel(p.phase)}
              </Badge>
            ) : null}
            {overdue ? (
              <Badge variant="destructive" className="text-xs">
                Overdue
              </Badge>
            ) : null}
          </div>
          <h3 className="mt-2 text-base font-semibold text-zinc-900">
            {p.name}
          </h3>
          {p.client ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
              <Building2 className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{p.client.companyName}</span>
            </p>
          ) : null}
          {desc ? (
            <p className="mt-2 line-clamp-2 text-sm text-zinc-500">{desc}</p>
          ) : null}

          <div className="mt-1 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-sm bg-zinc-200">
              <div
                className="h-full rounded-sm transition-all duration-300 ease-out"
                style={{ width: `${progress}%`, backgroundColor: cover }}
              />
            </div>
            <span className="min-w-[2rem] text-right text-xs tabular-nums text-zinc-500">
              {progress}%
            </span>
          </div>

          <div className="mt-1 flex items-end justify-between gap-3 border-t border-zinc-200 pt-2">
            <div className="flex items-center gap-1">
              {p.members.length === 0 ? (
                <span className="text-xs text-zinc-400">No members</span>
              ) : (
                <>
                  {p.members.slice(0, 4).map((m) => (
                    <UserProfileTrigger key={m.user.id} userId={m.user.id}>
                      <Avatar className="size-8 border-2 border-white ring-1 ring-zinc-200">
                        {m.user.image ? (
                          <AvatarImage src={m.user.image} alt="" />
                        ) : null}
                        <AvatarFallback className="text-[10px]">
                          {m.user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </UserProfileTrigger>
                  ))}
                  {extraMembers > 0 ? (
                    <span className="flex size-8 items-center justify-center rounded-full border border-dashed border-zinc-200 bg-zinc-50 text-[10px] font-medium text-zinc-500">
                      +{extraMembers}
                    </span>
                  ) : null}
                </>
              )}
            </div>
            {p.endDate ? (
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Calendar className="size-3.5 shrink-0" aria-hidden />
                {dateShort(p.endDate)}
              </span>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>
    );
  }

  /** Trackly-style flat grid: up to 3 columns per row on wide screens. */
  const gridClass =
    "grid grid-cols-1 gap-6 items-start sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-xl font-semibold text-zinc-900">Projects</h2>
          <p className="text-sm text-zinc-500">
            Manage all projects and track their progress
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canAuditTrail ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setAuditTrailOpen(true)}
            >
              <History className="size-4" />
              Audit Trail
            </Button>
          ) : null}
          {canCreate ? (
            <Button
              type="button"
              className="gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <FolderPlus className="size-4" />
              New Project
            </Button>
          ) : null}
        </div>
      </div>

      <ProjectFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSuccess={() => router.refresh()}
      />

      {editProject ? (
        <ProjectFormModal
          key={editProject.id}
          open={!!editProject}
          onOpenChange={(o) => {
            if (!o) setEditProject(null);
          }}
          mode="edit"
          projectId={editProject.id}
          excludeProjectId={editProject.id}
          onSuccess={() => {
            setEditProject(null);
            router.refresh();
          }}
        />
      ) : null}

      <ResourceListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, code, or client…"
        filterActiveCount={activeFilterCount}
        onOpenFilter={openFilterDialog}
        filterLabel="Filter projects"
      />

      <ActiveFilterChips items={chipItems} onRemove={removeChip} />

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Filter Projects</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={draftStatus || "__all__"}
                onValueChange={(v) =>
                  setDraftStatus(v === "__all__" ? "" : (v ?? ""))
                }
                items={filterStatusSelectItems}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {filterStatusSelectItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phase</Label>
              <Select
                value={draftPhase || "__all__"}
                onValueChange={(v) =>
                  setDraftPhase(v === "__all__" ? "" : (v ?? ""))
                }
                items={filterPhaseSelectItems}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All phases" />
                </SelectTrigger>
                <SelectContent>
                  {filterPhaseSelectItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={draftClientId || "__all__"}
                onValueChange={(v) =>
                  setDraftClientId(v === "__all__" ? "" : (v ?? ""))
                }
                items={filterClientSelectItems}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  {filterClientSelectItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraftStatus("");
                setDraftPhase("");
                setDraftClientId("");
                setAppliedStatus("");
                setAppliedPhase("");
                setAppliedClientId("");
                setFilterOpen(false);
              }}
            >
              Reset filter
            </Button>
            <Button type="button" onClick={applyFilters}>
              Apply filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 py-16 text-center">
          <p className="text-sm font-medium text-zinc-800">
            {initialProjects.length === 0
              ? "No projects yet"
              : "No projects match your filters"}
          </p>
          <p className="mt-1 max-w-sm text-xs text-zinc-500">
            {initialProjects.length === 0
              ? "Create your first project to get started."
              : "Try adjusting your search or filter criteria."}
          </p>
          {canCreate && initialProjects.length === 0 ? (
            <Button
              type="button"
              className="mt-4 gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <FolderPlus className="size-4" />
              New Project
            </Button>
          ) : null}
        </div>
      ) : topLevelGridProjects.length > 0 ? (
        <>
          <div className={gridClass}>
            {visibleTopGridProjects.map((p) => (
              <div key={p.id} className="min-w-0">
                <ProjectGridCell
                  project={p}
                  childListByParent={childListByParent}
                  expandedPanelIds={expandedPanelIds}
                  onTogglePanel={onTogglePanel}
                  renderCard={renderCard}
                />
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <ListPaginationBar
              total={gridTotal}
              page={gridPage}
              pageSize={gridPageSize}
              onPageChange={setGridPage}
              onPageSizeChange={setGridPageSize}
            />
          </div>
        </>
      ) : null}

      <AuditTrailPanel
        open={auditTrailOpen}
        onOpenChange={setAuditTrailOpen}
        featureScope="log"
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the project and related data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-600/90"
              onClick={() => deleteId && delMut.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
