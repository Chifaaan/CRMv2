"use client";

import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { isParkingLotBoardStatus } from "@/components/features/tasks/ParkingLotReasonModal";
import {
  canChangeTaskStatus,
  isTaskStatusLockedBySprint,
  notifySprintLockedStatusBlocked,
  notifyTaskStatusChangeBlocked,
} from "@/lib/task-status-restrictions";

type PendingMove = {
  taskId: string;
  status: string;
};

type Options = {
  onSuccess?: () => void;
  invalidateQueryKeys?: unknown[][];
  userRole?: string;
  getTaskStatus?: (taskId: string) => string | undefined;
  getTaskSprintStatus?: (taskId: string) => string | undefined | null;
};

export function useTaskStatusUpdate(options: Options = {}) {
  const qc = useQueryClient();
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const { userRole, getTaskStatus, getTaskSprintStatus } = options;

  const mutate = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: string;
      reason?: string;
    }) => {
      await api.patch(`/api/tasks/${id}`, {
        status,
        ...(reason ? { reason } : {}),
      });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal mengubah status";
      toast.error(msg);
    },
    onSuccess: () => {
      toast.success("Status updated");
      options.onSuccess?.();
    },
    onSettled: () => {
      for (const key of options.invalidateQueryKeys ?? []) {
        void qc.invalidateQueries({ queryKey: key });
      }
    },
  });

  const requestStatusChange = useCallback(
    (taskId: string, newStatus: string) => {
      const currentStatus = getTaskStatus?.(taskId);
      const sprintStatus = getTaskSprintStatus?.(taskId);
      if (isTaskStatusLockedBySprint(sprintStatus)) {
        notifySprintLockedStatusBlocked(sprintStatus);
        return;
      }
      if (
        currentStatus &&
        !canChangeTaskStatus(userRole, currentStatus, newStatus)
      ) {
        notifyTaskStatusChangeBlocked(userRole, currentStatus, newStatus);
        return;
      }
      if (isParkingLotBoardStatus(newStatus)) {
        setPendingMove({ taskId, status: newStatus });
        return;
      }
      mutate.mutate({ id: taskId, status: newStatus });
    },
    [getTaskStatus, getTaskSprintStatus, mutate, userRole],
  );

  const confirmParkingLotMove = useCallback(
    (reason: string) => {
      if (!pendingMove) return;
      mutate.mutate(
        {
          id: pendingMove.taskId,
          status: pendingMove.status,
          reason,
        },
        {
          onSettled: () => setPendingMove(null),
        },
      );
    },
    [mutate, pendingMove],
  );

  const cancelParkingLotMove = useCallback(() => {
    if (mutate.isPending) return;
    setPendingMove(null);
  }, [mutate.isPending]);

  return {
    requestStatusChange,
    confirmParkingLotMove,
    cancelParkingLotMove,
    pendingMove,
    isPending: mutate.isPending,
    mutateStatus: mutate.mutate,
  };
}
