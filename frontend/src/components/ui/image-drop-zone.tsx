"use client";

import { useRef, useState } from "react";
import { ImageUp } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ImageDropZoneProps {
  /** Current image URL or object-URL preview */
  preview: string | null;
  /** Fallback text shown when there is no preview */
  initials: string;
  /** Called when the user selects or drops a new image */
  onFile: (file: File) => void;
  /** Called when the user clicks Remove */
  onRemove?: () => void;
  /** Show the Remove button */
  canRemove?: boolean;
  /** Circle (avatar) or square (logo/banner) */
  shape?: "circle" | "square";
  /** Width and height in px */
  size?: number;
  /** Friendly label used in overlay text, e.g. "foto", "logo" */
  label?: string;
  /** Hint text under the drop zone */
  hint?: string;
  className?: string;
}

export function ImageDropZone({
  preview,
  initials,
  onFile,
  onRemove,
  canRemove = true,
  shape = "circle",
  size = 80,
  label = "gambar",
  hint = "JPG, PNG, atau WebP.",
  className,
}: ImageDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    onFile(file);
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      {/* Drop zone — the image itself is the target */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Unggah ${label}`}
        style={{ width: size, height: size }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={cn(
          "group relative shrink-0 cursor-pointer overflow-hidden border-2",
          shape === "circle" ? "rounded-full" : "rounded-lg",
          dragging ? "border-primary" : "border-border",
          "bg-primary/10",
        )}
      >
        {preview ? (
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-lg font-semibold text-primary">
            {initials}
          </div>
        )}

        {/* Hover / drag overlay */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 transition-opacity",
            dragging ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <ImageUp className="h-5 w-5 text-white" />
          <span className="px-1 text-center text-[10px] font-medium leading-tight text-white">
            {dragging ? "Lepas untuk unggah" : `Ubah ${label}`}
          </span>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Hints + remove */}
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">{hint}</p>
        <p className="text-muted-foreground text-xs">
          Seret ke area gambar atau klik untuk memilih.
        </p>
        {canRemove && preview && onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-fit px-2 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            Hapus
          </Button>
        ) : null}
      </div>
    </div>
  );
}
