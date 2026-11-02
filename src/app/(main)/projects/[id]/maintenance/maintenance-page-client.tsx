"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Columns,
  Download,
  Eye,
  Filter,
  List,
  Pencil,
  Paperclip,
  Search,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  MaintenanceBoard,
  type MaintenanceBoardFilters,
  type MaintenanceTicketRow,
} from "@/components/features/maintenance/MaintenanceBoard";
import { TicketFormSheet } from "@/components/features/maintenance/TicketFormSheet";
import { MaintenanceTicketDetailDialog } from "@/components/features/maintenance/MaintenanceTicketDetailDialog";
import {
  MNT_PRIORITY_OPTIONS,
  MNT_SEVERITY_OPTIONS,
  MNT_TYPE_OPTIONS,
  MNT_PRIORITY_LABELS,
  MNT_TYPE_LABELS,
  MNT_SEVERITY_LABELS,
  MNT_STATUS_LABELS,
  MAIN_PIPELINE_STATUSES,
  PARKING_LOT_STATUSES,
  formatDateID,
} from "@/components/features/maintenance/maintenance-constants";
import { toast } from "sonner";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import type { SortDirection } from "@/lib/column-sort";
import {
  cmpOptionalDateDir,
  cmpOptionalStringDir,
  toggleColumnSort,
} from "@/lib/column-sort";
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
import {
  DEFAULT_LIST_PAGE_SIZE,
  type ListPageSize,
} from "@/lib/list-pagination";
import { isAdminOrPmRole } from "@/lib/role-constants";

const VIEW_STORAGE_PREFIX = "trackly_maintenance_view_";

type ProjectMemberRow = {
  user: {
    id: string;
    name: string;
    role: string;
  };
};

const LIST_STATUS_OPTIONS = [
  ...MAIN_PIPELINE_STATUSES,
  ...PARKING_LOT_STATUSES,
  { value: "reported", label: "Reported" },
  { value: "open", label: "Open" },
] as const;

function viewStorageKey(projectId: string) {
  return `${VIEW_STORAGE_PREFIX}${projectId}`;
}

function maintenanceStats(tickets: MaintenanceTicketRow[]) {
  const backlogStatuses = new Set(["backlog", "reported", "open"]);
  return {
    total: tickets.length,
    backlog: tickets.filter((t) => backlogStatuses.has(t.status)).length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    completed: tickets.filter((t) => t.status === "completed").length,
    parked: tickets.filter(
      (t) => t.status === "canceled" || t.status === "on_hold",
    ).length,
  };
}

function canEditTicket(
  row: MaintenanceTicketRow,
  userId: string | undefined,
  role: string,
) {
  if (!userId) return false;
  if (isAdminOrPmRole(role)) return true;
  if (role === "developer") {
    if (row.assignedTo === userId) return true;
    return row.picDevs.some((p) => p.user.id === userId);
  }
  return false;
}

function severityCell(sev: string | null) {
  if (!sev) return <span className="text-zinc-400">—</span>;
  const major = sev === "major";
  return (
    <span
      className={cn(
        "inline-block rounded-md px-2 py-0.5 text-xs font-semibold",
        major
          ? "border border-amber-200 bg-amber-50 text-amber-800"
          : "border border-slate-200 bg-slate-100 text-slate-600",
      )}
    >
      {MNT_SEVERITY_LABELS[sev] ?? sev}
    </span>
  );
}

function hoursCell(row: MaintenanceTicketRow) {
  if (row.actualHours != null) return `${row.actualHours}h`;
  if (row.estimatedHours != null) return `~${row.estimatedHours}h`;
  return "—";
}

export function MaintenancePageClient() {
  const { id: projectId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as
    | { id?: string; role?: string }
    | undefined;
  const userId = user?.id;
  const role = user?.role ?? "developer";

  const [view, setView] = useState<"board" | "list">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [listFilters, setListFilters] = useState({
    status: "",
    type: "",
    priority: "",
    severity: "",
  });
  const [boardFilters, setBoardFilters] = useState<MaintenanceBoardFilters>({
    priority: "",
    type: "",
    severity: "",
    assigneeId: "",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTicketId, setEditTicketId] = useState<string | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTicketId, setDetailTicketId] = useState<string | null>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState<ListPageSize>(
    DEFAULT_LIST_PAGE_SIZE,
  );
  const [listSortCol, setListSortCol] = useState<string>("ticketNumber");
  const [listSortDir, setListSortDir] = useState<SortDirection>("asc");

  useEffect(() => {
    try {
      const v = localStorage.getItem(viewStorageKey(projectId));
      if (v === "list" || v === "board") setView(v);
    } catch {
      /* ignore */
    }
  }, [projectId]);

  function persistView(next: "board" | "list") {
    setView(next);
    try {
      localStorage.setItem(viewStorageKey(projectId), next);
    } catch {
      /* ignore */
    }
  }

  const q = useQuery({
    queryKey: ["maintenance", projectId],
    queryFn: async () => {
      const res = await api.get<{ data: MaintenanceTicketRow[] }>(
        "/api/maintenance",
        { params: { projectId, page: "1", take: "2000" } },
      );
      return res.data.data;
    },
  });

  const membersQ = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const res = await api.get<ProjectMemberRow[]>(
        `/api/projects/${projectId}/members`,
      );
      return res.data;
    },
  });

  const developers = useMemo(
    () =>
      (membersQ.data ?? []).filter((m) => m.user.role === "developer"),
    [membersQ.data],
  );

  const listStatusSelectItems = useMemo(
    () => [
      { value: "__all__", label: "All statuses" },
      ...LIST_STATUS_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
      })),
    ],
    [],
  );
  const listTypeSelectItems = useMemo(
    () => [
      { value: "__all__", label: "All types" },
      ...MNT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    ],
    [],
  );
  const listPrioritySelectItems = useMemo(
    () => [
      { value: "__all__", label: "All priorities" },
      ...MNT_PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    ],
    [],
  );
  const listSeveritySelectItems = useMemo(
    () => [
      { value: "__all__", label: "All severity" },
      ...MNT_SEVERITY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    ],
    [],
  );
  const assigneeSelectItems = useMemo(
    () => [
      { value: "__all__", label: "All assignees" },
      ...developers.map((m) => ({ value: m.user.id, label: m.user.name })),
    ],
    [developers],
  );

  const mutate = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) => {
      await api.patch(`/api/maintenance/${id}`, { status });
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ["maintenance", projectId] });
      void qc.invalidateQueries({ queryKey: ["maintenance", variables.id] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Could not update status"),
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/maintenance/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["maintenance", projectId] });
      setDeleteId(null);
      toast.success("Ticket deleted");
    },
    onError: () => toast.error("Could not delete ticket"),
  });

  const stats = useMemo(
    () => maintenanceStats(q.data ?? []),
    [q.data],
  );

  const activeFilterCount = useMemo(() => {
    if (view === "board") {
      return (
        (boardFilters.priority ? 1 : 0) +
        (boardFilters.type ? 1 : 0) +
        (boardFilters.severity ? 1 : 0) +
        (boardFilters.assigneeId ? 1 : 0)
      );
    }
    return (
      (listFilters.status ? 1 : 0) +
      (listFilters.type ? 1 : 0) +
      (listFilters.priority ? 1 : 0) +
      (listFilters.severity ? 1 : 0)
    );
  }, [view, boardFilters, listFilters]);

  async function exportMaintenanceCsv() {
    const params = new URLSearchParams({ projectId });
    if (boardFilters.priority) params.set("priority", boardFilters.priority);
    if (boardFilters.type) params.set("type", boardFilters.type);
    if (boardFilters.severity && isAdminOrPm) {
      params.set("severity", boardFilters.severity);
    }
    if (boardFilters.assigneeId) {
      params.set("picDevUserId", boardFilters.assigneeId);
    }
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }
    try {
      const res = await fetch(`/api/maintenance/export?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      const match = cd?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `maintenance-${projectId.slice(0, 8)}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Could not export");
    }
  }

  const listFiltered = useMemo(() => {
    let rows = q.data ?? [];
    if (listFilters.status) {
      rows = rows.filter((r) => r.status === listFilters.status);
    }
    if (listFilters.type) {
      rows = rows.filter((r) => r.type === listFilters.type);
    }
    if (listFilters.priority) {
      rows = rows.filter((r) => r.priority === listFilters.priority);
    }
    if (listFilters.severity) {
      rows = rows.filter((r) => (r.severity ?? "") === listFilters.severity);
    }
    const qry = searchQuery.trim().toLowerCase();
    if (!qry) return rows;
    return rows.filter((r) => {
      const devNames = r.picDevs.map((p) => p.user.name).join(" ").toLowerCase();
      const hay = `${r.ticketNumber} ${r.title} ${devNames}`.toLowerCase();
      return hay.includes(qry);
    });
  }, [q.data, searchQuery, listFilters]);

  const listSorted = useMemo(() => {
    const dir = listSortDir;
    const rows = [...listFiltered];
    rows.sort((a, b) => {
      switch (listSortCol) {
        case "title":
          return cmpOptionalStringDir(a.title, b.title, dir);
        case "type":
          return cmpOptionalStringDir(a.type, b.type, dir);
        case "severity":
          return cmpOptionalStringDir(a.severity, b.severity, dir);
        case "priority":
          return cmpOptionalStringDir(a.priority, b.priority, dir);
        case "status":
          return cmpOptionalStringDir(a.status, b.status, dir);
        case "pic": {
          const da = (a.picDevs ?? []).map((p) => p.user.name).join(", ");
          const db = (b.picDevs ?? []).map((p) => p.user.name).join(", ");
          return cmpOptionalStringDir(da, db, dir);
        }
        case "due":
          return cmpOptionalDateDir(a.dueDate, b.dueDate, dir);
        case "hours": {
          const na = a.actualHours ?? a.estimatedHours;
          const nb = b.actualHours ?? b.estimatedHours;
          if (na == null && nb == null) return 0;
          if (na == null) return dir === "asc" ? 1 : -1;
          if (nb == null) return dir === "asc" ? -1 : 1;
          const raw = na - nb;
          return dir === "asc" ? raw : -raw;
        }
        case "ticketNumber":
        default:
          return cmpOptionalStringDir(a.ticketNumber, b.ticketNumber, dir);
      }
    });
    return rows;
  }, [listFiltered, listSortCol, listSortDir]);

  useEffect(() => {
    setListPage(1);
  }, [searchQuery, listFilters, listPageSize]);

  function onMaintenanceListSort(key: string) {
    const next = toggleColumnSort(listSortCol, listSortDir, key);
    setListSortCol(next.key);
    setListSortDir(next.dir);
    setListPage(1);
  }

  const listPageRows = useMemo(() => {
    const start = (listPage - 1) * listPageSize;
    return listSorted.slice(start, start + listPageSize);
  }, [listSorted, listPage, listPageSize]);

  useEffect(() => {
    const pages = Math.max(
      1,
      Math.ceil(listSorted.length / listPageSize) || 1,
    );
    setListPage((p) => (p > pages ? Math.max(1, pages) : p));
  }, [listSorted.length, listPageSize]);

  const boardTicketsFiltered = useMemo(() => {
    let rows = q.data ?? [];
    const qry = searchQuery.trim().toLowerCase();
    if (!qry) return rows;
    return rows.filter((r) => {
      const devNames = r.picDevs.map((p) => p.user.name).join(" ").toLowerCase();
      const hay = `${r.ticketNumber} ${r.title} ${devNames}`.toLowerCase();
      return hay.includes(qry);
    });
  }, [q.data, searchQuery]);

  const isAdminOrPm = isAdminOrPmRole(role);
  const canCreateMaintenanceTicket = isAdminOrPm;
  const canExportMaintenance = isAdminOrPm;
  const canManageTickets = role !== "viewer" && role !== "client";

  function openCreateTicket() {
    setFormMode("create");
    setEditTicketId(undefined);
    setFormOpen(true);
  }

  function openEditTicket(id: string) {
    setFormMode("edit");
    setEditTicketId(id);
    setFormOpen(true);
  }

  function openDetail(id: string) {
    setDetailTicketId(id);
    setDetailOpen(true);
  }

  function filterFields() {
    return (
      <div className="space-y-4">
        {view === "list" ? (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Status</Label>
              <Select
                value={listFilters.status || "__all__"}
                onValueChange={(v) =>
                  setListFilters((f) => ({
                    ...f,
                    status: v === "__all__" ? "" : (v ?? ""),
                  }))
                }
                items={listStatusSelectItems}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {listStatusSelectItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Type</Label>
              <Select
                value={listFilters.type || "__all__"}
                onValueChange={(v) =>
                  setListFilters((f) => ({
                    ...f,
                    type: v === "__all__" ? "" : (v ?? ""),
                  }))
                }
                items={listTypeSelectItems}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {listTypeSelectItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Priority</Label>
              <Select
                value={listFilters.priority || "__all__"}
                onValueChange={(v) =>
                  setListFilters((f) => ({
                    ...f,
                    priority: v === "__all__" ? "" : (v ?? ""),
                  }))
                }
                items={listPrioritySelectItems}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  {listPrioritySelectItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isAdminOrPm ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Severity</Label>
                <Select
                  value={listFilters.severity || "__all__"}
                  onValueChange={(v) =>
                    setListFilters((f) => ({
                      ...f,
                      severity: v === "__all__" ? "" : (v ?? ""),
                    }))
                  }
                  items={listSeveritySelectItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    {listSeveritySelectItems.map((it) => (
                      <SelectItem key={it.value} value={it.value}>
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                setListFilters({
                  status: "",
                  type: "",
                  priority: "",
                  severity: "",
                })
              }
            >
              Reset filters
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-zinc-500">
              Board filters narrow cards in the pipeline and parking lot.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Priority</Label>
              <Select
                value={boardFilters.priority || "__all__"}
                onValueChange={(v) =>
                  setBoardFilters((f) => ({
                    ...f,
                    priority: v === "__all__" ? "" : (v ?? ""),
                  }))
                }
                items={listPrioritySelectItems}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {listPrioritySelectItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Type</Label>
              <Select
                value={boardFilters.type || "__all__"}
                onValueChange={(v) =>
                  setBoardFilters((f) => ({
                    ...f,
                    type: v === "__all__" ? "" : (v ?? ""),
                  }))
                }
                items={listTypeSelectItems}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {listTypeSelectItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isAdminOrPm ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Severity</Label>
                <Select
                  value={boardFilters.severity || "__all__"}
                  onValueChange={(v) =>
                    setBoardFilters((f) => ({
                      ...f,
                      severity: v === "__all__" ? "" : (v ?? ""),
                    }))
                  }
                  items={listSeveritySelectItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    {listSeveritySelectItems.map((it) => (
                      <SelectItem key={it.value} value={it.value}>
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">PIC dev</Label>
              <Select
                value={boardFilters.assigneeId || "__all__"}
                onValueChange={(v) =>
                  setBoardFilters((f) => ({
                    ...f,
                    assigneeId: v === "__all__" ? "" : (v ?? ""),
                  }))
                }
                items={assigneeSelectItems}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All assignees" />
                </SelectTrigger>
                <SelectContent>
                  {assigneeSelectItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                setBoardFilters({
                  priority: "",
                  type: "",
                  severity: "",
                  assigneeId: "",
                })
              }
            >
              Reset filters
            </Button>
          </>
        )}
      </div>
    );
  }

  if (q.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <TicketFormSheet
        projectId={projectId}
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditTicketId(undefined);
        }}
        mode={formMode}
        ticketId={editTicketId}
        members={membersQ.data ?? []}
        canFinancial={isAdminOrPm}
        canDelete={isAdminOrPm}
        showActivityLog={canManageTickets}
        onSuccess={() => void q.refetch()}
      />

      {detailTicketId ? (
        <MaintenanceTicketDetailDialog
          projectId={projectId}
          ticketId={detailTicketId}
          open={detailOpen}
          onOpenChange={(o) => {
            setDetailOpen(o);
            if (!o) setDetailTicketId(null);
          }}
          members={membersQ.data ?? []}
          onEdit={(id) => {
            setDetailOpen(false);
            setDetailTicketId(null);
            openEditTicket(id);
          }}
          onUpdated={() => void q.refetch()}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Maintenance</h2>
          <p className="text-sm text-zinc-600">
            Live system ticket tracking — board and list
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreateMaintenanceTicket ? (
            <Button type="button" size="sm" onClick={openCreateTicket}>
              New ticket
            </Button>
          ) : null}
          <div className="flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
            <Button
              type="button"
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              className="h-8 gap-1 px-2"
              onClick={() => persistView("list")}
            >
              <List className="h-3.5 w-3.5" />
              List
            </Button>
            <Button
              type="button"
              variant={view === "board" ? "default" : "ghost"}
              size="sm"
              className="h-8 gap-1 px-2"
              onClick={() => persistView("board")}
            >
              <Columns className="h-3.5 w-3.5" />
              Board
            </Button>
          </div>
          {canExportMaintenance ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => void exportMaintenanceCsv()}
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          ) : null}
          {isAdminOrPm ? (
            <Link
              href={`/projects/${projectId}/maintenance/report`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Generate report
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatCard label="Total" value={stats.total} />
        <StatCard
          label="Backlog"
          value={stats.backlog}
          className="border-blue-100 bg-blue-50/50"
        />
        <StatCard
          label="In progress"
          value={stats.in_progress}
          className="border-amber-100 bg-amber-50/50"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          className="border-emerald-100 bg-emerald-50/50"
        />
        <StatCard
          label="Parked"
          value={stats.parked}
          className="col-span-2 border-zinc-200 bg-zinc-100/60 sm:col-span-1"
        />
      </div>

      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent
          showCloseButton
          className="max-h-[min(720px,90vh)] gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          <DialogHeader className="border-b border-zinc-100 px-4 py-3">
            <DialogTitle>Filter maintenance</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              {view === "board"
                ? "Sempitkan kartu di board dan parking lot."
                : "Sempitkan baris di tabel daftar."}
            </DialogDescription>
            {activeFilterCount > 0 ? (
              <span className="inline-flex w-fit rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                {activeFilterCount} filter aktif
              </span>
            ) : null}
          </DialogHeader>
          <div className="max-h-[min(520px,70vh)] overflow-y-auto px-4 py-4">
            {filterFields()}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <Input
            className="h-10 pl-9"
            placeholder="Cari nomor tiket, judul, atau nama PIC dev…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Cari tiket maintenance"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="default"
          className="h-10 shrink-0 gap-2 border-zinc-200 bg-white shadow-sm"
          onClick={() => setFilterDialogOpen(true)}
        >
          <Filter className="size-4" />
          Filter
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </div>

      <div className="min-w-0 space-y-3">
          {view === "board" ? (
            <>
              <MaintenanceBoard
                tickets={boardTicketsFiltered}
                filters={boardFilters}
                onMove={(id, newStatus) =>
                  mutate.mutate({ id, status: newStatus })
                }
                userId={userId}
                role={role}
                onOpenDetail={openDetail}
              />
            </>
          ) : listSorted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 py-16 text-center">
              <p className="text-sm font-medium text-zinc-800">
                {(q.data ?? []).length === 0
                  ? "No tickets yet"
                  : "No tickets match your filters"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {(q.data ?? []).length === 0
                  ? "Create your first maintenance ticket to get started."
                  : "Coba ubah kata kunci pencarian atau buka Filter untuk menyempitkan hasil."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      label="ID"
                      columnKey="ticketNumber"
                      activeSortKey={listSortCol}
                      sortDirection={listSortDir}
                      onSort={onMaintenanceListSort}
                      className="w-[110px]"
                    />
                    <SortableTableHead
                      label="Title"
                      columnKey="title"
                      activeSortKey={listSortCol}
                      sortDirection={listSortDir}
                      onSort={onMaintenanceListSort}
                    />
                    <SortableTableHead
                      label="Type"
                      columnKey="type"
                      activeSortKey={listSortCol}
                      sortDirection={listSortDir}
                      onSort={onMaintenanceListSort}
                      className="hidden w-[90px] md:table-cell"
                    />
                    <SortableTableHead
                      label="Severity"
                      columnKey="severity"
                      activeSortKey={listSortCol}
                      sortDirection={listSortDir}
                      onSort={onMaintenanceListSort}
                      className="hidden w-[90px] md:table-cell"
                    />
                    <SortableTableHead
                      label="Priority"
                      columnKey="priority"
                      activeSortKey={listSortCol}
                      sortDirection={listSortDir}
                      onSort={onMaintenanceListSort}
                      className="w-[100px]"
                    />
                    <SortableTableHead
                      label="Status"
                      columnKey="status"
                      activeSortKey={listSortCol}
                      sortDirection={listSortDir}
                      onSort={onMaintenanceListSort}
                      className="w-[140px]"
                    />
                    <SortableTableHead
                      label="PIC dev"
                      columnKey="pic"
                      activeSortKey={listSortCol}
                      sortDirection={listSortDir}
                      onSort={onMaintenanceListSort}
                      className="w-[130px]"
                    />
                    <SortableTableHead
                      label="Due date"
                      columnKey="due"
                      activeSortKey={listSortCol}
                      sortDirection={listSortDir}
                      onSort={onMaintenanceListSort}
                      className="w-[110px]"
                    />
                    <SortableTableHead
                      label="Hours"
                      columnKey="hours"
                      activeSortKey={listSortCol}
                      sortDirection={listSortDir}
                      onSort={onMaintenanceListSort}
                      className="w-[80px]"
                    />
                    <TableHead className="w-[100px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listPageRows.map((r) => {
                    const attCount = r._count?.attachments ?? 0;
                    const devNames = r.picDevs
                      .map((p) => p.user.name)
                      .filter(Boolean)
                      .join(", ");
                    const editable = canEditTicket(r, userId, role);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">
                          {r.ticketNumber}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="text-left font-medium text-blue-700 hover:underline"
                            onClick={() => openDetail(r.id)}
                          >
                            {r.title}
                          </button>
                          {attCount > 0 ? (
                            <span className="ml-1 inline-flex items-center gap-0.5 text-[11px] text-zinc-500">
                              <Paperclip className="size-3" aria-hidden />
                              {attCount}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal"
                          >
                            {MNT_TYPE_LABELS[r.type] ?? r.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{severityCell(r.severity)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {MNT_PRIORITY_LABELS[r.priority] ?? r.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {MNT_STATUS_LABELS[r.status] ?? r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[130px] truncate text-sm text-zinc-600">
                          {devNames || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-zinc-600">
                          {formatDateID(r.dueDate)}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-sm text-zinc-600 md:table-cell">
                          {hoursCell(r)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              title="View"
                              onClick={() => openDetail(r.id)}
                            >
                              <Eye className="size-4" />
                            </Button>
                            {editable ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                title="Edit"
                                onClick={() => openEditTicket(r.id)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                            ) : null}
                            {isAdminOrPm ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-red-600"
                                title="Delete"
                                onClick={() => setDeleteId(r.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
              <ListPaginationBar
                total={listSorted.length}
                page={listPage}
                pageSize={listPageSize}
                onPageChange={setListPage}
                onPageSizeChange={setListPageSize}
              />
            </div>
          )}
      </div>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-600/90"
              onClick={() => deleteId && deleteM.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-200 bg-white px-3 py-2",
        className,
      )}
    >
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-zinc-600">{label}</p>
    </div>
  );
}
