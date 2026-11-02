"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Clock,
  FileDown,
  FileSpreadsheet,
  FileText,
  Layers,
  ListChecks,
  Loader2,
  Pause,
  Search,
  SlidersHorizontal,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import { useProjectDetail } from "../project-detail-context";
import { Button } from "@/components/ui/button";
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserProfileTrigger } from "@/components/features/users/UserProfileTrigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/lib/column-sort";
import { toggleColumnSort } from "@/lib/column-sort";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import {
  DEFAULT_LIST_PAGE_SIZE,
  type ListPageSize,
} from "@/lib/list-pagination";
import { TASK_STATUS_LABELS } from "@/components/features/board/board-constants";
import { toast } from "sonner";
import { taskTypeLabel } from "@/lib/task-types";
import { isAdminOrPmRole } from "@/lib/role-constants";

// ─── Types ─────────────────────────────────────────────────────────────────

type SprintRow = { id: string; name: string; status: string };

type TaskRow = {
  id: string;
  taskNumber: number;
  title: string;
  status: string;
  priority: string;
  type: string;
  storyPoints: number | null;
  dueDate: string | null;
  startDate: string | null;
  sprintId: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; code: string };
  references?: {
    reference: {
      taskNumber: number;
      title: string;
      project: { code: string };
    };
  }[];
  assignees: { user: { id: string; name: string; image: string | null } }[];
  sprint?: { id: string; name: string } | null;
  _count?: { comments: number; checklistItems: number };
};

type ListResponse = {
  data: TaskRow[];
  meta: { mode: string; total: number; pages?: number; page?: number; take: number };
};

type WorkloadRow = { name?: string; tasks: number };

type BurndownPayload = {
  sprint: { id: string; name: string };
  totalPoints: number;
  series: { date: string; ideal: number; remaining: number }[];
};

// ─── Constants ─────────────────────────────────────────────────────────────

const STATUS_FILTER_ITEMS = [
  { value: "__all__", label: "Semua Status" },
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "on_check", label: "On Check" },
  { value: "need_revision", label: "Need Revision" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_FILTER_ITEMS = [
  { value: "__all__", label: "Semua Prioritas" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STATUS_COLORS: Record<string, string> = {
  backlog: "#94a3b8",
  todo: "#64748b",
  in_progress: "#3b82f6",
  awaiting_approval: "#f59e0b",
  on_check: "#8b5cf6",
  need_revision: "#ef4444",
  completed: "#10b981",
  on_hold: "#d97706",
  cancelled: "#6b7280",
  // legacy
  in_review: "#f59e0b",
  review: "#f59e0b",
  done: "#10b981",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#0891b2",
  low: "#64748b",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

// ─── Helper fns ────────────────────────────────────────────────────────────

function statusLabel(s: string) {
  return TASK_STATUS_LABELS[s] ?? s;
}

function priorityLabel(p: string) {
  return PRIORITY_LABELS[p] ?? p;
}

function priorityBadgeClass(p: string) {
  if (p === "critical") return "bg-red-100 text-red-700 border-red-200";
  if (p === "high") return "bg-orange-100 text-orange-700 border-orange-200";
  if (p === "medium") return "bg-cyan-100 text-cyan-700 border-cyan-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function statusBadgeClass(s: string) {
  const n = s.toLowerCase();
  if (n === "completed" || n === "done") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (n === "in_progress") return "bg-blue-100 text-blue-700 border-blue-200";
  if (n === "awaiting_approval" || n === "in_review" || n === "review") return "bg-amber-100 text-amber-700 border-amber-200";
  if (n === "on_check") return "bg-violet-100 text-violet-700 border-violet-200";
  if (n === "need_revision") return "bg-red-100 text-red-700 border-red-200";
  if (n === "on_hold") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (n === "cancelled") return "bg-zinc-100 text-zinc-600 border-zinc-200";
  if (n === "todo") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-zinc-50 text-zinc-500 border-zinc-200";
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try { return format(new Date(iso), "dd MMM yyyy"); } catch { return "—"; }
}

function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

/** ID tampilan: {kode proyek}-0001 (bukan id database). */
function formatTaskPublicId(code: string | undefined, taskNumber: number) {
  if (!code || taskNumber == null || taskNumber < 1) return "—";
  return `${code}-${String(taskNumber).padStart(4, "0")}`;
}

function taskReferencesLabel(t: TaskRow) {
  const refs = t.references ?? [];
  if (!refs.length) return "—";
  return refs
    .map((r) => {
      const ref = r.reference;
      const id = formatTaskPublicId(ref.project?.code, ref.taskNumber);
      if (id === "—") return ref.title?.trim() || "—";
      return ref.title?.trim() ? `${id} — ${ref.title}` : id;
    })
    .join("; ");
}

// ─── Summary card ──────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sub?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
            {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
          </div>
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", color)}>
            <Icon className="size-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────

export function ProjectReportsPageClient() {
  const { id: projectId } = useParams<{ id: string }>();
  const { project } = useProjectDetail();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const allowed = isAdminOrPmRole(role);
  const [exportTasksLoading, setExportTasksLoading] = useState(false);

  // ── Tab 2: task table state ──
  const [tableSearch, setTableSearch] = useState("");
  const [tableStatus, setTableStatus] = useState("__all__");
  const [tablePriority, setTablePriority] = useState("__all__");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState<ListPageSize>(
    DEFAULT_LIST_PAGE_SIZE,
  );
  const [tableSortCol, setTableSortCol] = useState<string>("taskNumber");
  const [tableSortDir, setTableSortDir] = useState<SortDirection>("asc");
  const [pdfExporting, setPdfExporting] = useState(false);
  const [reportTab, setReportTab] = useState("infografis");

  useEffect(() => {
    setTablePage(1);
  }, [tableSearch, tableStatus, tablePriority, tablePageSize, tableSortCol, tableSortDir]);

  function onReportTableSort(columnKey: string) {
    const next = toggleColumnSort(tableSortCol, tableSortDir, columnKey);
    setTableSortCol(next.key);
    setTableSortDir(next.dir);
    setTablePage(1);
  }

  // ── Burndown sprint selector ──
  const [sprintId, setSprintId] = useState("");

  // ── Queries ──
  const sprintsQ = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: async () => {
      const res = await api.get<SprintRow[]>("/api/sprints", { params: { projectId } });
      return res.data;
    },
    enabled: allowed,
  });

  const effectiveSprintId = useMemo(() => {
    const rows = sprintsQ.data;
    if (!rows?.length) return "";
    if (sprintId && rows.some(s => s.id === sprintId)) return sprintId;
    return rows.find(s => s.status === "ACTIVE")?.id ?? rows[0]?.id ?? "";
  }, [sprintsQ.data, sprintId]);

  const progressQ = useQuery({
    queryKey: ["report-progress", projectId],
    queryFn: async () => {
      const res = await api.get<{
        byStatus: { status: string; _count: { id: number } }[];
        byPriority: { priority: string | null; _count: { id: number } }[];
        allTotal?: number;
      }>("/api/reports/progress", { params: { projectId } });
      return res.data;
    },
    enabled: allowed,
  });

  const workloadQ = useQuery({
    queryKey: ["report-workload", projectId],
    queryFn: async () => {
      const res = await api.get<WorkloadRow[]>("/api/reports/workload", { params: { projectId } });
      return res.data;
    },
    enabled: allowed,
  });

  const burndownQ = useQuery({
    queryKey: ["report-burndown", projectId, effectiveSprintId],
    queryFn: async () => {
      const res = await api.get<BurndownPayload>("/api/reports/burndown", {
        params: { projectId, sprintId: effectiveSprintId },
      });
      return res.data;
    },
    enabled: allowed && Boolean(effectiveSprintId),
  });

  const tableQ = useQuery({
    queryKey: [
      "report-tasks-table",
      projectId,
      tableSearch,
      tableStatus,
      tablePriority,
      tablePage,
      tablePageSize,
      tableSortCol,
      tableSortDir,
    ],
    queryFn: async () => {
      const params: Record<string, string> = {
        projectId,
        page: String(tablePage),
        take: String(tablePageSize),
        sortBy: tableSortCol,
        sortDir: tableSortDir,
      };
      if (tableSearch.trim()) params.search = tableSearch.trim();
      if (tableStatus && tableStatus !== "__all__") params.status = tableStatus;
      if (tablePriority && tablePriority !== "__all__") params.priority = tablePriority;
      const res = await api.get<ListResponse>("/api/tasks", { params });
      return res.data;
    },
    enabled: allowed && reportTab === "tabel",
  });

  // ── Derived data ──

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of progressQ.data?.byStatus ?? []) {
      const key = item.status;
      map[key] = (map[key] ?? 0) + item._count.id;
    }
    return map;
  }, [progressQ.data]);

  const totalTasks =
    progressQ.data?.allTotal ??
    Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const backlogCount = (statusCounts["backlog"] ?? 0) + (statusCounts["todo"] ?? 0);
  const inProgressCount = statusCounts["in_progress"] ?? 0;
  const awaitingCount = (statusCounts["awaiting_approval"] ?? 0) + (statusCounts["in_review"] ?? 0) + (statusCounts["review"] ?? 0);
  const onCheckCount = statusCounts["on_check"] ?? 0;
  const needRevisionCount = statusCounts["need_revision"] ?? 0;
  const completedCount = (statusCounts["completed"] ?? 0) + (statusCounts["done"] ?? 0);
  const parkingCount = (statusCounts["on_hold"] ?? 0) + (statusCounts["cancelled"] ?? 0);

  const completionPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const pieData = useMemo(() => {
    return Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: statusLabel(status),
        value: count,
        fill: STATUS_COLORS[status] ?? "#94a3b8",
      }));
  }, [statusCounts]);

  const workloadData = useMemo(
    () => (workloadQ.data ?? []).map(x => ({ name: x.name ?? "Unassigned", tasks: x.tasks })),
    [workloadQ.data],
  );

  const burnData = useMemo(
    () => (burndownQ.data?.series ?? []).map(r => ({
      date: r.date.slice(5),
      ideal: r.ideal,
      remaining: r.remaining,
    })),
    [burndownQ.data],
  );

  const priorityData = useMemo(() => {
    const rows = progressQ.data?.byPriority ?? [];
    const map: Record<string, number> = {};
    for (const r of rows) {
      const k = String(r.priority ?? "medium").toLowerCase();
      map[k] = (map[k] ?? 0) + r._count.id;
    }
    const order = ["critical", "high", "medium", "low"] as const;
    const out: { name: string; count: number; fill: string }[] = [];
    for (const k of order) {
      const c = map[k] ?? 0;
      if (c > 0) {
        out.push({
          name: priorityLabel(k),
          count: c,
          fill: PRIORITY_COLORS[k] ?? "#94a3b8",
        });
      }
    }
    for (const [k, c] of Object.entries(map)) {
      if (!(order as readonly string[]).includes(k) && c > 0) {
        out.push({
          name: priorityLabel(k),
          count: c,
          fill: "#94a3b8",
        });
      }
    }
    return out;
  }, [progressQ.data?.byPriority]);

  const tableRows = tableQ.data?.data ?? [];
  const tableMeta = tableQ.data?.meta;
  const tableTotal = tableMeta?.total ?? 0;

  // ── Export handlers ──

  async function loadExportTaskRows(): Promise<TaskRow[]> {
    const data = await qc.fetchQuery({
      queryKey: ["report-tasks-export", projectId],
      queryFn: async () => {
        const res = await api.get<ListResponse>("/api/tasks", {
          params: {
            projectId,
            page: "1",
            take: "2000",
            forGantt: "1",
            sortBy: "taskNumber",
            sortDir: "asc",
          },
        });
        return res.data;
      },
      staleTime: 60_000,
    });
    return data?.data ?? [];
  }

  async function exportCSV() {
    setExportTasksLoading(true);
    let all: TaskRow[] = [];
    try {
      all = await loadExportTaskRows();
    } finally {
      setExportTasksLoading(false);
    }
    if (!all.length) {
      return;
    }
    const rows = all.map((t, i) => ({
      No: i + 1,
      "ID Task": formatTaskPublicId(t.project?.code, t.taskNumber),
      Referensi: taskReferencesLabel(t),
      Judul: t.title,
      Status: statusLabel(t.status),
      Prioritas: priorityLabel(t.priority),
      Tipe: taskTypeLabel(t.type),
      Sprint: t.sprint?.name ?? "—",
      Assignee: t.assignees.map(a => a.user.name).join(", ") || "—",
      "Tanggal Mulai": fmtDate(t.startDate),
      "Tenggat": fmtDate(t.dueDate),
      "Dibuat": fmtDate(t.createdAt),
    }));
    const header = Object.keys(rows[0] ?? {}).join(",");
    const body = rows.map(r =>
      Object.values(r).map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const csv = `${header}\n${body}`;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `task-report_${project?.code ?? projectId}_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportPdf() {
    try {
      setPdfExporting(true);
      const params: Record<string, string> = { projectId };
      if (tableSearch.trim()) params.search = tableSearch.trim();
      if (tableStatus && tableStatus !== "__all__") params.status = tableStatus;
      if (tablePriority && tablePriority !== "__all__") params.priority = tablePriority;
      const res = await api.get("/api/reports/tasks-pdf", {
        params,
        responseType: "arraybuffer",
      });
      const buf = res.data as ArrayBuffer;
      const slice = new Uint8Array(buf.byteLength >= 4 ? buf.slice(0, 4) : buf);
      const header = String.fromCharCode(...slice);
      if (!header.startsWith("%PDF")) {
        try {
          const text = new TextDecoder().decode(buf);
          const j = JSON.parse(text) as { message?: string | string[] };
          const m = j.message;
          const msg = Array.isArray(m) ? m.join(", ") : m;
          toast.error(msg?.trim() || "Gagal mengunduh PDF");
        } catch {
          toast.error("Gagal mengunduh PDF — respons bukan berkas PDF valid");
        }
        return;
      }
      const blob = new Blob([buf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `task-report_${project?.code ?? projectId}_${format(new Date(), "yyyyMMdd-HHmm")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Gagal mengunduh PDF");
    } finally {
      setPdfExporting(false);
    }
  }

  async function exportXLSX() {
    setExportTasksLoading(true);
    let all: TaskRow[] = [];
    try {
      all = await loadExportTaskRows();
    } finally {
      setExportTasksLoading(false);
    }
    if (!all.length) return;
    const rows = all.map((t, i) => ({
      No: i + 1,
      "ID Task": formatTaskPublicId(t.project?.code, t.taskNumber),
      Referensi: taskReferencesLabel(t),
      Judul: t.title,
      Status: statusLabel(t.status),
      Prioritas: priorityLabel(t.priority),
      Tipe: taskTypeLabel(t.type),
      Sprint: t.sprint?.name ?? "—",
      Assignee: t.assignees.map(a => a.user.name).join(", ") || "—",
      "Tanggal Mulai": fmtDate(t.startDate),
      Tenggat: fmtDate(t.dueDate),
      Dibuat: fmtDate(t.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Task Report");
    XLSX.writeFile(wb, `task-report_${project?.code ?? projectId}_${format(new Date(), "yyyyMMdd")}.xlsx`);
  }

  if (!allowed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reports</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600">
          Hanya <strong>Admin</strong> dan <strong>PM</strong> yang dapat melihat laporan proyek ini.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 print:space-y-3">
      <div className="flex flex-col gap-2 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground">
            Laporan progres proyek — data akurat berdasarkan task aktif
          </p>
        </div>
      </div>

      <Tabs value={reportTab} onValueChange={setReportTab}>
        <TabsList className="grid w-full grid-cols-2 print:hidden">
          <TabsTrigger value="infografis" className="gap-2">
            <TrendingUp className="size-4" />
            Infografis
          </TabsTrigger>
          <TabsTrigger value="tabel" className="gap-2">
            <ListChecks className="size-4" />
            Daftar Task
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Infografis ────────────────────────────────────────── */}
        <TabsContent value="infografis" className="space-y-6 pt-4">

          {/* Summary cards */}
          {progressQ.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <SummaryCard
                label="Total Task"
                value={totalTasks}
                icon={Layers}
                color="bg-zinc-700"
                sub={`${completionPct}% selesai`}
              />
              <SummaryCard
                label="Backlog & To Do"
                value={backlogCount}
                icon={Clock}
                color="bg-slate-500"
                sub="Belum dimulai"
              />
              <SummaryCard
                label="In Progress"
                value={inProgressCount}
                icon={CircleDot}
                color="bg-blue-500"
                sub="Sedang dikerjakan"
              />
              <SummaryCard
                label="Awaiting Approval"
                value={awaitingCount}
                icon={AlertCircle}
                color="bg-amber-500"
                sub="Menunggu persetujuan"
              />
              <SummaryCard
                label="On Check"
                value={onCheckCount}
                icon={SlidersHorizontal}
                color="bg-violet-500"
                sub="Sedang dicek"
              />
              <SummaryCard
                label="Need Revision"
                value={needRevisionCount}
                icon={XCircle}
                color="bg-red-500"
                sub="Perlu revisi"
              />
              <SummaryCard
                label="Completed"
                value={completedCount}
                icon={CheckCircle2}
                color="bg-emerald-500"
                sub="Selesai"
              />
              <SummaryCard
                label="Parking Lot"
                value={parkingCount}
                icon={Pause}
                color="bg-zinc-400"
                sub="On hold / Cancelled"
              />
            </div>
          )}

          {/* Progress bar */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Penyelesaian Task</p>
                <span className="text-lg font-bold tabular-nums text-emerald-600">{completionPct}%</span>
              </div>
              <div className="h-3 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {completedCount} dari {totalTasks} task selesai
              </p>
            </CardContent>
          </Card>

          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Status distribution donut */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Distribusi Status</CardTitle>
              </CardHeader>
              <CardContent>
                {progressQ.isLoading ? (
                  <Skeleton className="h-56 w-full" />
                ) : pieData.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Belum ada task</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={88}
                        dataKey="value"
                        paddingAngle={2}
                        label={({ name, percent }) =>
                          (percent ?? 0) > 0.05 ? `${name} ${Math.round((percent ?? 0) * 100)}%` : ""
                        }
                        labelLine={false}
                        fontSize={10}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} task`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Priority distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Distribusi Prioritas</CardTitle>
              </CardHeader>
              <CardContent>
                {progressQ.isLoading ? (
                  <Skeleton className="h-56 w-full" />
                ) : priorityData.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Belum ada task</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={priorityData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-100" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => [`${v} task`, "Jumlah"]} />
                      <Bar dataKey="count" name="Task" radius={[4, 4, 0, 0]}>
                        {priorityData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Workload per member */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Beban Kerja per Anggota</CardTitle>
              </CardHeader>
              <CardContent>
                {workloadQ.isLoading ? (
                  <Skeleton className="h-56 w-full" />
                ) : workloadData.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Belum ada assignee</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(220, workloadData.length * 36)}>
                    <BarChart data={workloadData} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-100" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => [`${v} task`, "Jumlah"]} />
                      <Bar dataKey="tasks" name="Task" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Burndown chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold">Burndown Chart</CardTitle>
                  {sprintsQ.data && sprintsQ.data.length > 0 ? (
                    <Select
                      value={effectiveSprintId}
                      onValueChange={v => setSprintId(v ?? "" as string)}
                      items={(sprintsQ.data ?? []).map(s => ({ value: s.id, label: s.name }))}
                    >
                      <SelectTrigger className="h-7 w-[160px] text-xs">
                        <SelectValue placeholder="Pilih sprint" />
                      </SelectTrigger>
                      <SelectContent>
                        {(sprintsQ.data ?? []).map(s => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                {!effectiveSprintId ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Belum ada sprint aktif di proyek ini.
                  </p>
                ) : burndownQ.isLoading ? (
                  <Skeleton className="h-56 w-full" />
                ) : burnData.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Tidak ada data burndown untuk sprint ini.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={burnData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-100" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} width={32} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line
                        type="monotone"
                        dataKey="ideal"
                        name="Ideal"
                        stroke="#94a3b8"
                        strokeDasharray="5 5"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="remaining"
                        name="Sisa Poin"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 2.5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                {burndownQ.data ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Total story points: <strong>{burndownQ.data.totalPoints}</strong>
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 2: Daftar Task ───────────────────────────────────────── */}
        <TabsContent value="tabel" className="space-y-4 pt-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-end gap-2 print:hidden">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari task…"
                value={tableSearch}
                onChange={e => { setTableSearch(e.target.value); setTablePage(1); }}
                className="pl-8 h-9"
              />
            </div>
            <Select
              value={tableStatus}
              onValueChange={v => { setTableStatus(v ?? "__all__"); setTablePage(1); }}
              items={STATUS_FILTER_ITEMS}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_ITEMS.map(i => (
                  <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={tablePriority}
              onValueChange={v => { setTablePriority(v ?? "__all__"); setTablePage(1); }}
              items={PRIORITY_FILTER_ITEMS}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_FILTER_ITEMS.map(i => (
                  <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void exportCSV()}
                disabled={exportTasksLoading}
              >
                <FileText className="size-3.5" />
                CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void exportXLSX()}
                disabled={exportTasksLoading}
              >
                <FileSpreadsheet className="size-3.5" />
                Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void exportPdf()}
                disabled={pdfExporting}
              >
                {pdfExporting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <FileDown className="size-3.5" />
                )}
                PDF
              </Button>
            </div>
          </div>

          {/* Summary bar */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground print:hidden">
            <span>
              Total <strong className="text-foreground">{tableTotal}</strong> task
              {tableTotal !== totalTasks ? ` (dari ${totalTasks} keseluruhan)` : ""}
            </span>
          </div>

          {/* Table (~10 baris terlihat, sisanya scroll vertikal) */}
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-[28rem] overflow-y-auto overscroll-y-contain">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/95 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-muted/80">
                <TableRow className="bg-muted/40">
                  <TableHead className="w-8 text-center text-xs">#</TableHead>
                  <SortableTableHead
                    label="ID"
                    columnKey="taskNumber"
                    activeSortKey={tableSortCol}
                    sortDirection={tableSortDir}
                    onSort={onReportTableSort}
                    className="text-xs whitespace-nowrap"
                  />
                  <TableHead className="text-xs min-w-[10rem]">
                    Referensi task
                  </TableHead>
                  <SortableTableHead
                    label="Judul Task"
                    columnKey="title"
                    activeSortKey={tableSortCol}
                    sortDirection={tableSortDir}
                    onSort={onReportTableSort}
                    className="text-xs"
                  />
                  <SortableTableHead
                    label="Status"
                    columnKey="status"
                    activeSortKey={tableSortCol}
                    sortDirection={tableSortDir}
                    onSort={onReportTableSort}
                    className="text-xs"
                  />
                  <SortableTableHead
                    label="Prioritas"
                    columnKey="priority"
                    activeSortKey={tableSortCol}
                    sortDirection={tableSortDir}
                    onSort={onReportTableSort}
                    className="text-xs"
                  />
                  <TableHead className="text-xs">Assignee</TableHead>
                  <TableHead className="text-xs">Sprint</TableHead>
                  <SortableTableHead
                    label="Tanggal mulai"
                    columnKey="startDate"
                    activeSortKey={tableSortCol}
                    sortDirection={tableSortDir}
                    onSort={onReportTableSort}
                    className="text-xs whitespace-nowrap"
                  />
                  <SortableTableHead
                    label="Tenggat"
                    columnKey="dueDate"
                    activeSortKey={tableSortCol}
                    sortDirection={tableSortDir}
                    onSort={onReportTableSort}
                    className="text-xs"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableQ.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : tableRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                      Tidak ada task yang sesuai filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  tableRows.map((t, i) => (
                    <TableRow key={t.id} className="hover:bg-muted/30 text-sm">
                      <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                        {(tablePage - 1) * tablePageSize + i + 1}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground tabular-nums">
                        {formatTaskPublicId(t.project?.code, t.taskNumber)}
                      </TableCell>
                      <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                        <span className="line-clamp-2" title={taskReferencesLabel(t)}>
                          {taskReferencesLabel(t)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <p className="truncate font-medium">{t.title}</p>
                        <p className="text-[11px] text-muted-foreground">{taskTypeLabel(t.type)}</p>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
                          statusBadgeClass(t.status),
                        )}>
                          {statusLabel(t.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          priorityBadgeClass(t.priority),
                        )}>
                          {priorityLabel(t.priority)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex -space-x-1.5">
                          {t.assignees.slice(0, 3).map(a => (
                            <UserProfileTrigger
                              key={a.user.id}
                              userId={a.user.id}
                              title={a.user.name}
                              className="inline-flex"
                            >
                              <Avatar className="size-6 border-2 border-background">
                                <AvatarImage src={a.user.image ?? undefined} alt="" />
                                <AvatarFallback className="text-[9px]">{initials(a.user.name)}</AvatarFallback>
                              </Avatar>
                            </UserProfileTrigger>
                          ))}
                          {t.assignees.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : null}
                          {t.assignees.length > 3 ? (
                            <span
                              className="ml-1 text-[11px] text-muted-foreground"
                              title={t.assignees.slice(3).map(a => a.user.name).join(", ")}
                            >
                              +{t.assignees.length - 3}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {t.sprint?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(t.startDate)}
                      </TableCell>
                      <TableCell className={cn(
                        "text-xs whitespace-nowrap",
                        t.dueDate && new Date(t.dueDate) < new Date() &&
                          !["completed", "done", "cancelled"].includes(t.status)
                          ? "text-red-600 font-medium"
                          : "text-muted-foreground",
                      )}>
                        {fmtDate(t.dueDate)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </div>

          {/* Pagination */}
          <div className="overflow-hidden rounded-lg border border-border print:hidden">
            <ListPaginationBar
              total={tableTotal}
              page={tablePage}
              pageSize={tablePageSize}
              onPageChange={setTablePage}
              onPageSizeChange={setTablePageSize}
              disabled={tableQ.isFetching}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:space-y-3, .print\\:space-y-3 * { visibility: visible; }
          .print\\:hidden { display: none !important; }
          [data-radix-tabs-content][hidden] { display: block !important; visibility: visible; }
        }
      `}</style>
    </div>
  );
}
