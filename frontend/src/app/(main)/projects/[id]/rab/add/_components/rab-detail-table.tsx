"use client";

import { Fragment } from "react";
import { List, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  RAB_ADD_UNITS,
} from "./rab-add-data";
import { formatCurrency } from "../../_components/rab-format";
import { useRabAddPageStore } from "../store";

const GROUP_LABELS = ["I", "II", "III", "IV", "V"] as const;

export const RabDetailTable = ({
  mode = "rab",
}: {
  mode?: "rab" | "rap";
}) => {
  const unitField = mode === "rap" ? "rapUnitPrice" : "rabUnitPrice";
  const totalField = mode === "rap" ? "rapTotalPrice" : "rabTotalPrice";
  const {
    addDetailGroup,
    addDetailItem,
    detailGroups,
    removeDetailGroup,
    removeDetailItem,
    updateDetailGroupName,
    updateDetailItem,
    useDetails,
  } = useRabAddPageStore();
  const rabTotalPrice = detailGroups
    .flatMap((group) => group.items)
    .reduce((total, item) => total + Number(item.rabTotalPrice.replace(/\D/g, "")), 0);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-opacity",
        !useDetails && "opacity-50",
      )}
    >
      <div className="flex items-center justify-between border-b border-zinc-200 p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-zinc-950">
          <List className="size-4 text-blue-700" />
          Rincian Detail
        </h3>
      </div>

      <Table>
        <TableHeader className="bg-zinc-50">
          <TableRow>
            <TableHead className="w-12 px-4 py-3 text-center text-xs font-bold tracking-wide text-zinc-500 uppercase">
              No
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-bold tracking-wide text-zinc-500 uppercase">
              Grup Item Pekerjaan
            </TableHead>
            <TableHead className="w-24 px-4 py-3 text-xs font-bold tracking-wide text-zinc-500 uppercase">
              Volume
            </TableHead>
            <TableHead className="w-28 px-4 py-3 text-xs font-bold tracking-wide text-zinc-500 uppercase">
              Satuan
            </TableHead>
            <TableHead className="px-4 py-3 text-right text-xs font-bold tracking-wide text-zinc-500 uppercase">
              Harga Satuan (Rp)
            </TableHead>
            <TableHead className="px-4 py-3 text-right text-xs font-bold tracking-wide text-zinc-500 uppercase">
              Total Harga (Rp)
            </TableHead>
            <TableHead className="w-12 px-4 py-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {detailGroups.map((group, groupIndex) => (
            <Fragment key={group.id}>
              <TableRow className="bg-zinc-50/70 hover:bg-zinc-50/70">
                <TableCell className="px-4 py-4 text-center text-sm font-bold text-zinc-700">
                  {GROUP_LABELS[groupIndex] ?? groupIndex + 1}
                </TableCell>
                <TableCell className="px-4 py-4" colSpan={5}>
                  <Input
                    aria-label={`Nama kelompok ${groupIndex + 1}`}
                    className="h-10 rounded-xl border-zinc-200 bg-white font-semibold tracking-wide text-zinc-900 uppercase"
                    placeholder="Nama kelompok pekerjaan"
                    value={group.name}
                    onChange={(event) =>
                      updateDetailGroupName(group.id, event.target.value)
                    }
                  />
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div className="flex justify-center gap-2">
                    <Button
                      type="button"
                      aria-label={`Tambah sub item ${group.name || groupIndex + 1}`}
                      variant="outline"
                      size="icon-sm"
                      className="border-zinc-200 bg-white text-zinc-600 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => addDetailItem(group.id)}
                    >
                      <PlusCircle className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      aria-label={`Hapus kelompok ${group.name || groupIndex + 1}`}
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => removeDetailGroup(group.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {group.items.map((item, itemIndex) => (
                <TableRow key={item.id} className="group">
                  <TableCell className="px-4 py-4 text-center text-sm font-semibold text-zinc-700">
                    {itemIndex + 1}
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <Input
                      aria-label={`Nama sub item ${itemIndex + 1}`}
                      className="h-10 rounded-xl border-zinc-200 bg-white"
                      placeholder="Nama item pekerjaan"
                      value={item.name}
                      onChange={(event) =>
                        updateDetailItem(
                          group.id,
                          item.id,
                          "name",
                          event.target.value,
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <Input
                      aria-label={`Volume sub item ${itemIndex + 1}`}
                      className="h-10 rounded-xl border-zinc-200 bg-white"
                      placeholder="Volume"
                      value={item.volume}
                      onChange={(event) =>
                        updateDetailItem(
                          group.id,
                          item.id,
                          "volume",
                          event.target.value,
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <select
                      aria-label={`Satuan sub item ${itemIndex + 1}`}
                      className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      value={item.unit}
                      onChange={(event) =>
                        updateDetailItem(
                          group.id,
                          item.id,
                          "unit",
                          event.target.value,
                        )
                      }
                    >
                      {RAB_ADD_UNITS.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <Input
                      aria-label={`Harga satuan ${mode.toUpperCase()} sub item ${itemIndex + 1}`}
                      className="h-10 rounded-xl border-zinc-200 bg-white text-right font-mono"
                      placeholder="0"
                      value={item[unitField]}
                      onChange={(event) =>
                        updateDetailItem(
                          group.id,
                          item.id,
                          unitField,
                          event.target.value,
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <Input
                      aria-label={`Total harga sub item ${itemIndex + 1}`}
                      className="h-10 rounded-xl border-zinc-200 bg-white text-right font-mono font-semibold"
                      placeholder="0"
                      value={item[totalField]}
                      onChange={(event) =>
                        updateDetailItem(
                          group.id,
                          item.id,
                          totalField,
                          event.target.value,
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="px-4 py-4 text-center">
                    <Button
                      type="button"
                      aria-label={`Hapus sub item ${itemIndex + 1}`}
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => removeDetailItem(group.id, item.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-4 border-t border-zinc-200 bg-zinc-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" onClick={addDetailGroup}>
          <PlusCircle className="size-4 text-blue-700" />
          Tambah Baris
        </Button>
        <div className="text-left sm:text-right">
          <p className="mb-1 text-xs font-semibold text-zinc-500">
            Total
          </p>
          <p className="text-xl font-bold text-blue-700">
            {formatCurrency(rabTotalPrice)}
          </p>
        </div>
      </div>
    </section>
  );
};
