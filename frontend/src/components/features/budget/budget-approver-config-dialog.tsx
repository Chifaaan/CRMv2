"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BudgetApproverConfigPanel } from "./budget-approver-config-panel";

export function BudgetApproverConfigDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-xl">
        <DialogHeader className="border-b px-4 py-4 sm:px-6">
          <DialogTitle>Konfigurasi Approver</DialogTitle>
          <DialogDescription>
            Tentukan approver budget dan alokasi anggaran per periode.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <BudgetApproverConfigPanel />
        </div>
      </DialogContent>
    </Dialog>
  );
}
