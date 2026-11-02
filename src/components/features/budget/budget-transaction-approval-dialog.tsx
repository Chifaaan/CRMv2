"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import type { BudgetAllocationRow, BudgetTransactionRow } from "@/lib/budget-types";

function fmtMoney(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function txAmount(tx: BudgetTransactionRow) {
  const n = typeof tx.totalAmount === "number" ? tx.totalAmount : Number(tx.totalAmount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function allocationLabel(a: BudgetAllocationRow) {
  const base = a.period ? `${a.name} (${a.period})` : a.name;
  return `${base} — sisa ${fmtMoney(a.remaining)}`;
}

export function BudgetTransactionApprovalDialog({
  open,
  onOpenChange,
  transaction,
  acting,
  onApprove,
  onReject,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transaction: BudgetTransactionRow | null;
  acting?: boolean;
  onApprove: (payload: { note?: string; budgetId: string }) => Promise<void>;
  onReject: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [budgetId, setBudgetId] = useState("");

  const { data: allocationsData } = useQuery({
    queryKey: ["budget", "allocations", "approval-options"],
    queryFn: async () => {
      const res = await api.get<{
        items: BudgetAllocationRow[];
        meta: { total: number; pages: number };
      }>("/api/budget/allocations?activeOnly=true&page=1&take=100");
      return res.data;
    },
    enabled: open,
  });

  const allocations = allocationsData?.items ?? [];

  const allocationItems = useMemo(
    () =>
      allocations.map((a) => ({
        value: a.id,
        label: allocationLabel(a),
      })),
    [allocations],
  );

  useEffect(() => {
    if (open) {
      setNote("");
      setBudgetId("");
    }
  }, [open, transaction?.id]);

  const selectedAllocation = useMemo(
    () => allocations.find((a) => a.id === budgetId),
    [allocations, budgetId],
  );

  if (!transaction) return null;

  const amount = txAmount(transaction);
  const isExpense = transaction.type === "expense";

  const handleApprove = async () => {
    if (!budgetId) {
      toast.error("Pos alokasi wajib dipilih saat approve.");
      return;
    }
    if (
      isExpense &&
      selectedAllocation &&
      amount > selectedAllocation.remaining
    ) {
      toast.error("Sisa alokasi tidak cukup untuk transaksi ini.");
      return;
    }
    await onApprove({ note: note.trim() || undefined, budgetId });
    onOpenChange(false);
  };

  const handleReject = async () => {
    if (!note.trim()) {
      toast.error("Keterangan penolakan wajib diisi.");
      return;
    }
    await onReject(note.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Approve / Tolak transaksi</DialogTitle>
          <DialogDescription>
            Pilih pos alokasi dan berikan keterangan untuk transaksi &quot;
            {transaction.title}&quot; ({fmtMoney(amount)}).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Pos alokasi (wajib saat approve)</Label>
            <Select
              value={budgetId || undefined}
              onValueChange={(v) => setBudgetId(v ?? "")}
              items={allocationItems}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih pos alokasi" />
              </SelectTrigger>
              <SelectContent>
                {allocationItems.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    Belum ada alokasi aktif
                  </SelectItem>
                ) : (
                  allocationItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedAllocation ? (
              <p className="text-muted-foreground text-xs">
                Alokasi: {fmtMoney(selectedAllocation.allocated)} · Terpakai:{" "}
                {fmtMoney(selectedAllocation.usedExpense)} · Sisa:{" "}
                {fmtMoney(selectedAllocation.remaining)}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Keterangan</Label>
            <Textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Wajib diisi saat menolak; opsional saat menyetujui."
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={acting}
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={acting}
            onClick={() => void handleReject()}
          >
            Tolak
          </Button>
          <Button type="button" disabled={acting} onClick={() => void handleApprove()}>
            Setujui
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
