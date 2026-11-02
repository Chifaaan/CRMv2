import { cn } from "@/lib/utils";
import type { RabWorkItem } from "../types";
import { formatCurrency } from "./rab-format";

export const RabSummaryCards = ({
  workItems,
}: {
  workItems: RabWorkItem[];
}) => {
  const proposal = workItems.reduce(
    (total, item) => total + (item.rapAmount ?? 0),
    0,
  );
  const converted = workItems.reduce(
    (total, item) => total + (item.rabAmount ?? 0),
    0,
  );
  const deviation = converted - proposal;
  const deviationPercent = proposal > 0 ? (deviation / proposal) * 100 : 0;
  const cards = [
    {
      label: "Total RAP",
      value: formatCurrency(proposal),
      className: "border-zinc-200 bg-white text-zinc-950",
    },
    {
      label: "Total RAB",
      value: formatCurrency(converted),
      className: "border-blue-200 border-l-blue-600 bg-white text-zinc-950",
    },
    {
      label: "Margin",
      value: formatCurrency(deviation),
      className: "border-red-100 bg-red-50 text-red-700",
    },
    {
      label: "Persentase Margin",
      value: `${deviationPercent.toFixed(1)}%`,
      className: "border-red-100 bg-red-50 text-red-700",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, className }) => (
      <div
        key={label}
        className={cn(
          "rounded-2xl border border-l-4 p-5 shadow-sm transition-colors hover:border-zinc-300",
          className,
        )}
      >
        <p className="mb-2 text-xs font-semibold text-zinc-500">{label}</p>
        <p className="text-xl font-bold tabular-nums">{value}</p>
      </div>
      ))}
    </div>
  );
};
