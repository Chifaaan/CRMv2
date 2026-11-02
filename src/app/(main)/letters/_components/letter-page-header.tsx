"use client";

import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LetterSearchParams } from "../types";

export const LetterPageHeader = ({
  filters,
}: {
  filters: LetterSearchParams;
}) => (
  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Modul Surat
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl">
          Pencatatan Surat
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Kelola dan arsipkan dokumen perusahaan secara sistematis.
        </p>
      </div>
    </div>
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full sm:w-auto"
        onClick={() => {
          const query = new URLSearchParams();
          Object.entries(filters).forEach(([key, value]) => {
            if (value && key !== "page" && key !== "limits") {
              query.set(key, value);
            }
          });
          window.location.href = `/api/letters/export/xlsx?${query.toString()}`;
        }}
      >
        <Download className="h-4 w-4" />
        Export Data
      </Button>
      <Button
        nativeButton={false}
        render={<Link href="/letters/add" />}
        size="lg"
        className="w-full sm:w-auto"
      >
        <Plus className="h-4 w-4" />
        Buat Surat
      </Button>
    </div>
  </div>
);
