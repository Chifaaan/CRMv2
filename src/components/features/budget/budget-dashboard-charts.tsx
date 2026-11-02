"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BUDGET_CATEGORY_COLORS,
  budgetCategoryLabel,
} from "@/lib/budget-constants";
import type { BudgetDashboardData } from "@/lib/budget-types";

function fmtMoney(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function BudgetDashboardCharts({
  data,
}: {
  data: Pick<
    BudgetDashboardData,
    "monthlyTrend" | "categoryDistribution" | "allocationUsage"
  >;
}) {
  const catData = data.categoryDistribution.map((r) => ({
    name: budgetCategoryLabel(r.category),
    raw: r.category,
    value: r.amount,
  }));

  const allocationData = (data.allocationUsage ?? []).map((r) => ({
    name: r.name,
    allocated: r.allocated,
    used: r.used,
    remaining: r.remaining,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-zinc-200/90 shadow-sm lg:col-span-2">
        <CardHeader className="border-b border-zinc-100 bg-zinc-50/40 pb-3">
          <CardTitle className="text-base font-semibold">
            Alokasi vs realisasi per pos dana
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 pt-4">
          {allocationData.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada pos alokasi.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allocationData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} width={72} tickFormatter={(v) => `${Math.round(v / 1_000_000)}jt`} />
                <Tooltip formatter={(v) => fmtMoney(Number(v))} />
                <Legend />
                <Bar dataKey="allocated" name="Alokasi" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="used" name="Terpakai" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="remaining" name="Sisa" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-200/90 shadow-sm">
        <CardHeader className="border-b border-zinc-100 bg-zinc-50/40 pb-3">
          <CardTitle className="text-base font-semibold">
            Tren bulanan — pemasukan vs pengeluaran
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72 pt-4">
          {data.monthlyTrend.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada data transaksi.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={72} tickFormatter={(v) => `${Math.round(v / 1_000_000)}jt`} />
                <Tooltip formatter={(v) => fmtMoney(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="income" name="Pemasukan" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expense" name="Pengeluaran" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-200/90 shadow-sm">
        <CardHeader className="border-b border-zinc-100 bg-zinc-50/40 pb-3">
          <CardTitle className="text-base font-semibold">
            Distribusi pengeluaran per kategori
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72 pt-4">
          {catData.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada pengeluaran.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={catData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {catData.map((e) => (
                    <Cell
                      key={e.raw}
                      fill={BUDGET_CATEGORY_COLORS[e.raw] ?? "#6366f1"}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtMoney(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
