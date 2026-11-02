"use client";

import { Filter, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ResourceListToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filterActiveCount: number;
  onOpenFilter: () => void;
  filterLabel?: string;
  children?: React.ReactNode;
  className?: string;
};

export function ResourceListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  filterActiveCount,
  onOpenFilter,
  filterLabel = "Buka filter",
  children,
  className,
}: ResourceListToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="relative min-w-0 flex-1">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          className="h-10 pl-9"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          type="search"
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative shrink-0"
          onClick={onOpenFilter}
          aria-label={filterLabel}
        >
          <Filter className="size-4" />
          {filterActiveCount > 0 ? (
            <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums">
              {filterActiveCount > 9 ? "9+" : filterActiveCount}
            </span>
          ) : null}
        </Button>
        {children}
      </div>
    </div>
  );
}
