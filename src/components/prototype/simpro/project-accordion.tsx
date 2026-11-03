"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProjectAccordion({
  projectId,
  name,
  code,
  color,
  count,
  unit,
  open,
  onToggle,
  children,
}: {
  projectId: string;
  name: string;
  code?: string;
  color?: string;
  count: number;
  unit: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = `simpro-project-group-${projectId}`;
  return (
    <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl shadow-sm ring-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="hover:bg-muted/40 focus-visible:ring-ring/50 flex w-full items-center gap-3 p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <span
          className="size-9 shrink-0 rounded-lg"
          style={{ backgroundColor: color ?? "#64748b" }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="text-muted-foreground block text-[10px]">
            {code ? `${code} · ` : ""}
            {count} {unit}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div id={panelId} className="animate-in fade-in-0 border-t duration-200">
          {children}
        </div>
      ) : null}
    </div>
  );
}
