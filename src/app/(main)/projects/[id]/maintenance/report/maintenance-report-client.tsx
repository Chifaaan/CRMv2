"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Filter,
  Printer,
  Table as TableIcon,
  Search,
} from "lucide-react";
import { subDays } from "date-fns";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  REPORT_FILTER_STATUS_OPTIONS,
  formatDateID,
} from "@/components/features/maintenance/maintenance-constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import type { SortDirection } from "@/lib/column-sort";
import {
  cmpOptionalDateDir,
  cmpOptionalStringDir,
  toggleColumnSort,
} from "@/lib/column-sort";
import { isAdminOrPmRole } from "@/lib/role-constants";

type ReportRow = {
  id: string;
  ticketNumber: string;
  title: string;
  projectName: string;
  picPemohon: string;
  statusLabel: string;
  assignedDate: string | null;
  dueDate: string | null;
  priorityLabel: string;
  severityLabel: string;
  detailPenjelasan: string;
};

type ReportPayload = {
  rows: ReportRow[];
  meta: {
    total: number;
    dateFrom: string;
    dateTo: string;
    filterDesc: string;
    projectName: string;
  };
};

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function escapeCsv(val: unknown) {
  const str = String(val == null ? "" : val);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function MaintenanceReportClient({ projectId }: { projectId: string }) {
  const { data: session } = useSession();
  const role =
    (session?.user as { role?: string } | undefined)?.role ?? "";

  const now = new Date();
  const [from, setFrom] = useState(toYmd(subDays(now, 30)));
  const [to, setTo] = useState(toYmd(now));
  const [statuses, setStatuses] = useState<string[]>([]);
  const [includeSubProjects, setIncludeSubProjects] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [reportSortCol, setReportSortCol] = useState<string>("ticketNumber");
  const [reportSortDir, setReportSortDir] = useState<SortDirection>("asc");

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(searchInput), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const statusesParam = useMemo(
    () => (statuses.length > 0 ? statuses.join(",") : undefined),
    [statuses],
  );

  const q = useQuery({
    queryKey: [
      "maintenance-report",
      projectId,
      from,
      to,
      statusesParam,
      includeSubProjects,
      searchDebounced,
    ],
    queryFn: async () => {
      const res = await api.get<ReportPayload>("/api/maintenance/report", {
        params: {
          projectId,
          from,
          to,
          ...(statusesParam ? { statuses: statusesParam } : {}),
          ...(includeSubProjects ? { includeSubProjects: "true" } : {}),
          ...(searchDebounced.trim()
            ? { search: searchDebounced.trim() }
            : {}),
        },
      });
      return res.data;
    },
    enabled: isAdminOrPmRole(role),
  });

  const sortedReportRows = useMemo(() => {
    const raw = q.data?.rows ?? [];
    const dir = reportSortDir;
    const sorted = [...raw];
    sorted.sort((a, b) => {
      switch (reportSortCol) {
        case "title":
          return cmpOptionalStringDir(a.title, b.title, dir);
        case "project":
          return cmpOptionalStringDir(a.projectName, b.projectName, dir);
        case "pic":
          return cmpOptionalStringDir(a.picPemohon, b.picPemohon, dir);
        case "status":
          return cmpOptionalStringDir(a.statusLabel, b.statusLabel, dir);
        case "assigned":
          return cmpOptionalDateDir(a.assignedDate, b.assignedDate, dir);
        case "due":
          return cmpOptionalDateDir(a.dueDate, b.dueDate, dir);
        case "priority":
          return cmpOptionalStringDir(a.priorityLabel, b.priorityLabel, dir);
        case "severity":
          return cmpOptionalStringDir(a.severityLabel, b.severityLabel, dir);
        case "ticketNumber":
        default:
          return cmpOptionalStringDir(a.ticketNumber, b.ticketNumber, dir);
      }
    });
    return sorted;
  }, [q.data?.rows, reportSortCol, reportSortDir]);

  function onReportSort(key: string) {
    const next = toggleColumnSort(reportSortCol, reportSortDir, key);
    setReportSortCol(next.key);
    setReportSortDir(next.dir);
  }

  const buildExportObjects = useCallback(() => {
    return (q.data?.rows ?? []).map((r, idx) => ({
      No: idx + 1,
      "Ticket No": r.ticketNumber,
      "Task Title": r.title,
      Project: r.projectName,
      "PIC Pemohon": r.picPemohon,
      Status: r.statusLabel,
      "Assign Date": r.assignedDate ? formatDateID(r.assignedDate) : "",
      "Due Date": r.dueDate ? formatDateID(r.dueDate) : "",
      Priority: r.priorityLabel,
      Severity: r.severityLabel || "",
      "Detail (penjelasan)": r.detailPenjelasan,
    }));
  }, [q.data?.rows]);

  function exportCsv() {
    const objs = buildExportObjects();
    if (objs.length === 0) {
      toast.warning("No tickets to export");
      return;
    }
    const headers = Object.keys(objs[0]);
    const lines = [
      headers.map(escapeCsv).join(","),
      ...objs.map((row) =>
        headers.map((h) => escapeCsv(row[h as keyof typeof row])).join(","),
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = (q.data?.meta.projectName ?? "project").replace(
      /[^a-z0-9]/gi,
      "_",
    );
    a.download = `maintenance_report_${safe}_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  function exportXlsx() {
    const objs = buildExportObjects();
    if (objs.length === 0) {
      toast.warning("No tickets to export");
      return;
    }
    try {
      const ws = XLSX.utils.json_to_sheet(objs);
      ws["!cols"] = [
        { wch: 4 },
        { wch: 14 },
        { wch: 36 },
        { wch: 22 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 12 },
        { wch: 10 },
        { wch: 50 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Maintenance Report");
      const safe = (q.data?.meta.projectName ?? "project").replace(
        /[^a-z0-9]/gi,
        "_",
      );
      XLSX.writeFile(wb, `maintenance_report_${safe}_${from}_${to}.xlsx`);
      toast.success("Excel exported");
    } catch {
      toast.error("Excel export failed");
    }
  }

  function printPdf() {
    document.body.classList.add("mnt-report-printing");
    window.print();
    window.setTimeout(() => {
      document.body.classList.remove("mnt-report-printing");
    }, 800);
  }

  function toggleStatus(v: string) {
    setStatuses((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );
  }

  function selectAllStatuses() {
    setStatuses(REPORT_FILTER_STATUS_OPTIONS.map((s) => s.value));
  }

  function clearAllStatuses() {
    setStatuses([]);
  }

  const filterBody = (
    <div className="space-y-5">
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
        <Checkbox
          checked={includeSubProjects}
          onCheckedChange={(c) => setIncludeSubProjects(c === true)}
        />
        <span className="text-sm font-semibold leading-tight">
          Include sub-projects data
        </span>
      </label>

      <div>
        <div className="mb-2 text-xs font-semibold text-zinc-700">
          Assign date
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-500">From</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-500">To</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-700">Status</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={selectAllStatuses}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={clearAllStatuses}
            >
              Clear all
            </Button>
          </div>
        </div>
        <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
          {REPORT_FILTER_STATUS_OPTIONS.map((s) => (
            <label
              key={s.value}
              className="flex cursor-pointer items-center gap-2 py-1 text-sm"
            >
              <Checkbox
                checked={statuses.includes(s.value)}
                onCheckedChange={() => toggleStatus(s.value)}
              />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          const n = new Date();
          setFrom(toYmd(subDays(n, 30)));
          setTo(toYmd(n));
          setStatuses([]);
          setIncludeSubProjects(false);
        }}
      >
        Reset filters
      </Button>
    </div>
  );

  if (!isAdminOrPmRole(role)) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 py-16 text-center">
        <p className="text-sm font-medium text-zinc-800">Access denied</p>
        <p className="mt-1 text-xs text-zinc-500">
          Only PM and Admin can access maintenance reports.
        </p>
        <Link
          href={`/projects/${projectId}/maintenance`}
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "mt-4 inline-flex",
          )}
        >
          Back to maintenance
        </Link>
      </div>
    );
  }

  const meta = q.data?.meta;
  const activeFilterCount = statuses.length + (includeSubProjects ? 1 : 0);

  return (
    <>
      <style jsx global>{`
        @media print {
          body.mnt-report-printing * {
            visibility: hidden;
          }
          body.mnt-report-printing #mnt-report-print-root,
          body.mnt-report-printing #mnt-report-print-root * {
            visibility: visible;
          }
          body.mnt-report-printing #mnt-report-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      <div className="space-y-6">
        <div
          id="mnt-report-print-root"
          className="space-y-6 print:space-y-4"
        >
          <div className="hidden print:block print:break-inside-avoid">
            <div className="mb-4 flex justify-between gap-4 border-b border-zinc-300 pb-4">
              <div>
                <div className="text-lg font-bold text-zinc-900">Simpro</div>
              </div>
              <div className="text-right text-sm text-zinc-700">
                <strong>Maintenance Report</strong>
                <br />
                Project: {meta?.projectName ?? "—"}
                <br />
                Assign date: {formatDateID(from)} – {formatDateID(to)}
                <br />
                Filter: {meta?.filterDesc ?? "—"}
                <br />
                Generated: {formatDateID(new Date().toISOString())}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                Maintenance report
              </h2>
              <p className="text-sm text-zinc-600">
                {meta?.projectName ?? "—"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/projects/${projectId}/maintenance`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Back to maintenance
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={exportCsv}
              >
                <FileSpreadsheet className="size-3.5" />
                Export CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={exportXlsx}
              >
                <TableIcon className="size-3.5" />
                Export Excel
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1"
                onClick={printPdf}
              >
                <Printer className="size-3.5" />
                Generate PDF
              </Button>
            </div>
          </div>

          <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
            <DialogContent
              showCloseButton
              className="max-h-[min(720px,90vh)] gap-0 overflow-hidden p-0 sm:max-w-md print:hidden"
            >
              <DialogHeader className="border-b border-zinc-100 px-4 py-3">
                <DialogTitle>Filter laporan</DialogTitle>
                <DialogDescription className="text-xs text-zinc-500">
                  Rentang assign date, status, dan opsi sub-project. Pencarian
                  tiket ada di bilah atas.
                </DialogDescription>
                {activeFilterCount > 0 ? (
                  <span className="inline-flex w-fit rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                    {activeFilterCount} filter aktif
                  </span>
                ) : null}
              </DialogHeader>
              <div className="max-h-[min(520px,70vh)] overflow-y-auto px-4 py-4">
                {filterBody}
              </div>
            </DialogContent>
          </Dialog>

          <div className="min-w-0 space-y-4">
              <div className="flex flex-col gap-2 print:hidden sm:flex-row sm:items-center sm:gap-3">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden
                  />
                  <Input
                    className="h-10 pl-9"
                    placeholder="Cari ID tiket, nomor tiket, atau judul…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    aria-label="Cari laporan maintenance"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 gap-2 border-zinc-200 bg-white shadow-sm"
                  onClick={() => setFilterDialogOpen(true)}
                >
                  <Filter className="size-4" />
                  Filter
                  {activeFilterCount > 0 ? (
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </Button>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm print:hidden">
                <span className="font-medium text-zinc-900">
                  {meta?.projectName}
                </span>
                <span className="text-zinc-500">
                  {" "}
                  — Maintenance report · {meta?.filterDesc} · Assign date:{" "}
                  {formatDateID(from)} – {formatDateID(to)}
                </span>
                <span className="float-right text-zinc-500">
                  {meta?.total ?? 0} ticket
                  {(meta?.total ?? 0) !== 1 ? "s" : ""}
                </span>
              </div>

              {q.isLoading ? (
                <p className="text-sm text-zinc-500">Loading…</p>
              ) : sortedReportRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 py-16 text-center">
                  <p className="text-sm font-medium text-zinc-800">
                    No tickets in selected filter range
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Try adjusting the date range or status filter.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white print:border-zinc-300">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-50">
                        <TableHead className="w-10 text-center">No</TableHead>
                        <SortableTableHead
                          label="Ticket No"
                          columnKey="ticketNumber"
                          activeSortKey={reportSortCol}
                          sortDirection={reportSortDir}
                          onSort={onReportSort}
                          className="w-[110px]"
                        />
                        <SortableTableHead
                          label="Task Title"
                          columnKey="title"
                          activeSortKey={reportSortCol}
                          sortDirection={reportSortDir}
                          onSort={onReportSort}
                        />
                        <SortableTableHead
                          label="Project"
                          columnKey="project"
                          activeSortKey={reportSortCol}
                          sortDirection={reportSortDir}
                          onSort={onReportSort}
                        />
                        <SortableTableHead
                          label="PIC Pemohon"
                          columnKey="pic"
                          activeSortKey={reportSortCol}
                          sortDirection={reportSortDir}
                          onSort={onReportSort}
                          className="w-[120px]"
                        />
                        <SortableTableHead
                          label="Status"
                          columnKey="status"
                          activeSortKey={reportSortCol}
                          sortDirection={reportSortDir}
                          onSort={onReportSort}
                          className="w-[130px]"
                        />
                        <SortableTableHead
                          label="Assign Date"
                          columnKey="assigned"
                          activeSortKey={reportSortCol}
                          sortDirection={reportSortDir}
                          onSort={onReportSort}
                          className="w-[120px] whitespace-nowrap"
                        />
                        <SortableTableHead
                          label="Due Date"
                          columnKey="due"
                          activeSortKey={reportSortCol}
                          sortDirection={reportSortDir}
                          onSort={onReportSort}
                          className="w-[120px] whitespace-nowrap"
                        />
                        <SortableTableHead
                          label="Priority"
                          columnKey="priority"
                          activeSortKey={reportSortCol}
                          sortDirection={reportSortDir}
                          onSort={onReportSort}
                          className="w-[90px]"
                        />
                        <SortableTableHead
                          label="Severity"
                          columnKey="severity"
                          activeSortKey={reportSortCol}
                          sortDirection={reportSortDir}
                          onSort={onReportSort}
                          className="w-[80px]"
                        />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedReportRows.map((r, idx) => (
                        <TableRow
                          key={r.id}
                          className={idx % 2 === 1 ? "bg-zinc-50/60" : ""}
                        >
                          <TableCell className="text-center tabular-nums">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {r.ticketNumber}
                          </TableCell>
                          <TableCell className="max-w-[280px]">
                            {r.title}
                          </TableCell>
                          <TableCell>{r.projectName}</TableCell>
                          <TableCell className="text-sm">{r.picPemohon}</TableCell>
                          <TableCell>{r.statusLabel}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {r.assignedDate
                              ? formatDateID(r.assignedDate)
                              : "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {r.dueDate ? formatDateID(r.dueDate) : "—"}
                          </TableCell>
                          <TableCell>{r.priorityLabel}</TableCell>
                          <TableCell>{r.severityLabel || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
}
