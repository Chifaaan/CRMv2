import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const AddLetterPageHeader = () => (
  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
    <div>
      <nav className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/letters" className="hover:text-primary">
          Pencatatan Surat
        </Link>
        <span>/</span>
        <span className="font-semibold text-primary">Buat Surat</span>
      </nav>
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl">
          Buat Surat
        </h2>
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
          Draft
        </Badge>
      </div>
    </div>
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        nativeButton={false}
        render={<Link href="/letters" />}
        variant="outline"
        size="lg"
      >
        Kembali
      </Button>
    </div>
  </div>
);
