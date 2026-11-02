"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDndMonitor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { format } from "date-fns";
import {
  AlertTriangle,
  BookOpen,
  Bug,
  Calendar,
  CheckSquare,
  Database,
  FileText,
  Layers,
  LifeBuoy,
  Link2,
  MessageSquare,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserProfileTrigger } from "@/components/features/users/UserProfileTrigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { taskTypeLabel } from "@/lib/task-types";
import {
  BOARD_MAIN_PIPELINE,
  BOARD_PARKING_LOT,
  statusToBoardColumn,
  type BoardColumnStatus,
} from "@/components/features/board/board-constants";
import {
  formatKanbanTaskPublicId,
  taskBoardLinkKey,
} from "@/components/features/board/board-task-utils";
import { TaskDetailSheet } from "@/components/features/tasks/TaskDetailSheet";

const PIPELINE_COLS = BOARD_MAIN_PIPELINE;
const PARKING_COLS = BOARD_PARKING_LOT;

export type SprintBoardTask = {
  id: string;
  shareToken?: string | null;
  taskNumber?: number;
  project?: { id: string; code: string; name?: string } | null;
  title: string;
  status: string;
  priority: string;
  type: string;
  storyPoints: number | null;
  dueDate?: string | null;
  tags?: string[];
  assignees: { user: { id: string; name: string; image: string | null } }[];
  _count?: { comments: number; checklistItems: number; references?: number };
  dependsOn?: { dependsOnId: string }[];
};

function colDroppableId(col: BoardColumnStatus) {
  return `sprint-board-col-${col}`;
}

export function taskStatusToSprintColumn(status: string): BoardColumnStatus {
  return statusToBoardColumn(status);
}

export function sprintColumnToApiStatus(col: BoardColumnStatus): string {
  return col;
}

const PRIORITY_STYLE: Record<string, { label: string }> = {
  critical: { label: "Critical" },
  high: { label: "High" },
  medium: { label: "Medium" },
  low: { label: "Low" },
};

const TASK_TYPE_ICONS: Record<string, typeof CheckSquare> = {
  story: BookOpen,
  bug: Bug,
  enhancement: Zap,
  epic: Layers,
  task: CheckSquare,
  new_feature: Sparkles,
  adjustment: SlidersHorizontal,
  troubleshooting: LifeBuoy,
  inject_data: Database,
  data_update: RefreshCw,
};

function typeBadgeClass() {
  return "inline-block rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold leading-[18px] text-zinc-600";
}

function priorityBadgeClass(p: string) {
  switch (p) {
    case "critical": return "border border-red-200 bg-red-50 text-red-700";
    case "high":     return "border border-amber-200 bg-amber-50 text-amber-800";
    case "medium":   return "border border-blue-200 bg-blue-50 text-blue-800";
    default:         return "border border-slate-200 bg-slate-100 text-slate-600";
  }
}

function priorityBorderClass(priority: string) {
  switch (priority) {
    case "critical": return "border-l-red-600";
    case "high":     return "border-l-amber-600";
    case "medium":   return "border-l-cyan-600";
    case "low":      return "border-l-slate-400";
    default:         return "border-l-slate-300";
  }
}

function columnHeaderTone(status: BoardColumnStatus): string {
  switch (status) {
    case "backlog":            return "border-b-slate-200/90 bg-slate-100/95";
    case "todo":               return "border-b-sky-200/90 bg-sky-50/95";
    case "in_progress":        return "border-b-violet-200/90 bg-violet-50/95";
    case "awaiting_approval":  return "border-b-amber-200/90 bg-amber-50/95";
    case "on_check":           return "border-b-purple-200/90 bg-purple-50/95";
    case "need_revision":      return "border-b-red-200/90 bg-red-50/95";
    case "completed":          return "border-b-emerald-200/90 bg-emerald-50/95";
    case "on_hold":            return "border-b-amber-300/80 bg-amber-100/90";
    case "cancelled":          return "border-b-zinc-200/90 bg-zinc-100/95";
    default:                   return "border-b-zinc-100 bg-zinc-50/90";
  }
}

function BoardColumn({
  colKey,
  label,
  count,
  isParkingLot,
  children,
}: {
  colKey: BoardColumnStatus;
  label: string;
  count: number;
  isParkingLot?: boolean;
  children: React.ReactNode;
}) {
  const id = colDroppableId(colKey);
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <Card
      className={cn(
        "flex w-[80vw] max-w-[260px] shrink-0 flex-col overflow-hidden sm:w-[240px]",
        isParkingLot && "opacity-80",
      )}
    >
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b py-3 px-3",
          columnHeaderTone(colKey),
        )}
      >
        <div className="flex items-center gap-1.5">
          {isParkingLot && <span className="size-1.5 rounded-full bg-zinc-400" />}
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <Badge variant="secondary" className="text-[10px] tabular-nums">
          {count}
        </Badge>
      </CardHeader>
      <CardContent
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2 rounded-md border border-dashed border-transparent p-2 transition-colors",
          isOver && "border-zinc-300 bg-zinc-100/80",
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

function BoardCard({
  task,
  disabled,
  onOpenDetail,
}: {
  task: SprintBoardTask;
  disabled: boolean;
  onOpenDetail: (id: string) => void;
}) {
  const skipClickRef = useRef(false);
  useDndMonitor({
    onDragEnd(event) {
      if (String(event.active.id) === task.id) {
        skipClickRef.current = true;
        window.setTimeout(() => { skipClickRef.current = false; }, 400);
      }
    },
  });

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id, disabled });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const pr = task.priority || "medium";
  const TypeIc = TASK_TYPE_ICONS[task.type] ?? CheckSquare;
  const today = format(new Date(), "yyyy-MM-dd");
  const dueStr = task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : null;
  const isOverdue =
    Boolean(dueStr && dueStr < today) &&
    !["done", "cancelled", "completed"].includes(task.status.toLowerCase());

  const checks   = task._count?.checklistItems ?? 0;
  const comments = task._count?.comments ?? 0;
  const refCount = task._count?.references ?? 0;
  const depCount = task.dependsOn?.length ?? 0;

  const assignees    = task.assignees ?? [];
  const showAssignees = assignees.slice(0, 3);
  const extraA = Math.max(0, assignees.length - 3);
  const firstName = assignees[0]?.user?.name ?? "Unassigned";
  const linkKey = taskBoardLinkKey(task);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!disabled ? listeners : {})}
      {...(!disabled ? attributes : {})}
      className={cn(
        "select-none rounded-md border border-zinc-200 bg-white text-sm shadow-sm transition-[box-shadow,transform]",
        "border-l-[3px] border-l-solid",
        priorityBorderClass(pr),
        isDragging && "z-10 opacity-50 shadow-lg ring-2 ring-sky-400/80",
        !disabled && "cursor-grab touch-none active:cursor-grabbing",
      )}
    >
      <div
        className={cn(
          "min-w-0 flex-1 p-3 cursor-pointer",
          !disabled && "hover:-translate-y-px hover:shadow-md",
        )}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          if (skipClickRef.current) return;
          e.stopPropagation();
          onOpenDetail(linkKey);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenDetail(linkKey);
          }
        }}
      >
        {/* Type + priority badges */}
        <div className="mb-2 flex flex-wrap gap-1">
          <span className={cn(typeBadgeClass(), "inline-flex items-center gap-0.5")} title={taskTypeLabel(task.type)}>
            <TypeIc className="size-3 shrink-0" aria-hidden />
            {taskTypeLabel(task.type)}
          </span>
          <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-[18px]", priorityBadgeClass(pr))}>
            {PRIORITY_STYLE[pr]?.label ?? pr}
          </span>
        </div>

        {/* Title */}
        <p className="mb-2 line-clamp-3 text-sm font-medium leading-snug text-zinc-900">
          {task.title}
        </p>

        {/* Refs + deps */}
        {(depCount > 0 || refCount > 0) && (
          <div className="mb-2 space-y-1 rounded-md border border-zinc-100 bg-zinc-50/50 px-2 py-1.5 text-[10px] leading-snug">
            {refCount > 0 && (
              <p className="flex items-start gap-1 font-medium text-sky-800/95">
                <FileText className="size-3 shrink-0 opacity-90" aria-hidden />
                <span>{refCount} referensi</span>
              </p>
            )}
            {depCount > 0 && (
              <p className="flex items-start gap-1 font-medium text-amber-800/95">
                <Link2 className="size-3 shrink-0 opacity-90" aria-hidden />
                <span>{depCount} dependensi</span>
              </p>
            )}
          </div>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded border border-zinc-200 bg-zinc-50/80 px-1.5 py-0.5 text-[10px] text-zinc-600">
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-[10px] font-medium text-zinc-500">+{task.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Checklist / comments / due */}
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
          <span className="inline-flex flex-wrap items-center gap-2">
            {checks > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <CheckSquare className="size-3 shrink-0" aria-hidden />{checks}
              </span>
            )}
            {comments > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <MessageSquare className="size-3 shrink-0" aria-hidden />{comments}
              </span>
            )}
          </span>
          {task.dueDate && (
            <span className={cn("inline-flex items-center gap-0.5", isOverdue && "font-semibold text-red-600")}>
              {isOverdue
                ? <AlertTriangle className="size-3 shrink-0" aria-hidden />
                : <Calendar className="size-3 shrink-0" aria-hidden />}
              {format(new Date(task.dueDate), "d MMM yyyy")}
            </span>
          )}
        </div>

        {/* Assignees */}
        <div className="flex items-center justify-between gap-2">
          {assignees[0]?.user?.id ? (
            <UserProfileTrigger userId={assignees[0].user.id} className="max-w-[120px] rounded-none">
              <span className="truncate text-[11px] text-zinc-500">{firstName}</span>
            </UserProfileTrigger>
          ) : (
            <span className="max-w-[120px] truncate text-[11px] text-zinc-500">{firstName}</span>
          )}
          <div className="flex shrink-0 -space-x-1.5">
            {showAssignees.map((a) => (
              <UserProfileTrigger key={a.user.id} userId={a.user.id}>
                <Avatar className="size-6 border-2 border-white ring-1 ring-zinc-200">
                  {a.user.image && <AvatarImage src={a.user.image} alt="" />}
                  <AvatarFallback className="text-[8px]">
                    {a.user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </UserProfileTrigger>
            ))}
            {extraA > 0 && (
              <span className="flex size-6 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[8px] font-medium text-zinc-600">
                +{extraA}
              </span>
            )}
          </div>
        </div>

        {/* Task ID */}
        <p className="mt-1.5 font-mono text-[10px] font-medium tracking-wide text-zinc-500">
          {formatKanbanTaskPublicId(task)}
        </p>
      </div>
    </div>
  );
}

type Props = {
  activeSprintName: string;
  endDate: string | null;
  tasks: SprintBoardTask[];
  readOnly: boolean;
  projectId: string;
  onMove: (taskId: string, newStatus: string) => void;
};

export function SprintBoardTab({
  activeSprintName,
  endDate,
  tasks,
  readOnly,
  projectId,
  onMove,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byCol = useMemo(() => {
    const map: Partial<Record<BoardColumnStatus, SprintBoardTask[]>> = {};
    for (const col of [...PIPELINE_COLS, ...PARKING_COLS]) {
      map[col.value] = [];
    }
    for (const t of tasks) {
      const col = taskStatusToSprintColumn(t.status);
      if (!map[col]) map[col] = [];
      map[col]!.push(t);
    }
    return map as Record<BoardColumnStatus, SprintBoardTask[]>;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  function resolveColumn(overId: string | undefined): BoardColumnStatus | null {
    if (!overId) return null;
    if (overId.startsWith("sprint-board-col-")) {
      return overId.replace("sprint-board-col-", "") as BoardColumnStatus;
    }
    const t = tasks.find((x) => x.id === overId);
    return t ? taskStatusToSprintColumn(t.status) : null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (readOnly) return;
    const { active, over } = e;
    if (!over) return;
    const taskId = String(active.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const col = resolveColumn(String(over.id));
    if (!col) return;
    const next = sprintColumnToApiStatus(col);
    if (task.status === next) return;
    onMove(taskId, next);
  }

  const endLabel = endDate
    ? `Berakhir ${format(new Date(endDate), "d MMM yyyy")}`
    : null;

  const pipelineCols = PIPELINE_COLS;
  const parkingCols = PARKING_COLS;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge>Active</Badge>
          <span className="font-semibold">{activeSprintName}</span>
          {endLabel ? (
            <span className="text-sm text-zinc-500">{endLabel}</span>
          ) : null}
        </div>

        {/* Pipeline */}
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {pipelineCols.map(({ value, label }) => (
              <BoardColumn
                key={value}
                colKey={value}
                label={label}
                count={byCol[value]?.length ?? 0}
              >
                {(byCol[value] ?? []).map((t) => (
                  <BoardCard
                    key={t.id}
                    task={t}
                    disabled={readOnly}
                    onOpenDetail={setDetailTaskId}
                  />
                ))}
              </BoardColumn>
            ))}
          </div>
        </div>

        {/* Parking lot */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Parking Lot
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {parkingCols.map(({ value, label }) => (
              <BoardColumn
                key={value}
                colKey={value}
                label={label}
                count={byCol[value]?.length ?? 0}
                isParkingLot
              >
                {(byCol[value] ?? []).map((t) => (
                  <BoardCard
                    key={t.id}
                    task={t}
                    disabled={readOnly}
                    onOpenDetail={setDetailTaskId}
                  />
                ))}
              </BoardColumn>
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="w-[220px] rounded-md border border-zinc-900 bg-white p-3 text-sm shadow-lg">
              <p className="font-medium">{activeTask.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task detail sheet */}
      <TaskDetailSheet
        taskId={detailTaskId}
        projectId={projectId}
        open={!!detailTaskId}
        onOpenChange={(o) => { if (!o) setDetailTaskId(null); }}
      />
    </>
  );
}
