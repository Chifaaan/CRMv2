import { Fragment } from "react";
import { List } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RabWorkItem } from "../../types";
import { formatCurrency } from "../../_components/rab-format";
import { RAB_ADD_UNITS } from "../../add/_components/rab-add-data";

const GROUP_LABELS = ["I", "II", "III", "IV", "V"] as const;

export const RabItemDetailTable = ({ item }: { item: RabWorkItem }) => (
  <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
    <div className="border-b border-zinc-200 p-6">
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
        </TableRow>
      </TableHeader>
      <TableBody>
        {item.groups.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="px-4 py-8 text-center text-sm text-zinc-500"
            >
              Belum ada detail item pekerjaan.
            </TableCell>
          </TableRow>
        ) : null}
        {item.groups.map((group, groupIndex) => (
          <Fragment key={group.id}>
            <TableRow
              className="bg-zinc-50/70 hover:bg-zinc-50/70"
            >
              <TableCell className="px-4 py-4 text-center text-sm font-bold text-zinc-700">
                {GROUP_LABELS[groupIndex] ?? groupIndex + 1}
              </TableCell>
              <TableCell className="px-4 py-4 font-semibold text-zinc-950" colSpan={5}>
                {group.name}
              </TableCell>
            </TableRow>
            {group.details.map((detail, detailIndex) => (
              <TableRow key={detail.id}>
                <TableCell className="px-4 py-4 text-center text-sm text-zinc-500">
                  {detailIndex + 1}
                </TableCell>
                <TableCell className="px-4 py-4">
                  <Input
                    aria-label={`Nama detail ${detail.id}`}
                    className="h-8 border-transparent bg-transparent px-0 shadow-none focus-visible:ring-0"
                    defaultValue={detail.name}
                    readOnly
                  />
                </TableCell>
                <TableCell className="px-4 py-4">
                  <Input
                    aria-label={`Volume detail ${detail.id}`}
                    className="h-8 border-transparent bg-transparent px-0 shadow-none focus-visible:ring-0"
                    defaultValue={detail.volume ?? ""}
                    readOnly
                  />
                </TableCell>
                <TableCell className="px-4 py-4">
                  <select
                    aria-label={`Satuan detail ${detail.id}`}
                    className="h-8 w-full border-none bg-transparent p-0 text-sm outline-none"
                    defaultValue={detail.unit ?? ""}
                    disabled
                  >
                    <option value="">-</option>
                    {RAB_ADD_UNITS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell className="px-4 py-4 text-right font-mono text-sm">
                  {formatCurrency(detail.rabUnitPrice)}
                </TableCell>
                <TableCell className="px-4 py-4 text-right font-mono text-sm font-semibold">
                  {formatCurrency(detail.rabTotalPrice)}
                </TableCell>
              </TableRow>
            ))}
          </Fragment>
        ))}
      </TableBody>
    </Table>
    <div className="border-t border-zinc-200 bg-zinc-50 p-6 text-right">
      <p className="mb-1 text-xs font-semibold text-zinc-500">
        Total Nilai RAB
      </p>
      <p className="text-xl font-bold text-blue-700">
        {formatCurrency(item.rabAmount)}
      </p>
    </div>
  </section>
);
