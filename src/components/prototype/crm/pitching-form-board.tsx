"use client";

import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canAssignPitchingTask,
  canCreatePitchingTask,
  canReviewPitchingTask,
  canWorkPitchingTask,
  pitchingTaskAssignees,
  userById,
  validWorkUrl,
} from "@/lib/prototype/domain";
import {
  TASK_STATUS_LABEL,
  type ProspekPitching,
  type Task,
} from "@/lib/prototype/types";
import { NativeSelect, SectionCard, TaskStatusBadge } from "../ui";
import { TaskBoard } from "../simpro/board";

function PitchingTaskDialog({
  task,
  pitching,
  open,
  onOpenChange,
}: {
  task?: Task;
  pitching: ProspekPitching;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const [workUrl, setWorkUrl] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  if (!task || !currentUser) return null;
  const canWork = canWorkPitchingTask(currentUser, task);
  const canReview = canReviewPitchingTask(store, currentUser, task);
  const canAssign = canAssignPitchingTask(store, currentUser, pitching);
  const candidates = pitchingTaskAssignees(store, currentUser, pitching);
  const transition = (
    to: "in_progress" | "awaiting_approval" | "completed" | "need_revision",
    comment?: string,
  ) => {
    store.transitionTask(task.id, to, {
      workUrl: workUrl.trim() || task.workUrl,
      comment,
    });
    const result = store.tasks.find((item) => item.id === task.id);
    if (result && result.status === to) {
      toast.success(`Kartu menjadi ${TASK_STATUS_LABEL[to]}.`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>
            Form Pitching · {pitching.title} · {task.code}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Status</span>
            <TaskStatusBadge status={task.status} />
          </div>
          <p className="text-muted-foreground text-xs">{task.description}</p>
          {task.checklist.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold">Daftar centang</p>
              {task.checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => store.toggleChecklistItem(task.id, item.id)}
                  />
                  {item.text}
                </label>
              ))}
            </div>
          ) : null}
          {canWork || canReview ? (
            <div className="space-y-1">
              <Label htmlFor="pitching-work-url">Link Pekerjaan</Label>
              <div className="flex gap-2">
                <Input
                  id="pitching-work-url"
                  defaultValue={task.workUrl ?? ""}
                  onChange={(event) => setWorkUrl(event.target.value)}
                  placeholder="https://…"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!validWorkUrl(workUrl || task.workUrl || "")) {
                      toast.error("Link Pekerjaan wajib diisi.");
                      return;
                    }
                    store.updateTaskWorkUrl(
                      task.id,
                      (workUrl || task.workUrl || "").trim(),
                    );
                    toast.success("Link Pekerjaan disimpan.");
                  }}
                >
                  Simpan
                </Button>
              </div>
            </div>
          ) : null}
          {canAssign && task.status === "backlog" ? (
            <div className="space-y-1">
              <Label>Assign ke</Label>
              <div className="flex gap-2">
                <NativeSelect
                  value={assigneeId}
                  onChange={setAssigneeId}
                >
                  <option value="">Pilih assignee</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </NativeSelect>
                <Button
                  size="sm"
                  disabled={!assigneeId}
                  onClick={() => {
                    store.assignTask(task.id, assigneeId);
                    setAssigneeId("");
                  }}
                >
                  Assign
                </Button>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {canWork && (task.status === "todo" || task.status === "need_revision") ? (
              <Button size="sm" onClick={() => transition("in_progress")}>
                Mulai
              </Button>
            ) : null}
            {canWork && task.status === "in_progress" ? (
              <Button
                size="sm"
                onClick={() => transition("awaiting_approval")}
              >
                Submit
              </Button>
            ) : null}
            {canReview && task.status === "awaiting_approval" ? (
              <>
                <Button size="sm" onClick={() => transition("completed")}>
                  Setujui
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const comment = window.prompt("Komentar revisi wajib diisi:");
                    if (!comment?.trim()) return;
                    transition("need_revision", comment);
                  }}
                >
                  Minta revisi
                </Button>
              </>
            ) : null}
            {canAssign &&
            (task.status === "backlog" || task.status === "todo") ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const reason = window.prompt("Alasan membatalkan kartu:");
                  if (!reason?.trim()) return;
                  store.archivePitchingTask(task.id, reason);
                  onOpenChange(false);
                }}
              >
                Batalkan kartu
              </Button>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PitchingFormBoard({
  pitching,
  mineOnly = false,
}: {
  pitching: ProspekPitching;
  mineOnly?: boolean;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const [stageId, setStageId] = useState("");
  const [openTask, setOpenTask] = useState<Task | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const template = store.templates.find(
    (item) => item.id === pitching.templateId,
  );
  const stages = (template?.stages ?? []).filter(
    (stage) => stage.kind === "form" && stage.phase === "prospek",
  );
  const tasks = useMemo(() => {
    return store.tasks.filter(
      (task) =>
        task.pitchingId === pitching.id &&
        !task.archivedAt &&
        (task.scope === "pitching" || !task.projectId) &&
        (!stageId || task.templateStageId === stageId) &&
        (!mineOnly || task.assigneeId === currentUser?.id),
    );
  }, [store.tasks, pitching.id, stageId, mineOnly, currentUser?.id]);
  if (!currentUser) return null;
  const canCreate = canCreatePitchingTask(store, currentUser, pitching);
  const stageName = (task: Task) =>
    stages.find((stage) => stage.id === task.templateStageId)?.name ??
    "Form Pitching";

  return (
    <SectionCard
      title="Form Pitching"
      description="Pekerjaan Form Pitching dalam board SIMPRO."
    >
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[220px]">
          <NativeSelect value={stageId} onChange={setStageId}>
            <option value="">Semua form stage</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        {canCreate ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const created =
                  store.createPitchingTasksFromTemplate(pitching.id);
                toast.success(
                  created > 0
                    ? `${created} kartu dibuat dari template.`
                    : "Tidak ada form stage baru.",
                );
              }}
            >
              Buat dari template
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const title = window.prompt("Judul kartu Form Pitching:");
                if (!title?.trim()) return;
                const id = store.createPitchingTask(pitching.id, {
                  title: title.trim(),
                });
                if (id) toast.success("Kartu Form Pitching dibuat.");
              }}
            >
              Kartu custom
            </Button>
          </>
        ) : null}
      </div>
      <TaskBoard
        tasks={tasks}
        onTaskClick={(task) => {
          setOpenTask(task);
          setDialogOpen(true);
        }}
        readOnly={pitching.status === "lost" || Boolean(pitching.projectId)}
        stageLabel={stageName}
      />
      <PitchingTaskDialog
        task={openTask}
        pitching={pitching}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setOpenTask(undefined);
        }}
      />
    </SectionCard>
  );
}
