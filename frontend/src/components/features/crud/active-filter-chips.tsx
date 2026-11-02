"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

export type ActiveFilterChip = { id: string; label: string };

type ActiveFilterChipsProps = {
  items: ActiveFilterChip[];
  onRemove: (id: string) => void;
};

export function ActiveFilterChips({ items, onRemove }: ActiveFilterChipsProps) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-muted text-foreground inline-flex max-w-full items-center gap-0.5 rounded-full border border-transparent py-0.5 pr-0.5 pl-2.5 text-xs font-medium"
        >
          <span className="truncate">{item.label}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground size-6 shrink-0 rounded-full"
            onClick={() => onRemove(item.id)}
            aria-label={`Hapus filter: ${item.label}`}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
