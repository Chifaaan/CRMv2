"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

/** Clamp page when total pages shrink; skip when meta is unavailable (fetch in flight). */
export function useClampListPage(
  pages: number | undefined,
  setPage: Dispatch<SetStateAction<number>>,
) {
  useEffect(() => {
    if (pages == null) return;
    setPage((cur) => (cur > pages ? Math.max(1, pages) : cur));
  }, [pages, setPage]);
}
