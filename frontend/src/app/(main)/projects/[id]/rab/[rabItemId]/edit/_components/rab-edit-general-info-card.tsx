"use client";

import { useEffect } from "react";
import { GitBranch, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RabWorkItem } from "../../../types";
import { useRabEditStore } from "../store";

export const RabEditGeneralInfoCard = ({ item }: { item: RabWorkItem }) => {
  const {
    rabAmount,
    name,
    rapAmount,
    seedItem,
    setConvertedAmount,
    setName,
    setRapAmount,
    setUseDetails,
    useDetails,
  } = useRabEditStore();

  useEffect(() => {
    seedItem(item);
  }, [item, seedItem]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-zinc-950">
        <Info className="size-4 text-blue-700" />
        Informasi Umum
      </h3>
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Nama Item Pekerjaan *
            </span>
            <Input
              className="h-11 bg-white text-sm"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Nilai RAP (biaya pelaksanaan)
            </span>
            <div className="relative">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-zinc-500">
                Rp
              </span>
              <Input
                className="h-11 bg-white pl-10 text-sm"
                value={rapAmount}
                onChange={(event) => setRapAmount(event.target.value)}
              />
            </div>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Nilai RAB (harga kontrak)
            </span>
            <div className="relative">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-zinc-500">
                Rp
              </span>
              <Input
                className="h-11 bg-zinc-50 pl-10 text-sm font-semibold text-blue-700"
                value={rabAmount}
                onChange={(event) => setConvertedAmount(event.target.value)}
              />
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center gap-3">
            <GitBranch className="size-5 text-blue-700" />
            <div>
              <p className="text-sm font-semibold text-zinc-950">
                Gunakan Detail Item Pekerjaan
              </p>
              <p className="text-xs text-zinc-500">
                Breakdown item ini menjadi sub-tugas yang lebih kecil
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-pressed={useDetails}
            aria-label="Toggle detail item pekerjaan"
            onClick={() => setUseDetails(!useDetails)}
            className="relative inline-flex h-6 w-11 rounded-full bg-zinc-300 transition-colors aria-pressed:bg-blue-600"
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
                useDetails && "translate-x-5",
              )}
            />
          </button>
        </div>
      </div>
    </section>
  );
};
