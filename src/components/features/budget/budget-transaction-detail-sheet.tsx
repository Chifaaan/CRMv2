"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  budgetCategoryLabel,
  budgetStatusClass,
  budgetStatusLabel,
  budgetTypeLabel,
} from "@/lib/budget-constants";
import type { BudgetTransactionRow } from "@/lib/budget-types";
import { toDownloadUrl } from "@/lib/attachment-url";
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
    });
  } catch {
    return "—";
  }
}

export function BudgetTransactionDetailSheet({
  open,
  onOpenChange,
  transaction,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transaction: BudgetTransactionRow | null;
}) {
  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-xl">
        <DialogHeader className="border-b px-4 py-4 sm:px-6">
          <DialogTitle>{transaction.title}</DialogTitle>
          <DialogDescription>
            Detail transaksi budget & riwayat approval
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <span className="text-muted-foreground">Jenis</span>
              <p className="font-medium">{budgetTypeLabel(transaction.type)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Kategori</span>
              <p className="font-medium">
                {budgetCategoryLabel(transaction.category)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Tanggal</span>
              <p className="font-medium">{fmtDate(transaction.transactionDate)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Pengaju</span>
              <p className="font-medium">{transaction.requester?.name ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                    budgetStatusClass(transaction.status),
                  )}
                >
                  {budgetStatusLabel(transaction.status)}
                </span>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Pos alokasi</span>
              <p className="font-medium">{transaction.budget?.name ?? "—"}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <span className="text-muted-foreground">Total nominal</span>
              <p className="text-xl font-semibold tabular-nums">
                {fmtMoney(transaction.totalAmount)}
              </p>
            </div>
            {transaction.notes ? (
              <div className="sm:col-span-2 lg:col-span-3">
                <span className="text-muted-foreground">Keterangan</span>
                <p className="mt-1 whitespace-pre-wrap rounded-lg border bg-muted/20 p-3">
                  {transaction.notes}
                </p>
              </div>
            ) : null}
            {transaction.rejectionNote ? (
              <div className="sm:col-span-2 lg:col-span-3">
                <span className="text-muted-foreground">Alasan ditolak</span>
                <p className="mt-1 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                  {transaction.rejectionNote}
                </p>
              </div>
            ) : null}
          </div>

          {transaction.items?.length ? (
            <div>
              <h4 className="mb-3 text-sm font-medium">Item</h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead className="text-right">Harga satuan</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transaction.items.map((it, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{it.name}</TableCell>
                        <TableCell>{Number(it.quantity)}</TableCell>
                        <TableCell>{it.unit}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtMoney(it.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtMoney(it.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          {transaction.attachments?.length ? (
            <div>
              <h4 className="mb-3 text-sm font-medium">Lampiran</h4>
              <ul className="grid gap-2 sm:grid-cols-2">
                {transaction.attachments.map((a) => (
                  <li key={a.url}>
                    <a
                      href={toDownloadUrl(a.url)}
                      target="_blank"
                      rel="noreferrer"
                      {...(a.url.startsWith("/uploads/") ? { download: a.name } : {})}
                      className="text-primary hover:bg-muted/40 flex items-center rounded-lg border px-3 py-2 text-sm transition-colors hover:underline"
                    >
                      {a.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {transaction.approvalLogs?.length ? (
            <div>
              <h4 className="mb-3 text-sm font-medium">Riwayat approval</h4>
              <ul className="grid gap-2 sm:grid-cols-2">
                {transaction.approvalLogs.map((log) => (
                  <li key={log.id} className="rounded-lg border p-3">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{log.approver.name}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {fmtDate(log.createdAt)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-xs font-medium",
                        log.decision === "approved"
                          ? "text-emerald-700"
                          : "text-red-700",
                      )}
                    >
                      {log.decision === "approved" ? "Disetujui" : "Ditolak"}
                    </p>
                    {log.note ? (
                      <p className="text-muted-foreground mt-2 text-sm">{log.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
