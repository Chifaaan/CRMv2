"use client";

import { useState, useCallback, use, useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  startOfDay,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  History,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Zap,
  ListChecks,
  Download,
  CalendarRange,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserProfileTrigger } from "@/components/features/users/UserProfileTrigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isAdminOrPmRole } from "@/lib/role-constants";

type AuditLog = {
  id: string;
  projectId: string | null;
  entityType: string;
  entityId: string;
  entityName: string | null;
  action: string;
  actorId: string;
  actorName: string;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string; image: string | null } | null;
};

const ACTION_META: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  created:      { label: "Dibuat",       color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-200", icon: CheckCircle2 },
  updated:      { label: "Diperbarui",   color: "text-blue-700",    bg: "bg-blue-100",    border: "border-blue-200",    icon: Pencil },
  deleted:      { label: "Dihapus",      color: "text-red-700",     bg: "bg-red-100",     border: "border-red-200",     icon: Trash2 },
  bulk_updated: { label: "Bulk Update",  color: "text-purple-700",  bg: "bg-purple-100",  border: "border-purple-200",  icon: ListChecks },
  bulk_deleted: { label: "Bulk Delete",  color: "text-red-700",     bg: "bg-red-100",     border: "border-red-200",     icon: Trash2 },
  activated:    { label: "Diaktifkan",   color: "text-sky-700",     bg: "bg-sky-100",     border: "border-sky-200",     icon: Zap },
  completed:    { label: "Diselesaikan", color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-200", icon: CheckCircle2 },
};

const ENTITY_LABELS: Record<string, string> = {
  task: "Task", sprint: "Sprint", project: "Project",
};

const ENTITY_FILTERS = [
  { value: "", label: "Semua" },
  { value: "task", label: "Task" },
  { value: "sprint", label: "Sprint" },
  { value: "project", label: "Project" },
];

/** Item per permintaan API; area daftar memakai tinggi ~10 baris + scroll vertikal. */
const LOG_PAGE_SIZE = 10;

const ACTION_FILTERS = [
  { value: "", label: "Semua Aksi" },
  { value: "created", label: "Dibuat" },
  { value: "updated", label: "Diperbarui" },
  { value: "deleted", label: "Dihapus" },
  { value: "bulk_updated", label: "Bulk Update" },
  { value: "bulk_deleted", label: "Bulk Delete" },
  { value: "activated", label: "Diaktifkan" },
  { value: "completed", label: "Diselesaikan" },
];

function groupByDate(logs: AuditLog[]): { label: string; date: Date; logs: AuditLog[] }[] {
  const groups = new Map<string, AuditLog[]>();
  for (const log of logs) {
    const d = new Date(log.createdAt);
    const key = startOfDay(d).toISOString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(log);
  }
  return Array.from(groups.entries()).map(([key, items]) => {
    const d = new Date(key);
    let label: string;
    if (isToday(d)) label = "Hari Ini";
    else if (isYesterday(d)) label = "Kemarin";
    else label = format(d, "EEEE, d MMMM yyyy", { locale: idLocale });
    return { label, date: d, logs: items };
  });
}

function formatFieldName(key: string): string {
  const map: Record<string, string> = {
    status: "Status", priority: "Prioritas", type: "Tipe", title: "Judul",
    sprintId: "Sprint", startDate: "Tgl Mulai", dueDate: "Jatuh Tempo",
    name: "Nama", goal: "Tujuan", endDate: "Tgl Selesai",
  };
  return map[key] ?? key;
}

function formatFieldValue(val: unknown): string {
  if (val == null || val === "") return "—";
  if (typeof val === "string") {
    const statusMap: Record<string, string> = {
      backlog: "Backlog", todo: "To Do", in_progress: "In Progress",
      awaiting_approval: "Awaiting Approval", on_check: "On Check",
      need_revision: "Need Revision", completed: "Completed",
      on_hold: "On Hold", cancelled: "Cancelled",
      PLANNING: "Planning", ACTIVE: "Active", COMPLETED: "Completed",
    };
    if (statusMap[val]) return statusMap[val];
    try {
      if (/^\d{4}-\d{2}-\d{2}/.test(val))
        return format(new Date(val), "d MMM yyyy", { locale: idLocale });
    } catch { /* ignore */ }
    return val;
  }
  return String(val);
}

function ChangeDiff({ changes }: { changes: Record<string, unknown> }) {
  const entries = Object.entries(changes).filter(
    ([, v]) => v != null && typeof v === "object" && "before" in (v as object),
  );
  if (!entries.length) return null;
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
      <div className="grid grid-cols-[120px_1fr_20px_1fr] items-center gap-0 divide-y divide-zinc-100">
        <div className="col-span-4 grid grid-cols-[120px_1fr_20px_1fr] bg-zinc-100/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          <span>Field</span>
          <span>Sebelum</span>
          <span />
          <span>Sesudah</span>
        </div>
        {entries.map(([key, val]) => {
          const diff = val as { before: unknown; after: unknown };
          return (
            <div key={key} className="col-span-4 grid grid-cols-[120px_1fr_20px_1fr] items-center px-3 py-1.5 text-xs">
              <span className="font-medium text-zinc-500">{formatFieldName(key)}</span>
              <span className="min-w-0 truncate text-red-600 line-through">{formatFieldValue(diff.before)}</span>
              <ChevronRight className="size-3 shrink-0 text-zinc-300" />
              <span className="min-w-0 truncate font-medium text-emerald-700">{formatFieldValue(diff.after)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BulkSummary({ changes, metadata }: { changes: Record<string, unknown>; metadata: Record<string, unknown> | null }) {
  const tasks = (changes.tasks as { id: string; title: string }[] | undefined) ?? [];
  const patch = (changes.patch as Record<string, unknown> | undefined) ?? {};
  const patchEntries = Object.entries(patch).filter(([, v]) => v != null);
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs">
      {patchEntries.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Perubahan</p>
          {patchEntries.map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-zinc-500">{formatFieldName(key)}:</span>
              <span className="font-semibold text-zinc-800">{formatFieldValue(val)}</span>
            </div>
          ))}
        </div>
      )}
      {tasks.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Task yang terpengaruh ({tasks.length})
          </p>
          <ul className="space-y-0.5">
            {tasks.slice(0, 5).map((t) => (
              <li key={t.id} className="truncate text-zinc-600">&bull; {t.title}</li>
            ))}
            {tasks.length > 5 && (
              <li className="text-zinc-400">... dan {tasks.length - 5} lainnya</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function AuditCard({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const meta = ACTION_META[log.action] ?? { label: log.action, color: "text-zinc-700", bg: "bg-zinc-100", border: "border-zinc-200", icon: Pencil };
  const ActionIcon = meta.icon;
  const isBulk = log.action === "bulk_updated" || log.action === "bulk_deleted";
  const hasChanges = log.changes && typeof log.changes === "object" && Object.keys(log.changes).length > 0;

  return (
    <div className="group relative rounded-xl border border-zinc-100 bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border", meta.bg, meta.border)}>
          <ActionIcon className={cn("size-4", meta.color)} />
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.bg, meta.color)}>
                  {meta.label}
                </span>
                <span className="text-xs text-zinc-500">
                  {ENTITY_LABELS[log.entityType] ?? log.entityType}
                </span>
                {log.entityName && (
                  <span className="max-w-[260px] truncate text-xs font-semibold text-zinc-800">
                    {log.entityName}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-zinc-500" title={format(new Date(log.createdAt), "PPpp", { locale: idLocale })}>
                {format(new Date(log.createdAt), "HH:mm")}
              </p>
              <p className="text-[10px] text-zinc-400">
                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: idLocale })}
              </p>
            </div>
          </div>

          {/* Actor */}
          <div className="mt-1.5 flex items-center gap-1.5">
            {log.actorId ? (
              <UserProfileTrigger userId={log.actorId}>
                <Avatar className="size-5">
                  {log.actor?.image && <AvatarImage src={log.actor.image} />}
                  <AvatarFallback className="text-[9px]">
                    {(log.actor?.name ?? log.actorName).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </UserProfileTrigger>
            ) : (
              <Avatar className="size-5">
                {log.actor?.image && <AvatarImage src={log.actor.image} />}
                <AvatarFallback className="text-[9px]">
                  {(log.actor?.name ?? log.actorName).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <span className="text-xs text-zinc-500">
              oleh{" "}
              {log.actorId ? (
                <UserProfileTrigger userId={log.actorId} className="rounded-sm">
                  <span className="font-medium text-zinc-700">
                    {log.actor?.name ?? log.actorName}
                  </span>
                </UserProfileTrigger>
              ) : (
                <span className="font-medium text-zinc-700">
                  {log.actor?.name ?? log.actorName}
                </span>
              )}
            </span>
          </div>

          {/* Toggle diff */}
          {hasChanges && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary transition-colors"
            >
              <Filter className="size-3.5" />
              {expanded ? "Sembunyikan" : "Tampilkan"} detail perubahan
              <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
            </button>
          )}

          {/* Diff */}
          {expanded && hasChanges && (
            isBulk
              ? <BulkSummary changes={log.changes as Record<string, unknown>} metadata={log.metadata as Record<string, unknown> | null} />
              : <ChangeDiff changes={log.changes as Record<string, unknown>} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const allowed = isAdminOrPmRole(role);

  const logScrollRef = useRef<HTMLDivElement | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const logQ = useInfiniteQuery({
    queryKey: [
      "audit-trail-page",
      projectId,
      entityType,
      action,
      search,
      dateFrom,
      dateTo,
      LOG_PAGE_SIZE,
    ],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        projectId,
        take: String(LOG_PAGE_SIZE),
        page: String(pageParam),
      });
      if (entityType) params.set("entityType", entityType);
      if (action) params.set("action", action);
      if (search) params.set("search", search);
      const df = dateFrom.trim();
      const dt = dateTo.trim();
      if (df) params.set("dateFrom", df);
      if (dt) params.set("dateTo", dt);
      const res = await api.get<{ data: AuditLog[]; meta: { total: number; page: number; take: number } }>(
        `/api/activity-log?${params}`,
      );
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const { page, take, total } = last.meta;
      if (page * take >= total) return undefined;
      return page + 1;
    },
    refetchOnWindowFocus: false,
    enabled: allowed,
  });

  const handleRefresh = useCallback(() => void logQ.refetch(), [logQ]);

  const logs = logQ.data?.pages.flatMap((p) => p.data) ?? [];
  const meta = logQ.data?.pages[0]?.meta;
  const groups = groupByDate(logs);

  useEffect(() => {
    const root = logScrollRef.current;
    const el = loadMoreSentinelRef.current;
    if (!root || !el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (logQ.hasNextPage && !logQ.isFetchingNextPage) {
          void logQ.fetchNextPage();
        }
      },
      { root, rootMargin: "100px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [
    logQ.hasNextPage,
    logQ.isFetchingNextPage,
    logQ.fetchNextPage,
    logs.length,
    projectId,
    entityType,
    action,
    search,
    dateFrom,
    dateTo,
  ]);
  const hasFilter =
    Boolean(entityType) ||
    Boolean(action) ||
    Boolean(search.trim()) ||
    Boolean(dateFrom.trim()) ||
    Boolean(dateTo.trim());

  // Stats from current data (approximate)
  const uniqueActors = [...new Set(logs.map((l) => l.actorId))].length;
  const entityCounts = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.entityType] = (acc[l.entityType] ?? 0) + 1;
    return acc;
  }, {});

  if (!allowed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log aktivitas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600">
          Hanya <strong>Admin</strong> dan <strong>PM</strong> yang dapat mengakses log proyek ini.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Audit Trail</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Seluruh riwayat perubahan yang terjadi dalam project ini — siapa, apa, dan kapan.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={logQ.isFetching}
          className="shrink-0 gap-1.5"
        >
          <RefreshCw className={cn("size-3.5", logQ.isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats cards */}
      {meta && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-100 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Total Aktivitas</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{meta.total}</p>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Kontributor</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{uniqueActors}</p>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Task Events</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{entityCounts.task ?? 0}</p>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Sprint Events</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{entityCounts.sprint ?? 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
        <div className="rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-2.5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-zinc-600">
            <CalendarRange className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
            Rentang tanggal
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="log-date-from" className="text-[10px] font-normal text-zinc-500">
                Dari tanggal
              </Label>
              <Input
                id="log-date-from"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                }}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="log-date-to" className="text-[10px] font-normal text-zinc-500">
                Sampai tanggal
              </Label>
              <Input
                id="log-date-to"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => {
                  setDateTo(e.target.value);
                }}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Cari nama task, sprint…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              className="h-8 pl-8 text-sm"
            />
          </div>

          {/* Entity type */}
          <div className="flex flex-wrap gap-1">
            {ENTITY_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setEntityType(f.value);
                }}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  entityType === f.value
                    ? "bg-primary text-white"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Action */}
          <div className="flex flex-wrap gap-1">
            {ACTION_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setAction(f.value);
                }}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  action === f.value
                    ? "bg-zinc-800 text-white"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setEntityType("");
                setAction("");
                setSearch("");
                setDateFrom("");
                setDateTo("");
              }}
              className="flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-primary"
            >
              <X className="size-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      {logQ.isPending ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-zinc-100 bg-white p-4">
              <div className="flex gap-3">
                <div className="size-9 shrink-0 rounded-lg bg-zinc-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/3 rounded bg-zinc-100" />
                  <div className="h-2.5 w-1/3 rounded bg-zinc-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : logQ.isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertTriangle className="size-10 text-red-400" />
          <p className="text-sm font-medium text-zinc-700">Gagal memuat audit trail</p>
          <Button size="sm" variant="outline" onClick={handleRefresh}>Coba lagi</Button>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <History className="size-10 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-500">Belum ada aktivitas</p>
          <p className="text-xs text-zinc-400">
            {hasFilter
              ? "Coba ubah pencarian, jenis, aksi, atau rentang tanggal."
              : "Setiap perubahan pada task, sprint, dan project akan tercatat di sini."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-zinc-500">
            Menampilkan {logs.length} dari {meta?.total ?? 0} aktivitas
            {logQ.hasNextPage ? " · gulir ke bawah untuk memuat lebih banyak" : null}
          </p>
          <div
            ref={logScrollRef}
            className="max-h-[min(68vh,38rem)] overflow-y-auto overscroll-y-contain rounded-xl border border-zinc-100 bg-white px-4 py-3 [scrollbar-gutter:stable]"
          >
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.label}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-zinc-100" />
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                      {group.label}
                    </span>
                    <div className="h-px flex-1 bg-zinc-100" />
                  </div>
                  <div className="space-y-2">
                    {group.logs.map((log) => (
                      <AuditCard key={log.id} log={log} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div ref={loadMoreSentinelRef} className="h-1 w-full shrink-0" aria-hidden />
            {logQ.isFetchingNextPage ? (
              <p className="py-3 text-center text-xs text-zinc-400">Memuat…</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
