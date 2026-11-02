"use client";

import { FileSpreadsheet, PlusCircle, Wand2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deriveRap } from "../action";
import { useRabPageStore } from "../../rab/store";

export const RapPageHeader = ({
  projectId,
  hasItems,
}: {
  projectId: string;
  hasItems: boolean;
}) => {
  const [pending, startTransition] = useTransition();
  const setImportOpen = useRabPageStore((state) => state.setImportOpen);

  const handleDerive = (overwrite: boolean) => {
    startTransition(async () => {
      try {
        const result = await deriveRap(projectId, overwrite);
        if (result.updated === 0) {
          toast.info("Semua rincian sudah punya harga RAP.");
          return;
        }
        toast.success(
          `${result.updated} harga RAP disalin dari RAB. Sesuaikan di tabel di bawah.`,
        );
      } catch {
        toast.error("Gagal menyusun RAP dari RAB.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h2 className="text-xl font-bold text-zinc-950">
          Rencana Anggaran Pelaksanaan
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Biaya pelaksanaan internal. Struktur dan volume mengikuti RAB dan
          tidak bisa diubah di sini — yang disesuaikan hanya harga satuan RAP.
          Halaman ini tidak terlihat oleh role viewer dan client.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleDerive(false)}
          disabled={pending || !hasItems}
        >
          <Wand2 className="size-4" />
          {pending ? "Menyusun..." : "Susun RAP dari RAB"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setImportOpen(true)}
        >
          <FileSpreadsheet className="size-4" />
          Import Rekap (RAB + RAP)
        </Button>
        <Link
          href={`/projects/${projectId}/rap/add`}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-3 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-zinc-800"
        >
          <PlusCircle className="size-4" />
          Tambah Item
        </Link>
        <Link
          href={`/projects/${projectId}/rab`}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Buka RAB
        </Link>
      </div>
    </div>
  );
};
