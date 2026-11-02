"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_OPTIONS   = ["backlog", "todo", "in_progress", "in_review", "need_revision", "done", "cancelled"];
const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"];
const TYPE_OPTIONS     = ["task", "story", "bug", "enhancement", "epic", "new_feature", "adjustment", "troubleshooting", "inject_data", "data_update"];

async function generateTemplate() {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();

  // Sheet petunjuk dropdown values
  const refSheet = wb.addWorksheet("_ref", { state: "veryHidden" });
  STATUS_OPTIONS.forEach((v, i)   => { refSheet.getCell(`A${i + 1}`).value = v; });
  PRIORITY_OPTIONS.forEach((v, i) => { refSheet.getCell(`B${i + 1}`).value = v; });
  TYPE_OPTIONS.forEach((v, i)     => { refSheet.getCell(`C${i + 1}`).value = v; });

  const ws = wb.addWorksheet("Tasks");

  // Header
  ws.columns = [
    { header: "Title *",      key: "title",       width: 40 },
    { header: "Status",       key: "status",      width: 18 },
    { header: "Priority",     key: "priority",    width: 14 },
    { header: "Type",         key: "type",        width: 18 },
    { header: "Due (YYYY-MM-DD)", key: "due",     width: 18 },
    { header: "Description",  key: "description", width: 50 },
    { header: "Tags (pisah ;)", key: "tags",      width: 30 },
  ];

  // Style header
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getRow(1).height = 22;

  // Contoh baris
  const examples = [
    { title: "Form pelaporan kerusakan aset", status: "backlog", priority: "high",   type: "new_feature",  due: "2026-07-01", description: "User mengisi form laporan kerusakan", tags: "pemeliharaan;form" },
    { title: "Bug login gagal",               status: "todo",    priority: "high",   type: "bug",          due: "",           description: "",                                   tags: "" },
    { title: "Fitur ekspor laporan",          status: "backlog", priority: "medium", type: "enhancement",  due: "2026-08-01", description: "Ekspor ke Excel",                    tags: "ekspor" },
  ];
  examples.forEach((ex) => ws.addRow(ex));

  // Data validation dropdown untuk baris 2–500
  const dvRows = { sqref: "" };
  for (let r = 2; r <= 500; r++) {
    // Status — kolom B
    ws.getCell(`B${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`_ref!$A$1:$A${STATUS_OPTIONS.length}`],
      showErrorMessage: true,
      errorTitle: "Nilai tidak valid",
      error: `Pilih salah satu: ${STATUS_OPTIONS.join(", ")}`,
    };
    // Priority — kolom C
    ws.getCell(`C${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`_ref!$B$1:$B${PRIORITY_OPTIONS.length}`],
      showErrorMessage: true,
      errorTitle: "Nilai tidak valid",
      error: `Pilih salah satu: ${PRIORITY_OPTIONS.join(", ")}`,
    };
    // Type — kolom D
    ws.getCell(`D${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`_ref!$C$1:$C${TYPE_OPTIONS.length}`],
      showErrorMessage: true,
      errorTitle: "Nilai tidak valid",
      error: `Pilih salah satu: ${TYPE_OPTIONS.join(", ")}`,
    };
  }
  void dvRows;

  // Freeze header row
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "import-task-template.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

async function parseXlsx(file: File): Promise<PreviewRow[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const buf = await file.arrayBuffer();
  await wb.xlsx.load(buf);

  const ws = wb.worksheets.find((s) => s.name !== "_ref");
  if (!ws) return [];

  const headerRow = ws.getRow(1).values as (string | undefined)[];
  const headers = headerRow.map((h) => (h ?? "").toString().toLowerCase().replace(/\s*\*$/, "").trim());

  const col = (name: string) => headers.indexOf(name);
  const titleCol   = col("title");
  const statusCol  = col("status");
  const priorityCol = col("priority");
  const typeCol    = col("type");
  const dueCol     = col("due (yyyy-mm-dd)");
  const descCol    = col("description");
  const tagsCol    = col("tags (pisah ;)");

  if (titleCol === -1) return [];

  const rows: PreviewRow[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = row.values as (unknown)[];
    const get = (idx: number) => idx >= 0 ? String(vals[idx] ?? "").trim() : "";

    const title = get(titleCol);
    if (!title) return;

    const errors: string[] = [];
    const statusRaw   = get(statusCol).toLowerCase();
    const priorityRaw = get(priorityCol).toLowerCase();
    const typeRaw     = get(typeCol).toLowerCase().replace(/\s+/g, "_");

    if (statusRaw && !STATUS_OPTIONS.includes(statusRaw))     errors.push(`Status "${statusRaw}" tidak valid`);
    if (priorityRaw && !PRIORITY_OPTIONS.includes(priorityRaw)) errors.push(`Priority "${priorityRaw}" tidak valid`);
    if (typeRaw && !TYPE_OPTIONS.includes(typeRaw))           errors.push(`Type "${typeRaw}" tidak valid`);

    // Due bisa berupa Date object dari Excel atau string
    let dueStr = "";
    const rawDue = vals[dueCol];
    if (rawDue instanceof Date) {
      dueStr = rawDue.toISOString().slice(0, 10);
    } else if (dueCol >= 0 && rawDue) {
      dueStr = String(rawDue).trim();
      if (dueStr && Number.isNaN(new Date(dueStr).getTime())) errors.push("Format tanggal tidak valid");
    }

    rows.push({
      rowNum: rowNumber,
      title,
      status:      statusRaw || "backlog",
      priority:    priorityRaw || "medium",
      type:        typeRaw || "task",
      due:         dueStr,
      description: get(descCol),
      tags:        get(tagsCol),
      errors,
    });
  });

  return rows;
}

type PreviewRow = {
  rowNum: number;
  title: string;
  status: string;
  priority: string;
  type: string;
  due: string;
  description: string;
  tags: string;
  errors: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
};

export function ImportTaskDialog({ open, onClose, projectId }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [hasFile, setHasFile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);

  const validRows = preview.filter((r) => r.errors.length === 0);
  const errorRows = preview.filter((r) => r.errors.length > 0);

  async function loadFile(file: File) {
    const isXlsx = file.name.endsWith(".xlsx") || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (!isXlsx) {
      toast.error("Hanya file .xlsx yang didukung");
      return;
    }
    const rows = await parseXlsx(file);
    if (rows.length === 0) {
      toast.error("Tidak ada data ditemukan atau kolom Title tidak ada");
      return;
    }
    setFileName(file.name);
    setHasFile(true);
    setPreview(rows);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void loadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void loadFile(file);
  }

  async function handleDownloadTemplate() {
    setTemplateLoading(true);
    try { await generateTemplate(); }
    finally { setTemplateLoading(false); }
  }

  function reset() {
    setHasFile(false);
    setFileName("");
    setPreview([]);
  }

  const importMutation = useMutation({
    mutationFn: async () => {
      const rows = validRows.map((r) => ({
        title:       r.title,
        status:      r.status,
        priority:    r.priority,
        type:        r.type,
        due:         r.due || undefined,
        description: r.description || undefined,
        tags:        r.tags || undefined,
      }));
      const res = await api.post<{ imported: number; skipped: number }>("/api/tasks/import/csv", { projectId, rows });
      return res.data;
    },
    onSuccess: async (data) => {
      toast.success(`${data.imported} task berhasil diimport${data.skipped > 0 ? `, ${data.skipped} baris dilewati` : ""}`);
      await qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      reset();
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Gagal mengimport task");
    },
  });

  function handleClose() {
    if (importMutation.isPending) return;
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90vh] sm:w-[60vw] sm:max-w-[60vw] sm:rounded-xl">
        <DialogHeader className="border-b px-4 pt-5 pb-4 sm:px-6 sm:pt-6">
          <DialogTitle>Import Task dari Excel</DialogTitle>
          <DialogDescription>
            Upload file <strong>.xlsx</strong> untuk membuat banyak task sekaligus. Kolom{" "}
            <strong>Title</strong> wajib ada.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          {/* Upload zone */}
          {!hasFile ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors cursor-pointer",
                isDragOver ? "border-primary bg-primary/5" : "border-zinc-300 hover:border-zinc-400",
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="size-8 text-zinc-400" />
              <div>
                <p className="font-medium text-zinc-700">Klik atau seret file .xlsx ke sini</p>
                <p className="text-sm text-zinc-500 mt-1">Hanya file .xlsx, maks 10 MB</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={templateLoading}
                onClick={(e) => { e.stopPropagation(); void handleDownloadTemplate(); }}
              >
                <Download className="size-3.5 mr-1.5" />
                {templateLoading ? "Menyiapkan…" : "Download Template Excel"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <FileText className="size-5 text-zinc-500 shrink-0" />
              <span className="flex-1 text-sm font-medium truncate">{fileName}</span>
              <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={importMutation.isPending}>
                Ganti file
              </Button>
            </div>
          )}

          {/* Summary */}
          {preview.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 rounded-md bg-green-50 border border-green-200 px-3 py-1.5 text-sm text-green-700">
                <CheckCircle2 className="size-4" />
                <span><strong>{validRows.length}</strong> baris siap diimport</span>
              </div>
              {errorRows.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm text-amber-700">
                  <AlertCircle className="size-4" />
                  <span><strong>{errorRows.length}</strong> baris akan dilewati</span>
                </div>
              )}
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50">
                    <TableHead className="w-8 text-center">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="w-36">Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row) => (
                    <TableRow key={row.rowNum} className={cn(row.errors.length > 0 && "bg-red-50/60")}>
                      <TableCell className="text-center text-xs text-zinc-400">{row.rowNum}</TableCell>
                      <TableCell className="max-w-[240px] truncate font-medium text-sm">
                        {row.title || <span className="italic text-zinc-400">(kosong)</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{row.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{row.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-600">{row.type}</TableCell>
                      <TableCell className="text-xs text-zinc-600">{row.due || "—"}</TableCell>
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <ul className="space-y-0.5">
                            {row.errors.map((e, i) => (
                              <li key={i} className="flex items-start gap-1 text-[11px] text-red-600">
                                <AlertCircle className="size-3 mt-0.5 shrink-0" />{e}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-[11px] text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> OK
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t px-4 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={handleClose} disabled={importMutation.isPending}>
            Batal
          </Button>
          <Button
            type="button"
            disabled={validRows.length === 0 || importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            {importMutation.isPending ? "Mengimport…" : `Import ${validRows.length} Task`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
