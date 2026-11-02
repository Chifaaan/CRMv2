"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  Clock,
  Filter,
  PiggyBank,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { ActiveFilterChips } from "@/components/features/crud/active-filter-chips";
import { BudgetDashboardCharts } from "@/components/features/budget/budget-dashboard-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FilterSheetBody,
  filterDialogContentClassName,
  filterDialogFooterClassName,
  filterDialogHeaderClassName,
  filterSheetFieldClassName,
  filterSheetLabelClassName,
  filterSheetTitleClassName,
  filterSheetDescriptionClassName,
} from "@/components/ui/filter-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import {
  canAccessBudgetDashboard,
  isBudgetBlockedRole,
} from "@/lib/budget-access";
import {
  budgetCategoryLabel,
  budgetStatusClass,
  budgetStatusLabel,
  BUDGET_DASHBOARD_CATEGORY_FILTER_ITEMS,
} from "@/lib/budget-constants";
import type {
  BudgetAllocationRow,
  BudgetDashboardData,
  BudgetMeMeta,
  BudgetTransactionRow,
} from "@/lib/budget-types";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/list-pagination";
import { cn } from "@/lib/utils";

function fmtMoney(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const DASHBOARD_TOP_N = 5;

export function BudgetDashboardClient() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "developer";

  const { data: meMeta, isLoading: meLoading } = useQuery({
    queryKey: ["budget", "me"],
    queryFn: async () => {
      const res = await api.get<BudgetMeMeta>("/api/budget/meta/me");
      return res.data;
    },
    enabled: !isBudgetBlockedRole(role),
  });

  const canAccessDashboard =
    meMeta?.canAccessDashboard ?? canAccessBudgetDashboard(role);

  const [filterOpen, setFilterOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("");
  const [allocPage, setAllocPage] = useState(1);
  const [recentPage, setRecentPage] = useState(1);

  const filterCount = [from, to, category].filter(Boolean).length;

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (category) p.set("category", category);
    return p.toString();
  }, [from, to, category]);

  const { data, isLoading } = useQuery({
    queryKey: ["budget", "dashboard", params],
    queryFn: async () => {
      const res = await api.get<BudgetDashboardData>(
        `/api/budget/dashboard${params ? `?${params}` : ""}`,
      );
      return res.data;
    },
    enabled: canAccessDashboard,
  });

  const { data: allocationsData, isLoading: allocationsLoading } = useQuery({
    queryKey: ["budget", "allocations", "dashboard-table", allocPage],
    queryFn: async () => {
      const res = await api.get<{
        items: BudgetAllocationRow[];
        meta: { total: number; page: number; take: number; pages: number };
      }>(
        `/api/budget/allocations?activeOnly=true&page=${allocPage}&take=${DEFAULT_LIST_PAGE_SIZE}`,
      );
      return res.data;
    },
    enabled: canAccessDashboard,
  });

  const recentQueryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(recentPage));
    p.set("take", String(DEFAULT_LIST_PAGE_SIZE));
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (category) p.set("category", category);
    return p.toString();
  }, [recentPage, from, to, category]);

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ["budget", "transactions", "dashboard-recent", recentQueryParams],
    queryFn: async () => {
      const res = await api.get<{
        items: BudgetTransactionRow[];
        meta: { total: number; page: number; take: number; pages: number };
      }>(`/api/budget/transactions?${recentQueryParams}`);
      return res.data;
    },
    enabled: canAccessDashboard,
  });

  if (isBudgetBlockedRole(role)) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Budget Monitoring</h1>
        <p className="text-muted-foreground text-sm">
          Fitur budget tidak tersedia untuk peran Anda.
        </p>
      </div>
    );
  }

  if (meLoading) {
    return <p className="text-muted-foreground text-sm">Memuat…</p>;
  }

  if (!canAccessDashboard) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Budget Monitoring</h1>
        <p className="text-muted-foreground text-sm">
          Dashboard budget hanya dapat diakses admin.
        </p>
      </div>
    );
  }

  const summary = data?.summary;

  const cards = [
    {
      label: "Total alokasi",
      value: summary?.totalAllocated ?? 0,
      icon: Wallet,
      sub: "Budget yang dialokasikan",
    },
    {
      label: "Realisasi pengeluaran",
      value: summary?.totalExpense ?? 0,
      icon: ArrowDownRight,
      sub: "Transaksi expense disetujui",
    },
    {
      label: "Sisa budget",
      value: summary?.remaining ?? 0,
      icon: PiggyBank,
      sub: "Alokasi − realisasi",
    },
    {
      label: "Penyerapan",
      value: summary?.absorptionPct ?? 0,
      icon: TrendingUp,
      sub: "% budget terpakai",
      isPct: true,
    },
    {
      label: "Awaiting approval",
      value: summary?.pendingApprovalCount ?? 0,
      icon: Clock,
      sub: "Menunggu persetujuan",
      isCount: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Budget Monitoring
          </h1>
          <p className="text-muted-foreground text-sm">
            Ringkasan visual kondisi anggaran proyek.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="relative shrink-0"
          onClick={() => setFilterOpen(true)}
        >
          <Filter className="mr-1 size-4" />
          Filter
          {filterCount > 0 ? (
            <span className="bg-primary text-primary-foreground ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums">
              {filterCount > 9 ? "9+" : filterCount}
            </span>
          ) : null}
        </Button>
      </div>

      <ActiveFilterChips
        items={[
          ...(from ? [{ id: "from", label: `Dari: ${from}` }] : []),
          ...(to ? [{ id: "to", label: `Sampai: ${to}` }] : []),
          ...(category
            ? [{ id: "category", label: `Kategori: ${budgetCategoryLabel(category)}` }]
            : []),
        ]}
        onRemove={(id) => {
          if (id === "from") setFrom("");
          if (id === "to") setTo("");
          if (id === "category") setCategory("");
        }}
      />

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className={filterDialogContentClassName}>
          <DialogHeader className={filterDialogHeaderClassName}>
            <DialogTitle className={filterSheetTitleClassName}>
              Filter dashboard
            </DialogTitle>
            <DialogDescription className={filterSheetDescriptionClassName}>
              Sempitkan ringkasan berdasarkan rentang tanggal dan kategori.
            </DialogDescription>
          </DialogHeader>
          <FilterSheetBody className="px-6 py-5">
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Dari tanggal</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Sampai tanggal</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Kategori</Label>
              <Select
                value={category || "__all__"}
                onValueChange={(v) => {
                  setCategory(!v || v === "__all__" ? "" : v);
                  setRecentPage(1);
                }}
                items={BUDGET_DASHBOARD_CATEGORY_FILTER_ITEMS}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua kategori</SelectItem>
                  <SelectItem value="operational">Operasional</SelectItem>
                  <SelectItem value="assets">Aset & Inventaris</SelectItem>
                  <SelectItem value="sdm">SDM</SelectItem>
                  <SelectItem value="travel">Perjalanan Dinas</SelectItem>
                  <SelectItem value="other">Lain-lain</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FilterSheetBody>
          <DialogFooter className={filterDialogFooterClassName}>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFrom("");
                setTo("");
                setCategory("");
                setRecentPage(1);
              }}
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={() => {
                setRecentPage(1);
                setFilterOpen(false);
              }}
            >
              Terapkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="border-zinc-200/90 shadow-sm">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="bg-primary/10 text-primary rounded-lg p-2">
                <c.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">{c.label}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {isLoading
                    ? "…"
                    : "isPct" in c && c.isPct
                      ? `${(c.value as number).toFixed(1)}%`
                      : "isCount" in c && c.isCount
                        ? String(c.value)
                        : fmtMoney(c.value as number)}
                </p>
                <p className="text-muted-foreground truncate text-xs">{c.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pos alokasi anggaran</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama pos</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead className="text-right">Alokasi</TableHead>
                <TableHead className="text-right">Terpakai</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
                <TableHead className="text-right">Penyerapan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(allocationsData?.items ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.period ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoney(row.allocated)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoney(row.usedExpense)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoney(row.remaining)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.absorptionPct.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
              {!allocationsData?.items?.length && !allocationsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Belum ada pos alokasi.
                  </TableCell>
                </TableRow>
              ) : null}
              {allocationsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Memuat…
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          {allocationsData?.meta ? (
            <ListPaginationBar
              page={allocationsData.meta.page}
              total={allocationsData.meta.total}
              pageSize={DEFAULT_LIST_PAGE_SIZE}
              onPageChange={setAllocPage}
              onPageSizeChange={() => {}}
              className="border-0 px-0 pt-4"
            />
          ) : null}
        </CardContent>
      </Card>

      {data ? (
        <BudgetDashboardCharts
          data={{
            monthlyTrend: data.monthlyTrend,
            categoryDistribution: data.categoryDistribution,
            allocationUsage: data.allocationUsage ?? [],
          }}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Transaksi terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentData?.items ?? []).map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.title}</TableCell>
                    <TableCell>{fmtDate(tx.transactionDate)}</TableCell>
                    <TableCell className="tabular-nums">
                      {fmtMoney(Number(tx.totalAmount))}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                          budgetStatusClass(tx.status),
                        )}
                      >
                        {budgetStatusLabel(tx.status)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {!recentData?.items?.length && !recentLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      Belum ada transaksi.
                    </TableCell>
                  </TableRow>
                ) : null}
                {recentLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      Memuat…
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            {recentData?.meta ? (
              <ListPaginationBar
                page={recentData.meta.page}
                total={recentData.meta.total}
                pageSize={DEFAULT_LIST_PAGE_SIZE}
                onPageChange={setRecentPage}
                onPageSizeChange={() => {}}
                className="border-0 px-0 pt-4"
              />
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 5 pengeluaran terbesar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.topExpenses ?? []).slice(0, DASHBOARD_TOP_N).map((e) => (
                <div key={e.id} className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{e.title}</span>
                  <span className="shrink-0 tabular-nums">{fmtMoney(e.amount)}</span>
                </div>
              ))}
              {!data?.topExpenses?.length ? (
                <p className="text-muted-foreground text-sm">—</p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 5 pengaju terbanyak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.topRequesters ?? []).slice(0, DASHBOARD_TOP_N).map((r) => (
                <div key={r.requesterId} className="flex justify-between gap-2 text-sm">
                  <span>
                    {r.name}{" "}
                    <span className="text-muted-foreground">({r.count}x)</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{fmtMoney(r.total)}</span>
                </div>
              ))}
              {!data?.topRequesters?.length ? (
                <p className="text-muted-foreground text-sm">—</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
