"use client";

/**
 * Gantt: zoom, sprint filter, today, legend, overdue/done colors.
 * Read/Edit schedule mode; exports (Excel, print/PDF landscape).
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Gantt, ViewMode, type Task as GanttTask } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import { useProjectDetail } from "@/app/(main)/projects/[id]/project-detail-context";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { isTaskAndPlanningReadOnlyRole } from "@/lib/project-detail-permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResourceListToolbar } from "@/components/features/crud/resource-list-toolbar";
import { ActiveFilterChips } from "@/components/features/crud/active-filter-chips";
import {
  FilterSheetBody,
  filterSheetContentClassName,
  filterSheetDescriptionClassName,
  filterSheetFieldClassName,
  filterSheetFooterClassName,
  filterSheetHeaderClassName,
  filterSheetLabelClassName,
  filterSheetTitleClassName,
} from "@/components/ui/filter-sheet";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  FileSpreadsheet,
  Printer,
  BookOpen,
  Pencil,
} from "lucide-react";
import {
  buildGanttExportRows,
  buildTimelineBuckets,
  ganttBarRange,
  taskCoversBucket,
  viewModeLabelId,
  type GanttApiTask,
} from "./gantt-export";
import { narrowGanttTodayLine } from "./gantt-today-line";

type ApiTask = GanttApiTask & {
  sprintId: string | null;
  dependsOn?: { dependsOnId: string }[];
};

type SprintRow = { id: string; name: string };

type ProjectMemberApiRow = {
  projectRole: string;
  user: {
    id: string;
    name: string;
    email?: string | null;
    image?: string | null;
  };
};

function barStyles(t: ApiTask): GanttTask["styles"] {
  const done = t.status === "done" || t.status === "completed";
  const end = t.dueDate ? new Date(t.dueDate) : null;
  const overdue = !done && end && end < new Date();
  if (done) {
    return {
      backgroundColor: "#22c55e",
      backgroundSelectedColor: "#16a34a",
      progressColor: "#15803d",
      progressSelectedColor: "#14532d",
    };
  }
  if (overdue) {
    return {
      backgroundColor: "#ef4444",
      backgroundSelectedColor: "#dc2626",
      progressColor: "#b91c1c",
      progressSelectedColor: "#991b1b",
    };
  }
  return {
    backgroundColor: "#3b82f6",
    backgroundSelectedColor: "#2563eb",
    progressColor: "#1d4ed8",
    progressSelectedColor: "#1e40af",
  };
}

function toGanttRows(tasks: ApiTask[], barsLocked: boolean): GanttTask[] {
  const taskIds = new Set(tasks.map((t) => t.id));
  return tasks.map((t) => {
    const { start, end } = ganttBarRange(t);
    const progress =
      t.status === "done" || t.status === "completed" ? 100 : 0;
    // Only include dependencies that exist in the current visible tasks
    const dependencies = (t.dependsOn ?? [])
      .map((d) => d.dependsOnId)
      .filter((id) => taskIds.has(id));
    return {
      id: t.id,
      type: "task",
      name: t.title,
      start,
      end,
      progress,
      isDisabled: barsLocked,
      dependencies: dependencies.length ? dependencies : undefined,
      styles: barStyles(t),
    };
  });
}

function columnWidthFor(mode: ViewMode): number {
  switch (mode) {
    case ViewMode.Day:
      return 60;
    case ViewMode.Week:
      return 250;
    case ViewMode.Month:
      return 280;
    default:
      return 60;
  }
}

type SprintFilter = "all" | "none" | string;

type ScheduleMode = "read" | "edit";

export default function ProjectGanttChart({ projectId }: { projectId: string }) {
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { project } = useProjectDetail();
  const { data: session } = useSession();
  const role =
    (session?.user as { role?: string } | undefined)?.role ?? "";
  const isDeveloper = role.toLowerCase() === "developer";
  const readOnlyRole = isTaskAndPlanningReadOnlyRole(role);

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [sprintFilter, setSprintFilter] = useState<SprintFilter>("all");
  const [ganttSearch, setGanttSearch] = useState("");
  const [ganttFilterOpen, setGanttFilterOpen] = useState(false);
  const [draftSprintFilter, setDraftSprintFilter] =
    useState<SprintFilter>("all");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("read");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const assigneeForQuery = isDeveloper ? "all" : assigneeFilter;

  const barsLocked = readOnlyRole || scheduleMode === "read";

  const membersQ = useQuery({
    queryKey: ["project-members", projectId, "gantt-assignees"],
    queryFn: async () => {
      const res = await api.get<ProjectMemberApiRow[]>(
        `/api/projects/${projectId}/members`,
      );
      return res.data;
    },
    enabled: !!projectId && !isDeveloper,
  });

  const assigneeSelectItems = useMemo(() => {
    const rows = membersQ.data ?? [];
    return [
      { value: "all", label: "All members" },
      ...rows.map((r) => ({ value: r.user.id, label: r.user.name })),
    ];
  }, [membersQ.data]);

  const assigneeChipLabel = useMemo(() => {
    if (assigneeFilter === "all") return "";
    return (
      assigneeSelectItems.find((i) => i.value === assigneeFilter)?.label ?? ""
    );
  }, [assigneeFilter, assigneeSelectItems]);

  const sprintsQ = useQuery({
    queryKey: ["sprints", projectId, "gantt"],
    queryFn: async () => {
      const res = await api.get<SprintRow[]>("/api/sprints", {
        params: { projectId },
      });
      return res.data;
    },
  });

  const q = useQuery({
    queryKey: ["tasks", projectId, "gantt", assigneeForQuery],
    queryFn: async () => {
      const params: Record<string, string> = {
        projectId,
        page: "1",
        take: "2000",
        forGantt: "1",
      };
      if (assigneeForQuery !== "all") {
        params.assigneeId = assigneeForQuery;
      }
      const res = await api.get<{ data: ApiTask[] }>("/api/tasks", {
        params,
      });
      return res.data.data;
    },
  });

  const filteredTasks = useMemo(() => {
    let rows = q.data ?? [];
    if (sprintFilter === "all") {
      /* keep */
    } else if (sprintFilter === "none") {
      rows = rows.filter((t) => !t.sprintId);
    } else {
      rows = rows.filter((t) => t.sprintId === sprintFilter);
    }
    const qry = ganttSearch.trim().toLowerCase();
    if (qry) {
      rows = rows.filter((t) => t.title.toLowerCase().includes(qry));
    }
    return rows;
  }, [q.data, sprintFilter, ganttSearch]);

  const exportRows = useMemo(
    () => buildGanttExportRows(filteredTasks, viewMode),
    [filteredTasks, viewMode],
  );

  const timelineBuckets = useMemo(
    () => buildTimelineBuckets(filteredTasks, viewMode),
    [filteredTasks, viewMode],
  );

  const openGanttFilter = useCallback(() => {
    setDraftSprintFilter(sprintFilter);
    setGanttFilterOpen(true);
  }, [sprintFilter]);

  const applyGanttFilter = useCallback(() => {
    setSprintFilter(draftSprintFilter);
    setGanttFilterOpen(false);
  }, [draftSprintFilter]);

  const sprintChipLabel = useMemo(() => {
    if (sprintFilter === "all") return "";
    if (sprintFilter === "none") return "No sprint";
    const sp = sprintsQ.data?.find((s) => s.id === sprintFilter);
    return sp?.name ?? "Sprint";
  }, [sprintFilter, sprintsQ.data]);

  const ganttSprintSelectItems = useMemo(
    () => [
      { value: "all", label: "All sprints" },
      { value: "none", label: "No sprint" },
      ...(sprintsQ.data ?? []).map((s) => ({
        value: s.id,
        label: s.name,
      })),
    ],
    [sprintsQ.data],
  );

  const ganttFilterCount =
    (sprintFilter !== "all" ? 1 : 0) +
    (!isDeveloper && assigneeFilter !== "all" ? 1 : 0);

  const patchDates = useMutation({
    mutationFn: async (input: {
      id: string;
      startDate: string;
      dueDate: string;
    }) => {
      await api.patch(`/api/tasks/${input.id}`, {
        startDate: input.startDate,
        dueDate: input.dueDate,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["tasks", projectId, "gantt"] });
    },
    onError: () => toast.error("Gagal menyimpan tanggal"),
  });

  async function handleDateChange(task: GanttTask) {
    if (barsLocked) return false;
    try {
      await patchDates.mutateAsync({
        id: task.id,
        startDate: task.start.toISOString(),
        dueDate: task.end.toISOString(),
      });
      return true;
    } catch {
      return false;
    }
  }

  function exportExcel() {
    const stamp = format(new Date(), "yyyy-MM-dd_HH-mm");
    const safeCode = (project.code || "project").replace(/[^\w-]+/g, "_");
    const aoa: (string | number)[][] = [
      ["Gantt export", project.name],
      ["Kode proyek", project.code],
      ["Skala tampilan", viewModeLabelId(viewMode)],
      ["Filter sprint", sprintChipLabel || "Semua sprint"],
      [
        "Filter assignee",
        isDeveloper
          ? "Tidak ditampilkan (developer)"
          : assigneeFilter === "all"
            ? "Semua anggota"
            : assigneeChipLabel || "—",
      ],
      ["Diekspor (UTC lokal)", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
      [],
      ["Nama", "Mulai", "Selesai", "Status"],
      ...exportRows.map((r) => [r.name, r.from, r.to, r.status]),
    ];
    if (timelineBuckets.length > 0) {
      aoa.push([]);
      aoa.push([
        `Matriks jadwal (${viewModeLabelId(viewMode)}, maks ${timelineBuckets.length} kolom)`,
      ]);
      aoa.push([
        "Nama tugas",
        ...timelineBuckets.map((b) => b.label),
      ]);
      for (const t of filteredTasks) {
        const { start, end } = ganttBarRange(t);
        aoa.push([
          t.title,
          ...timelineBuckets.map((b) =>
            taskCoversBucket(start, end, b) ? "■" : "",
          ),
        ]);
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gantt");
    XLSX.writeFile(wb, `gantt_${safeCode}_${stamp}.xlsx`);
    toast.success("Excel berhasil diunduh.");
  }

  function printPdf() {
    document.body.classList.add("gantt-printing");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("gantt-printing");
    }, 400);
  }

  const ganttTasks = useMemo(
    () =>
      filteredTasks.length ? toGanttRows(filteredTasks, barsLocked) : [],
    [filteredTasks, barsLocked],
  );

  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setNowTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const columnWidth = columnWidthFor(viewMode);
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      narrowGanttTodayLine(ganttScrollRef.current, viewMode);
    });
    return () => cancelAnimationFrame(id);
  }, [ganttTasks, viewMode, viewDate, nowTick, columnWidth]);

  if (q.isPending) {
    return <Skeleton className="h-[480px] w-full rounded-lg" />;
  }

  if (!q.isPending && (!q.data || q.data.length === 0)) {
    return (
      <div className="space-y-2 text-sm text-zinc-600">
        <p>
          {!isDeveloper && assigneeFilter !== "all"
            ? "No tasks for this assignee on the timeline."
            : isDeveloper
              ? "Belum ada tugas relevan untuk Anda di timeline ini."
              : "Belum ada tugas untuk ditampilkan di Gantt."}
        </p>
        {!isDeveloper && assigneeFilter !== "all" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAssigneeFilter("all")}
          >
            Show all members
          </Button>
        ) : (
          <Link
            href={`/projects/${projectId}/backlog`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Buka backlog
          </Link>
        )}
      </div>
    );
  }

  if (!ganttTasks.length) {
    return (
      <div className="space-y-3 text-sm text-zinc-600">
        <p>Tidak ada tugas untuk kombinasi filter sprint / pencarian ini.</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSprintFilter("all")}
          >
            Tampilkan semua sprint
          </Button>
          {!isDeveloper && assigneeFilter !== "all" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAssigneeFilter("all")}
            >
              Semua assignee
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const modeButtons: { label: string; mode: ViewMode }[] = [
    { label: "Day", mode: ViewMode.Day },
    { label: "Week", mode: ViewMode.Week },
    { label: "Month", mode: ViewMode.Month },
  ];

  return (
    <>
      <div className="space-y-3">
        <ResourceListToolbar
          searchValue={ganttSearch}
          onSearchChange={setGanttSearch}
          searchPlaceholder="Search tasks on timeline…"
          filterActiveCount={ganttFilterCount}
          onOpenFilter={openGanttFilter}
          filterLabel="Gantt filters"
        />

        <ActiveFilterChips
          items={[
            ...(sprintFilter !== "all"
              ? [{ id: "sprint", label: `Sprint: ${sprintChipLabel}` }]
              : []),
            ...(!isDeveloper &&
            assigneeFilter !== "all" &&
            assigneeChipLabel
              ? [{ id: "assignee", label: `Assignee: ${assigneeChipLabel}` }]
              : []),
          ]}
          onRemove={(id) => {
            if (id === "sprint") setSprintFilter("all");
            if (id === "assignee") setAssigneeFilter("all");
          }}
        />

        <Sheet open={ganttFilterOpen} onOpenChange={setGanttFilterOpen}>
          <SheetContent side="right" className={filterSheetContentClassName}>
            <SheetHeader className={filterSheetHeaderClassName}>
              <SheetTitle className={filterSheetTitleClassName}>
                Filter Gantt
              </SheetTitle>
              <SheetDescription className={filterSheetDescriptionClassName}>
                Batasi timeline ke sprint tertentu atau semua sprint aktif.
              </SheetDescription>
            </SheetHeader>
            <FilterSheetBody>
              <div className={filterSheetFieldClassName}>
                <Label className={filterSheetLabelClassName}>Sprint</Label>
                <Select
                  value={draftSprintFilter}
                  onValueChange={(v) =>
                    v && setDraftSprintFilter(v as SprintFilter)
                  }
                  items={ganttSprintSelectItems}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ganttSprintSelectItems.map((it) => (
                      <SelectItem key={it.value} value={it.value}>
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FilterSheetBody>
            <SheetFooter
              className={cn(
                filterSheetFooterClassName,
                "flex-col sm:flex-row sm:justify-end",
              )}
            >
              <Button
                type="button"
                variant="outline"
                className="min-h-10 w-full sm:w-auto"
                onClick={() => setGanttFilterOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                className="min-h-10 w-full sm:w-auto"
                onClick={applyGanttFilter}
              >
                Terapkan
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {!isDeveloper ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-zinc-500">Assignee:</span>
            <Select
              value={assigneeFilter}
              onValueChange={(v) => v && setAssigneeFilter(v)}
              items={assigneeSelectItems}
            >
              <SelectTrigger
                className="h-9 w-[min(240px,100%)] text-sm"
                disabled={
                  membersQ.isPending || assigneeSelectItems.length <= 1
                }
              >
                <SelectValue placeholder="Project members" />
              </SelectTrigger>
              <SelectContent>
                {assigneeSelectItems.map((it) => (
                  <SelectItem key={it.value} value={it.value}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Scale:</span>
          {modeButtons.map(({ label, mode }) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={viewMode === mode ? "default" : "outline"}
              onClick={() => setViewMode(mode)}
            >
              {label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setViewDate(new Date())}
          >
            Today
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
          <span className="text-xs font-medium text-zinc-500">Schedule:</span>
          {readOnlyRole ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">
              <BookOpen className="size-3.5" />
              Read (peran Anda tidak dapat mengedit jadwal)
            </span>
          ) : (
            <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50/80 p-0.5">
              <Button
                type="button"
                size="sm"
                variant={scheduleMode === "read" ? "secondary" : "ghost"}
                className="h-8 gap-1 px-2.5 text-xs"
                onClick={() => setScheduleMode("read")}
              >
                <BookOpen className="size-3.5" />
                Read
              </Button>
              <Button
                type="button"
                size="sm"
                variant={scheduleMode === "edit" ? "default" : "ghost"}
                className="h-8 gap-1 px-2.5 text-xs"
                onClick={() => setScheduleMode("edit")}
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
            </div>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {!readOnlyRole ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={exportExcel}
                >
                  <FileSpreadsheet className="size-3.5" />
                  Export Excel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={printPdf}
                >
                  <Printer className="size-3.5" />
                  Export PDF
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-zinc-500">
          {readOnlyRole
            ? "Anda hanya dapat melihat timeline."
            : scheduleMode === "read"
              ? "Mode Read: batang tugas tidak dapat digeser. Buka Edit untuk mengubah tanggal (tersimpan ke task)."
              : "Mode Edit: geser atau ubah ukuran batang untuk memperbarui tanggal mulai & selesai task di server."}
        </p>

        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{ background: "#3b82f6" }}
            />
            Active
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{ background: "#ef4444" }}
            />
            Overdue
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{ background: "#22c55e" }}
            />
            Done
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-4 w-px rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.65)]"
              aria-hidden
            />
            Sekarang (garis merah, mengikuti jam)
          </span>
        </div>

        <div
          ref={ganttScrollRef}
          className="gantt-simpro w-full overflow-x-auto rounded-md border border-zinc-200 bg-white p-2 print:hidden"
        >
          <Gantt
            tasks={ganttTasks}
            viewMode={viewMode}
            viewDate={viewDate}
            onDateChange={(task) => handleDateChange(task)}
            listCellWidth="200px"
            columnWidth={columnWidth}
            rowHeight={44}
            ganttHeight={440}
            todayColor="transparent"
          />
        </div>
      </div>

      <div
        id="gantt-print-root"
        className="hidden print:block"
        aria-hidden
      >
        <div className="space-y-4 text-zinc-900">
          <header>
            <h1 className="text-xl font-bold">Gantt — {project.name}</h1>
            <p className="text-sm text-zinc-600">
              {project.code} · Skala: {viewModeLabelId(viewMode)}
            </p>
            <p className="text-xs text-zinc-500">
              {sprintChipLabel
                ? `Sprint: ${sprintChipLabel} · `
                : ""}
              Dicetak {format(new Date(), "d MMM yyyy, HH:mm")}
            </p>
          </header>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">
              Tabel jadwal
            </h2>
            <table className="w-full border-collapse border border-zinc-300 text-sm">
              <thead>
                <tr className="bg-zinc-100">
                  <th className="border border-zinc-300 px-2 py-1.5 text-left">
                    Nama
                  </th>
                  <th className="border border-zinc-300 px-2 py-1.5 text-left">
                    Mulai
                  </th>
                  <th className="border border-zinc-300 px-2 py-1.5 text-left">
                    Selesai
                  </th>
                  <th className="border border-zinc-300 px-2 py-1.5 text-left">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t, i) => {
                  const r = exportRows[i];
                  if (!r) return null;
                  return (
                    <tr key={t.id}>
                      <td className="border border-zinc-300 px-2 py-1">
                        {r.name}
                      </td>
                      <td className="border border-zinc-300 px-2 py-1">
                        {r.from}
                      </td>
                      <td className="border border-zinc-300 px-2 py-1">
                        {r.to}
                      </td>
                      <td className="border border-zinc-300 px-2 py-1 capitalize">
                        {r.status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {timelineBuckets.length > 0 ? (
            <section className="break-inside-avoid">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">
                Ringkasan timeline ({viewModeLabelId(viewMode)})
              </h2>
              <p className="mb-2 text-xs text-zinc-500">
                ■ = tugas berjalan pada periode kolom (sesuai skala Hari / Minggu /
                Bulan).
              </p>
              <div className="max-w-full overflow-x-auto">
                <table className="border-collapse border border-zinc-300 text-[10px]">
                  <thead>
                    <tr className="bg-zinc-100">
                      <th className="sticky left-0 z-10 min-w-[120px] border border-zinc-300 bg-zinc-100 px-1 py-1 text-left">
                        Tugas
                      </th>
                      {timelineBuckets.map((b) => (
                        <th
                          key={b.label + b.start.toISOString()}
                          className="min-w-[28px] border border-zinc-300 px-0.5 py-1 text-center font-normal"
                        >
                          {b.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((t) => {
                      const { start, end } = ganttBarRange(t);
                      return (
                        <tr key={t.id}>
                          <td className="sticky left-0 z-10 max-w-[140px] truncate border border-zinc-300 bg-white px-1 py-0.5">
                            {t.title}
                          </td>
                          {timelineBuckets.map((b) => (
                            <td
                              key={b.label + t.id}
                              className="border border-zinc-300 px-0 py-0.5 text-center"
                            >
                              {taskCoversBucket(start, end, b) ? "■" : ""}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
