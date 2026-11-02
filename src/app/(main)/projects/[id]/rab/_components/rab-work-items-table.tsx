"use client";

import Link from "next/link";
import { FileSpreadsheet, PlusCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { RAB_ACTIONS } from "./rab-data";
import { useRabPageStore } from "../store";
import { useProjectDetail } from "../../project-detail-context";
import type { RabWorkItem } from "../types";
import { deleteRabItem } from "../action";
import { formatCurrency, formatCurrencyOrUnpriced } from "./rab-format";

export const RabWorkItemsTable = ({
  workItems,
}: {
  workItems: RabWorkItem[];
}) => {
  const { project } = useProjectDetail();
  const { search, setSearch, setImportOpen } = useRabPageStore();
  const showRap = workItems.some((item) => item.rapAmount !== undefined);
  const visibleItems = workItems.filter((item) => !item.rapOnly);
  const rows = visibleItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );
  const totals = visibleItems.reduce(
    (acc, item) => ({
      proposal: acc.proposal + (item.rapAmount ?? 0),
      converted: acc.converted + (item.rabAmount ?? 0),
      deviation: acc.deviation + (item.marginAmount ?? 0),
    }),
    { proposal: 0, converted: 0, deviation: 0 },
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="space-y-4 border-b border-zinc-200 bg-zinc-50/70 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-950">
              Rekapitulasi Item Pekerjaan
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Kelola item dan siapkan rekap RAB proyek.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportOpen(true)}
            >
              <FileSpreadsheet className="size-4" />
              Import Rekap (RAB + RAP)
            </Button>
            <Link
              href={`/projects/${project.id}/rab/add`}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-2.5 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-zinc-800"
            >
              <PlusCircle className="size-4" />
              Tambah Item
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              aria-label="Cari item pekerjaan"
              className="h-9 bg-white pl-9 sm:w-56"
              placeholder="Cari item..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>

      <Table>
        <TableHeader className="bg-zinc-50">
          <TableRow>
            <TableHead className="w-16 px-5 py-3 text-xs font-bold tracking-wide text-zinc-500 uppercase">
              No
            </TableHead>
            <TableHead className="px-5 py-3 text-xs font-bold tracking-wide text-zinc-500 uppercase">
              Item Pekerjaan
            </TableHead>
            {showRap ? (
              <TableHead className="px-5 py-3 text-right text-xs font-bold tracking-wide text-zinc-500 uppercase">
                Nilai RAP
              </TableHead>
            ) : null}
            <TableHead className="px-5 py-3 text-right text-xs font-bold tracking-wide text-zinc-500 uppercase">
              Nilai RAB
            </TableHead>
            {showRap ? (
              <TableHead className="px-5 py-3 text-right text-xs font-bold tracking-wide text-zinc-500 uppercase">
                Margin
              </TableHead>
            ) : null}
            <TableHead className="px-5 py-3 text-center text-xs font-bold tracking-wide text-zinc-500 uppercase">
              Aksi
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showRap ? 6 : 4}
                className="px-5 py-8 text-center text-sm text-zinc-500"
              >
                Belum ada item pekerjaan RAB.
              </TableCell>
            </TableRow>
          ) : null}
          {rows.map((item, index) => (
            <TableRow key={item.id}>
              <TableCell className="px-5 py-4 font-mono text-sm text-zinc-500">
                {index + 1}
              </TableCell>
              <TableCell className="px-5 py-4 font-semibold text-zinc-950">
                {item.name}
              </TableCell>
              {showRap ? (
                <TableCell className="px-5 py-4 text-right font-mono text-sm">
                  {formatCurrency(item.rapAmount)}
                </TableCell>
              ) : null}
              <TableCell
                className={cn(
                  "px-5 py-4 text-right font-mono text-sm",
                  item.rabAmount === null || item.rabAmount === undefined
                    ? "text-amber-700"
                    : "text-blue-700",
                )}
              >
                {formatCurrencyOrUnpriced(item.rabAmount)}
              </TableCell>
              {showRap ? (
                <TableCell className="px-5 py-4 text-right font-mono text-sm text-red-700">
                  {formatCurrency(item.marginAmount)}
                </TableCell>
              ) : null}
              <TableCell className="px-5 py-4">
                <div className="flex justify-center gap-1">
                  {RAB_ACTIONS.map(({ label, icon: Icon, className }) => {
                    const isEdit = label === "Edit item";
                    const isView = label === "Lihat item";
                    if (isEdit || isView) {
                      return (
                        <Link
                          key={label}
                          href={`/projects/${project.id}/rab/${item.id}${isEdit ? "/edit" : ""}`}
                          aria-label={label}
                          className={cn(
                            "inline-flex size-7 items-center justify-center rounded-lg transition-colors",
                            className,
                          )}
                        >
                          <Icon className="size-4" />
                        </Link>
                      );
                    }

                    return (
                      <Button
                        key={label}
                        type="button"
                        aria-label={label}
                        variant="ghost"
                        size="icon-sm"
                        className={className}
                        onClick={() => {
                          void deleteRabItem(project.id, item.id);
                        }}
                      >
                        <Icon className="size-4" />
                      </Button>
                    );
                  })}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="border-t-2 bg-zinc-50 font-bold hover:bg-zinc-50">
            <TableCell
              colSpan={2}
              className="px-5 py-4 text-xs tracking-wide text-zinc-950 uppercase"
            >
              Total Ringkasan
            </TableCell>
            {showRap ? (
              <TableCell className="px-5 py-4 text-right font-mono text-sm">
                {formatCurrency(totals.proposal)}
              </TableCell>
            ) : null}
            <TableCell className="px-5 py-4 text-right font-mono text-sm text-blue-700">
              {formatCurrency(totals.converted)}
            </TableCell>
            {showRap ? (
              <TableCell className="px-5 py-4 text-right font-mono text-sm text-red-700">
                {formatCurrency(totals.deviation)}
              </TableCell>
            ) : null}
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};
