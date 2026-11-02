"use client";

import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { api } from "@/lib/api/client";
import type { KanbanTask } from "./KanbanBoard";
import {
  BOARD_MAIN_PIPELINE,
  BOARD_PARKING_LOT,
  type BoardColumnStatus,
} from "./board-constants";

export type KanbanColumnPageResponse = {
  data: KanbanTask[];
  meta: {
    total: number;
    page: number;
    take: number;
    pages: number;
  };
};

export const KANBAN_COLUMN_PAGE_SIZE = 5;

/** Maks. kolom kanban yang dimuat paralel — mengurangi tekanan pool DB Prisma. */
export const KANBAN_COLUMN_FETCH_BATCH = 3;

const ALL_BOARD_COLUMNS: BoardColumnStatus[] = [
  ...BOARD_MAIN_PIPELINE.map((c) => c.value),
  ...BOARD_PARKING_LOT.map((c) => c.value),
];

export type KanbanColumnInfiniteConfig = {
  hasMore: boolean;
  loadMore: () => void;
  loadingMore: boolean;
};

function useKanbanColumnInfinite(opts: {
  column: BoardColumnStatus;
  queryKeyBase: readonly unknown[];
  url: "/api/tasks" | "/api/tasks/my" | "/api/tasks/my/related";
  baseParams: Record<string, string>;
  enabled: boolean;
}): UseInfiniteQueryResult<
  InfiniteData<KanbanColumnPageResponse, number>,
  Error
> {
  const { column, queryKeyBase, url, baseParams, enabled } = opts;
  return useInfiniteQuery<
    KanbanColumnPageResponse,
    Error,
    InfiniteData<KanbanColumnPageResponse, number>
  >({
    queryKey: [...queryKeyBase, column],
    queryFn: async ({ pageParam }) => {
      const res = await api.get<KanbanColumnPageResponse>(url, {
        params: {
          ...baseParams,
          kanban: "1",
          kanbanColumn: column,
          page: String(pageParam),
          take: String(KANBAN_COLUMN_PAGE_SIZE),
        },
      });
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined,
    enabled,
  });
}

/** State + reset saat filter/proyek berubah. */
function useKanbanColumnBatchIndex(enabled: boolean, resetKey: unknown) {
  const [throughIndex, setThroughIndex] = useState(
    enabled ? KANBAN_COLUMN_FETCH_BATCH - 1 : -1,
  );

  useEffect(() => {
    if (!enabled) {
      setThroughIndex(-1);
      return;
    }
    setThroughIndex(KANBAN_COLUMN_FETCH_BATCH - 1);
  }, [enabled, resetKey]);

  return [throughIndex, setThroughIndex] as const;
}

function useAdvanceKanbanColumnBatch(
  enabled: boolean,
  throughIndex: number,
  setThroughIndex: Dispatch<SetStateAction<number>>,
  columnQueries: UseInfiniteQueryResult<
    InfiniteData<KanbanColumnPageResponse, number>,
    Error
  >[],
) {
  useEffect(() => {
    if (!enabled) return;
    if (throughIndex >= ALL_BOARD_COLUMNS.length - 1) return;
    const pendingInWindow = columnQueries
      .slice(0, throughIndex + 1)
      .some((q) => q.isPending);
    if (!pendingInWindow) {
      setThroughIndex((i) =>
        Math.min(i + KANBAN_COLUMN_FETCH_BATCH, ALL_BOARD_COLUMNS.length - 1),
      );
    }
  }, [
    enabled,
    throughIndex,
    setThroughIndex,
    columnQueries[0]?.isPending,
    columnQueries[1]?.isPending,
    columnQueries[2]?.isPending,
    columnQueries[3]?.isPending,
    columnQueries[4]?.isPending,
    columnQueries[5]?.isPending,
    columnQueries[6]?.isPending,
    columnQueries[7]?.isPending,
    columnQueries[8]?.isPending,
  ]);
}

function mergeColumnQueriesData(
  queries: UseInfiniteQueryResult<
    InfiniteData<KanbanColumnPageResponse, number>,
    Error
  >[],
): KanbanTask[] {
  const m = new Map<string, KanbanTask>();
  for (const q of queries) {
    for (const page of q.data?.pages ?? []) {
      for (const t of page.data) {
        m.set(t.id, {
          ...t,
          updatedAt: t.updatedAt ?? t.createdAt,
        });
      }
    }
  }
  return [...m.values()];
}

export function useProjectBoardKanbanInfinite(opts: {
  baseParams: Record<string, string>;
  enabled: boolean;
}) {
  const { baseParams, enabled } = opts;
  const projectId = baseParams.projectId;
  const queryKeyBase = useMemo(
    () => ["tasks", projectId, "board", "kanban-col", baseParams] as const,
    [projectId, baseParams],
  );
  const [throughIndex, setThroughIndex] = useKanbanColumnBatchIndex(
    enabled,
    queryKeyBase,
  );
  const colOn = (index: number) => enabled && index <= throughIndex;

  const qBacklog = useKanbanColumnInfinite({
    column: "backlog",
    queryKeyBase,
    url: "/api/tasks",
    baseParams,
    enabled: colOn(0),
  });
  const qTodo = useKanbanColumnInfinite({
    column: "todo",
    queryKeyBase,
    url: "/api/tasks",
    baseParams,
    enabled: colOn(1),
  });
  const qInProgress = useKanbanColumnInfinite({
    column: "in_progress",
    queryKeyBase,
    url: "/api/tasks",
    baseParams,
    enabled: colOn(2),
  });
  const qAwaiting = useKanbanColumnInfinite({
    column: "awaiting_approval",
    queryKeyBase,
    url: "/api/tasks",
    baseParams,
    enabled: colOn(3),
  });
  const qOnCheck = useKanbanColumnInfinite({
    column: "on_check",
    queryKeyBase,
    url: "/api/tasks",
    baseParams,
    enabled: colOn(4),
  });
  const qNeedRev = useKanbanColumnInfinite({
    column: "need_revision",
    queryKeyBase,
    url: "/api/tasks",
    baseParams,
    enabled: colOn(5),
  });
  const qReadyToDeploy = useKanbanColumnInfinite({
    column: "ready_to_deploy",
    queryKeyBase,
    url: "/api/tasks",
    baseParams,
    enabled: colOn(6),
  });
  const qCompleted = useKanbanColumnInfinite({
    column: "completed",
    queryKeyBase,
    url: "/api/tasks",
    baseParams,
    enabled: colOn(7),
  });
  const qOnHold = useKanbanColumnInfinite({
    column: "on_hold",
    queryKeyBase,
    url: "/api/tasks",
    baseParams,
    enabled: colOn(8),
  });
  const qCancelled = useKanbanColumnInfinite({
    column: "cancelled",
    queryKeyBase,
    url: "/api/tasks",
    baseParams,
    enabled: colOn(9),
  });

  const columnQueries = [
    qBacklog,
    qTodo,
    qInProgress,
    qAwaiting,
    qOnCheck,
    qNeedRev,
    qReadyToDeploy,
    qCompleted,
    qOnHold,
    qCancelled,
  ];

  useAdvanceKanbanColumnBatch(
    enabled,
    throughIndex,
    setThroughIndex,
    columnQueries,
  );

  const tasks = useMemo(
    () => mergeColumnQueriesData(columnQueries),
    [
      qBacklog.data,
      qTodo.data,
      qInProgress.data,
      qAwaiting.data,
      qOnCheck.data,
      qNeedRev.data,
      qReadyToDeploy.data,
      qCompleted.data,
      qOnHold.data,
      qCancelled.data,
    ],
  );

  const columnTotals = useMemo(() => {
    const out: Partial<Record<BoardColumnStatus, number>> = {};
    ALL_BOARD_COLUMNS.forEach((col, i) => {
      const total = columnQueries[i].data?.pages[0]?.meta.total;
      if (total !== undefined) out[col] = total;
    });
    return out;
  }, [
    qBacklog.data,
    qTodo.data,
    qInProgress.data,
    qAwaiting.data,
    qOnCheck.data,
    qNeedRev.data,
    qReadyToDeploy.data,
    qCompleted.data,
    qOnHold.data,
    qCancelled.data,
  ]);

  const columnInfinite = useMemo(() => {
    const out: Partial<Record<BoardColumnStatus, KanbanColumnInfiniteConfig>> =
      {};
    ALL_BOARD_COLUMNS.forEach((col, i) => {
      const q = columnQueries[i];
      out[col] = {
        hasMore: Boolean(q.hasNextPage),
        loadMore: () => void q.fetchNextPage(),
        loadingMore: q.isFetchingNextPage,
      };
    });
    return out;
  }, [
    qBacklog.hasNextPage,
    qBacklog.isFetchingNextPage,
    qBacklog.fetchNextPage,
    qTodo.hasNextPage,
    qTodo.isFetchingNextPage,
    qTodo.fetchNextPage,
    qInProgress.hasNextPage,
    qInProgress.isFetchingNextPage,
    qInProgress.fetchNextPage,
    qAwaiting.hasNextPage,
    qAwaiting.isFetchingNextPage,
    qAwaiting.fetchNextPage,
    qOnCheck.hasNextPage,
    qOnCheck.isFetchingNextPage,
    qOnCheck.fetchNextPage,
    qNeedRev.hasNextPage,
    qNeedRev.isFetchingNextPage,
    qNeedRev.fetchNextPage,
    qReadyToDeploy.hasNextPage,
    qReadyToDeploy.isFetchingNextPage,
    qReadyToDeploy.fetchNextPage,
    qCompleted.hasNextPage,
    qCompleted.isFetchingNextPage,
    qCompleted.fetchNextPage,
    qOnHold.hasNextPage,
    qOnHold.isFetchingNextPage,
    qOnHold.fetchNextPage,
    qCancelled.hasNextPage,
    qCancelled.isFetchingNextPage,
    qCancelled.fetchNextPage,
  ]);

  const isInitialLoading = columnQueries.some((q) => q.isPending && !q.data);

  return {
    tasks,
    columnTotals,
    columnInfinite,
    isInitialLoading,
    columnQueries,
  };
}

export function useMyTasksBoardKanbanInfinite(opts: {
  baseParams: Record<string, string>;
  enabled: boolean;
}) {
  return useCrossProjectMyTasksKanbanInfinite("/api/tasks/my", opts);
}

export function useCrossProjectMyTasksKanbanInfinite(
  url: "/api/tasks/my" | "/api/tasks/my/related",
  opts: {
    baseParams: Record<string, string>;
    enabled: boolean;
  },
) {
  const { baseParams, enabled } = opts;
  const queryKeyBase = useMemo(
    () => ["tasks", url === "/api/tasks/my" ? "my" : "my-related", "kanban-col", baseParams] as const,
    [url, baseParams],
  );
  const [throughIndex, setThroughIndex] = useKanbanColumnBatchIndex(
    enabled,
    queryKeyBase,
  );
  const colOn = (index: number) => enabled && index <= throughIndex;

  const qBacklog = useKanbanColumnInfinite({
    column: "backlog",
    queryKeyBase,
    url,
    baseParams,
    enabled: colOn(0),
  });
  const qTodo = useKanbanColumnInfinite({
    column: "todo",
    queryKeyBase,
    url,
    baseParams,
    enabled: colOn(1),
  });
  const qInProgress = useKanbanColumnInfinite({
    column: "in_progress",
    queryKeyBase,
    url,
    baseParams,
    enabled: colOn(2),
  });
  const qAwaiting = useKanbanColumnInfinite({
    column: "awaiting_approval",
    queryKeyBase,
    url,
    baseParams,
    enabled: colOn(3),
  });
  const qOnCheck = useKanbanColumnInfinite({
    column: "on_check",
    queryKeyBase,
    url,
    baseParams,
    enabled: colOn(4),
  });
  const qNeedRev = useKanbanColumnInfinite({
    column: "need_revision",
    queryKeyBase,
    url,
    baseParams,
    enabled: colOn(5),
  });
  const qReadyToDeploy = useKanbanColumnInfinite({
    column: "ready_to_deploy",
    queryKeyBase,
    url,
    baseParams,
    enabled: colOn(6),
  });
  const qCompleted = useKanbanColumnInfinite({
    column: "completed",
    queryKeyBase,
    url,
    baseParams,
    enabled: colOn(7),
  });
  const qOnHold = useKanbanColumnInfinite({
    column: "on_hold",
    queryKeyBase,
    url,
    baseParams,
    enabled: colOn(8),
  });
  const qCancelled = useKanbanColumnInfinite({
    column: "cancelled",
    queryKeyBase,
    url,
    baseParams,
    enabled: colOn(9),
  });

  const columnQueries = [
    qBacklog,
    qTodo,
    qInProgress,
    qAwaiting,
    qOnCheck,
    qNeedRev,
    qReadyToDeploy,
    qCompleted,
    qOnHold,
    qCancelled,
  ];

  useAdvanceKanbanColumnBatch(
    enabled,
    throughIndex,
    setThroughIndex,
    columnQueries,
  );

  const tasks = useMemo(
    () => mergeColumnQueriesData(columnQueries),
    [
      qBacklog.data,
      qTodo.data,
      qInProgress.data,
      qAwaiting.data,
      qOnCheck.data,
      qNeedRev.data,
      qReadyToDeploy.data,
      qCompleted.data,
      qOnHold.data,
      qCancelled.data,
    ],
  );

  const columnTotals = useMemo(() => {
    const out: Partial<Record<BoardColumnStatus, number>> = {};
    ALL_BOARD_COLUMNS.forEach((col, i) => {
      const total = columnQueries[i].data?.pages[0]?.meta.total;
      if (total !== undefined) out[col] = total;
    });
    return out;
  }, [
    qBacklog.data,
    qTodo.data,
    qInProgress.data,
    qAwaiting.data,
    qOnCheck.data,
    qNeedRev.data,
    qReadyToDeploy.data,
    qCompleted.data,
    qOnHold.data,
    qCancelled.data,
  ]);

  const columnInfinite = useMemo(() => {
    const out: Partial<Record<BoardColumnStatus, KanbanColumnInfiniteConfig>> =
      {};
    ALL_BOARD_COLUMNS.forEach((col, i) => {
      const q = columnQueries[i];
      out[col] = {
        hasMore: Boolean(q.hasNextPage),
        loadMore: () => void q.fetchNextPage(),
        loadingMore: q.isFetchingNextPage,
      };
    });
    return out;
  }, [
    qBacklog.hasNextPage,
    qBacklog.isFetchingNextPage,
    qBacklog.fetchNextPage,
    qTodo.hasNextPage,
    qTodo.isFetchingNextPage,
    qTodo.fetchNextPage,
    qInProgress.hasNextPage,
    qInProgress.isFetchingNextPage,
    qInProgress.fetchNextPage,
    qAwaiting.hasNextPage,
    qAwaiting.isFetchingNextPage,
    qAwaiting.fetchNextPage,
    qOnCheck.hasNextPage,
    qOnCheck.isFetchingNextPage,
    qOnCheck.fetchNextPage,
    qNeedRev.hasNextPage,
    qNeedRev.isFetchingNextPage,
    qNeedRev.fetchNextPage,
    qReadyToDeploy.hasNextPage,
    qReadyToDeploy.isFetchingNextPage,
    qReadyToDeploy.fetchNextPage,
    qCompleted.hasNextPage,
    qCompleted.isFetchingNextPage,
    qCompleted.fetchNextPage,
    qOnHold.hasNextPage,
    qOnHold.isFetchingNextPage,
    qOnHold.fetchNextPage,
    qCancelled.hasNextPage,
    qCancelled.isFetchingNextPage,
    qCancelled.fetchNextPage,
  ]);

  const isInitialLoading = columnQueries.some((q) => q.isPending && !q.data);

  return {
    tasks,
    columnTotals,
    columnInfinite,
    isInitialLoading,
    columnQueries,
  };
}
