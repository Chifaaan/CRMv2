"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TASK_STATUS_LABELS } from "@/components/features/board/board-constants";

type ParkingLotStatus = "on_hold" | "cancelled";

type Props = {
  open: boolean;
  targetStatus: ParkingLotStatus | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isPending?: boolean;
};

export function ParkingLotReasonModal({
  open,
  targetStatus,
  onConfirm,
  onCancel,
  isPending = false,
}: Props) {
  const [reason, setReason] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next && !isPending) {
      setReason("");
      onCancel();
    }
  }

  function handleConfirm() {
    const trimmed = reason.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    setReason("");
  }

  const statusLabel = targetStatus
    ? (TASK_STATUS_LABELS[targetStatus] ?? targetStatus)
    : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keterangan wajib</DialogTitle>
          <DialogDescription>
            Task akan dipindahkan ke{" "}
            <span className="font-medium text-zinc-900">{statusLabel}</span>.
            Jelaskan alasan pemindahan ke Parking Lot.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="parking-lot-reason">Alasan</Label>
          <Textarea
            id="parking-lot-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: menunggu persetujuan klien, scope ditunda, dll."
            rows={4}
            disabled={isPending}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || !reason.trim()}
          >
            Konfirmasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function isParkingLotBoardStatus(
  status: string,
): status is ParkingLotStatus {
  return status === "on_hold" || status === "cancelled";
}
