"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TransferTargetProject } from "./task-transfer-types";

type PickProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceProjectId: string;
  taskCount: number;
  targetProjectId: string;
  onTargetProjectIdChange: (id: string) => void;
  onSubmit: () => void;
};

export function TaskTransferPickProjectDialog({
  open,
  onOpenChange,
  sourceProjectId,
  taskCount,
  targetProjectId,
  onTargetProjectIdChange,
  onSubmit,
}: PickProjectDialogProps) {
  const targetsQ = useQuery({
    queryKey: ["tasks", "transfer-targets", sourceProjectId],
    queryFn: async () => {
      const { data } = await api.get<TransferTargetProject[]>(
        "/api/tasks/transfer-targets",
        { params: { excludeProjectId: sourceProjectId } },
      );
      return data;
    },
    enabled: open,
  });

  const projects = targetsQ.data ?? [];
  const selectItems = projects.map((p) => ({
    value: p.id,
    label: p.name.trim() ? `${p.name.trim()} (${p.code})` : p.code,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pindahkan task</DialogTitle>
          <DialogDescription>
            Pilih proyek tujuan untuk {taskCount} task yang dipilih. Hanya
            proyek aktif yang Anda ikuti yang ditampilkan.
          </DialogDescription>
        </DialogHeader>
        {targetsQ.isPending ? (
          <p className="text-sm text-zinc-500">Memuat daftar proyek…</p>
        ) : targetsQ.isError ? (
          <p className="text-sm text-red-600">
            Gagal memuat proyek tujuan. Coba lagi.
          </p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Tidak ada proyek aktif lain yang tersedia untuk transfer.
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="transfer-target-project">Proyek tujuan</Label>
            <Select
              value={targetProjectId || undefined}
              onValueChange={(v) => onTargetProjectIdChange(v ?? "")}
              items={selectItems}
            >
              <SelectTrigger id="transfer-target-project" className="w-full">
                <SelectValue placeholder="Pilih proyek…" />
              </SelectTrigger>
              <SelectContent>
                {selectItems.map((it) => (
                  <SelectItem key={it.value} value={it.value}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            type="button"
            disabled={!targetProjectId}
            onClick={onSubmit}
          >
            Lanjut
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskCount: number;
  targetLabel: string;
  pending?: boolean;
  onConfirm: () => void;
};

export function TaskTransferConfirmDialog({
  open,
  onOpenChange,
  taskCount,
  targetLabel,
  pending,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi pemindahan task</AlertDialogTitle>
          <AlertDialogDescription>
            {taskCount === 1 ? (
              <>
                Task ini akan dipindahkan ke proyek{" "}
                <span className="font-medium text-zinc-800">{targetLabel}</span>
                . Nomor task akan disesuaikan di proyek asal dan tujuan.
              </>
            ) : (
              <>
                {taskCount} task akan dipindahkan ke proyek{" "}
                <span className="font-medium text-zinc-800">{targetLabel}</span>
                . Nomor task akan disesuaikan di proyek asal dan tujuan.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm}>
            {pending ? "Memindahkan…" : "Pindahkan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
