/** Trackly-aligned maintenance pipeline (_reference/js/modules/maintenance.js) */

/** Trackly pipeline order (main flow, excludes parking). */
export const STATUS_PIPELINE = [
  "backlog",
  "in_progress",
  "awaiting_approval",
  "on_check",
  "need_revision",
  "completed",
] as const;

export const MAIN_PIPELINE_STATUSES = [
  { value: "backlog", label: "Backlog" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "on_check", label: "On Check" },
  { value: "need_revision", label: "Need Revision" },
  { value: "completed", label: "Completed" },
] as const;

export const PARKING_LOT_STATUSES = [
  { value: "canceled", label: "Canceled" },
  { value: "on_hold", label: "On Hold" },
] as const;

/** All maintenance statuses with display labels (list/report). */
export const MNT_STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  awaiting_approval: "Awaiting Approval",
  on_check: "On Check",
  need_revision: "Need Revision",
  completed: "Completed",
  canceled: "Canceled",
  on_hold: "On Hold",
  reported: "Reported",
  open: "Open",
  resolved: "Resolved",
  closed: "Closed",
  rejected: "Rejected",
};

export function mntStatusLabel(status: string) {
  return MNT_STATUS_LABELS[status] ?? status;
}

const ID_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** Trackly-style Indonesian long date for maintenance list/board. */
export function formatDateID(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return `${d.getDate()} ${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Report page filter statuses (Trackly FILTER_STATUS_OPTIONS). */
export const REPORT_FILTER_STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "on_check", label: "On Check" },
  { value: "need_revision", label: "Need Revision" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
  { value: "on_hold", label: "On Hold" },
] as const;

export type MaintenancePipelineStatus =
  (typeof MAIN_PIPELINE_STATUSES)[number]["value"];
export type MaintenanceParkingStatus =
  (typeof PARKING_LOT_STATUSES)[number]["value"];
export type MaintenanceBoardColumnStatus =
  | MaintenancePipelineStatus
  | MaintenanceParkingStatus;

export const ALL_BOARD_STATUSES: MaintenanceBoardColumnStatus[] = [
  ...MAIN_PIPELINE_STATUSES.map((s) => s.value),
  ...PARKING_LOT_STATUSES.map((s) => s.value),
];

const STATUS_SET = new Set<string>(ALL_BOARD_STATUSES);

/** Map DB / legacy status into a board column (first pipeline column catches unknown). */
export function statusToBoardColumn(
  status: string,
): MaintenanceBoardColumnStatus {
  if (STATUS_SET.has(status)) {
    return status as MaintenanceBoardColumnStatus;
  }
  if (status === "reported" || status === "open") return "backlog";
  return "backlog";
}

export const MNT_TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  adjustment: "Adjustment",
  enhancement: "Enhancement",
  user_request: "User request",
  incident: "Incident",
};

export const MNT_PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const MNT_SEVERITY_LABELS: Record<string, string> = {
  major: "Major",
  minor: "Minor",
};

export const MNT_TYPE_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "adjustment", label: "Adjustment" },
  { value: "enhancement", label: "Enhancement" },
  { value: "user_request", label: "User request" },
  { value: "incident", label: "Incident" },
] as const;

export const MNT_PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export const MNT_SEVERITY_OPTIONS = [
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
] as const;
