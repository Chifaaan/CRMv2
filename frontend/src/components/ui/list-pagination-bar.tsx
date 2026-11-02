"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  coerceListPageSize,
  LIST_PAGE_SIZES,
  type ListPageSize,
  pageRangeLabel,
} from "@/lib/list-pagination";
import { cn } from "@/lib/utils";

type Props = {
  total: number;
  page: number;
  pageSize: ListPageSize;
  onPageChange: (next: number) => void;
  onPageSizeChange: (next: ListPageSize) => void;
  disabled?: boolean;
  className?: string;
};

export function ListPaginationBar({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  disabled,
  className,
}: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), pages);
  const { from, to } = pageRangeLabel(total, safePage, pageSize);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-muted-foreground order-3 sm:order-1">
        {total <= 0 ? (
          <>No items</>
        ) : (
          <>
            Showing{" "}
            <span className="text-foreground font-medium tabular-nums">
              {from}-{to}
            </span>{" "}
            of{" "}
            <span className="text-foreground font-medium tabular-nums">{total}</span>
          </>
        )}
      </p>

      <div className="order-1 flex flex-wrap items-center gap-2 sm:order-2 sm:justify-end">
        <div className="flex items-center gap-2">
          <Label htmlFor="list-page-size" className="text-muted-foreground shrink-0 text-xs">
            Rows
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(coerceListPageSize(v))}
            disabled={disabled}
          >
            <SelectTrigger id="list-page-size" size="sm" className="h-9 w-[4.75rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIST_PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-9"
            aria-label="Previous page"
            disabled={disabled || safePage <= 1}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-muted-foreground min-w-[8rem] px-2 text-center tabular-nums">
            Page {safePage} / {pages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-9"
            aria-label="Next page"
            disabled={disabled || safePage >= pages}
            onClick={() => onPageChange(Math.min(pages, safePage + 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
