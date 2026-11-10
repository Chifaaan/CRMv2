"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type ListView = "card" | "table";

const PREFIX = "prototype-view:";

export function useViewPreference(key: string) {
  const [view, setView] = useState<ListView>("card");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`${PREFIX}${key}`);
      if (stored === "card" || stored === "table") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setView(stored);
      }
    } catch {
      /* ignore storage errors */
    }
  }, [key]);

  const update = (next: ListView) => {
    setView(next);
    try {
      window.localStorage.setItem(`${PREFIX}${key}`, next);
    } catch {
      /* ignore storage errors */
    }
  };

  return [view, update] as const;
}

export function ViewToggle({
  value,
  onChange,
}: {
  value: ListView;
  onChange: (next: ListView) => void;
}) {
  return (
    <div className="bg-muted flex items-center rounded-lg p-1">
      {[
        { key: "card" as const, label: "Card", icon: LayoutGrid },
        { key: "table" as const, label: "Table", icon: List },
      ].map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === item.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          <item.icon className="size-3.5" /> {item.label}
        </button>
      ))}
    </div>
  );
}
