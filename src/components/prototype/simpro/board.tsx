"use client";

import { useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CalendarDays, ExternalLink, GripVertical, Plus, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  formatDate,
  isOverdue,
  taskTransition,
  userById,
  validateWorkingLink,
} from "@/lib/prototype/domain";
import {
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  type Task,
  type TaskStatus,
} from "@/lib/prototype/types";
import { PriorityBadge } from "../ui";

const COLUMN_TONE: Record<TaskStatus, string> = {
  backlog: "bg-slate-50 border-slate-200",
  todo: "bg-sky-50 border-sky-200",
  in_progress: "bg-violet-50 border-violet-200",
  awaiting_approval: "bg-amber-50 border-amber-200",
  need_revision: "bg-rose-50 border-rose-200",
  completed: "bg-emerald-50 border-emerald-200",
};

function httpHref(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    /* opaque text */
  }
  return undefined;
}

function BoardCard({
  task,
  onClick,
  readOnly,
}: {
  task: Task;
  onClick: () => void;
  readOnly?: boolean;
}) {
  const store = usePrototypeStore();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: readOnly,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const assignee = userById(store, task.assigneeId);
  const manager = userById(store, task.managerId);
  const requested = userById(store, task.requestedAssigneeId);
  const stage = store.steps.find(
    (step) =>
      step.projectId === task.projectId &&
      (step.id === task.stageId || step.key === task.stepKey),
  );
  const linkHref = httpHref(task.workingLink?.url);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group bg-card cursor-pointer rounded-lg border p-2.5 shadow-sm transition-shadow hover:shadow-md",
        isDragging && "z-50 opacity-70 shadow-xl",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
            {stage?.name ?? "Task"}
          </span>
          <PriorityBadge priority={task.priority} />
        </div>
        {!readOnly ? <GripVertical className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100" /> : null}
      </div>
      <p className="mt-1.5 line-clamp-3 text-xs font-medium leading-snug">{task.title}</p>
      <p className="text-muted-foreground mt-1 text-[10px]">{task.code}</p>
      {task.workingLink ? (
        linkHref ? (
          <a
            href={linkHref}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="text-primary mt-1 inline-flex items-center gap-1 text-[10px] underline"
          >
            <ExternalLink className="size-3" /> Link kerja
          </a>
        ) : (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-[10px]">
            Link kerja: {task.workingLink.url}
          </p>
        )
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px]">
          {assignee ? (
            <>
              <User className="size-3" /> {assignee.name}
            </>
          ) : requested ? (
            <>
              <User className="size-3" /> Requested: {requested.name}
            </>
          ) : (
            "Unassigned"
          )}
          {manager ? ` · Mgr ${manager.name}` : ""}
        </span>
        {task.dueDate ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px]",
              isOverdue(task) ? "font-medium text-rose-600" : "text-muted-foreground",
            )}
          >
            <CalendarDays className="size-3" />
            {formatDate(task.dueDate)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Column({
  status,
  tasks,
  onTaskClick,
  readOnly,
}: {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  readOnly?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[240px] w-[270px] shrink-0 flex-col rounded-xl border p-2",
        COLUMN_TONE[status],
        isOver && "ring-primary/40 ring-2",
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold">{TASK_STATUS_LABEL[status]}</span>
        <span className="bg-background/80 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {tasks.map((task) => (
          <BoardCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            readOnly={readOnly}
          />
        ))}
        {tasks.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center rounded-lg border border-dashed border-current/15 py-6 text-[10px]">
            Belum ada task
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TaskBoard({
  tasks,
  onTaskClick,
  onNewTask,
  readOnly,
}: {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onNewTask?: () => void;
  readOnly?: boolean;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const grouped = useMemo(() => {
    const map = Object.fromEntries(
      TASK_STATUSES.map((status) => [status, [] as Task[]]),
    ) as Record<TaskStatus, Task[]>;
    for (const task of tasks) map[task.status].push(task);
    return map;
  }, [tasks]);

  const onDragEnd = (event: DragEndEvent) => {
    if (!currentUser || !event.over) return;
    const task = tasks.find((item) => item.id === event.active.id);
    const to = event.over.id as TaskStatus;
    if (!task || task.status === to) return;
    if (to === "need_revision") {
      toast.error("Buka card untuk mengisi komentar revisi.");
      return;
    }
    let link: string | undefined;
    if (to === "in_progress") {
      link =
        task.workingLink?.url ??
        window.prompt(
          "Tempel link kerja aktif (Google Docs/Slides/Drive) sebelum memulai:",
          "",
        ) ??
        undefined;
      const validation = validateWorkingLink(link);
      if (!validation.ok) {
        toast.error(
          validation.reason ?? "Link kerja wajib diisi sebelum memulai.",
        );
        return;
      }
      link = validation.url;
    }
    const result = taskTransition(store, currentUser, task, to, link);
    if (!result.ok) {
      toast.error(result.reason ?? "Transisi tidak diizinkan.");
      return;
    }
    store.transitionTask(task.id, to, link);
    toast.success(`Task dipindahkan ke ${TASK_STATUS_LABEL[to]}.`);
  };

  return (
    <div className="space-y-3">
      {onNewTask ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={onNewTask}>
            <Plus className="size-3.5" /> New task
          </Button>
        </div>
      ) : null}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {TASK_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={grouped[status]}
              onTaskClick={onTaskClick}
              readOnly={readOnly}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
