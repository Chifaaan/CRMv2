"use client";

import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export const DASHBOARD_INITIAL_LIMIT = 7;
export const DASHBOARD_LOAD_MORE_LIMIT = 5;

export type DashboardPageMeta = {
  total: number;
  hasMore: boolean;
  nextPage: number | null;
};

export type DashboardPageResponse<T> = {
  items: T[];
  meta: DashboardPageMeta;
};

export function dashboardLimitForPage(page: number): number {
  return page === 1 ? DASHBOARD_INITIAL_LIMIT : DASHBOARD_LOAD_MORE_LIMIT;
}

export function useDashboardInfinite<T>(opts: {
  queryKey: readonly unknown[];
  path: string;
  params?: Record<string, string>;
  enabled?: boolean;
}): UseInfiniteQueryResult<
  InfiniteData<DashboardPageResponse<T>, number>,
  Error
> {
  const { queryKey, path, params, enabled = true } = opts;

  return useInfiniteQuery<
    DashboardPageResponse<T>,
    Error,
    InfiniteData<DashboardPageResponse<T>, number>
  >({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const res = await api.get<DashboardPageResponse<T>>(path, {
        params: {
          ...params,
          page: String(page),
          limit: String(dashboardLimitForPage(page)),
        },
      });
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) => last.meta.nextPage ?? undefined,
    enabled,
  });
}

export function flattenDashboardPages<T>(
  data: InfiniteData<DashboardPageResponse<T>, number> | undefined,
): T[] {
  return data?.pages.flatMap((p) => p.items) ?? [];
}

export function dashboardTotalCount(
  data: InfiniteData<DashboardPageResponse<unknown>, number> | undefined,
): number {
  return data?.pages[0]?.meta.total ?? 0;
}
