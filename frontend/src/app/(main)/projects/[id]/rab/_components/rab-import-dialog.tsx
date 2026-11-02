"use client";

import { CheckCircle2, Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  downloadRabTemplate,
  importRabFromFile,
  type RabImportResult,
} from "../action";
import { useRabPageStore } from "../store";

const IMPORT_STEPS = [
  "Salin data RAP/RAB Anda ke template ini, jangan unggah file asli.",
  "Satu baris untuk satu rincian. Jangan buat baris subtotal.",
  "Import mengganti seluruh rekap RAB proyek, bukan menambahkan.",
] as const;

export const RabImportDialog = ({
  summary,
}: {
  summary?: { items: number; groups: number; details: number };
}) => {
  const { importFile, importOpen, setImportFile, setImportOpen } =
    useRabPageStore();

  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "";
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<RabImportResult | null>(null);

  const closeDialog = () => {
    setImportFile(null);
    setResult(null);
    setConfirmed(false);
    setImportOpen(false);
  };

  const handleTemplate = async () => {
    try {
      setBusy(true);
      const base64 = await downloadRabTemplate(projectId);
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "simpro-rab-import-template.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Gagal mengunduh template.");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setBusy(true);
    setResult(null);
    const formData = new FormData();
    formData.append("file", importFile);
    try {
      const response = await importRabFromFile(projectId, formData);
      setResult(response);
      if (response.imported) {
        toast.success(
          `Import berhasil: ${response.itemCount} item pekerjaan dari ${response.totalRows} baris.`,
        );
        closeDialog();
        return;
      }
      toast.error("Import ditolak. Perbaiki baris yang ditandai.");
    } catch {
      toast.error("Import gagal dijalankan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={importOpen}
      onOpenChange={(open) => {
        if (open) {
          setImportOpen(true);
          return;
        }
        closeDialog();
      }}
    >
      <DialogContent
        className="gap-0 overflow-hidden border-zinc-200 p-0 sm:max-w-xl"
        showCloseButton
      >
        <DialogHeader className="border-b border-zinc-100 px-5 py-4 text-left">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-950">
                Import RAB
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-zinc-500">
                Unggah file Excel atau CSV untuk menyiapkan item pekerjaan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-5 py-5">
          <section className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950">
                  Template import
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Pakai template agar kolom terbaca konsisten.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-zinc-200 bg-white"
                onClick={handleTemplate}
                disabled={busy}
              >
                <Download className="size-4" />
                Download template
              </Button>
            </div>
            <ul className="grid gap-2 text-xs font-medium text-zinc-600">
              {IMPORT_STEPS.map((step, index) => (
                <li key={step} className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-zinc-700 ring-1 ring-zinc-200">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <label
              htmlFor="rab-import-file"
              className="mb-2 block text-sm font-semibold text-zinc-900"
            >
              File RAB
            </label>
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-4 transition-colors hover:border-zinc-400">
              <label
                htmlFor="rab-import-file"
                className="flex cursor-pointer flex-col items-center justify-center gap-3 text-center"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                  {importFile ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <UploadCloud className="size-5" />
                  )}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-zinc-950">
                    {importFile?.name ?? "Pilih file atau drag ke area ini"}
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    .xlsx, .xls, .csv sampai 2MB
                  </span>
                </span>
                <span className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100">
                  Browse file
                </span>
              </label>
              <input
                id="rab-import-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={(event) => {
                  setImportFile(event.target.files?.[0] ?? null);
                }}
              />
            </div>
          </section>
          <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <h3 className="text-sm font-semibold text-amber-900">
              Import mengganti seluruh rekap proyek
            </h3>
            <p className="mt-1 text-xs text-amber-800">
              Struktur, harga RAB, harga RAP, dan item bertanda RAP-saja akan
              dihapus lalu diganti isi berkas. Ini bukan penambahan.
            </p>
            {summary && summary.items > 0 ? (
              <p className="mt-2 text-xs font-semibold text-amber-900">
                Rekap saat ini berisi {summary.items} item pekerjaan,{" "}
                {summary.groups} kelompok, dan {summary.details} rincian —
                semuanya akan terhapus.
              </p>
            ) : null}
            <label className="mt-3 flex items-start gap-2 text-xs text-amber-900">
              <input
                type="checkbox"
                className="mt-0.5 size-3.5"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              Saya mengerti rekap lama akan diganti.
            </label>
          </section>

          {result && !result.imported && result.errors.length > 0 ? (
            <section className="rounded-2xl border border-red-200 bg-red-50/70 p-4">
              <h3 className="text-sm font-semibold text-red-900">
                {result.errors.length} baris perlu diperbaiki
              </h3>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-red-800">
                {result.errors.map((error) => (
                  <li key={`${error.row}-${error.message}`}>
                    {error.row > 0 ? `Baris ${error.row}: ` : ""}
                    {error.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <DialogFooter className="m-0 rounded-none border-t border-zinc-100 bg-zinc-50/70 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="border-zinc-200 bg-white"
            onClick={closeDialog}
          >
            Batal
          </Button>
          <Button
            type="button"
            className="bg-zinc-950 text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500"
            disabled={!importFile || busy || !confirmed}
            onClick={handleImport}
          >
            <UploadCloud className="size-4" />
            {busy ? "Memproses..." : "Mulai import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
