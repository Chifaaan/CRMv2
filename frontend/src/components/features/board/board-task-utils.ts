import {
  differenceInCalendarDays,
  formatDistanceToNowStrict,
} from "date-fns";

/** Task row shape cukup untuk menampilkan nomor publik di board / daftar. */
export type TaskPublicIdFields = {
  id: string;
  taskNumber?: number | null;
  project?: { code: string } | null;
};

/**
 * Nomor task yang dibaca manusia (sama seperti form / modal: `KODE-001`).
 * Bukan `id` internal (CUID) di database.
 */
export function formatKanbanTaskPublicId(task: TaskPublicIdFields): string {
  const n = task.taskNumber;
  const code = task.project?.code?.trim();
  if (code && typeof n === "number" && n > 0) {
    return `${code}-${String(n).padStart(4, "0")}`;
  }
  if (typeof n === "number" && n > 0) return `#${n}`;
  return "—";
}

/** Query param `?task=` — non-kosong; hindari `shareToken` string kosong yang mematikan deep link. */
export function taskBoardLinkKey(task: {
  id: string;
  shareToken?: string | null;
}): string {
  const st =
    typeof task.shareToken === "string" ? task.shareToken.trim() : "";
  return st || task.id;
}

const TERMINAL = new Set(["done", "completed", "cancelled"]);

export function isTerminalTaskStatus(status: string) {
  return TERMINAL.has(status);
}

/** Human-readable time the task has been open (from createdAt) for active work. */
export function formatTaskOpenDuration(createdAt: string, status: string) {
  if (isTerminalTaskStatus(status)) {
    return "—";
  }
  try {
    return formatDistanceToNowStrict(new Date(createdAt), { addSuffix: false });
  } catch {
    return "—";
  }
}

export function formatLastUpdated(updatedAt: string) {
  try {
    return formatDistanceToNowStrict(new Date(updatedAt), { addSuffix: true });
  } catch {
    return "—";
  }
}

export function daysSinceDate(iso: string) {
  try {
    return differenceInCalendarDays(new Date(), new Date(iso));
  } catch {
    return 0;
  }
}

export type StalePreset = "none" | "no_update_7d" | "no_update_14d" | "open_30d";

export function passesStalePreset(
  preset: StalePreset,
  task: { status: string; createdAt: string; updatedAt: string },
) {
  if (preset === "none") return true;
  if (isTerminalTaskStatus(task.status)) return false;
  if (preset === "open_30d") {
    return daysSinceDate(task.createdAt) >= 30;
  }
  if (preset === "no_update_7d") {
    return daysSinceDate(task.updatedAt) >= 7;
  }
  if (preset === "no_update_14d") {
    return daysSinceDate(task.updatedAt) >= 14;
  }
  return true;
}

export type ListSortKey =
  | "createdAt"
  | "updatedAt"
  | "dueDate"
  | "title"
  | "status";

/** Sort keys accepted by GET /api/tasks list endpoints. */
export type TaskListSortKey =
  | ListSortKey
  | "taskNumber"
  | "priority"
  | "startDate";

const BOARD_LIST_COLUMN_TO_SORT_KEY: Record<string, TaskListSortKey> = {
  taskNo: "taskNumber",
  title: "title",
  status: "status",
  priority: "priority",
  assignees: "title",
  openFor: "createdAt",
  lastUpdate: "updatedAt",
  start: "startDate",
  due: "dueDate",
};

export function boardListColumnToSortKey(
  columnKey: string,
): TaskListSortKey | null {
  return BOARD_LIST_COLUMN_TO_SORT_KEY[columnKey] ?? null;
}

export function boardListSortKeyToColumn(
  sortKey: TaskListSortKey,
): string | null {
  for (const [col, key] of Object.entries(BOARD_LIST_COLUMN_TO_SORT_KEY)) {
    if (key === sortKey) return col;
  }
  return null;
}

export const BOARD_LIST_SORT_KEY_ITEMS: {
  value: ListSortKey;
  label: string;
}[] = [
  { value: "updatedAt", label: "Last updated" },
  { value: "createdAt", label: "Created" },
  { value: "dueDate", label: "Due date" },
  { value: "title", label: "Title" },
  { value: "status", label: "Status" },
];

export const BOARD_LIST_SORT_DIR_ITEMS: {
  value: "asc" | "desc";
  label: string;
}[] = [
  { value: "desc", label: "Newest / Z→A" },
  { value: "asc", label: "Oldest / A→Z" },
];

export const BOARD_STALE_PRESET_ITEMS: {
  value: StalePreset;
  label: string;
}[] = [
  { value: "none", label: "All tasks" },
  { value: "no_update_7d", label: "No update 7+ days (active)" },
  { value: "no_update_14d", label: "No update 14+ days (active)" },
  { value: "open_30d", label: "Open 30+ days (active)" },
];

export const DEFAULT_LIST_SORT_KEY: ListSortKey = "updatedAt";
export const DEFAULT_LIST_SORT_DIR = "desc" as const;
export const DEFAULT_LIST_STALE_PRESET: StalePreset = "none";

export function compareTasksForList(
  a: {
    title: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    dueDate: string | null;
  },
  b: {
    title: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    dueDate: string | null;
  },
  key: ListSortKey,
  dir: "asc" | "desc",
) {
  const mul = dir === "asc" ? 1 : -1;
  const ts = (iso: string | null) =>
    iso ? new Date(iso).getTime() : dir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  switch (key) {
    case "title":
      return a.title.localeCompare(b.title) * mul;
    case "status":
      return a.status.localeCompare(b.status) * mul;
    case "createdAt":
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * mul;
    case "updatedAt":
      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * mul;
    case "dueDate":
      return (ts(a.dueDate) - ts(b.dueDate)) * mul;
    default:
      return 0;
  }
}
