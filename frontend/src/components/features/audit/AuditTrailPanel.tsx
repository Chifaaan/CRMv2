"use client";

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  History,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Zap,
  ListChecks,
  CalendarRange,
} from "lucide-react";
import { api } from "@/lib/api/client";
import {
  AUDIT_SCOPE_LABEL,
  entityTypesQueryForScope,
  isAuditScopeNarrow,
  type ProjectAuditFeatureScope,
} from "@/lib/project-audit-scope";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserProfileTrigger } from "@/components/features/users/UserProfileTrigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  project: { id: string; name: string; code: string } | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Diisi untuk membatasi log ke satu project; kosong = semua project yang dapat diakses user (anggota tim / admin global). */
  projectId?: string | null;
  /** Ditampilkan di judul modal agar jelas konteks project */
  projectName?: string | null;
  /**
   * Halaman fitur saat panel dibuka: membatasi jenis entitas (mis. Backlog → hanya task).
   * `log` dan `all` = semua jenis + filter jenis tetap bisa dipilih.
   */
  featureScope: ProjectAuditFeatureScope;
};

const ACTION_META: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }
> = {
  created:      { label: "Dibuat",       color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle2 },
  updated:      { label: "Diperbarui",   color: "text-blue-700",    bg: "bg-blue-100",    icon: Pencil },
  deleted:      { label: "Dihapus",      color: "text-red-700",     bg: "bg-red-100",     icon: Trash2 },
  bulk_updated: { label: "Bulk Update",  color: "text-purple-700",  bg: "bg-purple-100",  icon: ListChecks },
  bulk_deleted: { label: "Bulk Delete",  color: "text-red-700",     bg: "bg-red-100",     icon: Trash2 },
  activated:    { label: "Diaktifkan",   color: "text-sky-700",     bg: "bg-sky-100",     icon: Zap },
  completed:    { label: "Diselesaikan", color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle2 },
};

const ENTITY_META: Record<string, { label: string; color: string }> = {
  task:    { label: "Task",    color: "text-indigo-600" },
  sprint:  { label: "Sprint",  color: "text-orange-600" },
  project: { label: "Project", color: "text-zinc-600" },
  maintenance: { label: "Maintenance", color: "text-amber-700" },
  meeting: { label: "Meeting", color: "text-violet-600" },
  discussion: { label: "Discussion", color: "text-cyan-700" },
};

/** Kata benda untuk kalimat aktivitas (bahasa Indonesia). */
const ENTITY_NOUN_ID: Record<string, string> = {
  task: "tugas",
  sprint: "sprint",
  project: "proyek",
  maintenance: "tiket maintenance",
  meeting: "rapat",
  discussion: "diskusi",
};

const ENTITY_FILTER_ALL = "__all__";
const ACTION_FILTER_ALL = "__all__";

const ENTITY_FILTERS = [
  { value: ENTITY_FILTER_ALL, label: "Semua jenis" },
  { value: "task", label: "Task" },
  { value: "sprint", label: "Sprint" },
  { value: "project", label: "Project" },
  { value: "maintenance", label: "Maintenance" },
  { value: "meeting", label: "Meeting" },
];

const ACTION_FILTERS = [
  { value: ACTION_FILTER_ALL, label: "Semua aksi" },
  { value: "created", label: "Dibuat" },
  { value: "updated", label: "Diperbarui" },
  { value: "deleted", label: "Dihapus" },
  { value: "bulk_updated", label: "Bulk Update" },
  { value: "bulk_deleted", label: "Bulk Delete" },
  { value: "activated", label: "Diaktifkan" },
  { value: "completed", label: "Diselesaikan" },
];

function groupByDate(logs: AuditLog[]): { label: string; logs: AuditLog[] }[] {
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
    return { label, logs: items };
  });
}

function formatFieldName(key: string): string {
  const map: Record<string, string> = {
    status: "Status",
    priority: "Prioritas",
    type: "Tipe",
    title: "Judul",
    description: "Deskripsi",
    sprintId: "Sprint",
    startDate: "Tgl mulai",
    dueDate: "Jatuh tempo",
    name: "Nama",
    goal: "Tujuan",
    endDate: "Tgl selesai",
    tags: "Tag",
    assignees: "Penerima tugas",
    epicId: "Epic",
    parentTaskId: "Task induk (legacy)",
    referenceIds: "Referensi task",
    storyPoints: "Story points",
    clientUserId: "Reporter klien",
    pmReporterId: "Reporter PM",
    teamMembers: "Jumlah anggota tim",
    phase: "Fase",
    budget: "Anggaran",
    actualCost: "Biaya aktual",
    actualEndDate: "Selesai aktual",
    coverColor: "Warna sampul",
    coverImageUrl: "Gambar sampul",
    clientId: "Klien",
    parentId: "Project induk",
  };
  return map[key] ?? key;
}

function formatFieldValue(val: unknown, fieldKey?: string): string {
  if (val == null || val === "") return "—";
  if (Array.isArray(val)) {
    if (val.length === 0) return "—";
    if (val.every((x) => typeof x === "string")) {
      if (fieldKey === "assignees") {
        return val.length === 1 ? "1 orang" : `${val.length} orang`;
      }
      return val.join(", ");
    }
    return val.length === 1 ? "1 item" : `${val.length} item`;
  }
  if (typeof val === "number" && Number.isFinite(val)) {
    if (fieldKey === "budget" || fieldKey === "actualCost") {
      try {
        return new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }
  if (typeof val === "string") {
    const statusMap: Record<string, string> = {
      backlog: "Backlog",
      todo: "To Do",
      in_progress: "In Progress",
      awaiting_approval: "Awaiting Approval",
      on_check: "On Check",
      need_revision: "Need Revision",
      completed: "Completed",
      on_hold: "On Hold",
      cancelled: "Cancelled",
      PLANNING: "Planning",
      ACTIVE: "Active",
      COMPLETED: "Completed",
    };
    if (statusMap[val]) return statusMap[val];
    try {
      if (/^\d{4}-\d{2}-\d{2}/.test(val))
        return format(new Date(val), "d MMM yyyy", { locale: idLocale });
    } catch {
      /* ignore */
    }
    return val;
  }
  if (typeof val === "boolean") return val ? "Ya" : "Tidak";
  if (typeof val === "object") return "—";
  return String(val);
}

function isBeforeAfter(val: unknown): val is { before: unknown; after: unknown } {
  return (
    val != null &&
    typeof val === "object" &&
    "before" in val &&
    "after" in val
  );
}

/** Satu field: tampilan kartu “sebelum → sesudah”, tanpa nuansa kode/response. */
function ChangeFieldCard({
  fieldKey,
  diff,
}: {
  fieldKey: string;
  diff: { before: unknown; after: unknown };
}) {
  const label = formatFieldName(fieldKey);
  const isLong =
    fieldKey === "description" ||
    (typeof diff.before === "string" && diff.before.length > 100) ||
    (typeof diff.after === "string" && diff.after.length > 100);
  const beforeText = formatFieldValue(diff.before, fieldKey);
  const afterText = formatFieldValue(diff.after, fieldKey);

  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-medium text-zinc-800">{label}</p>
      <div
        className={cn(
          "mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch",
          isLong && "sm:flex-col",
        )}
      >
        <div className="min-w-0 flex-1 rounded-lg bg-zinc-50 px-2.5 py-2 ring-1 ring-zinc-100">
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            Sebelumnya
          </p>
          <p
            className={cn(
              "mt-1 text-[11px] leading-snug text-zinc-600 line-through decoration-zinc-400",
              isLong && "max-h-28 overflow-y-auto whitespace-pre-wrap break-words pr-1",
            )}
          >
            {beforeText}
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-center text-zinc-300 sm:px-0.5">
          <ArrowRight className="size-4 rotate-90 sm:rotate-0" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 rounded-lg bg-emerald-50/60 px-2.5 py-2 ring-1 ring-emerald-100/80">
          <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-700/90">
            Menjadi
          </p>
          <p
            className={cn(
              "mt-1 text-[11px] font-medium leading-snug text-emerald-900",
              isLong && "max-h-28 overflow-y-auto whitespace-pre-wrap break-words pr-1",
            )}
          >
            {afterText}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Ringkasan kolom untuk log lama (bukan bentuk before/after): hanya nama kolom, tanpa raw JSON. */
function LegacyFieldsChips({ keys }: { keys: string[] }) {
  if (!keys.length) return null;
  return (
    <div className="mt-3 rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-3">
      <p className="text-[11px] font-medium text-zinc-800">Bagian yang ikut diperbarui</p>
      <p className="mt-0.5 text-[10px] text-zinc-500">
        Riwayat ini mencatat pembaruan pada bidang berikut.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {keys.map((k) => (
          <span
            key={k}
            className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] text-zinc-700 shadow-sm"
          >
            {formatFieldName(k)}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChangeDiff({ changes }: { changes: Record<string, unknown> }) {
  const structured = Object.entries(changes).filter(([, v]) => isBeforeAfter(v));
  if (structured.length) {
    return (
      <div className="mt-2 space-y-2.5">
        <p className="text-[11px] font-medium text-zinc-600">Rincian perubahan</p>
        {structured.map(([key, val]) => (
          <ChangeFieldCard key={key} fieldKey={key} diff={val as { before: unknown; after: unknown }} />
        ))}
      </div>
    );
  }
  const legacyKeys = Object.keys(changes).filter(
    (k) => changes[k] != null && k !== "patch",
  );
  if (!legacyKeys.length) return null;
  return <LegacyFieldsChips keys={legacyKeys} />;
}

function BulkChangeSummary({ changes, metadata }: { changes: Record<string, unknown>; metadata: Record<string, unknown> | null }) {
  const count = (metadata?.count as number) ?? 0;
  const patch = changes.patch as Record<string, unknown> | undefined;
  const patchEntries = patch ? Object.entries(patch).filter(([, v]) => v != null) : [];
  if (!patchEntries.length && !count) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="rounded-xl border border-violet-200/90 bg-violet-50/60 px-3 py-2.5">
        <p className="text-[11px] font-medium text-violet-950">
          {count > 0 ? `${count} tugas terpilih` : "Pembaruan sekaligus"}
        </p>
        <p className="mt-0.5 text-[10px] leading-snug text-violet-900/75">
          Perubahan di bawah diterapkan ke semua tugas yang Anda pilih pada aksi ini.
        </p>
      </div>
      {patchEntries.map(([key, val]) => (
        <div
          key={key}
          className="rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm"
        >
          <p className="text-[11px] font-medium text-zinc-800">{formatFieldName(key)}</p>
          <p className="mt-1.5 text-[11px] text-zinc-600">
            <span className="text-zinc-400">Nilai baru: </span>
            <span className="font-medium text-zinc-900">{formatFieldValue(val, key)}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

/** Satu baris ringkas sebelum expand: apa saja yang berubah (tanpa raw data). */
function changeTeaserLine(
  changes: Record<string, unknown> | null,
  isBulk: boolean,
  metadata: Record<string, unknown> | null,
): string | null {
  if (!changes || typeof changes !== "object") return null;
  if (isBulk) {
    const count = (metadata?.count as number) ?? 0;
    const patch = changes.patch as Record<string, unknown> | undefined;
    const patchKeys =
      patch && typeof patch === "object"
        ? Object.keys(patch).filter((k) => patch[k] != null)
        : [];
    const fieldLabels = patchKeys.map((k) => formatFieldName(k));
    const fields =
      fieldLabels.length <= 2
        ? fieldLabels.join(", ")
        : `${fieldLabels.slice(0, 2).join(", ")} +${fieldLabels.length - 2}`;
    if (count && fields) return `${count} tugas · ${fields}`;
    if (count) return `${count} tugas diperbarui sekaligus`;
    if (fields) return fields;
    return null;
  }
  const structuredKeys = Object.entries(changes)
    .filter(([, v]) => isBeforeAfter(v))
    .map(([k]) => formatFieldName(k));
  if (structuredKeys.length) {
    const shown =
      structuredKeys.length <= 3
        ? structuredKeys.join(", ")
        : `${structuredKeys.slice(0, 3).join(", ")}…`;
    return shown;
  }
  const legacyKeys = Object.keys(changes).filter(
    (k) => changes[k] != null && k !== "patch",
  );
  if (!legacyKeys.length) return null;
  const labels = legacyKeys.map((k) => formatFieldName(k));
  return labels.length <= 3 ? labels.join(", ") : `${labels.slice(0, 3).join(", ")}…`;
}

function AuditEntry({
  log,
  showProjectLink,
}: {
  log: AuditLog;
  showProjectLink: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const actionMeta = ACTION_META[log.action] ?? { label: log.action, color: "text-zinc-700", bg: "bg-zinc-100", icon: Pencil };
  const entityMeta = ENTITY_META[log.entityType] ?? { label: log.entityType, color: "text-zinc-500" };
  const ActionIcon = actionMeta.icon;
  const hasChanges = log.changes && typeof log.changes === "object" && Object.keys(log.changes).length > 0;
  const isBulk = log.action === "bulk_updated" || log.action === "bulk_deleted";
  const teaser = changeTeaserLine(
    log.changes as Record<string, unknown> | null,
    isBulk,
    log.metadata as Record<string, unknown> | null,
  );
  const entityNoun = ENTITY_NOUN_ID[log.entityType] ?? entityMeta.label.toLowerCase();

  return (
    <div className="relative flex gap-3 py-3">
      {/* Timeline dot */}
      <div className="relative flex shrink-0 flex-col items-center">
        <div className={cn("flex size-7 items-center justify-center rounded-full shadow-sm ring-2 ring-white", actionMeta.bg)}>
          <ActionIcon className={cn("size-3.5", actionMeta.color)} />
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("text-xs font-semibold", actionMeta.color)}>{actionMeta.label}</span>
              <span className={cn("text-xs font-medium", entityMeta.color)}>
                {entityMeta.label}
              </span>
              {log.entityName && !isBulk && (
                <span className="max-w-[180px] truncate text-xs font-semibold text-zinc-800">
                  &ldquo;{log.entityName}&rdquo;
                </span>
              )}
            </div>
            {isBulk && log.entityName && (
              <p className="mt-0.5 text-xs text-zinc-500">{log.entityName}</p>
            )}
            {showProjectLink && log.projectId && log.project?.name ? (
              <p className="mt-1">
                <Link
                  href={`/projects/${log.projectId}`}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  <span className="font-mono text-zinc-500">{log.project.code}</span>
                  <span className="text-zinc-400"> · </span>
                  <span>{log.project.name}</span>
                </Link>
              </p>
            ) : null}
          </div>
          <span className="shrink-0 text-[11px] text-zinc-400" title={format(new Date(log.createdAt), "PPpp", { locale: idLocale })}>
            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: idLocale })}
          </span>
        </div>

        {/* Actor */}
        <div className="mt-1 flex items-center gap-1.5">
          {log.actor?.id ? (
            <UserProfileTrigger userId={log.actor.id}>
              <Avatar className="size-4">
                {log.actor?.image && <AvatarImage src={log.actor.image} />}
                <AvatarFallback className="text-[8px]">
                  {(log.actor?.name ?? log.actorName).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </UserProfileTrigger>
          ) : (
            <Avatar className="size-4">
              {log.actor?.image && <AvatarImage src={log.actor.image} />}
              <AvatarFallback className="text-[8px]">
                {(log.actor?.name ?? log.actorName).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="text-[11px] text-zinc-600">
            {log.actor?.id ? (
              <UserProfileTrigger userId={log.actor.id} className="rounded-sm">
                <span className="font-medium text-zinc-700">{log.actor?.name ?? log.actorName}</span>
              </UserProfileTrigger>
            ) : (
              <span className="font-medium text-zinc-700">{log.actor?.name ?? log.actorName}</span>
            )}
            <span className="text-zinc-400"> · </span>
            <span className="text-zinc-500">
              {log.action === "created" && `membuat ${entityNoun} ini`}
              {log.action === "updated" && `mengubah ${entityNoun} ini`}
              {log.action === "deleted" && `menghapus ${entityNoun} ini`}
              {log.action === "bulk_updated" && "memperbarui banyak tugas sekaligus"}
              {log.action === "bulk_deleted" && "menghapus banyak tugas sekaligus"}
              {log.action === "activated" && "mengaktifkan item ini"}
              {log.action === "completed" && "menandai selesai"}
              {!["created", "updated", "deleted", "bulk_updated", "bulk_deleted", "activated", "completed"].includes(log.action) &&
                `melakukan: ${actionMeta.label.toLowerCase()}`}
            </span>
          </span>
        </div>

        {hasChanges && teaser && !expanded && (
          <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
            <span className="text-zinc-400">Ringkasannya: </span>
            {teaser}
          </p>
        )}

        {/* Changes toggle */}
        {hasChanges && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/90 transition-colors"
          >
            <Filter className="size-3" />
            {expanded ? "Sembunyikan rincian" : "Lihat rincian perubahan"}
            <ChevronDown className={cn("size-3 transition-transform", expanded && "rotate-180")} />
          </button>
        )}

        {/* Diff */}
        {expanded && hasChanges && (
          isBulk
            ? <BulkChangeSummary changes={log.changes as Record<string, unknown>} metadata={log.metadata as Record<string, unknown> | null} />
            : <ChangeDiff changes={log.changes as Record<string, unknown>} />
        )}
      </div>
    </div>
  );
}

export function AuditTrailPanel({
  open,
  onOpenChange,
  projectId,
  projectName,
  featureScope,
}: Props) {
  const workspaceMode = !projectId?.trim();
  const scopeNarrow = isAuditScopeNarrow(featureScope);
  const [entityType, setEntityType] = useState(ENTITY_FILTER_ALL);
  const [action, setAction] = useState(ACTION_FILTER_ALL);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setEntityType(ENTITY_FILTER_ALL);
    setAction(ACTION_FILTER_ALL);
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, [projectId, featureScope]);

  const scopedTypesParam = entityTypesQueryForScope(featureScope);
  const queryProjectKey = workspaceMode ? "__workspace__" : projectId!.trim();

  const logQ = useQuery({
    queryKey: [
      "audit-trail",
      queryProjectKey,
      featureScope,
      scopedTypesParam,
      scopeNarrow,
      entityType,
      action,
      search,
      dateFrom,
      dateTo,
      page,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ take: "50" });
      if (!workspaceMode) {
        params.set("projectId", projectId!.trim());
      }
      if (scopeNarrow && scopedTypesParam) {
        params.set("entityTypes", scopedTypesParam);
      } else if (entityType && entityType !== ENTITY_FILTER_ALL) {
        params.set("entityType", entityType);
      }
      if (action && action !== ACTION_FILTER_ALL) {
        params.set("action", action);
      }
      if (search) params.set("search", search);
      const df = dateFrom.trim();
      const dt = dateTo.trim();
      if (df) params.set("dateFrom", df);
      if (dt) params.set("dateTo", dt);
      if (page > 1) params.set("page", String(page));
      const res = await api.get<{ data: AuditLog[]; meta: { total: number; page: number; take: number } }>(
        `/api/activity-log?${params}`
      );
      return res.data;
    },
    enabled: open && (workspaceMode || Boolean(projectId?.trim())),
    refetchOnWindowFocus: false,
  });

  const handleRefresh = useCallback(() => {
    void logQ.refetch();
  }, [logQ]);

  const logs = logQ.data?.data ?? [];
  const meta = logQ.data?.meta;
  const groups = groupByDate(logs);
  const totalPages = meta ? Math.ceil(meta.total / meta.take) : 1;
  const hasActiveFilter =
    (!scopeNarrow && entityType !== ENTITY_FILTER_ALL) ||
    action !== ACTION_FILTER_ALL ||
    Boolean(search.trim()) ||
    Boolean(dateFrom.trim()) ||
    Boolean(dateTo.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(85vh,820px)] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        {/* ── Header ── */}
        <DialogHeader className="shrink-0 space-y-0 border-b border-zinc-100 bg-zinc-50/80 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <History className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate text-sm font-semibold text-zinc-900">
                  Audit Trail
                  {workspaceMode ? (
                    <span className="font-normal text-zinc-500"> — Semua proyek</span>
                  ) : projectName?.trim() ? (
                    <span className="font-normal text-zinc-500"> — {projectName.trim()}</span>
                  ) : null}
                </DialogTitle>
                <DialogDescription className="text-[11px] text-zinc-500">
                  {scopeNarrow ? (
                    <span className="block text-zinc-600">
                      {AUDIT_SCOPE_LABEL[featureScope]}
                    </span>
                  ) : null}
                  <span className={scopeNarrow ? "mt-0.5 block" : undefined}>
                    {meta
                      ? workspaceMode
                        ? `${meta.total} aktivitas di semua proyek yang Anda akses`
                        : `${meta.total} aktivitas untuk project ini`
                      : workspaceMode
                        ? "Riwayat perubahan di semua proyek Anda"
                        : "Riwayat perubahan pada project ini saja"}
                  </span>
                </DialogDescription>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={logQ.isFetching || (!workspaceMode && !projectId?.trim())}
                className="flex size-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50"
              >
                <RefreshCw className={cn("size-3.5", logQ.isFetching && "animate-spin")} />
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Rentang tanggal — di atas pencarian agar langsung terlihat */}
          <div className="mt-3 rounded-lg border border-zinc-200/80 bg-white/70 px-3 py-2.5">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-zinc-600">
              <CalendarRange className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
              Rentang tanggal
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="audit-date-from" className="text-[10px] text-zinc-500">
                  Dari tanggal
                </Label>
                <Input
                  id="audit-date-from"
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="audit-date-to" className="text-[10px] text-zinc-500">
                  Sampai tanggal
                </Label>
                <Input
                  id="audit-date-to"
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Search + filters (satu baris di layar lebar) */}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Cari nama task, sprint…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap">
              {!scopeNarrow ? (
                <Select
                  value={entityType}
                  onValueChange={(v) => {
                    setEntityType(v ?? ENTITY_FILTER_ALL);
                    setPage(1);
                  }}
                  items={ENTITY_FILTERS}
                >
                  <SelectTrigger size="sm" className="h-8 w-full min-w-[140px] sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_FILTERS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Select
                value={action}
                onValueChange={(v) => {
                  setAction(v ?? ACTION_FILTER_ALL);
                  setPage(1);
                }}
                items={ACTION_FILTERS}
              >
                <SelectTrigger size="sm" className="h-8 w-full min-w-[140px] sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setEntityType(ENTITY_FILTER_ALL);
                setAction(ACTION_FILTER_ALL);
                setSearch("");
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
              className="mt-2 flex items-center gap-1 self-start text-[11px] text-zinc-400 transition-colors hover:text-primary"
            >
              <X className="size-3" />
              Reset filter
            </button>
          )}
        </DialogHeader>

        {/* ── Timeline (scroll asli browser agar scrollbar vertikal jelas) ── */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable]">
          <div className="px-5 py-3">
            {logQ.isPending ? (
              <div className="space-y-4 py-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="size-7 shrink-0 rounded-full bg-zinc-100" />
                    <div className="flex-1 space-y-1.5 py-1">
                      <div className="h-3 w-3/4 rounded bg-zinc-100" />
                      <div className="h-2.5 w-1/2 rounded bg-zinc-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : logQ.isError ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <AlertTriangle className="size-8 text-red-400" />
                <p className="text-sm text-zinc-600">Gagal memuat audit trail</p>
                <Button size="sm" variant="outline" onClick={handleRefresh}>Coba lagi</Button>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <History className="size-8 text-zinc-300" />
                <p className="text-sm font-medium text-zinc-500">Belum ada aktivitas</p>
                <p className="text-xs text-zinc-400">
                  {hasActiveFilter
                    ? "Coba ubah kata kunci, jenis, aksi, atau rentang tanggal."
                    : "Aktivitas akan tercatat di sini."}
                </p>
              </div>
            ) : (
              <>
                {groups.map((group) => (
                  <div key={group.label} className="mb-2">
                    {/* Date label */}
                    <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm py-1.5 mb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                        {group.label}
                      </span>
                    </div>

                    {/* Entries with timeline line */}
                    <div className="relative ml-3.5 border-l border-zinc-100 pl-3">
                      {group.logs.map((log) => (
                        <AuditEntry key={log.id} log={log} showProjectLink={workspaceMode} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="h-7 text-xs"
                    >
                      Sebelumnya
                    </Button>
                    <span className="text-xs text-zinc-500">{page} / {totalPages}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="h-7 text-xs"
                    >
                      Berikutnya
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Footer stats ── */}
        {meta && meta.total > 0 && (
          <div className="shrink-0 border-t border-zinc-100 bg-zinc-50/80 px-5 py-2">
            <p className="text-[11px] text-zinc-400">
              Menampilkan {logs.length} dari {meta.total} aktivitas
              {hasActiveFilter && " (difilter)"}
              {(dateFrom || dateTo) && " · rentang tanggal aktif"}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
