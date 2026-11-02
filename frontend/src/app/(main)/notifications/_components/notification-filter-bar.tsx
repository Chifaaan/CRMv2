"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notificationTypeLabel } from "@/lib/notification-constants";
import { NotificationFilterDialog } from "./notification-filter-dialog";
import type {
  NotificationProject,
  NotificationSearchParams,
} from "../action";

export const NotificationFilterBar = ({
  filters,
  projects,
}: {
  filters: NotificationSearchParams;
  projects: NotificationProject[];
}) => {
  const router = useRouter();
  const [search, setSearch] = useState(filters.q ?? "");
  const [filterOpen, setFilterOpen] = useState(false);

  const update = (values: Partial<NotificationSearchParams>) => {
    const query = new URLSearchParams();
    Object.entries({ ...filters, ...values }).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const queryString = query.toString();
    router.push(
      queryString ? `/notifications?${queryString}` : "/notifications",
    );
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search !== (filters.q ?? "")) update({ q: search });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const selectedTypes = (filters.types ?? "").split(",").filter(Boolean);

  const projectName =
    projects.find((project) => project.id === filters.projectId)?.name ??
    filters.projectId;

  const chips = [
    filters.q && {
      key: "q",
      label: `Cari: ${filters.q}`,
      clear: () => {
        setSearch("");
        update({ q: "" });
      },
    },
    filters.dateFrom && {
      key: "dateFrom",
      label: `Dari: ${filters.dateFrom}`,
      clear: () => update({ dateFrom: "" }),
    },
    filters.dateTo && {
      key: "dateTo",
      label: `Sampai: ${filters.dateTo}`,
      clear: () => update({ dateTo: "" }),
    },
    filters.projectId && {
      key: "projectId",
      label: `Proyek: ${projectName}`,
      clear: () => update({ projectId: "" }),
    },
    ...selectedTypes.map((type) => ({
      key: `type-${type}`,
      label: `Jenis: ${notificationTypeLabel(type)}`,
      clear: () =>
        update({
          types: selectedTypes.filter((item) => item !== type).join(","),
        }),
    })),
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const resetAll = () => {
    setSearch("");
    router.push("/notifications");
  };

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari notifikasi, proyek, atau item..."
            className="h-9 pl-9"
            aria-label="Cari notifikasi"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setFilterOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
          {chips.length > 0 ? (
            <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {chips.length}
            </span>
          ) : null}
        </Button>
        <Button
          type="button"
          variant="link"
          size="lg"
          className="px-1"
          onClick={resetAll}
          disabled={chips.length === 0}
        >
          Reset
        </Button>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Filter Aktif:
          </span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs"
            >
              {chip.label}
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      ) : null}

      <NotificationFilterDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        projects={projects}
        onApply={update}
      />
    </div>
  );
};
