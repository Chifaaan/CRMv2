"use client";

import { cn } from "@/lib/utils";
import type { RabWorkItem } from "../../types";
import { formatCurrency } from "../../_components/rab-format";

export const RabItemSummaryCards = ({ item }: { item: RabWorkItem }) => {
  const cards = [
    { label: "Nama Item", value: item.name },
    { label: "Nilai RAP", value: formatCurrency(item.rapAmount) },
    {
      label: "Nilai RAB",
      value: formatCurrency(item.rabAmount),
      className: "text-blue-700",
    },
    {
      label: "Margin",
      value: formatCurrency(item.marginAmount),
      className: "text-red-700",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, className }) => (
        <div
          key={label}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            {label}
          </p>
          <p className={cn("text-lg font-bold text-zinc-950", className)}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
};
