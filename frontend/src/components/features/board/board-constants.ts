/**
 * Task board columns.
 * Pipeline = active work flow; parking lot = paused / cancelled.
 *
 * Statuses: backlog → todo → in_progress → awaiting_approval → on_check → need_revision → completed
 * Parking lot: on_hold, cancelled
 */

export const BOARD_MAIN_PIPELINE = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "on_check", label: "On Check" },
  { value: "need_revision", label: "Need Revision" },
  { value: "ready_to_deploy", label: "Ready To Deploy" },
  { value: "completed", label: "Completed" },
] as const;

export const BOARD_PARKING_LOT = [
  { value: "on_hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export type BoardPipelineStatus = (typeof BOARD_MAIN_PIPELINE)[number]["value"];
export type BoardParkingStatus = (typeof BOARD_PARKING_LOT)[number]["value"];
export type BoardColumnStatus = BoardPipelineStatus | BoardParkingStatus;

const PIPELINE_SET = new Set<string>(
  BOARD_MAIN_PIPELINE.map((s) => s.value),
);
const PARKING_SET = new Set<string>(
  BOARD_PARKING_LOT.map((s) => s.value),
);
const ALL_BOARD = new Set<string>([...PIPELINE_SET, ...PARKING_SET]);

/** Same token sets as backend `KANBAN_COLUMN_DB_STATUSES` (lowercase). */
const STATUS_SYNONYMS: Record<BoardColumnStatus, string[]> = {
  backlog: ["backlog"],
  todo: ["todo", "to do", "to_do"],
  in_progress: ["in_progress", "in progress"],
  awaiting_approval: [
    "awaiting_approval",
    "awaiting approval",
    "in_review",
    "review",
    "testing",
  ],
  on_check: ["on_check", "on check"],
  need_revision: ["need_revision", "need revision"],
  ready_to_deploy: ["ready_to_deploy", "Ready To Deploy"],
  completed: ["completed", "done"],
  on_hold: ["on_hold", "on hold", "blocked"],
  cancelled: ["cancelled", "canceled"],
};

/** Map DB / legacy status into a board column (canonical column status). */
export function statusToBoardColumn(status: string | undefined | null): BoardColumnStatus {
  const s = String(status ?? "").trim().toLowerCase();
  if (!s) return "todo";
  if (ALL_BOARD.has(s)) return s as BoardColumnStatus;
  for (const [column, tokens] of Object.entries(STATUS_SYNONYMS) as [
    BoardColumnStatus,
    string[],
  ][]) {
    if (tokens.includes(s)) return column;
  }
  // Legacy status mappings (tokens not listed above)
  if (s === "done") return "completed";
  return "todo";
}

/** Human-readable label for any task status value. */
export const TASK_STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  awaiting_approval: "Awaiting Approval",
  on_check: "On Check",
  need_revision: "Need Revision",
  completed: "Completed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
  // legacy
  in_review: "Awaiting Approval",
  review: "Awaiting Approval",
  done: "Completed",
};

export function isParkingColumn(status: BoardColumnStatus): boolean {
  return PARKING_SET.has(status);
}

export function colDroppableId(status: BoardColumnStatus): string {
  return `task-col-${status}`;
}

export function swimlaneCellDroppableId(
  rowKey: string,
  status: BoardColumnStatus,
): string {
  return `task-swl::${rowKey}::${status}`;
}

export function parseBoardDropTarget(
  overId: string,
): { status: BoardColumnStatus } | null {
  if (overId.startsWith("task-col-")) {
    const st = overId.slice("task-col-".length);
    if (ALL_BOARD.has(st)) return { status: st as BoardColumnStatus };
    return null;
  }
  if (overId.startsWith("task-swl::")) {
    const parts = overId.split("::");
    if (parts.length === 3 && parts[0] === "task-swl") {
      const st = parts[2];
      if (ALL_BOARD.has(st)) return { status: st as BoardColumnStatus };
    }
  }
  return null;
}
