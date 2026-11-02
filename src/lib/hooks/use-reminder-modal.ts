"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useReminderSnooze } from "@/lib/hooks/use-reminder-snooze";

export type ReminderTaskItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  overdueDays: number | null;
  project: { id: string; name: string; coverColor: string | null };
};

export type ReminderResponse = {
  deadlineTasks: ReminderTaskItem[];
  awaitingTasks: ReminderTaskItem[];
};

export function useReminderModal(opts?: { enabled?: boolean }) {
  const { isSnoozed, snooze: persistSnooze } = useReminderSnooze();
  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const q = useQuery({
    queryKey: ["dashboard", "reminders"],
    queryFn: async () => {
      const res = await api.get<ReminderResponse>(
        "/api/reports/dashboard/reminders",
      );
      return res.data;
    },
    enabled: opts?.enabled !== false,
  });

  const deadlineTasks = q.data?.deadlineTasks ?? [];
  const awaitingTasks = q.data?.awaitingTasks ?? [];
  const hasItems = deadlineTasks.length > 0 || awaitingTasks.length > 0;

  useEffect(() => {
    if (!q.isSuccess || hasAutoOpened || isSnoozed() || !hasItems) return;
    setIsOpen(true);
    setHasAutoOpened(true);
  }, [q.isSuccess, hasAutoOpened, isSnoozed, hasItems]);

  const onClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const onSnooze = useCallback(
    (durationHours: number) => {
      persistSnooze(durationHours);
      setIsOpen(false);
    },
    [persistSnooze],
  );

  return {
    isOpen,
    onClose,
    onSnooze,
    deadlineTasks,
    awaitingTasks,
    isLoading: q.isLoading,
    refetch: q.refetch,
  };
}
