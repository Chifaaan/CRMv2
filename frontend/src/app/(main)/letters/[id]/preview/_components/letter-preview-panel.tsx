import Link from "next/link";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, PenLine, Printer } from "lucide-react";
import { LETTER_STATUS_LABELS, LETTER_TYPE_LABELS } from "@/lib/letter-constants";
import type { LetterDetail } from "../../../types";

export const LetterPreviewPanel = ({ letter }: { letter: LetterDetail }) => (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-l bg-card p-6 xl:w-80">
      <h2 className="mb-6 text-lg font-semibold">Detail & Tindakan</h2>

      <div className="mb-8 space-y-4">
        <div className="rounded-2xl border bg-background p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Nomor Surat
          </p>
          <p className="font-semibold text-primary">{letter.number}</p>
        </div>
        <div className="rounded-2xl border bg-background p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Status Dokumen
          </p>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <Badge variant="outline">
              {LETTER_STATUS_LABELS[letter.status] ?? letter.status}
            </Badge>
          </div>
        </div>
        <div className="rounded-2xl border bg-background p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Tipe Surat
          </p>
          <p className="text-sm font-medium">
            {LETTER_TYPE_LABELS[letter.letterType] ?? letter.letterType}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => window.open(`/api/letters/${letter.id}/pdf`, "_blank")}
            className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium text-muted-foreground"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <a
            href={`/api/letters/${letter.id}/pdf?download=1`}
            className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium text-muted-foreground"
          >
            <Download className="h-4 w-4" />
            PDF
          </a>
        </div>

        <div className="border-t pt-4">
          {letter.capabilities.canEdit ? <Button
            nativeButton={false}
            render={<Link href={`/letters/${letter.id}/edit`} />}
            variant="ghost"
            className="w-full"
          >
            <PenLine className="h-4 w-4" />
            Kembali Edit
          </Button> : null}
        </div>
      </div>

      <div className="mt-auto pt-8">
        <div className="flex items-start gap-3 rounded-2xl border bg-background/80 p-4">
          <Info className="mt-0.5 h-5 w-5 text-primary" />
          <p className="text-sm leading-5 text-muted-foreground">
            Dokumen ini akan dikunci setelah finalisasi. Pastikan semua data
            sudah benar.
          </p>
        </div>
      </div>
    </aside>
);
