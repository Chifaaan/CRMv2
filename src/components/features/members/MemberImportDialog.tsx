"use client";

import { Download, Upload } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { api } from "@/lib/api/client";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File) => void;
  importing?: boolean;
};

export function MemberImportDialog({
  open,
  onOpenChange,
  onImport,
  importing = false,
}: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelectedFile(null);
    }
    onOpenChange(next);
  }

  async function downloadTemplate() {
    setDownloading(true);
    try {
      const res = await api.get("/api/users/import/template", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "simpro-users-import-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(90vh,640px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="border-border shrink-0 space-y-2 border-b px-6 pt-6 pb-5">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Import Member
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pb-0.5 text-sm leading-relaxed">
            Unggah file Excel (.xlsx) untuk menambahkan member secara massal.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-y-contain px-6 pt-5 pb-6">
          <div className="bg-muted/40 text-muted-foreground space-y-2 rounded-lg border px-4 py-3 text-sm leading-relaxed">
            <p className="text-foreground font-medium">Cara import:</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Unduh template Excel, lalu isi data member.</li>
              <li>
                Kolom <strong>Role</strong> dan <strong>Company</strong> gunakan
                dropdown agar nilainya konsisten. Company non-client dari{" "}
                <strong>Kelola Company</strong>; role client dari master Client.
              </li>
              <li>
                Password default: <strong>123123123</strong>. Status bawaan:{" "}
                <strong>inactive</strong>.
              </li>
              <li>Unggah file .xlsx yang sudah diisi, lalu klik Import.</li>
            </ol>
          </div>

          <FileDropZone
            busy={importing}
            multiple={false}
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            label="Seret file .xlsx ke sini atau klik untuk memilih"
            hint={
              selectedFile
                ? `File dipilih: ${selectedFile.name}`
                : "Hanya format Excel .xlsx"
            }
            onFiles={(files) => setSelectedFile(files[0] ?? null)}
          />

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={downloading}
            onClick={() => void downloadTemplate()}
          >
            <Download className="size-4" />
            {downloading ? "Mengunduh…" : "Unduh Template"}
          </Button>
        </div>

        <DialogFooter className="border-border bg-muted/30 mx-0 mb-0 shrink-0 border-t px-6 pt-5 pb-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-10 w-full sm:w-auto"
            disabled={importing}
            onClick={() => handleOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            type="button"
            className="min-h-10 w-full gap-2 sm:w-auto"
            disabled={!selectedFile || importing}
            onClick={() => {
              if (!selectedFile) return;
              onImport(selectedFile);
            }}
          >
            <Upload className="size-4" />
            {importing ? "Mengimpor…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
