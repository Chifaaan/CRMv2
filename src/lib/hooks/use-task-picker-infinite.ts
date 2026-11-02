"use client";

import { useEffect, useState } from "react";
import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export const TASK_PICKER_PAGE_SIZE = 10;

export type TaskPickRow = {
  id: string;
  title: string;
  taskNumber: number;
  project?: { code: string };
};

export type TaskPickPageResponse = {
  data: TaskPickRow[];
  meta: { total: number; page: number; take: number; pages: number };
};

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useTaskPickerInfinite(opts: {
  projectId: string;
  search: string;
  enabled: boolean;
}): UseInfiniteQueryResult<
  InfiniteData<TaskPickPageResponse, number>,
  Error
> {
  const { projectId, search, enabled } = opts;
  const debouncedSearch = useDebouncedValue(search, 300);

  return useInfiniteQuery<
    TaskPickPageResponse,
    Error,
    InfiniteData<TaskPickPageResponse, number>
  >({
    queryKey: ["tasks", projectId, "pick", "paged", debouncedSearch],
    queryFn: async ({ pageParam }) => {
      const q = debouncedSearch.trim();
      const res = await api.get<TaskPickPageResponse>("/api/tasks", {
        params: {
          projectId,
          page: String(pageParam),
          take: String(TASK_PICKER_PAGE_SIZE),
          ...(q ? { search: q } : {}),
        },
      });
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined,
    enabled: enabled && Boolean(projectId),
  });
}
