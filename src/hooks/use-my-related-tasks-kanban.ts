"use client";

import { useCrossProjectMyTasksKanbanInfinite } from "@/components/features/board/use-kanban-board-infinite";

/** Infinite kanban board for tab "Task Terkait" (reporterId scope). */
export function useMyRelatedTasksBoardKanbanInfinite(opts: {
  baseParams: Record<string, string>;
  enabled: boolean;
}) {
  return useCrossProjectMyTasksKanbanInfinite("/api/tasks/my/related", opts);
}
