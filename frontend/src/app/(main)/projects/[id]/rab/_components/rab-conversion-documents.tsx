"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Table2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { uploadFile } from "@/lib/upload";
import { toDownloadUrl } from "@/lib/attachment-url";
import type { RabDocument, RabDocumentType, RabOverview } from "../types";
import { createRabDocument, updateRabMetadata } from "../action";
import { formatDate } from "./rab-format";

const documentIcon = (document: RabDocument) => {
  if (document.type === "RAB") return Table2;
  return FileText;
};

const documentClassName = (document: RabDocument) =>
  document.type === "RAB" ? "text-emerald-600" : "text-blue-600";

const documentMeta = (document: RabDocument) => {
  const size = document.size ? `${(document.size / 1024 / 1024).toFixed(1)} MB` : "-";
  return `${size} - Diunggah ${formatDate(document.uploadedAt)}`;
};

const documentSlots: Array<{
  type: RabDocumentType;
  title: string;
  empty: string;
}> = [
  {
    type: "RAP",
    title: "Dokumen RAP",
    empty: "Belum ada dokumen RAP.",
  },
  {
    type: "RAB",
    title: "Dokumen RAB",
    empty: "Belum ada dokumen RAB.",
  },
];

export const RabConversionDocuments = ({
  rab,
  variant = "RAB",
}: {
  rab: RabOverview;
  variant?: RabDocumentType;
}) => {
  const slots = documentSlots.filter((slot) => slot.type === variant);
  const router = useRouter();
  const inputRefs = useRef<Record<RabDocumentType, HTMLInputElement | null>>({
    RAP: null,
    RAB: null,
  });
  const [uploadingType, setUploadingType] = useState<RabDocumentType | null>(null);
  const [conversionDate, setConversionDate] = useState(
    rab.conversionDate?.slice(0, 10) ?? "",
  );
  const [savingDate, setSavingDate] = useState(false);

  const latestByType = (type: RabDocumentType) =>
    rab.documents.find((document) => document.type === type);

  const uploadDocument = async (type: RabDocumentType, file: File | null) => {
    if (!file) return;
    setUploadingType(type);
    try {
      const uploaded = await uploadFile(file, "rab");
      await createRabDocument(rab.projectId, {
        type,
        name: uploaded.name,
        url: uploaded.url,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
      });
      router.refresh();
      toast.success("Dokumen RAB diunggah");
    } catch {
      toast.error("Gagal mengunggah dokumen RAB");
    } finally {
      setUploadingType(null);
      const input = inputRefs.current[type];
      if (input) input.value = "";
    }
  };

  const saveConversionDate = async () => {
    const initialDate = rab.conversionDate?.slice(0, 10) ?? "";
    if (conversionDate === initialDate) return;
    setSavingDate(true);
    try {
      await updateRabMetadata(rab.projectId, {
        conversionDate: conversionDate || null,
      });
      router.refresh();
      toast.success("Tanggal konversi disimpan");
    } catch {
      setConversionDate(initialDate);
      toast.error("Gagal menyimpan tanggal konversi");
    } finally {
      setSavingDate(false);
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm xl:col-span-7">
      <h3 className="mb-1 text-base font-bold text-zinc-950">
        Dokumen {variant}
      </h3>
      <p className="mb-6 text-sm text-zinc-500">
        {variant === "RAB"
          ? "Dokumen kontrak yang disepakati dengan owner."
          : "Dokumen anggaran pelaksanaan internal. Tidak terlihat oleh viewer dan client."}
      </p>
      <div className="grid gap-4">
        {slots.map((slot) => {
          const document = latestByType(slot.type);
          const Icon = document ? documentIcon(document) : UploadCloud;
          const uploading = uploadingType === slot.type;

          return (
            <div
              key={slot.type}
              className="flex flex-col items-center rounded-xl border-2 border-dashed border-zinc-200 p-5 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/40"
            >
              <Icon
                className={cn(
                  "mb-2 size-6",
                  document ? documentClassName(document) : "text-zinc-500",
                )}
              />
              <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                {slot.title}
              </span>
              <span className="mt-1 text-sm font-semibold text-zinc-950">
                {document?.name ?? slot.empty}
              </span>
              <span className="mt-1 text-xs text-zinc-500">
                {document ? documentMeta(document) : "PDF, Excel, atau CSV maksimal 10MB"}
              </span>
              <input
                ref={(element) => {
                  inputRefs.current[slot.type] = element;
                }}
                type="file"
                accept=".pdf,.xls,.xlsx,.csv"
                className="sr-only"
                onChange={(event) =>
                  void uploadDocument(slot.type, event.target.files?.[0] ?? null)
                }
              />
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-zinc-200 bg-white"
                  disabled={Boolean(uploadingType)}
                  onClick={() => inputRefs.current[slot.type]?.click()}
                >
                  <UploadCloud className="size-4" />
                  {uploading ? "Mengunggah..." : document ? "Upload versi baru" : "Upload dokumen"}
                </Button>
                {document ? (
                  <a
                    href={toDownloadUrl(document.url)}
                    download={document.name}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "text-blue-600 hover:text-blue-700",
                    )}
                  >
                    <Download className="size-4" />
                    Unduh
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Tanggal Unggah Terakhir
          </p>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            {formatDate(rab.latestUploadDate)}
          </div>
        </div>
        <label className={variant === "RAB" ? "" : "hidden"}>
          <span className="mb-1 block text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Tanggal RAB
          </span>
          <input
            type="date"
            value={conversionDate}
            disabled={savingDate}
            onChange={(event) => setConversionDate(event.target.value)}
            onBlur={() => void saveConversionDate()}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>
    </div>
  );
};
