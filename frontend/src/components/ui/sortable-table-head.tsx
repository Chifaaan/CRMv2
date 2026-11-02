"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ComponentProps } from "react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/lib/column-sort";

type SortableTableHeadProps = Omit<ComponentProps<typeof TableHead>, "children"> & {
  label: string;
  columnKey: string;
  activeSortKey: string;
  sortDirection: SortDirection;
  onSort: (columnKey: string) => void;
};

/**
 * Interactive table header: toggles ascending/descending with ArrowUp / ArrowDown icons.
 */
export function SortableTableHead({
  label,
  columnKey,
  activeSortKey,
  sortDirection,
  onSort,
  className,
  ...tableHeadProps
}: SortableTableHeadProps) {
  const active = activeSortKey === columnKey;
  const Icon =
    active && sortDirection === "asc"
      ? ArrowUp
      : active && sortDirection === "desc"
        ? ArrowDown
        : ArrowUpDown;
  const sortLabel =
    active && sortDirection === "asc"
      ? "sorted ascending"
      : active && sortDirection === "desc"
        ? "sorted descending"
        : "not sorted";

  return (
    <TableHead className={className} {...tableHeadProps}>
      <button
        type="button"
        className={cn(
          "-mx-2 inline-flex min-h-10 max-w-full items-center gap-1 rounded px-2 text-left hover:text-foreground",
          active ? "font-semibold text-foreground" : "text-foreground",
        )}
        aria-label={`${label}, ${sortLabel}`}
        onClick={() => onSort(columnKey)}
      >
        <span className="truncate">{label}</span>
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            active ? "text-foreground opacity-70" : "text-muted-foreground opacity-55",
          )}
          aria-hidden
        />
      </button>
    </TableHead>
  );
}

/** Native `<th>` when the grid does not use `TableHead`. */
export function SortableNativeTh({
  label,
  columnKey,
  activeSortKey,
  sortDirection,
  onSort,
  className,
}: {
  label: string;
  columnKey: string;
  activeSortKey: string;
  sortDirection: SortDirection;
  onSort: (columnKey: string) => void;
  className?: string;
}) {
  const active = activeSortKey === columnKey;
  const Icon =
    active && sortDirection === "asc"
      ? ArrowUp
      : active && sortDirection === "desc"
        ? ArrowDown
        : ArrowUpDown;
  const sortLabel =
    active && sortDirection === "asc"
      ? "sorted ascending"
      : active && sortDirection === "desc"
        ? "sorted descending"
        : "not sorted";

  return (
    <th scope="col" className={className}>
      <button
        type="button"
        className="-mx-1 inline-flex min-h-10 max-w-full items-center gap-1 px-2 text-left uppercase tracking-wide hover:text-foreground"
        aria-label={`${label}, ${sortLabel}`}
        onClick={() => onSort(columnKey)}
      >
        <span className="truncate">{label}</span>
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            active ? "opacity-70" : "opacity-55",
          )}
          aria-hidden
        />
      </button>
    </th>
  );
}
