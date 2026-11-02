export const LIST_PAGE_SIZES = [10, 25, 50, 100] as const;
export type ListPageSize = (typeof LIST_PAGE_SIZES)[number];

export const DEFAULT_LIST_PAGE_SIZE: ListPageSize = 10;

export function coerceListPageSize(n: unknown, fallback = DEFAULT_LIST_PAGE_SIZE): ListPageSize {
  const x = typeof n === "number" ? n : parseInt(String(n), 10);
  return (LIST_PAGE_SIZES as readonly number[]).includes(x)
    ? (x as ListPageSize)
    : fallback;
}

export type ListPaginationMeta = {
  total: number;
  page: number;
  take: number;
  pages: number;
};

export function pageRangeLabel(
  total: number,
  page: number,
  take: number,
): { from: number; to: number } {
  if (total <= 0) return { from: 0, to: 0 };
  const from = (page - 1) * take + 1;
  const to = Math.min(page * take, total);
  return { from, to };
}
