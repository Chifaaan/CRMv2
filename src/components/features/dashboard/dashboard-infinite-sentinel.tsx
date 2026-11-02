"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

export function DashboardInfiniteSentinel({
  hasMore,
  isFetchingNextPage,
  onLoadMore,
  endMessage = "Semua data sudah ditampilkan",
  scrollRoot,
}: {
  hasMore: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  endMessage?: string;
  /** Scroll container for Intersection Observer root (defaults to viewport). */
  scrollRoot?: React.RefObject<Element | null>;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || isFetchingNextPage) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      {
        root: scrollRoot?.current ?? null,
        rootMargin: "120px",
      },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, isFetchingNextPage, onLoadMore, scrollRoot]);

  if (!hasMore && !isFetchingNextPage) {
    return (
      <p className="px-4 py-3 text-center text-xs text-zinc-400">
        {endMessage}
      </p>
    );
  }

  return (
    <div ref={sentinelRef} className="flex justify-center py-3">
      {isFetchingNextPage ? (
        <Loader2 className="size-4 animate-spin text-zinc-400" aria-hidden />
      ) : (
        <span className="h-1 w-full" aria-hidden />
      )}
    </div>
  );
}
