"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Layout konsisten untuk panel filter samping (Sheet kanan):
 * header dengan border, body scroll ber-padding, footer menempel bawah.
 */
export const filterSheetContentClassName = cn(
  "flex h-full max-h-[100dvh] w-full max-w-[100vw] flex-col gap-0 border-l border-zinc-200/90 bg-white p-0 shadow-xl sm:max-w-md",
);

export const filterSheetHeaderClassName = cn(
  "shrink-0 gap-1 border-b border-zinc-100 bg-zinc-50/60 pr-12 pl-5 pb-4 pt-6",
);

export const filterSheetTitleClassName = "text-base font-semibold text-zinc-900";

export const filterSheetDescriptionClassName = "text-xs leading-relaxed text-zinc-500";

export const filterSheetFooterClassName = cn(
  "mt-0 shrink-0 gap-3 border-t border-zinc-100 bg-zinc-50/50 px-5 py-4 sm:flex-row sm:items-center",
);

export const filterSheetLabelClassName =
  "text-xs font-medium tracking-wide text-zinc-600";

export const filterSheetFieldClassName = "space-y-2";

export function FilterSheetBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="filter-sheet-body"
      className={cn(
        "min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-gutter:stable]",
        className,
      )}
      {...props}
    />
  );
}

/** Layout dialog filter (My tasks, dst.): luas comfy di desktop, tinggi capped + scroll di body */
export const filterDialogContentClassName = cn(
  "flex max-h-[min(90dvh,840px)] w-[min(calc(100vw-2rem),30rem)] max-w-none flex-col gap-0 overflow-hidden rounded-xl border-0 bg-white p-0 text-zinc-900 shadow-lg ring-zinc-200/80 sm:max-w-xl",
);

export const filterDialogHeaderClassName = cn(
  "shrink-0 gap-1 border-b border-zinc-100 bg-zinc-50/60 px-6 pb-4 pt-6 pr-14",
);

export const filterDialogFooterClassName = cn(
  "mt-0 shrink-0 gap-3 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between",
);
