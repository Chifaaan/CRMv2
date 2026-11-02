"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  /** Whether an upload is in progress */
  busy?: boolean;
  /** Called when files are selected via drag-drop or browse */
  onFiles: (files: File[]) => void;
  /** Accepted MIME types / extensions, e.g. "image/*,.pdf" */
  accept?: string;
  /** Secondary hint text */
  hint?: string;
  /** Primary action text when idle */
  label?: string;
  className?: string;
  /** Allow multiple files (default true) */
  multiple?: boolean;
}

export function FileDropZone({
  busy = false,
  onFiles,
  accept,
  hint = "PDF, gambar, dokumen — bisa pilih beberapa sekaligus",
  label = "Seret file ke sini atau klik untuk memilih",
  className,
  multiple = true,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !busy && inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
        dragging
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50",
        busy && "pointer-events-none opacity-60",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <Upload className="h-6 w-6 text-muted-foreground" />
      )}
      <div>
        <p className="text-sm font-medium text-foreground">
          {busy ? "Mengunggah…" : label}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </div>
  );
}
