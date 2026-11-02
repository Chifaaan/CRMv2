import { FileText } from "lucide-react";

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <div className="border-t pt-4 first:border-t-0 first:pt-0">
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
  </div>
);

export const AddLetterSummary = () => (
  <aside className="h-fit rounded-2xl border bg-card/90 p-6 shadow-sm xl:sticky xl:top-20">
    <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
      <FileText className="h-5 w-5 text-primary" />
      Ringkasan Surat
    </h3>
    <div className="space-y-4">
      <SummaryItem
        label="Kategori & Jenis"
        value="Diisi melalui formulir"
      />
      <SummaryItem label="Nomor Surat" value="Dibuat saat draft disimpan" />
      <SummaryItem label="Tanggal Penerbitan" value="Mengikuti tanggal surat" />
      <div className="border-t pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Pemohon
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
            ?
          </div>
          <p className="text-sm font-semibold">Pilih requester</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t pt-4">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Status
        </span>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
          Draft
        </span>
      </div>
    </div>
  </aside>
);
