import Link from "next/link";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LETTER_STATUS_LABELS } from "@/lib/letter-constants";
import type { LetterDetail } from "../../../types";

export const EditLetterPageHeader = ({ letter }: { letter: LetterDetail }) => (
  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
    <div>
      <nav className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/letters" className="hover:text-primary">
          Pencatatan Surat
        </Link>
        <span>/</span>
        <Link href={`/letters/${letter.id}`} className="hover:text-primary">
          Detail Surat
        </Link>
        <span>/</span>
        <span className="font-semibold text-primary">Edit Surat</span>
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl">
          Edit Surat
        </h2>
        <Badge
          variant="outline"
          className="border-slate-200 bg-slate-50 text-slate-700"
        >
          {LETTER_STATUS_LABELS[letter.status] ?? letter.status}
        </Badge>
        <span className="text-sm text-muted-foreground">{letter.number}</span>
      </div>
    </div>
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        nativeButton={false}
        render={<Link href={`/letters/${letter.id}`} />}
        variant="outline"
        size="lg"
      >
        Kembali
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
    </div>
  </div>
);
