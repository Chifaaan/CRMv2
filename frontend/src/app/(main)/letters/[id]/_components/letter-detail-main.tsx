"use client";

import {
  CheckCircle2,
  Circle,
  Clock3,
  FileSpreadsheet,
  FileText,
  PauseCircle,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  LETTER_CATEGORY_LABELS,
  LETTER_SECURITY_LABELS,
  LETTER_STATUS_LABELS,
  LETTER_TYPE_LABELS,
} from "@/lib/letter-constants";
import type { LetterDetail } from "../../types";
import { removeLetterAttachment } from "../action";

const SectionTitle = ({ id, title }: { id: string; title: string }) => (
  <div id={id} className="scroll-mt-24">
    <div className="mb-4 flex items-center gap-2">
      <div className="h-6 w-1.5 rounded-full bg-primary" />
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    </div>
  </div>
);

const MetadataItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {label}
    </p>
    <p className="text-sm font-medium text-foreground">{value}</p>
  </div>
);

const approvalStatusMeta: Record<
  string,
  {
    label: string;
    containerClassName: string;
    iconClassName: string;
    icon: typeof Circle;
  }
> = {
  approved: {
    label: "DISETUJUI",
    containerClassName: "border-emerald-200 bg-emerald-50 text-emerald-900",
    iconClassName: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  active: {
    label: "MENUNGGU",
    containerClassName: "border-primary/40 bg-primary/5 text-foreground",
    iconClassName: "bg-amber-100 text-amber-700",
    icon: Clock3,
  },
  queued: {
    label: "ANTRIAN",
    containerClassName: "border-border bg-card text-muted-foreground opacity-60",
    iconClassName: "bg-muted text-muted-foreground",
    icon: Circle,
  },
  revision_requested: {
    label: "REVISI",
    containerClassName: "border-violet-200 bg-violet-50 text-violet-900",
    iconClassName: "bg-violet-100 text-violet-700",
    icon: PauseCircle,
  },
  rejected: {
    label: "DITOLAK",
    containerClassName: "border-red-200 bg-red-50 text-red-900",
    iconClassName: "bg-red-100 text-red-700",
    icon: XCircle,
  },
};

const formatBytes = (size: number | null) => {
  if (size == null) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const LetterDetailMain = ({ letter }: { letter: LetterDetail }) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
  <div className="space-y-12">
    <section>
      <SectionTitle id="informasi-surat" title="Informasi Surat" />
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h4 className="mb-5 font-semibold">Metadata Detail</h4>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <MetadataItem
              label="Klasifikasi"
              value={LETTER_TYPE_LABELS[letter.letterType] ?? letter.letterType}
            />
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Derajat Keamanan
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                {LETTER_SECURITY_LABELS[letter.security] ?? letter.security}
              </span>
            </div>
            <MetadataItem label="Unit Pengirim" value={letter.unit} />
            <MetadataItem label="Tujuan Utama" value={letter.recipient} />
            <MetadataItem
              label="Kategori"
              value={LETTER_CATEGORY_LABELS[letter.category] ?? letter.category}
            />
            <MetadataItem
              label="Status"
              value={LETTER_STATUS_LABELS[letter.status] ?? letter.status}
            />
            <div className="md:col-span-2">
              <MetadataItem label="Tembusan" value={letter.cc ?? "-"} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h4 className="mb-3 font-semibold">Ringkasan Isi</h4>
          <p className="whitespace-pre-line text-sm leading-7 text-foreground">
            {letter.body
              .replace(/<br\s*\/?>/gi, "\n")
              .replace(/<\/p>/gi, "\n")
              .replace(/<[^>]+>/g, "")
              .trim()}
          </p>
        </div>
      </div>
    </section>

    <section>
      <SectionTitle id="dokumen" title="Dokumen Lampiran" />
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead className="px-6 py-4 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Nama File
              </TableHead>
              <TableHead className="px-6 py-4 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Ukuran
              </TableHead>
              <TableHead className="px-6 py-4 text-right text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {letter.attachments.map((attachment) => {
              const Icon = attachment.mimeType?.includes("spreadsheet")
                ? FileSpreadsheet
                : FileText;

              return (
                <TableRow key={attachment.id}>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">{attachment.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.mimeType ?? "Lampiran"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm">
                    {formatBytes(attachment.size)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        nativeButton={false}
                        render={
                          <a
                            href={`/api/upload/file/letters/${attachment.url.split("/").at(-1)}`}
                          />
                        }
                        variant="link"
                        className="px-0"
                      >
                        Download
                      </Button>
                      {letter.capabilities.canEdit ? (
                        <Button
                          type="button"
                          variant="link"
                          className="px-0 text-destructive"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              try {
                                await removeLetterAttachment(
                                  letter.id,
                                  attachment.id,
                                );
                                router.refresh();
                              } catch {
                                window.alert("Lampiran gagal dihapus.");
                              }
                            })
                          }
                        >
                          Hapus
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {letter.attachments.length === 0 ? (
          <div className="border-t bg-muted/20 p-5 text-center text-sm text-muted-foreground">
            Belum ada lampiran.
          </div>
        ) : null}
      </div>
    </section>

    <section>
      <SectionTitle id="approval" title="Alur Persetujuan" />
      <div className="space-y-3 rounded-2xl border bg-card p-6 shadow-sm">
        {letter.approvals.map((step) => {
          const meta = approvalStatusMeta[step.status] ?? approvalStatusMeta.queued;
          const Icon = meta.icon;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center justify-between rounded-xl border p-4",
                meta.containerClassName,
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    meta.iconClassName,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{step.user.name}</p>
                  <p className="text-sm opacity-75">
                    {step.user.position ?? step.user.email}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.12em]">
                {meta.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>

    <section className="pb-12">
      <SectionTitle id="riwayat" title="Riwayat Aktivitas" />
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="space-y-9 border-l-2 border-border pl-8">
          {[
            ...letter.activities.map((activity) => ({
              id: activity.id,
              decision: activity.action,
              note: null as string | null,
              createdAt: activity.createdAt,
              actor: { name: activity.actorName },
              step: { order: 0 },
            })),
            ...letter.actions,
          ].length > 0
            ? [
                ...letter.activities.map((activity) => ({
                  id: activity.id,
                  decision: activity.action,
                  note: null as string | null,
                  createdAt: activity.createdAt,
                  actor: { name: activity.actorName },
                  step: { order: 0 },
                })),
                ...letter.actions,
              ]
                .sort(
                  (first, second) =>
                    new Date(second.createdAt).getTime() -
                    new Date(first.createdAt).getTime(),
                )
                .map((activity) => (
            <div key={activity.id} className="relative">
              <span className="absolute -left-[41px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
              <div>
                <p className="font-semibold">
                  {LETTER_STATUS_LABELS[activity.decision] ?? activity.decision}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.step.order > 0
                    ? `Tahap ${activity.step.order} oleh `
                    : "Oleh "}
                  {activity.actor.name} ·{" "}
                  {new Date(activity.createdAt).toLocaleString("id-ID")}
                </p>
                {activity.note ? (
                  <div className="mt-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    {activity.note}
                  </div>
                ) : null}
              </div>
            </div>
          ))
            : (
            <p className="text-sm text-muted-foreground">
              Belum ada keputusan approval.
            </p>
          )}
        </div>
      </div>
    </section>
  </div>
  );
};
