"use client";

import { Lock } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "../../rab/_components/rab-format";
import type { RabWorkItem } from "../../rab/types";
import { updateRapUnitPrice } from "../action";

type Row = {
  manualItem: boolean;
  detailId: string;
  groupId: string;
  itemName: string;
  groupName: string;
  detailName: string;
  volume: number | null;
  unit: string | null;
  rabUnitPrice: number | null;
  rapUnitPrice: number | null;
  rabTotalPrice: number | null;
  rapTotalPrice: number | null;
};

const flatten = (workItems: RabWorkItem[]): Row[] =>
  workItems.flatMap((item) =>
    item.groups.flatMap((group) =>
      group.details.map((detail) => ({
        manualItem: item.rapUseDetails === false,
        detailId: detail.id,
        groupId: group.id,
        itemName: item.name,
        groupName: group.name,
        detailName: detail.name,
        volume: detail.volume,
        unit: detail.unit,
        rabUnitPrice: detail.rabUnitPrice,
        rapUnitPrice: detail.rapUnitPrice ?? null,
        rabTotalPrice: detail.rabTotalPrice,
        rapTotalPrice: detail.rapTotalPrice ?? null,
      })),
    ),
  );

export const RapPriceTable = ({
  projectId,
  workItems,
}: {
  projectId: string;
  workItems: RabWorkItem[];
}) => {
  const rows = flatten(workItems);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const commit = (row: Row) => {
    const raw = drafts[row.detailId];
    if (raw === undefined) return;
    const trimmed = raw.trim();
    const parsed = trimmed === "" ? null : Number(trimmed.replace(/[^\d.-]/g, ""));
    if (parsed !== null && !Number.isFinite(parsed)) {
      toast.error("Harga satuan RAP harus berupa angka.");
      return;
    }
    if (parsed === row.rapUnitPrice) return;
    setSaving(row.detailId);
    startTransition(async () => {
      try {
        await updateRapUnitPrice(projectId, row.groupId, row.detailId, parsed);
        setDrafts((current) => {
          const next = { ...current };
          delete next[row.detailId];
          return next;
        });
      } catch {
        toast.error(`Gagal menyimpan harga "${row.detailName}".`);
      } finally {
        setSaving(null);
      }
    });
  };

  const totals = rows.reduce(
    (acc, row) => ({
      rab: acc.rab + (row.rabTotalPrice ?? 0),
      rap: acc.rap + (row.rapTotalPrice ?? 0),
    }),
    { rab: 0, rap: 0 },
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/70 p-5">
        <div>
          <h3 className="text-base font-bold text-zinc-950">
            Penyesuaian Harga RAP
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Ubah harga satuan RAP per rincian. Perubahan tersimpan otomatis saat
            keluar dari kolom. Baris total di bawah menjumlah rincian saja — item
            yang nilainya diisi manual tidak memakai angka ini.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
          <Lock className="size-3" />
          Kolom abu-abu terkunci mengikuti RAB
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-zinc-50">
            <TableRow>
              <TableHead className="px-4 py-3 text-xs font-bold tracking-wide text-zinc-500 uppercase">
                Item / Kelompok / Rincian
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-bold tracking-wide text-zinc-500 uppercase">
                Volume
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-bold tracking-wide text-zinc-500 uppercase">
                Harga RAB
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-bold tracking-wide text-zinc-500 uppercase">
                Harga RAP
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-bold tracking-wide text-zinc-500 uppercase">
                Total RAP
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-bold tracking-wide text-zinc-500 uppercase">
                Margin
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-zinc-500"
                >
                  Belum ada rincian. Susun RAB terlebih dahulu, lalu klik
                  &quot;Susun RAP dari RAB&quot;.
                </TableCell>
              </TableRow>
            ) : null}
            {rows.map((row) => {
              const margin = (row.rabTotalPrice ?? 0) - (row.rapTotalPrice ?? 0);
              return (
                <TableRow key={row.detailId}>
                  <TableCell className="px-4 py-3">
                    <p className="text-sm font-semibold text-zinc-950">
                      {row.detailName}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {row.itemName} · {row.groupName}
                      {row.manualItem ? (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          nilai item diisi manual
                        </span>
                      ) : null}
                    </p>
                  </TableCell>
                  <TableCell className="bg-zinc-50/60 px-4 py-3 text-right font-mono text-sm text-zinc-500">
                    {row.volume ?? "—"} {row.unit ?? ""}
                  </TableCell>
                  <TableCell className="bg-zinc-50/60 px-4 py-3 text-right font-mono text-sm text-blue-700">
                    {formatCurrency(row.rabUnitPrice)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Input
                      aria-label={`Harga satuan RAP ${row.detailName}`}
                      className="h-9 w-36 rounded-lg text-right font-mono"
                      inputMode="decimal"
                      disabled={saving === row.detailId}
                      value={drafts[row.detailId] ?? row.rapUnitPrice ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.detailId]: event.target.value,
                        }))
                      }
                      onBlur={() => commit(row)}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-mono text-sm">
                    {formatCurrency(row.rapTotalPrice)}
                  </TableCell>
                  <TableCell
                    className={`px-4 py-3 text-right font-mono text-sm ${
                      margin < 0 ? "text-red-700" : "text-emerald-700"
                    }`}
                  >
                    {formatCurrency(margin)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="border-t-2 bg-zinc-50 font-bold hover:bg-zinc-50">
              <TableCell
                colSpan={2}
                className="px-4 py-4 text-xs tracking-wide text-zinc-950 uppercase"
              >
                Total dari rincian
              </TableCell>
              <TableCell className="px-4 py-4 text-right font-mono text-sm text-blue-700">
                {formatCurrency(totals.rab)}
              </TableCell>
              <TableCell />
              <TableCell className="px-4 py-4 text-right font-mono text-sm">
                {formatCurrency(totals.rap)}
              </TableCell>
              <TableCell
                className={`px-4 py-4 text-right font-mono text-sm ${
                  totals.rab - totals.rap < 0
                    ? "text-red-700"
                    : "text-emerald-700"
                }`}
              >
                {formatCurrency(totals.rab - totals.rap)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
};
