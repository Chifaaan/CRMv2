"use client";

import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { Gantt, ViewMode, type Task as GanttTask } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { api } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChevronDown, RefreshCw } from "lucide-react";
import {
  ganttBarRange,
  type GanttApiTask,
} from "../gantt/gantt-export";
import { narrowGanttTodayLine } from "../gantt/gantt-today-line";
import type { AccessibleProject } from "./dashboard-widgets";
import { DashboardInfiniteSentinel } from "./dashboard-infinite-sentinel";
import {
  dashboardLimitForPage,
  type DashboardPageMeta,
} from "@/lib/hooks/use-dashboard-infinite";
import { useSession } from "@/lib/auth-client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiTask = GanttApiTask & {
  sprintId: string | null;
  dependsOn?: { dependsOnId: string }[];
};

type SprintRow = { id: string; name: string };

type DashboardGanttPageResponse = {
  items: ApiTask[];
  sprints: SprintRow[];
  meta: DashboardPageMeta;
};

type ProjectMemberApiRow = {
  projectRole: string;
  user: {
    id: string;
    name: string;
    email?: string | null;
    image?: string | null;
  };
};

// ─── Helpers (sama persis dengan ProjectGanttChart) ───────────────────────────

function barStyles(t: ApiTask): GanttTask["styles"] {
  const done = t.status === "done" || t.status === "completed";
  const end = t.dueDate ? new Date(t.dueDate) : null;
  const overdue = !done && end && end < new Date();
  if (done)
    return {
      backgroundColor: "#22c55e",
      backgroundSelectedColor: "#16a34a",
      progressColor: "#15803d",
      progressSelectedColor: "#14532d",
    };
  if (overdue)
    return {
      backgroundColor: "#ef4444",
      backgroundSelectedColor: "#dc2626",
      progressColor: "#b91c1c",
      progressSelectedColor: "#991b1b",
    };
  return {
    backgroundColor: "#3b82f6",
    backgroundSelectedColor: "#2563eb",
    progressColor: "#1d4ed8",
    progressSelectedColor: "#1e40af",
  };
}

function toGanttRows(tasks: ApiTask[]): GanttTask[] {
  const taskIds = new Set(tasks.map((t) => t.id));
  return tasks.map((t) => {
    const { start, end } = ganttBarRange(t);
    const progress = t.status === "done" || t.status === "completed" ? 100 : 0;
    const dependencies = (t.dependsOn ?? [])
      .map((d) => d.dependsOnId)
      .filter((id) => taskIds.has(id));
    return {
      id: t.id,
      type: "task",
      name: t.title,
      start,
      end,
      progress,
      isDisabled: true,
      dependencies: dependencies.length ? dependencies : undefined,
      styles: barStyles(t),
    };
  });
}

function columnWidthFor(mode: ViewMode): number {
  switch (mode) {
    case ViewMode.Week:
      return 250;
    case ViewMode.Month:
      return 280;
    default:
      return 60;
  }
}

// ─── Error Boundary ───────────────────────────────────────────────────────────

type EBState = { hasError: boolean };

class GanttErrorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  EBState
> {
  constructor(props: { children: ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): EBState {
    return { hasError: true };
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("[DashboardGantt]", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-3 rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-4 py-6">
          <p className="text-sm text-amber-800">
            Terjadi kesalahan saat merender Gantt chart. Coba reset atau pilih
            proyek lain.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => this.props.onReset()}
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Reset
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Inner: remount dengan key=projectId agar sprint & assignee reset tanpa effect

function DashboardGanttChartInner({
  projectId,
  accessibleProjects,
  onProjectChange,
}: {
  projectId: string;
  accessibleProjects: AccessibleProject[];
  onProjectChange: (projectId: string) => void;
}) {
  const { data: session } = useSession();
  const viewerRole =
    (session?.user as { role?: string } | undefined)?.role ?? "";
  const isDeveloper = viewerRole.toLowerCase() === "developer";

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [viewDate] = useState(() => new Date());
  const [sprintFilter, setSprintFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [assigneePickerQuery, setAssigneePickerQuery] = useState("");
  const [ebKey, setEbKey] = useState(0);
  const ganttScrollContainerRef = useRef<HTMLDivElement>(null);

  const assigneeForQuery = isDeveloper ? "all" : assigneeFilter;

  const membersQ = useQuery({
    queryKey: ["dashboard-gantt-members", projectId],
    queryFn: async () => {
      const res = await api.get<ProjectMemberApiRow[]>(
        `/api/projects/${projectId}/members`,
      );
      return res.data;
    },
    enabled: !!projectId && !isDeveloper,
  });

  const assigneeSelectItems = useMemo(() => {
    const rows = membersQ.data ?? [];
    return [
      { value: "all", label: "Semua anggota" },
      ...rows.map((r) => ({ value: r.user.id, label: r.user.name })),
    ];
  }, [membersQ.data]);

  const assigneeTriggerLabel = useMemo(() => {
    const hit = assigneeSelectItems.find((x) => x.value === assigneeFilter);
    return hit?.label ?? "Anggota proyek";
  }, [assigneeSelectItems, assigneeFilter]);

  const filteredAssigneeMemberRows = useMemo(() => {
    const rows = membersQ.data ?? [];
    const q = assigneePickerQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.user.name.toLowerCase().includes(q));
  }, [membersQ.data, assigneePickerQuery]);

  // ── Tasks + sprints (paginated dashboard gantt endpoint) ───────────────
  const ganttQ = useInfiniteQuery({
    queryKey: [
      "dashboard",
      "gantt",
      projectId,
      assigneeForQuery,
    ],
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const params: Record<string, string> = {
        projectId,
        page: String(page),
        limit: String(dashboardLimitForPage(page)),
      };
      if (assigneeForQuery !== "all") {
        params.assigneeId = assigneeForQuery;
      }
      const res = await api.get<DashboardGanttPageResponse>(
        "/api/reports/dashboard/gantt",
        { params },
      );
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) => last.meta.nextPage ?? undefined,
    enabled: !!projectId,
  });

  const allTasks = useMemo(
    () => ganttQ.data?.pages.flatMap((p) => p.items) ?? [],
    [ganttQ.data],
  );

  const sprints = ganttQ.data?.pages[0]?.sprints ?? [];

  const dashboardGanttProjectSelectItems = useMemo(
    () => accessibleProjects.map((p) => ({ value: p.id, label: p.name })),
    [accessibleProjects],
  );

  const dashboardGanttSprintFilterItems = useMemo(() => {
    return [
      { value: "all", label: "Semua sprint" },
      { value: "none", label: "Tanpa sprint" },
      ...sprints.map((s) => ({ value: s.id, label: s.name })),
    ];
  }, [sprints]);

  const filteredTasks = useMemo(() => {
    const rows = allTasks;
    if (sprintFilter === "all") return rows;
    if (sprintFilter === "none") return rows.filter((t) => !t.sprintId);
    return rows.filter((t) => t.sprintId === sprintFilter);
  }, [allTasks, sprintFilter]);

  const ganttTasks = useMemo(
    () => (filteredTasks.length ? toGanttRows(filteredTasks) : []),
    [filteredTasks],
  );

  const ganttChartHeight = Math.max(308, ganttTasks.length * 44 + 60);

  // Lebar kolom daftar-task: dipersempit di layar HP agar timeline tetap terlihat.
  const [listCellWidth, setListCellWidth] = useState("200px");
  useEffect(() => {
    const apply = () => setListCellWidth(window.innerWidth < 640 ? "120px" : "200px");
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setNowTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const columnWidth = columnWidthFor(viewMode);
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      narrowGanttTodayLine(ganttScrollRef.current, viewMode);
    });
    return () => cancelAnimationFrame(id);
  }, [ganttTasks, viewMode, viewDate, nowTick, columnWidth]);

  const modeButtons: { label: string; mode: ViewMode }[] = [
    { label: "Hari", mode: ViewMode.Day },
    { label: "Minggu", mode: ViewMode.Week },
    { label: "Bulan", mode: ViewMode.Month },
  ];

  return (
    <div className="space-y-3">
      {/* ── Toolbar: filter cluster vs skala — hindari tabrakan horizontal ─ */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        {/* Project selector — tidak ada opsi "all" */}
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-zinc-500">
            Proyek:
          </span>
          <Select
            value={projectId}
            onValueChange={(v) => v && onProjectChange(v)}
            items={dashboardGanttProjectSelectItems}
          >
            <SelectTrigger className="h-9 w-[min(260px,100%)] max-w-[min(260px,100%)] min-w-[140px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dashboardGanttProjectSelectItems.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isDeveloper ? (
          <div className="flex min-w-0 max-w-full items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-zinc-500">
              Assignee:
            </span>
            <div className="min-w-0 max-w-[220px] shrink">
            <Popover
              open={assigneePickerOpen}
              onOpenChange={(open) => {
                setAssigneePickerOpen(open);
                if (!open) setAssigneePickerQuery("");
              }}
            >
              <PopoverTrigger
                type="button"
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 w-full min-w-0 justify-between gap-2 px-3 text-sm font-normal"
                    disabled={
                      membersQ.isPending || assigneeSelectItems.length <= 1
                    }
                  />
                }
              >
                <span
                  className={cn(
                    "truncate text-left",
                    membersQ.isPending || membersQ.isError
                      ? "text-muted-foreground"
                      : "text-foreground",
                  )}
                >
                  {membersQ.isPending
                    ? "Memuat…"
                    : membersQ.isError
                      ? "Gagal memuat anggota"
                      : assigneeTriggerLabel}
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="z-[200] w-[min(100vw-2rem,22rem)] border-zinc-200 p-0 shadow-lg ring-zinc-200/60"
                sideOffset={4}
              >
                <div className="border-b border-zinc-100 p-2">
                  <Input
                    type="search"
                    value={assigneePickerQuery}
                    onChange={(e) => setAssigneePickerQuery(e.target.value)}
                    placeholder="Cari nama…"
                    className="h-8 text-xs"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <div
                  className="max-h-56 overflow-y-auto p-1"
                  role="listbox"
                  aria-label="Filter assignee Gantt"
                >
                  {membersQ.isError ? (
                    <p className="text-destructive px-2 py-3 text-center text-xs">
                      Gagal memuat daftar anggota.
                    </p>
                  ) : (membersQ.data?.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                      Tidak ada anggota.
                    </p>
                  ) : filteredAssigneeMemberRows.length === 0 ? (
                    <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                      Tidak ada yang cocok.
                    </p>
                  ) : (
                    <ul className="space-y-0.5">
                      <li>
                        <button
                          type="button"
                          role="option"
                          aria-selected={assigneeFilter === "all"}
                          className={cn(
                            "hover:bg-muted/80 flex w-full rounded px-2 py-2 text-left text-sm",
                            assigneeFilter === "all" &&
                              "bg-muted/70 font-medium text-foreground",
                          )}
                          onClick={() => {
                            setAssigneeFilter("all");
                            setEbKey((k) => k + 1);
                            setAssigneePickerOpen(false);
                          }}
                        >
                          Semua anggota
                        </button>
                      </li>
                      {filteredAssigneeMemberRows.map((r) => (
                        <li key={r.user.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={assigneeFilter === r.user.id}
                            className={cn(
                              "hover:bg-muted/80 flex w-full rounded px-2 py-2 text-left text-sm",
                              assigneeFilter === r.user.id &&
                                "bg-muted/70 font-medium text-foreground",
                            )}
                            onClick={() => {
                              setAssigneeFilter(r.user.id);
                              setEbKey((k) => k + 1);
                              setAssigneePickerOpen(false);
                            }}
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {r.user.name}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            </div>
          </div>
        ) : null}

        {/* Sprint filter */}
        {sprints.length > 0 && (
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-zinc-500">
              Sprint:
            </span>
            <Select
              value={sprintFilter}
              onValueChange={(v) => v && setSprintFilter(v)}
              items={dashboardGanttSprintFilterItems}
            >
              <SelectTrigger className="h-9 w-[min(200px,100%)] max-w-[min(200px,100%)] min-w-[120px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dashboardGanttSprintFilterItems.map((it) => (
                  <SelectItem key={it.value} value={it.value}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        </div>

        {/* Scale — grup terpisah agar tidak bertabrakan dengan assignee */}
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-zinc-500">Skala:</span>
          {modeButtons.map(({ label, mode }) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={viewMode === mode ? "default" : "outline"}
              onClick={() => setViewMode(mode)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-blue-500" />
          Aktif
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-red-500" />
          Overdue
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-4 w-px rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.65)]"
            aria-hidden
          />
          Sekarang
        </span>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      {ganttQ.isPending ? (
        <Skeleton className="h-[308px] w-full rounded-md" />
      ) : ganttQ.isError ? (
        <div className="space-y-3 rounded-lg border border-dashed border-red-200 bg-red-50/50 px-4 py-6">
          <p className="text-sm text-red-800">
            Gagal memuat data Gantt. Periksa koneksi atau coba lagi.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void ganttQ.refetch()}
          >
            Coba lagi
          </Button>
        </div>
      ) : !allTasks.length ? (
        <div className="space-y-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
          <p>
            {!isDeveloper && assigneeFilter !== "all"
              ? "Tidak ada tugas untuk assignee ini pada proyek terpilih."
              : isDeveloper
                ? "Belum ada tugas aktif (yang di-assign atau Anda ikuti) dengan jadwal di proyek ini."
                : "Belum ada tugas aktif dengan jadwal di proyek ini."}
          </p>
          {!isDeveloper && assigneeFilter !== "all" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAssigneeFilter("all")}
            >
              Tampilkan semua anggota
            </Button>
          ) : null}
        </div>
      ) : !ganttTasks.length ? (
        <div className="space-y-2">
          <p className="text-sm text-zinc-600">
            Tidak ada tugas untuk filter sprint ini.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSprintFilter("all")}
          >
            Tampilkan semua sprint
          </Button>
        </div>
      ) : (
        <GanttErrorBoundary
          key={ebKey}
          onReset={() => {
            setSprintFilter("all");
            if (!isDeveloper) setAssigneeFilter("all");
            setEbKey((k) => k + 1);
          }}
        >
          <div
            ref={ganttScrollContainerRef}
            className="max-h-[420px] overflow-y-auto rounded-md border border-zinc-200 bg-white [scrollbar-gutter:stable]"
          >
            <div
              ref={ganttScrollRef}
              className="gantt-simpro w-full overflow-x-auto p-2"
            >
              <Gantt
                tasks={ganttTasks}
                viewMode={viewMode}
                viewDate={viewDate}
                listCellWidth={listCellWidth}
                columnWidth={columnWidth}
                rowHeight={44}
                ganttHeight={ganttChartHeight}
                todayColor="transparent"
              />
            </div>
            <DashboardInfiniteSentinel
              hasMore={ganttQ.hasNextPage}
              isFetchingNextPage={ganttQ.isFetchingNextPage}
              onLoadMore={() => void ganttQ.fetchNextPage()}
              scrollRoot={ganttScrollContainerRef}
            />
          </div>
        </GanttErrorBoundary>
      )}
    </div>
  );
}

export function DashboardGanttChart({
  accessibleProjects,
}: {
  accessibleProjects: AccessibleProject[];
}) {
  const [userProjectId, setUserProjectId] = useState<string | null>(null);

  const projectId = useMemo(() => {
    if (!accessibleProjects.length) return "";
    if (
      userProjectId &&
      accessibleProjects.some((p) => p.id === userProjectId)
    ) {
      return userProjectId;
    }
    return accessibleProjects[0].id;
  }, [accessibleProjects, userProjectId]);

  if (!accessibleProjects.length) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
        Tidak ada proyek yang dapat Anda akses.
      </p>
    );
  }

  return (
    <DashboardGanttChartInner
      key={projectId}
      projectId={projectId}
      accessibleProjects={accessibleProjects}
      onProjectChange={setUserProjectId}
    />
  );
}
