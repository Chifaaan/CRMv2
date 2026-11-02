import { toast } from "sonner";
import { statusToBoardColumn } from "@/components/features/board/board-constants";

export const COMPLETED_STATUS_CHANGE_BLOCKED_MESSAGE =
  "Task yang sudah selesai tidak dapat diubah statusnya. Jika ada revisi atau pekerjaan lanjutan, buat task baru dan gunakan fitur Referensi Task untuk menghubungkannya.";

export const COMPLETED_STATUS_FINAL_TOOLTIP =
  "Status final — task sudah selesai";

export const COMPLETED_STATUS_BANNER_MESSAGE =
  "Task ini sudah selesai dan statusnya tidak dapat diubah. Jika perlu revisi atau pekerjaan lanjutan, buat task baru dan gunakan Referensi Task untuk menghubungkannya dengan task ini.";

export const DEVELOPER_FORBIDDEN_TARGET_STATUS_MESSAGE =
  "Developer tidak dapat memindahkan task ke status Need Revision, Ready To Deploy, atau Completed. Minta PM atau Admin untuk menandai revisi, deployment, atau penyelesaian task.";

export const DEVELOPER_FORBIDDEN_STATUS_TOOLTIP =
  "Hanya PM/Admin yang dapat menetapkan Need Revision, Ready To Deploy, atau Completed";

const DEVELOPER_FORBIDDEN_TARGET_COLUMNS = new Set([
  "need_revision",
  "ready_to_deploy",
  "completed",
]);

export function isWorkspaceAdminRole(role: string | undefined | null): boolean {
  const n = String(role ?? "").trim().toLowerCase();
  return n === "admin" || n === "administrator";
}

export function isDeveloperRole(role: string | undefined | null): boolean {
  return String(role ?? "").trim().toLowerCase() === "developer";
}

export function isTaskCompletedBoardStatus(status: string): boolean {
  return statusToBoardColumn(status) === "completed";
}

export function isDeveloperForbiddenTargetStatus(newStatus: string): boolean {
  return DEVELOPER_FORBIDDEN_TARGET_COLUMNS.has(statusToBoardColumn(newStatus));
}

export function canChangeTaskStatusFromCompleted(
  role: string | undefined | null,
  currentStatus: string,
  newStatus?: string,
): boolean {
  if (!newStatus || currentStatus === newStatus) return true;
  if (!isTaskCompletedBoardStatus(currentStatus)) return true;
  return isWorkspaceAdminRole(role);
}

export function canDeveloperSetTaskStatus(newStatus?: string): boolean {
  if (!newStatus) return true;
  return !isDeveloperForbiddenTargetStatus(newStatus);
}

/** Gabungan semua restriction perpindahan status (completed, developer, dll.). */
export function canChangeTaskStatus(
  role: string | undefined | null,
  currentStatus: string,
  newStatus?: string,
): boolean {
  if (!newStatus || currentStatus === newStatus) return true;
  if (!canChangeTaskStatusFromCompleted(role, currentStatus, newStatus)) {
    return false;
  }
  if (isDeveloperRole(role) && isDeveloperForbiddenTargetStatus(newStatus)) {
    return false;
  }
  return true;
}

export function notifyCompletedStatusChangeBlocked(): void {
  toast.error(COMPLETED_STATUS_CHANGE_BLOCKED_MESSAGE);
}

export function notifyDeveloperForbiddenStatusBlocked(): void {
  toast.error(DEVELOPER_FORBIDDEN_TARGET_STATUS_MESSAGE);
}

export function notifyTaskStatusChangeBlocked(
  role: string | undefined | null,
  currentStatus: string,
  newStatus: string,
): void {
  if (!canChangeTaskStatusFromCompleted(role, currentStatus, newStatus)) {
    notifyCompletedStatusChangeBlocked();
    return;
  }
  if (isDeveloperRole(role) && isDeveloperForbiddenTargetStatus(newStatus)) {
    notifyDeveloperForbiddenStatusBlocked();
  }
}

/* ------------------------------------------------------------------ */
/* Kunci status task berdasarkan status sprint induk                   */
/* ------------------------------------------------------------------ */

/** Status sprint yang mengunci perpindahan status task-nya. */
const SPRINT_LOCKED_STATUSES = new Set(["PLANNING", "ON_HOLD", "COMPLETED"]);

const SPRINT_STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning",
  ON_HOLD: "On Hold",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const CANCELLED_SPRINT_INFO_BADGE =
  "Task ini berasal dari sprint yang dibatalkan, tetapi masih bisa diselesaikan.";

export const SPRINT_COMPLETED_TASK_UNFINISHED_BADGE =
  "Sprint sudah diselesaikan, tetapi task ini belum selesai.";

/**
 * Status task terkunci jika sprint induknya PLANNING / ON_HOLD / COMPLETED.
 * Task tanpa sprint, sprint ACTIVE, atau sprint CANCELLED tetap bisa diubah.
 */
export function isTaskStatusLockedBySprint(
  sprintStatus: string | undefined | null,
): boolean {
  if (!sprintStatus) return false;
  return SPRINT_LOCKED_STATUSES.has(String(sprintStatus).toUpperCase());
}

export function sprintStatusLockMessage(
  sprintStatus: string | undefined | null,
): string {
  const label =
    SPRINT_STATUS_LABELS[String(sprintStatus ?? "").toUpperCase()] ??
    String(sprintStatus ?? "");
  if (String(sprintStatus ?? "").toUpperCase() === "COMPLETED") {
    return "Status tugas terkunci karena sprint sudah selesai (Completed).";
  }
  return `Status tugas terkunci karena sprint induk berstatus ${label}. Aktifkan sprint terlebih dahulu untuk mengubah status tugas.`;
}

export function notifySprintLockedStatusBlocked(
  sprintStatus: string | undefined | null,
): void {
  toast.error(sprintStatusLockMessage(sprintStatus));
}
