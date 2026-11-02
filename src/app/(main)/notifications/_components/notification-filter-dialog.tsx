"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FilterSheetBody,
  filterDialogContentClassName,
  filterDialogFooterClassName,
  filterDialogHeaderClassName,
  filterSheetDescriptionClassName,
  filterSheetFieldClassName,
  filterSheetLabelClassName,
  filterSheetTitleClassName,
} from "@/components/ui/filter-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NOTIFICATION_DATE_PRESETS,
  NOTIFICATION_TYPE_OPTIONS,
  resolveNotificationDatePreset,
} from "@/lib/notification-constants";
import { cn } from "@/lib/utils";
import type {
  NotificationProject,
  NotificationSearchParams,
} from "../action";

type FilterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: NotificationSearchParams;
  projects: NotificationProject[];
  onApply: (values: Partial<NotificationSearchParams>) => void;
};

const NotificationFilterForm = ({
  filters,
  projects,
  onApply,
  onClose,
}: Omit<FilterDialogProps, "open" | "onOpenChange"> & {
  onClose: () => void;
}) => {
  const [dateFrom, setDateFrom] = useState(filters.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(filters.dateTo ?? "");
  const [projectId, setProjectId] = useState(filters.projectId ?? "");
  const [types, setTypes] = useState<string[]>(
    (filters.types ?? "").split(",").filter(Boolean),
  );

  const applyPreset = (preset: string) => {
    const range = resolveNotificationDatePreset(preset);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
  };

  const toggleType = (value: string) => {
    setTypes((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const clearDraft = () => {
    setDateFrom("");
    setDateTo("");
    setProjectId("");
    setTypes([]);
  };

  const apply = () => {
    onApply({ dateFrom, dateTo, projectId, types: types.join(",") });
    onClose();
  };

  return (
    <>
      <FilterSheetBody className="px-6 py-5">
        <div className={filterSheetFieldClassName}>
          <Label className={filterSheetLabelClassName}>Periode tanggal</Label>
          <div className="flex flex-wrap gap-2">
            {NOTIFICATION_DATE_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => applyPreset(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="notification-date-from"
                className="text-xs text-muted-foreground"
              >
                Dari
              </Label>
              <Input
                id="notification-date-from"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => setDateFrom(event.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="notification-date-to"
                className="text-xs text-muted-foreground"
              >
                Sampai
              </Label>
              <Input
                id="notification-date-to"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => setDateTo(event.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </div>

        <div className={filterSheetFieldClassName}>
          <Label
            htmlFor="notification-project"
            className={filterSheetLabelClassName}
          >
            Proyek
          </Label>
          <select
            id="notification-project"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Semua proyek</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className={filterSheetFieldClassName}>
          <Label className={filterSheetLabelClassName}>Jenis notifikasi</Label>
          <div className="grid grid-cols-1 gap-2 rounded-md border border-zinc-200 bg-zinc-50/40 p-3 sm:grid-cols-2">
            {NOTIFICATION_TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={types.includes(option.value)}
                  onCheckedChange={() => toggleType(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      </FilterSheetBody>

      <div
        className={cn(
          filterDialogFooterClassName,
          "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <Button type="button" variant="ghost" onClick={clearDraft}>
          Clear all
        </Button>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="button" onClick={apply}>
            Terapkan
          </Button>
        </div>
      </div>
    </>
  );
};

export const NotificationFilterDialog = ({
  open,
  onOpenChange,
  filters,
  projects,
  onApply,
}: FilterDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={filterDialogContentClassName}>
      <DialogHeader className={filterDialogHeaderClassName}>
        <DialogTitle className={filterSheetTitleClassName}>
          Filter Notifikasi
        </DialogTitle>
        <DialogDescription className={filterSheetDescriptionClassName}>
          Persempit daftar berdasarkan periode, proyek, dan jenis notifikasi.
          Biarkan kosong untuk menampilkan semua.
        </DialogDescription>
      </DialogHeader>
      <NotificationFilterForm
        filters={filters}
        projects={projects}
        onApply={onApply}
        onClose={() => onOpenChange(false)}
      />
    </DialogContent>
  </Dialog>
);
