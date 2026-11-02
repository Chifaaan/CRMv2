"use client";

import { useEffect, useRef } from "react";
import type { UseInfiniteQueryResult, InfiniteData } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  TaskPickPageResponse,
  TaskPickRow,
} from "@/lib/hooks/use-task-picker-infinite";

type Props = {
  query: UseInfiniteQueryResult<InfiniteData<TaskPickPageResponse, number>, Error>;
  tasks: TaskPickRow[];
  getLabel: (t: TaskPickRow) => string;
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  emptyMessage?: string;
};

export function TaskPickerInfiniteList({
  query,
  tasks,
  getLabel,
  isSelected,
  onToggle,
  emptyMessage = "Tidak ada task",
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scrollRef.current;
    const el = sentinelRef.current;
    if (!root || !el || !query.hasNextPage || query.isFetchingNextPage) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void query.fetchNextPage();
      },
      { root, rootMargin: "24px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [
    query.hasNextPage,
    query.isFetchingNextPage,
    query.fetchNextPage,
    tasks.length,
  ]);

  return (
    <div ref={scrollRef} className="max-h-44 overflow-y-auto">
      {query.isLoading && tasks.length === 0 ? (
        <p className="py-3 text-center text-xs text-zinc-400">Memuat…</p>
      ) : tasks.length === 0 ? (
        <p className="py-3 text-center text-xs text-zinc-400">{emptyMessage}</p>
      ) : (
        tasks.map((t) => (
          <label
            key={t.id}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-zinc-50"
          >
            <Checkbox
              checked={isSelected(t.id)}
              onCheckedChange={() => onToggle(t.id)}
              className="size-3.5"
            />
            <span className="truncate text-sm">{getLabel(t)}</span>
          </label>
        ))
      )}
      <div ref={sentinelRef} className="h-px shrink-0" aria-hidden />
      {query.isFetchingNextPage ? (
        <p className="py-2 text-center text-[11px] text-zinc-400">Memuat lagi…</p>
      ) : null}
    </div>
  );
}
