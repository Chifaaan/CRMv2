"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LETTER_CATEGORY_OPTIONS,
  LETTER_STATUS_OPTIONS,
} from "@/lib/letter-constants";
import type { LetterSearchParams } from "../types";

export const LetterFilterBar = ({
  filters,
  units,
}: {
  filters: LetterSearchParams;
  units: string[];
}) => {
  const router = useRouter();
  const [search, setSearch] = useState(filters.q ?? "");

  const update = (values: Partial<LetterSearchParams>) => {
    const query = new URLSearchParams();
    Object.entries({ ...filters, ...values, page: "1" }).forEach(
      ([key, value]) => {
        if (value) query.set(key, value);
      },
    );
    router.push(`/letters?${query.toString()}`);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search !== (filters.q ?? "")) update({ q: search });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const active = [
    filters.unit && { key: "unit", label: `Unit: ${filters.unit}` },
    filters.category && {
      key: "category",
      label: `Kategori: ${
        LETTER_CATEGORY_OPTIONS.find(
          (option) => option.value === filters.category,
        )?.label ?? filters.category
      }`,
    },
    filters.status && {
      key: "status",
      label: `Status: ${
        LETTER_STATUS_OPTIONS.find(
          (option) => option.value === filters.status,
        )?.label ?? filters.status
      }`,
    },
    filters.dateFrom && {
      key: "dateFrom",
      label: `Dari: ${filters.dateFrom}`,
    },
    filters.dateTo && { key: "dateTo", label: `Sampai: ${filters.dateTo}` },
  ].filter(Boolean) as { key: keyof LetterSearchParams; label: string }[];

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nomor atau Perihal..."
            className="h-9 pl-9"
          />
        </div>
        <select
          value={filters.unit ?? ""}
          onChange={(event) => update({ unit: event.target.value })}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">Semua Unit</option>
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
        <select
          value={filters.category ?? ""}
          onChange={(event) => update({ category: event.target.value })}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">Semua Kategori</option>
          {LETTER_CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={filters.status ?? ""}
          onChange={(event) => update({ status: event.target.value })}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          {LETTER_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(event) => update({ dateFrom: event.target.value })}
          className="h-9 w-auto"
          aria-label="Tanggal mulai"
        />
        <Input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(event) => update({ dateTo: event.target.value })}
          className="h-9 w-auto"
          aria-label="Tanggal akhir"
        />
        <Button type="button" variant="outline" size="lg">
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </Button>
        <Button
          type="button"
          variant="link"
          size="lg"
          className="px-1"
          onClick={() => router.push("/letters")}
        >
          Reset
        </Button>
      </div>
      {active.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Filter Aktif:
          </span>
          {active.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => update({ [filter.key]: "" })}
              className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs"
            >
              {filter.label}
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
