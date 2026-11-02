"use client";

import { Paperclip, Plus, Trash2, X } from "lucide-react";
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
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BUDGET_CATEGORIES,
  BUDGET_TRANSACTION_TYPES,
} from "@/lib/budget-constants";
import type { BudgetItemRow, BudgetTransactionRow } from "@/lib/budget-types";
import { uploadFiles } from "@/lib/upload";

type ItemForm = BudgetItemRow;

const emptyItem = (): ItemForm => ({
  name: "",
  quantity: 1,
  unit: "pcs",
  unitPrice: 0,
  subtotal: 0,
});

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function addAttachmentFiles(prev: File[], incoming: File[]) {
  const accepted: File[] = [];
  for (const file of incoming) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.warning(`"${file.name}" melebihi 10 MB dan dilewati.`);
      continue;
    }
    accepted.push(file);
  }
  if (!accepted.length) return prev;
  return [...prev, ...accepted];
}

export function BudgetTransactionFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: BudgetTransactionRow | null;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  saving?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("operational");
  const [transactionDate, setTransactionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<
    { url: string; name: string }[]
  >([]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setType(editing.type);
      setCategory(editing.category);
      setTransactionDate(editing.transactionDate.slice(0, 10));
      setNotes(editing.notes ?? "");
      setItems(
        editing.items?.length
          ? editing.items.map((it) => ({
              name: it.name,
              quantity: Number(it.quantity),
              unit: it.unit,
              unitPrice: Number(it.unitPrice),
              subtotal: Number(it.subtotal),
            }))
          : [emptyItem()],
      );
      setExistingAttachments(
        (editing.attachments ?? []).map((a) => ({ url: a.url, name: a.name })),
      );
      setPendingFiles([]);
    } else {
      setTitle("");
      setType("expense");
      setCategory("operational");
      setTransactionDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setItems([emptyItem()]);
      setExistingAttachments([]);
      setPendingFiles([]);
    }
  }, [open, editing]);

  const total = useMemo(
    () =>
      items.reduce(
        (s, it) => s + Number(it.quantity || 0) * Number(it.unitPrice || 0),
        0,
      ),
    [items],
  );

  const updateItem = (idx: number, patch: Partial<ItemForm>) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, ...patch };
        next.subtotal = Number(next.quantity) * Number(next.unitPrice);
        return next;
      }),
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Judul wajib diisi.");
      return;
    }
    let attachments = [...existingAttachments];
    if (pendingFiles.length) {
      const uploaded = await uploadFiles(pendingFiles, "budget");
      attachments = [
        ...attachments,
        ...uploaded.map((u) => ({
          url: u.url,
          name: u.name,
          mimeType: u.mimeType,
          size: u.size,
        })),
      ];
    }
    await onSave({
      title: title.trim(),
      type,
      category,
      transactionDate,
      notes: notes.trim() || undefined,
      totalAmount: total,
      items: items
        .filter((it) => it.name.trim())
        .map((it) => ({
          name: it.name.trim(),
          quantity: Number(it.quantity),
          unit: it.unit.trim() || "pcs",
          unitPrice: Number(it.unitPrice),
          subtotal: Number(it.quantity) * Number(it.unitPrice),
        })),
      attachments,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-xl">
        <DialogHeader className="border-b px-4 py-4 sm:px-6">
          <DialogTitle>
            {editing ? "Edit transaksi budget" : "Tambah transaksi budget"}
          </DialogTitle>
          <DialogDescription>
            Isi detail pengajuan pemasukan atau pengeluaran anggaran.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="space-y-2">
            <Label>Judul / nama pengajuan</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Jenis transaksi</Label>
              <Select
                value={type}
                onValueChange={(v) => v && setType(v)}
                items={[...BUDGET_TRANSACTION_TYPES]}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={category}
                onValueChange={(v) => v && setCategory(v)}
                items={[...BUDGET_CATEGORIES]}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tanggal transaksi</Label>
            <Input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Daftar item</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItems((p) => [...p, emptyItem()])}
              >
                <Plus className="mr-1 size-3.5" />
                Item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 rounded-lg border p-2 sm:grid-cols-12"
                >
                  <Input
                    className="sm:col-span-4"
                    placeholder="Nama barang"
                    value={it.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                  />
                  <Input
                    className="sm:col-span-2"
                    type="number"
                    min={0}
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) =>
                      updateItem(idx, { quantity: Number(e.target.value) })
                    }
                  />
                  <Input
                    className="sm:col-span-2"
                    placeholder="Satuan"
                    value={it.unit}
                    onChange={(e) => updateItem(idx, { unit: e.target.value })}
                  />
                  <Input
                    className="sm:col-span-3"
                    type="number"
                    min={0}
                    placeholder="Harga satuan"
                    value={it.unitPrice || ""}
                    onChange={(e) =>
                      updateItem(idx, { unitPrice: Number(e.target.value) })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="sm:col-span-1"
                    disabled={items.length <= 1}
                    onClick={() =>
                      setItems((p) => p.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-right text-sm tabular-nums">
              Total:{" "}
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(total)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Lampiran</Label>
            <FileDropZone
              busy={saving}
              onFiles={(files) =>
                setPendingFiles((prev) => addAttachmentFiles(prev, files))
              }
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
              label="Seret file ke sini atau klik untuk memilih"
              hint="PDF, gambar, dokumen, arsip — maks 10 MB per file, bisa beberapa sekaligus"
            />
            {existingAttachments.length > 0 ? (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Lampiran tersimpan</p>
                {existingAttachments.map((a) => (
                  <div
                    key={a.url}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Paperclip className="text-muted-foreground size-3.5 shrink-0" />
                      <span className="truncate text-sm">{a.name}</span>
                    </div>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive ml-2 shrink-0 rounded p-0.5"
                      aria-label={`Hapus lampiran ${a.name}`}
                      onClick={() =>
                        setExistingAttachments((prev) =>
                          prev.filter((item) => item.url !== a.url),
                        )
                      }
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {pendingFiles.length > 0 ? (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">
                  {pendingFiles.length} file siap diunggah
                </p>
                {pendingFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${file.size}-${idx}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Paperclip className="text-muted-foreground size-3.5 shrink-0" />
                      <span className="truncate text-sm">{file.name}</span>
                      <span className="text-muted-foreground shrink-0 text-[11px]">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive ml-2 shrink-0 rounded p-0.5"
                      aria-label={`Hapus ${file.name}`}
                      onClick={() =>
                        setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Keterangan</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="border-t bg-transparent px-4 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSubmit()}>
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
