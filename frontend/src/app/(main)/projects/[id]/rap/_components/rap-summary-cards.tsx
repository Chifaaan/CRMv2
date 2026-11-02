import { formatCurrency } from "../../rab/_components/rab-format";
import type { RabWorkItem } from "../../rab/types";

export const RapSummaryCards = ({
  workItems,
}: {
  workItems: RabWorkItem[];
}) => {
  const totalRab = workItems.reduce(
    (sum, item) => sum + (item.rabAmount ?? 0),
    0,
  );
  const totalRap = workItems.reduce(
    (sum, item) => sum + (item.rapAmount ?? 0),
    0,
  );
  const margin = totalRab - totalRap;
  const marginPercent = totalRab > 0 ? (margin / totalRab) * 100 : 0;

  const cards = [
    {
      label: "Total RAB",
      note: "Nilai kontrak ke owner",
      value: formatCurrency(totalRab),
      className: "text-blue-700",
    },
    {
      label: "Total RAP",
      note: "Biaya pelaksanaan internal",
      value: formatCurrency(totalRap),
      className: "text-zinc-950",
    },
    {
      label: "Margin Kotor",
      note: "Belum dikurangi biaya tak langsung",
      value: `${formatCurrency(margin)} (${marginPercent.toFixed(1)}%)`,
      className: margin < 0 ? "text-red-700" : "text-emerald-700",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-bold tracking-wide text-zinc-500 uppercase">
            {card.label}
          </p>
          <p className={`mt-2 font-mono text-xl font-bold ${card.className}`}>
            {card.value}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{card.note}</p>
        </div>
      ))}
    </div>
  );
};
