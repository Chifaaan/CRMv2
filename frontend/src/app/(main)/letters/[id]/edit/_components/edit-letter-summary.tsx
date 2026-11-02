import { FileText } from "lucide-react";
import {
  LETTER_CATEGORY_LABELS,
  LETTER_STATUS_LABELS,
  LETTER_TYPE_LABELS,
} from "@/lib/letter-constants";
import type { LetterDetail } from "../../../types";

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <div className="border-t pt-4 first:border-t-0 first:pt-0">
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
  </div>
);

export const EditLetterSummary = ({ letter }: { letter: LetterDetail }) => (
  <aside className="h-fit rounded-2xl border bg-card/90 p-6 shadow-sm xl:sticky xl:top-20">
    <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
      <FileText className="h-5 w-5 text-primary" />
      Ringkasan Surat
    </h3>
    <div className="space-y-4">
      <SummaryItem label="ID Surat" value={letter.id} />
      <SummaryItem
        label="Kategori & Jenis"
        value={`${LETTER_CATEGORY_LABELS[letter.category] ?? letter.category} - ${
          LETTER_TYPE_LABELS[letter.letterType] ?? letter.letterType
        }`}
      />
      <SummaryItem label="Nomor Surat" value={letter.number} />
      <SummaryItem
        label="Tanggal Penerbitan"
        value={new Date(letter.letterDate).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })}
      />
      <div className="border-t pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Pemohon
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
            {letter.requesterName
              .split(/\s+/)
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <p className="text-sm font-semibold">
            {letter.requesterName}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t pt-4">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Status
        </span>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {LETTER_STATUS_LABELS[letter.status] ?? letter.status}
        </span>
      </div>
    </div>
  </aside>
);
