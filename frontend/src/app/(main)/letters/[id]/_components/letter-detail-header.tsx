"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eye,
  FilePenLine,
  Pencil,
  Printer,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LETTER_STATUS_LABELS } from "@/lib/letter-constants";
import type { LetterDetail } from "../../types";
import {
  decideLetter,
  deleteLetterDetail,
  duplicateLetterDetail,
} from "../action";

export const LetterDetailHeader = ({ letter }: { letter: LetterDetail }) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const decide = (decision: string) => {
    const decisionNote =
      decision === "approved"
        ? note
        : window.prompt(
            decision === "rejected"
              ? "Alasan penolakan:"
              : "Catatan revisi:",
            note,
          );
    if (decision !== "approved" && !decisionNote?.trim()) return;
    startTransition(async () => {
      try {
        await decideLetter(letter.id, {
          decision,
          note: decisionNote?.trim() || undefined,
        });
        router.refresh();
      } catch {
        window.alert("Keputusan gagal diproses.");
      }
    });
  };

  return (
  <div className="space-y-6">
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/letters" className="hover:text-primary">
        Daftar Surat
      </Link>
      <span>/</span>
      <span className="font-semibold text-primary">Detail Surat</span>
    </nav>
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            No: {letter.number}
          </span>
          <Badge variant="outline">
            {LETTER_STATUS_LABELS[letter.status] ?? letter.status}
          </Badge>
          <span className="text-sm text-muted-foreground">{letter.id}</span>
        </div>
        <div>
          <h2 className="max-w-4xl text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl">
            {letter.subject}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {letter.internalNote ?? `Surat dari unit ${letter.unit}.`}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          nativeButton={false}
          render={<Link href="/letters" />}
          variant="outline"
          size="lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                const duplicate = await duplicateLetterDetail(letter.id);
                router.push(`/letters/${duplicate.id}/edit`);
              } catch {
                window.alert("Surat gagal diduplikasi.");
              }
            })
          }
        >
          <Copy className="h-4 w-4" />
          Duplikasi
        </Button>
        {letter.capabilities.canEdit ? <Button
          nativeButton={false}
          render={<Link href={`/letters/${letter.id}/edit`} />}
          variant="outline"
          size="lg"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button> : null}
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => window.open(`/api/letters/${letter.id}/pdf`, "_blank")}
        >
          <Printer className="h-4 w-4" />
          Cetak PDF
        </Button>
        <Button
          nativeButton={false}
          render={<Link href={`/letters/${letter.id}/preview`} />}
          variant="outline"
          size="lg"
        >
          <Eye className="h-4 w-4" />
          Preview
        </Button>
        {letter.capabilities.canDecide ? <>
        <Button
          type="button"
          size="lg"
          disabled={pending}
          onClick={() => decide("approved")}
        >
          <CheckCircle2 className="h-4 w-4" />
          Setujui Surat
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={pending}
          onClick={() => decide("revision_requested")}
        >
          <FilePenLine className="h-4 w-4" />
          Revisi
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="lg"
          disabled={pending}
          onClick={() => decide("rejected")}
        >
          <XCircle className="h-4 w-4" />
          Tolak
        </Button>
        </> : null}
        {letter.capabilities.canDelete ? (
          <Button
            type="button"
            variant="destructive"
            size="lg"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Hapus draft surat ini?")) return;
              startTransition(async () => {
                try {
                  await deleteLetterDetail(letter.id);
                  router.push("/letters");
                } catch {
                  window.alert("Draft gagal dihapus.");
                }
              });
            }}
          >
            Hapus Draft
          </Button>
        ) : null}
      </div>
    </div>
    {letter.capabilities.canDecide ? (
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Catatan approval opsional..."
        className="min-h-20 w-full rounded-lg border bg-background p-3 text-sm"
      />
    ) : null}
  </div>
  );
};
