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
import { CalendarDays, GripVertical, Plus, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  formatDate,
  isOverdue,
  taskTransition,
  userById,
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

function BoardCard({
  task,
  onClick,
  readOnly,
  showProject,
}: {
  task: Task;
  onClick: () => void;
  readOnly?: boolean;
  showProject?: boolean;
}) {
  const store = usePrototypeStore();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: readOnly,
  });  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const assignee = userById(store, task.assigneeId);
  const manager = userById(store, task.managerId);
  const requested = userById(store, task.requestedAssigneeId);
  const currentUser = userById(store, store.currentUserId);
  const project = store.projects.find((item) => item.id === task.projectId);
  const canSeeWorkLink = Boolean(
    currentUser &&
      (currentUser.role === "admin" ||
        currentUser.role === "manager" ||
        task.assigneeId === currentUser.id ||
        (currentUser.role === "pm" && project?.createdById === currentUser.id)),
  );
  const stage = store.steps.find(
    (step) =>
      step.projectId === task.projectId &&
      (step.id === task.stageId || step.key === task.stepKey),
  );

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
      {showProject && project ? (
        <p className="text-primary mt-1 truncate text-[10px] font-semibold">
          {project.code} · {project.name}
        </p>
      ) : null}
      <p className="text-muted-foreground mt-1 text-[10px]">{task.code}</p>
      {task.workUrl && canSeeWorkLink ? (
        task.workUrl.startsWith("http://") || task.workUrl.startsWith("https://") ? (
          <a
            href={task.workUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="text-primary mt-1 block truncate text-[10px] hover:underline"
          >
            Link Pekerjaan
          </a>
        ) : (
          <span className="text-muted-foreground mt-1 block truncate text-[10px]">
            Link: {task.workUrl}
          </span>
        )
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px]">
          {assignee ? (
            <>
              <User className="size-3" /> {assignee.name}
            </>
          ) : manager ? (
            <>
              <User className="size-3" /> Manager: {manager.name}
            </>
          ) : requested ? (
            <>
              <User className="size-3" /> Requested: {requested.name}
            </>
          ) : (
            "Unassigned"
          )}
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
  showProject,
  readOnlyTaskIds,
}: {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  readOnly?: boolean;
  showProject?: boolean;
  readOnlyTaskIds?: Set<string>;
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
            readOnly={readOnly || readOnlyTaskIds?.has(task.id)}
            showProject={showProject}
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
  showProject,
  readOnlyTaskIds,
}: {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onNewTask?: () => void;
  readOnly?: boolean;
  showProject?: boolean;
  readOnlyTaskIds?: Set<string>;
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
    const result = taskTransition(store, currentUser, task, to);
    if (!result.ok) {
      toast.error(result.reason ?? "Transisi tidak diizinkan.");
      return;
    }
    store.transitionTask(task.id, to);
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
              showProject={showProject}
              readOnlyTaskIds={readOnlyTaskIds}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
