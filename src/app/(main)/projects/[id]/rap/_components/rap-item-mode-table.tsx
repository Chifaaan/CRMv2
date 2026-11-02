"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "../../rab/_components/rab-format";
import type { RabWorkItem } from "../../rab/types";
import { updateRapItemMode } from "../action";

export const RapItemModeTable = ({
  projectId,
  workItems,
}: {
  projectId: string;
  workItems: RabWorkItem[];
}) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const save = (
    itemId: string,
    payload: { rapUseDetails?: boolean; rapAmount?: number | null },
  ) => {
    setBusy(itemId);
    startTransition(async () => {
      try {
        await updateRapItemMode(projectId, itemId, payload);
      } catch {
        toast.error("Gagal menyimpan perubahan RAP.");
      } finally {
        setBusy(null);
      }
    });
  };

  const commitAmount = (item: RabWorkItem) => {
    const raw = drafts[item.id];
    if (raw === undefined) return;
    const trimmed = raw.trim();
    const parsed =
      trimmed === "" ? null : Number(trimmed.replace(/[^\d.-]/g, ""));
    if (parsed !== null && !Number.isFinite(parsed)) {
      toast.error("Nilai RAP harus berupa angka.");
      return;
    }
    if (parsed === item.rapAmount) return;
    save(item.id, { rapAmount: parsed });
    setDrafts((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 bg-zinc-50/70 p-5">
        <h3 className="text-base font-bold text-zinc-950">
          Mode Nilai RAP per Item
        </h3>
        <p className="mt-1 max-w-3xl text-sm text-zinc-500">
          Secara bawaan nilai RAP dijumlahkan dari rincian. Matikan
          &quot;Ikuti rincian&quot; bila item ini memakai harga borongan atau
          paket subkontraktor yang tidak mengikuti struktur RAB, lalu isi
          nilainya langsung.
        </p>
      </div>

      <Table>
        <TableHeader className="bg-zinc-50">
          <TableRow>
            <TableHead className="px-5 py-3 text-xs font-bold tracking-wide text-zinc-500 uppercase">
              Item Pekerjaan
            </TableHead>
            <TableHead className="px-5 py-3 text-center text-xs font-bold tracking-wide text-zinc-500 uppercase">
              Ikuti Rincian
            </TableHead>
            <TableHead className="px-5 py-3 text-right text-xs font-bold tracking-wide text-zinc-500 uppercase">
              Nilai RAP
            </TableHead>
            <TableHead className="px-5 py-3 text-right text-xs font-bold tracking-wide text-zinc-500 uppercase">
              Nilai RAB
            </TableHead>
            <TableHead className="px-5 py-3 text-right text-xs font-bold tracking-wide text-zinc-500 uppercase">
              Margin
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workItems.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="px-5 py-8 text-center text-sm text-zinc-500"
              >
                Belum ada item pekerjaan.
              </TableCell>
            </TableRow>
          ) : null}
          {workItems.map((item) => {
            const follows = item.rapUseDetails !== false;
            return (
              <TableRow key={item.id}>
                <TableCell className="px-5 py-4 font-semibold text-zinc-950">
                  {item.name}
                </TableCell>
                <TableCell className="px-5 py-4 text-center">
                  <Switch
                    aria-label={`Ikuti rincian untuk ${item.name}`}
                    checked={follows}
                    disabled={busy === item.id}
                    onCheckedChange={(checked) =>
                      save(item.id, { rapUseDetails: checked })
                    }
                  />
                </TableCell>
                <TableCell className="px-5 py-4 text-right">
                  {follows ? (
                    <span className="font-mono text-sm text-zinc-500">
                      {formatCurrency(item.rapAmount)}
                      <span className="ml-2 text-xs">(dari rincian)</span>
                    </span>
                  ) : (
                    <Input
                      aria-label={`Nilai RAP manual ${item.name}`}
                      className="ml-auto h-9 w-40 rounded-lg text-right font-mono"
                      inputMode="decimal"
                      disabled={busy === item.id}
                      value={drafts[item.id] ?? item.rapAmount ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      onBlur={() => commitAmount(item)}
                    />
                  )}
                </TableCell>
                <TableCell className="px-5 py-4 text-right font-mono text-sm text-blue-700">
                  {formatCurrency(item.rabAmount)}
                </TableCell>
                <TableCell
                  className={`px-5 py-4 text-right font-mono text-sm ${
                    (item.marginAmount ?? 0) < 0
                      ? "text-red-700"
                      : "text-emerald-700"
                  }`}
                >
                  {formatCurrency(item.marginAmount)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
