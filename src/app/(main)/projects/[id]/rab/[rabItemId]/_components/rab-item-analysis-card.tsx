"use client";

import { TrendingUp, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RabWorkItem } from "../../types";
import { formatShortCurrency } from "../../_components/rab-format";
import { useRabItemDetailStore } from "../store";

export const RabItemAnalysisCard = ({ item }: { item: RabWorkItem }) => {
  const showAnalysis = useRabItemDetailStore((state) => state.showAnalysis);
  const proposal = item.rapAmount ?? 0;
  const converted = item.rabAmount ?? 0;
  const maxAmount = Math.max(proposal, converted, 1);
  const marginAmount = item.marginAmount ?? 0;
  const deviationPercent = proposal > 0 ? (marginAmount / proposal) * 100 : 0;
  const metrics = [
    {
      label: "Nilai RAP",
      value: formatShortCurrency(proposal),
      width: `${Math.round((proposal / maxAmount) * 100)}%`,
      className: "bg-zinc-400",
    },
    {
      label: "Nilai RAB",
      value: formatShortCurrency(converted),
      width: `${Math.round((converted / maxAmount) * 100)}%`,
      className: "bg-blue-600",
      valueClassName: "font-bold text-blue-700",
    },
  ];

  if (!showAnalysis) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 flex items-center justify-between text-base font-bold text-zinc-950">
        Analisis Margin
        <TrendingUp className="size-5 text-zinc-400" />
      </h3>
      <div className="space-y-6">
        {metrics.map(({ label, value, width, className, valueClassName }) => (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{label}</span>
              <span className={cn("font-mono", valueClassName)}>{value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div className={cn("h-full", className)} style={{ width }} />
            </div>
          </div>
        ))}
        <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <TriangleAlert className="mt-0.5 size-5 text-amber-600" />
          <div>
            <p className="mb-1 text-xs font-semibold text-amber-800">
              Margin Harga
            </p>
            <p className="text-lg font-bold text-amber-600">
              {formatShortCurrency(marginAmount)}
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Margin terhadap proposal sebesar {deviationPercent.toFixed(1)}%.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
