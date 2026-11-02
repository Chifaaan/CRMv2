"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, MoreVertical, Plus, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import {
  BUDGET_ALLOCATION_ADJUST_ITEMS,
  budgetAllocationLogTypeLabel,
} from "@/lib/budget-constants";
import type {
  BudgetAllocationLogRow,
  BudgetAllocationRow,
} from "@/lib/budget-types";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/list-pagination";
import { cn } from "@/lib/utils";

function fmtMoney(v: unknown) {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? 0));
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function BudgetAllocationsPageClient() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

  const [createOpen, setCreateOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<BudgetAllocationRow | null>(
    null,
  );
  const [logsTarget, setLogsTarget] = useState<BudgetAllocationRow | null>(
    null,
  );

  const [name, setName] = useState("");
  const [period, setPeriod] = useState("");
  const [description, setDescription] = useState("");
  const [initialAmount, setInitialAmount] = useState("");
  const [initialDescription, setInitialDescription] = useState("");

  const [adjustType, setAdjustType] = useState("increase");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [page, setPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);

  const { data: allocationsData, isLoading } = useQuery({
    queryKey: ["budget", "allocations", "list", page],
    queryFn: async () => {
      const res = await api.get<{
        items: BudgetAllocationRow[];
        meta: { total: number; page: number; take: number; pages: number };
      }>(
        `/api/budget/allocations?page=${page}&take=${DEFAULT_LIST_PAGE_SIZE}`,
      );
      return res.data;
    },
    enabled: isAdmin,
  });

  const allocations = allocationsData?.items ?? [];

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["budget", "allocations", logsTarget?.id, "logs", logsPage],
    queryFn: async () => {
      const res = await api.get<{
        items: BudgetAllocationLogRow[];
        meta: { total: number; page: number; take: number; pages: number };
      }>(
        `/api/budget/allocations/${logsTarget!.id}/logs?page=${logsPage}&take=${DEFAULT_LIST_PAGE_SIZE}`,
      );
      return res.data;
    },
    enabled: !!logsTarget?.id,
  });

  const logs = logsData?.items ?? [];

  const createMut = useMutation({
    mutationFn: async () => {
      await api.post("/api/budget/allocations", {
        name: name.trim(),
        period: period.trim() || undefined,
        description: description.trim() || undefined,
        initialAmount: Number(initialAmount),
        initialDescription: initialDescription.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Pos alokasi dibuat.");
      setCreateOpen(false);
      resetCreateForm();
      setPage(1);
      void qc.invalidateQueries({ queryKey: ["budget"] });
    },
    onError: () => toast.error("Gagal membuat alokasi."),
  });

  const adjustMut = useMutation({
    mutationFn: async () => {
      if (!adjustTarget) return;
      await api.post(`/api/budget/allocations/${adjustTarget.id}/adjust`, {
        type: adjustType,
        amount: Number(adjustAmount),
        description: adjustDescription.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Mutasi alokasi disimpan.");
      setAdjustTarget(null);
      setAdjustAmount("");
      setAdjustDescription("");
      void qc.invalidateQueries({ queryKey: ["budget"] });
    },
    onError: () => toast.error("Gagal menyimpan mutasi."),
  });

  const resetCreateForm = () => {
    setName("");
    setPeriod("");
    setDescription("");
    setInitialAmount("");
    setInitialDescription("");
  };

  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Kelola Alokasi</h1>
        <p className="text-muted-foreground text-sm">
          Halaman ini hanya dapat diakses admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Kelola Alokasi
          </h1>
          <p className="text-muted-foreground text-sm">
            Pos dana anggaran — tambah, kurangi, dan riwayat mutasi tercatat.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 size-4" />
          Tambah pos alokasi
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama pos alokasi</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead className="text-right">Total alokasi</TableHead>
              <TableHead className="text-right">Terpakai</TableHead>
              <TableHead className="text-right">Sisa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  Memuat…
                </TableCell>
              </TableRow>
            ) : allocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  Belum ada pos alokasi.
                </TableCell>
              </TableRow>
            ) : (
              allocations.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    {row.description ? (
                      <div className="text-muted-foreground max-w-xs truncate text-xs">
                        {row.description}
                      </div>
                    ) : null}
                  </TableCell>
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
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                        row.isActive
                          ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                          : "bg-zinc-100 text-zinc-600 ring-zinc-200",
                      )}
                    >
                      {row.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Aksi alokasi"
                        >
                          <MoreVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[11rem]">
                          <DropdownMenuItem
                            onClick={() => {
                              setLogsTarget(row);
                              setLogsPage(1);
                            }}
                          >
                            <History className="mr-2 size-3.5" />
                            Riwayat
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAdjustTarget(row);
                              setAdjustType("increase");
                              setAdjustAmount("");
                              setAdjustDescription("");
                            }}
                          >
                            <Settings2 className="mr-2 size-3.5" />
                            Mutasi
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {allocationsData?.meta ? (
        <ListPaginationBar
          page={allocationsData.meta.page}
          total={allocationsData.meta.total}
          pageSize={DEFAULT_LIST_PAGE_SIZE}
          onPageChange={setPage}
          onPageSizeChange={() => {}}
        />
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah pos alokasi</DialogTitle>
            <DialogDescription>
              Buat pos dana baru beserta saldo awal (opsional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nama pos alokasi</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dana Operasional 2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Periode (opsional)</Label>
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="2026 / 2026-Q1"
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi (opsional)</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Saldo awal</Label>
                <Input
                  type="number"
                  min={0}
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Keterangan saldo awal</Label>
                <Input
                  value={initialDescription}
                  onChange={(e) => setInitialDescription(e.target.value)}
                  placeholder="Alokasi awal tahun 2026"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!name.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!adjustTarget}
        onOpenChange={(open) => !open && setAdjustTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mutasi alokasi</DialogTitle>
            <DialogDescription>
              {adjustTarget?.name} — saldo saat ini{" "}
              {fmtMoney(adjustTarget?.allocated ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Jenis mutasi</Label>
              <Select
                value={adjustType}
                onValueChange={(v) => v && setAdjustType(v)}
                items={BUDGET_ALLOCATION_ADJUST_ITEMS}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_ALLOCATION_ADJUST_ITEMS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {adjustType === "adjustment"
                  ? "Saldo baru"
                  : "Nominal mutasi"}
              </Label>
              <Input
                type="number"
                min={0}
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Keterangan (wajib)</Label>
              <Textarea
                rows={3}
                value={adjustDescription}
                onChange={(e) => setAdjustDescription(e.target.value)}
                placeholder="Untuk apa mutasi ini dilakukan"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustTarget(null)}>
              Batal
            </Button>
            <Button
              disabled={
                !adjustDescription.trim() ||
                !adjustAmount ||
                adjustMut.isPending
              }
              onClick={() => adjustMut.mutate()}
            >
              Simpan mutasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!logsTarget}
        onOpenChange={(open) => {
          if (!open) {
            setLogsTarget(null);
            setLogsPage(1);
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] w-[min(96vw,56rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Riwayat mutasi</DialogTitle>
            <DialogDescription>
              {logsTarget?.name}
              {logsTarget?.period ? ` · ${logsTarget.period}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="overflow-hidden rounded-md border">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[9.5rem]">Waktu</TableHead>
                    <TableHead className="w-[7.5rem]">User</TableHead>
                    <TableHead className="w-[8.5rem]">Jenis</TableHead>
                    <TableHead className="w-[7.5rem] text-right">Nominal</TableHead>
                    <TableHead className="w-[10.5rem] text-right">Saldo</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        Memuat…
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        Belum ada riwayat.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="align-top text-xs leading-snug whitespace-normal">
                          {fmtDate(log.createdAt)}
                        </TableCell>
                        <TableCell className="align-top text-sm whitespace-normal break-words">
                          {log.actor.name}
                        </TableCell>
                        <TableCell className="align-top text-sm whitespace-normal">
                          {budgetAllocationLogTypeLabel(log.type)}
                        </TableCell>
                        <TableCell className="align-top text-right text-sm tabular-nums whitespace-nowrap">
                          {fmtMoney(log.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground align-top text-right text-xs leading-snug whitespace-normal">
                          <span className="block tabular-nums">
                            {fmtMoney(log.balanceBefore)}
                          </span>
                          <span className="block tabular-nums">
                            → {fmtMoney(log.balanceAfter)}
                          </span>
                        </TableCell>
                        <TableCell className="align-top text-sm leading-snug whitespace-normal break-words">
                          {log.description}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {logsData?.meta ? (
            <ListPaginationBar
              page={logsData.meta.page}
              total={logsData.meta.total}
              pageSize={DEFAULT_LIST_PAGE_SIZE}
              onPageChange={setLogsPage}
              onPageSizeChange={() => {}}
              className="shrink-0 border-t"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
