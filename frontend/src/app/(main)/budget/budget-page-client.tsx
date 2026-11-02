"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Send,
  Settings2,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BudgetApproverConfigDialog } from "@/components/features/budget/budget-approver-config-dialog";
import { BudgetTransactionApprovalDialog } from "@/components/features/budget/budget-transaction-approval-dialog";
import { BudgetTransactionDetailSheet } from "@/components/features/budget/budget-transaction-detail-sheet";
import { BudgetTransactionFormDialog } from "@/components/features/budget/budget-transaction-form-dialog";
import { ActiveFilterChips } from "@/components/features/crud/active-filter-chips";
import { ResourceListToolbar } from "@/components/features/crud/resource-list-toolbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  FilterSheetBody,
  filterDialogContentClassName,
  filterDialogFooterClassName,
  filterDialogHeaderClassName,
  filterSheetDescriptionClassName,
  filterSheetFieldClassName,
  filterSheetLabelClassName,
  filterSheetTitleClassName,
} from "@/components/ui/filter-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
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
  BUDGET_CATEGORIES,
  BUDGET_CATEGORY_FILTER_ITEMS,
  BUDGET_DASHBOARD_CATEGORY_FILTER_ITEMS,
  BUDGET_STATUSES,
  BUDGET_STATUS_FILTER_ITEMS,
  BUDGET_TRANSACTION_TYPES,
  BUDGET_TYPE_FILTER_ITEMS,
  budgetCategoryLabel,
  budgetStatusClass,
  budgetStatusLabel,
  budgetTypeLabel,
  budgetAllocationLabel,
} from "@/lib/budget-constants";
import type { BudgetMeMeta, BudgetTransactionRow } from "@/lib/budget-types";
import {
  canEditBudgetTransaction,
  canManageBudgetTransactions,
  canSubmitBudgetTransaction,
  isBudgetAdmin,
} from "@/lib/budget-access";
import type { ListPageSize } from "@/lib/list-pagination";
import { cn } from "@/lib/utils";

function buildFilterChips(args: {
  statusFilter: string;
  categoryFilter: string;
  typeFilter: string;
  fromFilter: string;
  toFilter: string;
}) {
  const chips: { id: string; label: string }[] = [];
  if (args.statusFilter) {
    chips.push({
      id: "status",
      label: `Status: ${budgetStatusLabel(args.statusFilter)}`,
    });
  }
  if (args.categoryFilter) {
    chips.push({
      id: "category",
      label: `Kategori: ${budgetCategoryLabel(args.categoryFilter)}`,
    });
  }
  if (args.typeFilter) {
    chips.push({
      id: "type",
      label: `Jenis: ${budgetTypeLabel(args.typeFilter)}`,
    });
  }
  if (args.fromFilter) {
    chips.push({ id: "from", label: `Dari: ${args.fromFilter}` });
  }
  if (args.toFilter) {
    chips.push({ id: "to", label: `Sampai: ${args.toFilter}` });
  }
  return chips;
}

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
    });
  } catch {
    return "—";
  }
}

export function BudgetPageClient() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "developer";

  const [approverConfigOpen, setApproverConfigOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [take, setTake] = useState<ListPageSize>(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetTransactionRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTx, setDetailTx] = useState<BudgetTransactionRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalTx, setApprovalTx] = useState<BudgetTransactionRow | null>(null);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("take", String(take));
    if (search.trim()) p.set("q", search.trim());
    if (statusFilter) p.set("status", statusFilter);
    if (categoryFilter) p.set("category", categoryFilter);
    if (typeFilter) p.set("type", typeFilter);
    if (fromFilter) p.set("from", fromFilter);
    if (toFilter) p.set("to", toFilter);
    return p.toString();
  }, [
    page,
    take,
    search,
    statusFilter,
    categoryFilter,
    typeFilter,
    fromFilter,
    toFilter,
  ]);

  const { data: meMeta, isLoading: meLoading } = useQuery({
    queryKey: ["budget", "me"],
    queryFn: async () => {
      const res = await api.get<BudgetMeMeta>("/api/budget/meta/me");
      return res.data;
    },
    enabled: canManageBudgetTransactions(role),
  });

  const canAccess = meMeta?.canAccessBudget ?? canManageBudgetTransactions(role);
  const isAdmin = meMeta?.isAdmin ?? isBudgetAdmin(role);
  const isApprover = meMeta?.isApprover ?? false;
  const canExport = meMeta?.canExport ?? isAdmin;
  const canApproveActions = meMeta?.canApprove ?? isApprover;
  const showRequesterColumn =
    meMeta?.showRequesterColumn ?? (isAdmin || isApprover);
  const showAllocationColumn = isAdmin;
  const tableColCount = showRequesterColumn ? 10 : 8;

  const { data: listData, isLoading } = useQuery({
    queryKey: ["budget", "transactions", queryParams],
    queryFn: async () => {
      const res = await api.get<{
        items: BudgetTransactionRow[];
        meta: { total: number; page: number; take: number; pages: number };
      }>(`/api/budget/transactions?${queryParams}`);
      return res.data;
    },
    enabled: canAccess,
  });

  const saveMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (editing) {
        await api.patch(`/api/budget/transactions/${editing.id}`, payload);
      } else {
        await api.post("/api/budget/transactions", payload);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Transaksi diperbarui." : "Transaksi dibuat.");
      setFormOpen(false);
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["budget"] });
    },
    onError: () => toast.error("Gagal menyimpan transaksi."),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/budget/transactions/${id}`);
    },
    onSuccess: () => {
      toast.success("Transaksi dihapus.");
      setDeleteId(null);
      void qc.invalidateQueries({ queryKey: ["budget"] });
    },
    onError: () => toast.error("Gagal menghapus."),
  });

  const submitMut = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/budget/transactions/${id}/submit`);
    },
    onSuccess: () => {
      toast.success("Pengajuan dikirim untuk approval.");
      void qc.invalidateQueries({ queryKey: ["budget"] });
    },
    onError: () => toast.error("Gagal mengajukan."),
  });

  const approveMut = useMutation({
    mutationFn: async ({
      id,
      note,
      budgetId,
    }: {
      id: string;
      note?: string;
      budgetId: string;
    }) => {
      await api.post(`/api/budget/transactions/${id}/approve`, { note, budgetId });
    },
    onSuccess: () => {
      toast.success("Transaksi disetujui.");
      setApprovalOpen(false);
      setApprovalTx(null);
      void qc.invalidateQueries({ queryKey: ["budget"] });
    },
    onError: () => toast.error("Gagal menyetujui."),
  });

  const rejectMut = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      await api.post(`/api/budget/transactions/${id}/reject`, { note });
    },
    onSuccess: () => {
      toast.success("Transaksi ditolak.");
      setApprovalOpen(false);
      setApprovalTx(null);
      void qc.invalidateQueries({ queryKey: ["budget"] });
    },
    onError: () => toast.error("Gagal menolak."),
  });

  const openDetail = async (id: string) => {
    const res = await api.get<BudgetTransactionRow>(`/api/budget/transactions/${id}`);
    setDetailTx(res.data);
    setDetailOpen(true);
  };

  const openEdit = async (id: string) => {
    const res = await api.get<BudgetTransactionRow>(`/api/budget/transactions/${id}`);
    setEditing(res.data);
    setFormOpen(true);
  };

  const filterCount = [
    statusFilter,
    categoryFilter,
    typeFilter,
    fromFilter,
    toFilter,
  ].filter(Boolean).length;

  const exportQuery = queryParams.replace(/page=\d+&?/, "").replace(/take=\d+&?/, "");

  if (!canManageBudgetTransactions(role)) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
        <p className="text-muted-foreground text-sm">
          Fitur budget tidak tersedia untuk peran Anda.
        </p>
      </div>
    );
  }

  if (meLoading) {
    return (
      <p className="text-muted-foreground text-sm">Memuat…</p>
    );
  }

  if (!canAccess) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
        <p className="text-muted-foreground text-sm">
          Fitur budget tidak tersedia untuk peran Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
          <p className="text-muted-foreground text-sm">
            Manajemen transaksi anggaran & approval.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setApproverConfigOpen(true)}
            >
              <Settings2 className="mr-1 size-4" />
              Konfigurasi Approver
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1 size-4" />
            Tambah transaksi
          </Button>
        </div>
      </div>

      <div className="space-y-4">
          <ResourceListToolbar
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            searchPlaceholder="Cari judul atau keterangan…"
            filterActiveCount={filterCount}
            onOpenFilter={() => setFilterOpen(true)}
          >
            {canExport ? (
              <>
                <a
                  href={`/api/budget/transactions/export/xlsx?${exportQuery}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Download className="mr-1 size-3.5" />
                  XLSX
                </a>
                <a
                  href={`/api/budget/transactions/export/pdf?${exportQuery}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Download className="mr-1 size-3.5" />
                  PDF
                </a>
              </>
            ) : null}
          </ResourceListToolbar>

          <ActiveFilterChips
            items={buildFilterChips({
              statusFilter,
              categoryFilter,
              typeFilter,
              fromFilter,
              toFilter,
            })}
            onRemove={(id) => {
              if (id === "status") setStatusFilter("");
              if (id === "category") setCategoryFilter("");
              if (id === "type") setTypeFilter("");
              if (id === "from") setFromFilter("");
              if (id === "to") setToFilter("");
            }}
          />

          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Tanggal</TableHead>
                  {showRequesterColumn ? <TableHead>Pengaju</TableHead> : null}
                  {showAllocationColumn ? (
                    <TableHead>Alokasi anggaran</TableHead>
                  ) : null}
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={tableColCount} className="text-muted-foreground">
                      Memuat…
                    </TableCell>
                  </TableRow>
                ) : (listData?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={tableColCount} className="text-muted-foreground">
                      Tidak ada transaksi.
                    </TableCell>
                  </TableRow>
                ) : (
                  listData!.items.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {tx.title}
                      </TableCell>
                      <TableCell>{budgetTypeLabel(tx.type)}</TableCell>
                      <TableCell>{budgetCategoryLabel(tx.category)}</TableCell>
                      <TableCell>{fmtDate(tx.transactionDate)}</TableCell>
                      {showRequesterColumn ? (
                        <TableCell>{tx.requester?.name ?? "—"}</TableCell>
                      ) : null}
                      {showAllocationColumn ? (
                        <TableCell className="max-w-[180px] truncate">
                          {budgetAllocationLabel(tx.budget)}
                        </TableCell>
                      ) : null}
                      <TableCell className="text-right tabular-nums">
                        {fmtMoney(tx.totalAmount)}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground">
                        {tx.notes?.trim() || "—"}
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
                      <TableCell>
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label="Aksi transaksi"
                            >
                              <MoreVertical className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[12.5rem]">
                              <DropdownMenuItem
                                onClick={() => void openDetail(tx.id)}
                              >
                                <Eye className="mr-2 size-3.5" />
                                Lihat detail
                              </DropdownMenuItem>
                              {canEditBudgetTransaction(tx.status, { isAdmin }) ? (
                                <DropdownMenuItem
                                  onClick={() => void openEdit(tx.id)}
                                >
                                  <Pencil className="mr-2 size-3.5" />
                                  Edit
                                </DropdownMenuItem>
                              ) : null}
                              {canSubmitBudgetTransaction(tx.status) ? (
                                <DropdownMenuItem
                                  onClick={() => submitMut.mutate(tx.id)}
                                  disabled={submitMut.isPending}
                                >
                                  <Send className="mr-2 size-3.5" />
                                  Ajukan approval
                                </DropdownMenuItem>
                              ) : null}
                              {tx.canApprove && canApproveActions ? (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setApprovalTx(tx);
                                    setApprovalOpen(true);
                                  }}
                                >
                                  <CheckCircle2 className="mr-2 size-3.5" />
                                  Approve / Tolak
                                </DropdownMenuItem>
                              ) : null}
                              {tx.status === "draft" ||
                              tx.status === "pending_approval" ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteId(tx.id)}
                                  >
                                    <Trash2 className="mr-2 size-3.5" />
                                    Hapus
                                  </DropdownMenuItem>
                                </>
                              ) : null}
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

          {listData?.meta ? (
            <ListPaginationBar
              page={listData.meta.page}
              total={listData.meta.total}
              pageSize={take}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setTake(n);
                setPage(1);
              }}
            />
          ) : null}
      </div>

      <BudgetApproverConfigDialog
        open={approverConfigOpen}
        onOpenChange={setApproverConfigOpen}
      />

      <BudgetTransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        saving={saveMut.isPending}
        onSave={async (payload) => {
          await saveMut.mutateAsync(payload);
        }}
      />

      <BudgetTransactionDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        transaction={detailTx}
      />

      <BudgetTransactionApprovalDialog
        open={approvalOpen}
        onOpenChange={(open) => {
          setApprovalOpen(open);
          if (!open) setApprovalTx(null);
        }}
        transaction={approvalTx}
        acting={approveMut.isPending || rejectMut.isPending}
        onApprove={async ({ note, budgetId }) => {
          if (approvalTx) {
            await approveMut.mutateAsync({
              id: approvalTx.id,
              note,
              budgetId,
            });
          }
        }}
        onReject={async (note) => {
          if (approvalTx) await rejectMut.mutateAsync({ id: approvalTx.id, note });
        }}
      />

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className={filterDialogContentClassName}>
          <DialogHeader className={filterDialogHeaderClassName}>
            <DialogTitle className={filterSheetTitleClassName}>
              Filter transaksi
            </DialogTitle>
            <DialogDescription className={filterSheetDescriptionClassName}>
              Sempitkan daftar berdasarkan status, kategori, jenis, dan rentang
              tanggal.
            </DialogDescription>
          </DialogHeader>
          <FilterSheetBody className="px-6 py-5">
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Status</Label>
              <Select
                value={statusFilter || "__all__"}
                onValueChange={(v) => setStatusFilter(!v || v === "__all__" ? "" : v)}
                items={BUDGET_STATUS_FILTER_ITEMS}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua</SelectItem>
                  {BUDGET_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Kategori</Label>
              <Select
                value={categoryFilter || "__all__"}
                onValueChange={(v) => setCategoryFilter(!v || v === "__all__" ? "" : v)}
                items={BUDGET_CATEGORY_FILTER_ITEMS}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua</SelectItem>
                  {BUDGET_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Jenis</Label>
              <Select
                value={typeFilter || "__all__"}
                onValueChange={(v) => setTypeFilter(!v || v === "__all__" ? "" : v)}
                items={BUDGET_TYPE_FILTER_ITEMS}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua</SelectItem>
                  {BUDGET_TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Dari tanggal</Label>
              <Input
                type="date"
                value={fromFilter}
                onChange={(e) => setFromFilter(e.target.value)}
              />
            </div>
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Sampai tanggal</Label>
              <Input
                type="date"
                value={toFilter}
                onChange={(e) => setToFilter(e.target.value)}
              />
            </div>
          </FilterSheetBody>
          <DialogFooter className={filterDialogFooterClassName}>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStatusFilter("");
                setCategoryFilter("");
                setTypeFilter("");
                setFromFilter("");
                setToFilter("");
              }}
            >
              Reset
            </Button>
            <Button type="button" onClick={() => setFilterOpen(false)}>
              Terapkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Transaksi akan diarsipkan (soft delete).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
