"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  OverdueBadge,
  PriorityBadge,
  TaskStatusBadge,
} from "@/components/features/dashboard/dashboard-task-badges";
import type { ReminderTaskItem } from "@/lib/hooks/use-reminder-modal";
import { cn } from "@/lib/utils";

const SNOOZE_OPTIONS = [
  { value: "1", label: "1 jam" },
  { value: "2", label: "2 jam" },
  { value: "3", label: "3 jam" },
  { value: "5", label: "5 jam" },
  { value: "8", label: "8 jam" },
  { value: "12", label: "12 jam" },
] as const;

export type ReminderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSnooze: (durationHours: number) => void;
  deadlineTasks: ReminderTaskItem[];
  awaitingTasks: ReminderTaskItem[];
  isLoading?: boolean;
  onOpenTask: (task: ReminderTaskItem) => void;
};

function ReminderTaskRow({
  task,
  onOpenTask,
}: {
  task: ReminderTaskItem;
  onOpenTask: (task: ReminderTaskItem) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpenTask(task)}
        className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-zinc-50/80 sm:flex-row sm:items-center sm:gap-3"
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-zinc-900">{task.title}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{task.project.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TaskStatusBadge status={task.status} />
          {task.dueDate ? (
            <time
              className={cn(
                "text-xs tabular-nums",
                task.overdueDays != null
                  ? "font-medium text-red-600"
                  : "text-zinc-500",
              )}
              dateTime={task.dueDate}
            >
              {new Date(task.dueDate).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </time>
          ) : null}
          {task.overdueDays != null ? (
            <OverdueBadge days={task.overdueDays} />
          ) : null}
          <PriorityBadge priority={task.priority} />
        </div>
      </button>
    </li>
  );
}

export function ReminderModal({
  isOpen,
  onClose,
  onSnooze,
  deadlineTasks,
  awaitingTasks,
  isLoading,
  onOpenTask,
}: ReminderModalProps) {
  const [snoozeHours, setSnoozeHours] = useState("1");

  if (!isOpen && !isLoading) return null;

  const showModal = isOpen && !isLoading;
  const hasItems = deadlineTasks.length > 0 || awaitingTasks.length > 0;

  return (
    <Dialog
      open={showModal && hasItems}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center gap-2 pr-8">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <Bell className="size-4" aria-hidden />
            </div>
            <DialogTitle className="text-left text-lg">
              Pengingat Task
            </DialogTitle>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="deadline" className="flex min-h-0 flex-1 flex-col">
            <TabsList
              variant="line"
              className="mx-5 mt-3 w-auto shrink-0 justify-start"
            >
              <TabsTrigger value="deadline" className="gap-2">
                Mendekati Deadline
                {deadlineTasks.length > 0 ? (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    {deadlineTasks.length}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="awaiting" className="gap-2">
                Menunggu Review
                {awaitingTasks.length > 0 ? (
                  <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-800">
                    {awaitingTasks.length}
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="deadline"
              className="min-h-0 flex-1 overflow-y-auto data-active:flex data-active:flex-col"
            >
              {deadlineTasks.length === 0 ? (
                <p className="p-8 text-center text-sm text-zinc-500">
                  Tidak ada task yang mendekati deadline.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {deadlineTasks.map((t) => (
                    <ReminderTaskRow
                      key={t.id}
                      task={t}
                      onOpenTask={onOpenTask}
                    />
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent
              value="awaiting"
              className="min-h-0 flex-1 overflow-y-auto data-active:flex data-active:flex-col"
            >
              {awaitingTasks.length === 0 ? (
                <p className="p-8 text-center text-sm text-zinc-500">
                  Tidak ada task yang menunggu review Anda.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {awaitingTasks.map((t) => (
                    <ReminderTaskRow
                      key={t.id}
                      task={t}
                      onOpenTask={onOpenTask}
                    />
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="shrink-0 flex-col gap-3 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <span className="text-xs text-zinc-500">Ingatkan lagi dalam:</span>
            <Select
              value={snoozeHours}
              onValueChange={(v) => v && setSnoozeHours(v)}
              items={SNOOZE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            >
              <SelectTrigger className="h-8 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SNOOZE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSnooze(Number(snoozeHours))}
            >
              Snooze
            </Button>
            <Button type="button" size="sm" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
