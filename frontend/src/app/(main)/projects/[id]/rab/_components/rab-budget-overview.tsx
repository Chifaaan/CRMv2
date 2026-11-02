import type { RabOverview } from "../types";
import { formatShortCurrency } from "./rab-format";

const CIRCUMFERENCE = 552.92;

export const RabBudgetOverview = ({
  budget,
}: {
  budget: RabOverview["budget"];
}) => {
  const usedPercent = Math.min(Math.max(budget.usedPercent, 0), 100);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm xl:col-span-5">
      <h3 className="mb-6 text-base font-bold text-zinc-950">
        Ringkasan Anggaran
      </h3>
      <div className="relative flex items-center justify-center py-6">
        <svg className="size-48 -rotate-90" viewBox="0 0 192 192">
          <circle
            cx="96"
            cy="96"
            fill="none"
            r="88"
            stroke="#f1f5f9"
            strokeWidth="12"
          />
          <circle
            cx="96"
            cy="96"
            fill="none"
            r="88"
            stroke="#2563eb"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE - (usedPercent / 100) * CIRCUMFERENCE}
            strokeLinecap="round"
            strokeWidth="12"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-zinc-950">
            {usedPercent}%
          </span>
          <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Anggaran Terpakai
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 border-t border-zinc-200 pt-5 text-center">
        <div>
          <p className="text-xs text-zinc-500">Total Anggaran</p>
          <p className="text-sm font-bold text-zinc-950">
            {formatShortCurrency(budget.totalBudget)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Aktual</p>
          <p className="text-sm font-bold text-blue-700">
            {formatShortCurrency(budget.actualCost)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Sisa</p>
          <p className="text-sm font-bold text-emerald-700">
            {formatShortCurrency(budget.remaining)}
          </p>
        </div>
      </div>
    </div>
  );
};
