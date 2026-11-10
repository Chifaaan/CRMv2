"use client";

import { useMemo, useState } from "react";
import { ChartNoAxesCombined, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  businessDashboardRows,
  formatCurrency,
  roleCanAccessBusiness,
  userById,
} from "@/lib/prototype/domain";
import { BUSINESS_UNITS, type BusinessUnitId } from "@/lib/prototype/types";
import {
  DataRow,
  EmptyState,
  NativeSelect,
  PageHeader,
  SectionCard,
} from "./ui";

const PERIOD_OPTIONS = [
  { id: "all", label: "Semua periode" },
  { id: "month", label: "Bulan ini" },
  { id: "quarter", label: "3 bulan terakhir" },
];

function periodRange(period: string): { from?: string; to?: string } {
  if (period === "all") return {};
  const now = new Date();
  const to = now.toISOString();
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString(), to };
  }
  const from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  return { from: from.toISOString(), to };
}

function UnitCard({
  unit,
  row,
}: {
  unit: BusinessUnitId;
  row: ReturnType<typeof businessDashboardRows>[number];
}) {
  const label =
    BUSINESS_UNITS.find((item) => item.id === unit)?.label ?? unit;
  const positive = row.margin >= 0;
  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="bg-muted rounded px-1.5 py-0.5 text-[10px] font-semibold">
          {row.itemCount} item
        </span>
      </div>
      <div className="mt-3 space-y-1.5 text-xs">
        <DataRow label="Revenue" value={formatCurrency(row.revenue)} />
        <DataRow label="Cost MO" value={formatCurrency(row.cost)} />
        <DataRow
          label="Margin"
          value={
            <span className={positive ? "text-emerald-700" : "text-rose-600"}>
              {formatCurrency(row.margin)} ({Math.round(row.marginPercent)}%)
            </span>
          }
        />
        <DataRow
          label="RAB baseline"
          value={
            row.plannedRabCost > 0
              ? formatCurrency(row.plannedRabCost)
              : "Belum ada"
          }
        />
        <DataRow
          label="Variance"
          value={
            row.itemCount > 0 && row.plannedRabCost > 0
              ? formatCurrency(row.variance)
              : "—"
          }
        />
      </div>
    </div>
  );
}

export function BusinessDashboard() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const [umbrella, setUmbrella] = useState("");
  const [period, setPeriod] = useState("all");

  const rows = useMemo(() => {
    const range = periodRange(period);
    return businessDashboardRows(store, {
      groupId: umbrella && umbrella !== "__standalone" ? umbrella : undefined,
      standalone: umbrella === "__standalone",
      ...range,
    });
  }, [store, umbrella, period]);

  if (!currentUser || !roleCanAccessBusiness(currentUser.role)) {
    return (
      <EmptyState
        icon={ChartNoAxesCombined}
        title="Akses ditolak"
        description="Business Dashboard hanya untuk BOD dan Admin."
      />
    );
  }

  const totals = rows.reduce(
    (sum, row) => ({
      revenue: sum.revenue + row.revenue,
      cost: sum.cost + row.cost,
      margin: sum.margin + row.margin,
      planned: sum.planned + row.plannedRabCost,
      items: sum.items + row.itemCount,
    }),
    { revenue: 0, cost: 0, margin: 0, planned: 0, items: 0 },
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Business Dashboard"
        description="Revenue, biaya vendor, dan margin per unit bisnis dari Media Order. Read-only untuk BOD."
      />

      <div className="flex flex-wrap gap-2">
        <NativeSelect
          value={umbrella}
          onChange={setUmbrella}
          className="h-9 w-56 text-xs"
        >
          <option value="">Semua umbrella</option>
          <option value="__standalone">Proyek standalone</option>
          {store.groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={period}
          onChange={setPeriod}
          className="h-9 w-48 text-xs"
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Belum ada data komersial"
          description="Belum ada Media Order atau RAB baseline untuk filter ini."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="bg-card rounded-xl border p-4 shadow-sm">
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                Total revenue
              </p>
              <p className="mt-1 text-lg font-semibold">
                {formatCurrency(totals.revenue)}
              </p>
              <p className="text-muted-foreground mt-1 text-[11px]">
                {totals.items} item MO
              </p>
            </div>
            <div className="bg-card rounded-xl border p-4 shadow-sm">
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                Total cost
              </p>
              <p className="mt-1 text-lg font-semibold">
                {formatCurrency(totals.cost)}
              </p>
              <p className="text-muted-foreground mt-1 text-[11px]">
                RAB baseline {formatCurrency(totals.planned)}
              </p>
            </div>
            <div className="bg-card rounded-xl border p-4 shadow-sm">
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                Total margin
              </p>
              <p
                className={
                  totals.margin >= 0
                    ? "mt-1 text-lg font-semibold text-emerald-700"
                    : "mt-1 text-lg font-semibold text-rose-600"
                }
              >
                {formatCurrency(totals.margin)}
              </p>
              <p className="text-muted-foreground mt-1 text-[11px]">
                {totals.revenue > 0
                  ? `${Math.round((totals.margin / totals.revenue) * 100)}% dari revenue`
                  : "Revenue belum tersedia"}
              </p>
            </div>
            <div className="bg-card rounded-xl border p-4 shadow-sm">
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                Variance vs RAB
              </p>
              <p className="mt-1 flex items-center gap-1 text-lg font-semibold">
                {totals.cost - totals.planned >= 0 ? (
                  <TrendingUp className="size-4 text-rose-500" />
                ) : (
                  <TrendingDown className="size-4 text-emerald-600" />
                )}
                {formatCurrency(totals.cost - totals.planned)}
              </p>
              <p className="text-muted-foreground mt-1 text-[11px]">
                Cost MO dibanding RAB baseline
              </p>
            </div>
          </div>

          <SectionCard
            title="Per unit bisnis"
            description="Setiap item Media Order dipetakan ke unit pemiliknya."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <UnitCard key={row.businessUnitId} unit={row.businessUnitId} row={row} />
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
