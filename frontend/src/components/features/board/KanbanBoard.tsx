"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Layers,
  FileText,
  Link2,
  MessageSquare,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Zap,
  LifeBuoy,
  Loader2,
  Lock,
} from "lucide-react";
import { UserProfileTrigger } from "@/components/features/users/UserProfileTrigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { taskTypeLabel } from "@/lib/task-types";
import {
  BOARD_MAIN_PIPELINE,
  BOARD_PARKING_LOT,
  colDroppableId,
  parseBoardDropTarget,
  statusToBoardColumn,
  swimlaneCellDroppableId,
  type BoardColumnStatus,
} from "./board-constants";
import type { KanbanColumnInfiniteConfig } from "./use-kanban-board-infinite";
import { formatKanbanTaskPublicId, taskBoardLinkKey } from "./board-task-utils";
import {
  isTaskStatusLockedBySprint,
  sprintStatusLockMessage,
} from "@/lib/task-status-restrictions";

export type KanbanTask = {
  id: string;
  /** Token unik untuk query `?task=` (tautan berbagi). */
  shareToken?: string | null;
  /** Nomor urut per proyek (bukan `id` internal). */
  taskNumber?: number;
  project?: { id: string; code: string; name?: string } | null;
  title: string;
  status: string;
  priority: string;
  type: string;
  storyPoints: number | null;
  dueDate: string | null;
  startDate: string | null;
  sprintId: string | null;
  tags: string[];
  createdAt: string;
  /** Present when API returns task list rows (board / backlog). */
  updatedAt?: string;
  assignees: { user: { id: string; name: string; image: string | null } }[];
  sprint?: {
    id: string;
    name: string;
    status?: string;
    completedNote?: string | null;
  } | null;
  _count?: { comments: number; checklistItems: number; references?: number };
  /** Dependensi aktif (task harus selesai dulu). */
  dependsOn?: { dependsOnId: string }[];
};

const PRIORITY_STYLE: Record<
  string,
  { border: string; label: string }
> = {
  critical: { border: "#DC2626", label: "Critical" },
  high: { border: "#D97706", label: "High" },
  medium: { border: "#0891B2", label: "Medium" },
  low: { border: "#64748B", label: "Low" },
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

function typeLabel(type: string) {
  return taskTypeLabel(type);
}

function kanbanActiveDepCount(task: KanbanTask): number {
  return task.dependsOn?.length ?? 0;
}

function kanbanReferenceCount(task: KanbanTask): number {
  return task._count?.references ?? 0;
}

function priorityOrder(p: string): number {
  const o: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return o[p] ?? 99;
}

function columnHeaderTone(status: BoardColumnStatus): string {
  switch (status) {
    case "backlog":
      return "border-b-slate-200/90 bg-slate-100/95";
    case "todo":
      return "border-b-sky-200/90 bg-sky-50/95";
    case "in_progress":
      return "border-b-violet-200/90 bg-violet-50/95";
    case "awaiting_approval":
      return "border-b-amber-200/90 bg-amber-50/95";
    case "on_check":
      return "border-b-purple-200/90 bg-purple-50/95";
    case "need_revision":
      return "border-b-red-200/90 bg-red-50/95";
    case "completed":
      return "border-b-emerald-200/90 bg-emerald-50/95";
    case "on_hold":
      return "border-b-amber-300/80 bg-amber-100/90";
    case "cancelled":
      return "border-b-zinc-200/90 bg-zinc-100/95";
    default:
      return "border-b-zinc-100 bg-zinc-50/90";
  }
}

function typeBadgeClass() {
  return "inline-block rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold leading-[18px] text-zinc-600";
}

function priorityBadgeClass(p: string) {
  switch (p) {
    case "critical":
      return "border border-red-200 bg-red-50 text-red-700";
    case "high":
      return "border border-amber-200 bg-amber-50 text-amber-800";
    case "medium":
      return "border border-blue-200 bg-blue-50 text-blue-800";
    default:
      return "border border-slate-200 bg-slate-100 text-slate-600";
  }
}

function priorityBorderClass(priority: string) {
  switch (priority) {
    case "critical":
      return "border-l-red-600";
    case "high":
      return "border-l-amber-600";
    case "medium":
      return "border-l-cyan-600";
    case "low":
      return "border-l-slate-400";
    default:
      return "border-l-slate-300";
  }
}

function BoardTaskDragPreview({
  task,
  showProjectOnCard,
}: {
  task: KanbanTask;
  showProjectOnCard?: boolean;
}) {
  const TypeIc = TASK_TYPE_ICONS[task.type] ?? CheckSquare;
  const pri = task.priority || "medium";
  const projectLabel =
    showProjectOnCard && (task.project?.name?.trim() || task.project?.code)
      ? (task.project?.name?.trim() || task.project?.code)
      : null;
  const depCount = kanbanActiveDepCount(task);
  const refCount = kanbanReferenceCount(task);
  return (
    <div
      className={cn(
        "w-[min(260px,calc(100vw-2rem))] rounded-md border border-zinc-300 bg-white p-3 text-sm shadow-2xl ring-2 ring-sky-400/50",
        "border-l-[3px] border-l-solid",
        priorityBorderClass(pri),
      )}
    >
      <div className="mb-2 flex flex-wrap gap-1">
        <span
          className={cn(
            typeBadgeClass(),
            "inline-flex items-center gap-0.5",
          )}
        >
          <TypeIc className="size-3 shrink-0" aria-hidden />
          {typeLabel(task.type)}
        </span>
        <span
          className={cn(
            "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-[18px]",
            priorityBadgeClass(pri),
          )}
        >
          {PRIORITY_STYLE[pri]?.label ?? task.priority ?? pri}
        </span>
      </div>
      <p className="line-clamp-2 font-medium text-zinc-900">{task.title}</p>
      {depCount > 0 || refCount > 0 ? (
        <div className="mt-2 space-y-1 rounded-md border border-zinc-100 bg-zinc-50/50 px-2 py-1.5 text-[10px] leading-snug">
          {refCount > 0 ? (
            <p
              className="flex items-start gap-1 font-medium text-sky-800/95"
              title={`${refCount} referensi task`}
            >
              <FileText className="size-3 shrink-0 opacity-90" aria-hidden />
              <span>{refCount} referensi</span>
            </p>
          ) : null}
          {depCount > 0 ? (
            <p
              className="flex items-start gap-1 font-medium text-amber-800/95"
              title="Task ini punya dependensi yang memblokir progres sampai task tersebut selesai."
            >
              <Link2 className="size-3 shrink-0 opacity-90" aria-hidden />
              <span>{depCount} dependensi</span>
            </p>
          ) : null}
        </div>
      ) : null}
      {projectLabel ? (
        <p className="mt-2 truncate text-[11px] font-medium text-zinc-600">
          {projectLabel}
          {task.project?.name?.trim() && task.project.code ? (
            <span className="font-normal text-zinc-400">
              {" "}
              ({task.project.code})
            </span>
          ) : null}
        </p>
      ) : null}
      <p className="mt-2 font-mono text-[10px] font-medium tracking-wide text-zinc-500">
        {formatKanbanTaskPublicId(task)}
      </p>
    </div>
  );
}

function BoardColumnShell({
  droppableId,
  label,
  count,
  isParking,
  compact,
  columnStatus,
  infiniteLoad,
  children,
}: {
  droppableId: string;
  label: string;
  count: number;
  isParking: boolean;
  /** Swimlane cell: no column header, count badge only */
  compact?: boolean;
  columnStatus?: BoardColumnStatus;
  /** Scroll “load more” for paginated Kanban columns (non-swimlane). */
  infiniteLoad?: KanbanColumnInfiniteConfig | undefined;
  children: React.ReactNode;
}) {
  const scrollElRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: droppableId,
  });

  const setContentRef = useCallback(
    (el: HTMLDivElement | null) => {
      setDroppableRef(el);
      scrollElRef.current = el;
    },
    [setDroppableRef],
  );

  useEffect(() => {
    if (compact || !infiniteLoad) return;
    const root = scrollElRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (
          hit &&
          infiniteLoad.hasMore &&
          !infiniteLoad.loadingMore
        ) {
          infiniteLoad.loadMore();
        }
      },
      { root, rootMargin: "120px", threshold: 0 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [compact, infiniteLoad]);

  const headerTone =
    compact || !columnStatus
      ? "border-b-zinc-100/80 bg-zinc-50/80"
      : columnHeaderTone(columnStatus);
  return (
    <Card
      className={cn(
        "flex w-[85vw] max-w-[300px] shrink-0 flex-col overflow-hidden sm:max-h-[min(60vh,560px)] sm:w-[272px]",
        isParking && "border-amber-200/90 bg-amber-50/50",
        compact && "border-zinc-200 bg-zinc-50/40 sm:max-h-[min(50vh,420px)]",
      )}
    >
      {!compact ? (
        <CardHeader
          className={cn(
            "flex flex-row items-center justify-between space-y-0 border-b py-3",
            headerTone,
          )}
        >
          <span className="truncate text-sm font-semibold text-zinc-900">
            {label}
          </span>
          <Badge variant="secondary" className="tabular-nums text-[10px]">
            {count}
          </Badge>
        </CardHeader>
      ) : (
        <div className="flex justify-end border-b border-zinc-100/80 px-2 py-1">
          <Badge variant="outline" className="tabular-nums text-[10px]">
            {count}
          </Badge>
        </div>
      )}
      <CardContent
        ref={setContentRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 rounded-md border border-dashed border-transparent p-2 transition-colors sm:overflow-y-auto",
          compact ? "min-h-[100px]" : "min-h-[160px]",
          isOver && "border-sky-300 bg-sky-50/50",
        )}
      >
        {children}
        {infiniteLoad && !compact ? (
          <>
            <div
              ref={sentinelRef}
              className="h-1 w-full shrink-0"
              aria-hidden
            />
            {infiniteLoad.loadingMore ? (
              <div className="flex justify-center py-2">
                <Loader2
                  className="size-5 animate-spin text-zinc-400"
                  aria-label="Loading more tasks"
                />
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BoardTaskCard({
  task,
  readOnly,
  onOpen,
  showProjectOnCard,
}: {
  task: KanbanTask;
  readOnly?: boolean;
  onOpen?: (id: string) => void;
  showProjectOnCard?: boolean;
}) {
  const skipClickRef = useRef(false);
  useDndMonitor({
    onDragEnd(event) {
      if (String(event.active.id) === task.id) {
        skipClickRef.current = true;
        window.setTimeout(() => {
          skipClickRef.current = false;
        }, 400);
      }
    },
  });

  const sprintLocked = isTaskStatusLockedBySprint(task.sprint?.status);
  const dragDisabled = readOnly || sprintLocked;
  const lockMessage = sprintLocked
    ? sprintStatusLockMessage(task.sprint?.status)
    : undefined;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    disabled: dragDisabled,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const pr = task.priority || "medium";
  const TypeIc = TASK_TYPE_ICONS[task.type] ?? CheckSquare;
  const today = format(new Date(), "yyyy-MM-dd");
  const dueStr = task.dueDate
    ? format(new Date(task.dueDate), "yyyy-MM-dd")
    : null;
  const isOverdue =
    Boolean(dueStr && dueStr < today) &&
    !["done", "cancelled", "completed"].includes(task.status.toLowerCase());

  const checks = task._count?.checklistItems ?? 0;
  const comments = task._count?.comments ?? 0;
  const refCount = kanbanReferenceCount(task);
  const assignees = task.assignees ?? [];
  const showAssignees = assignees.slice(0, 3);
  const extraA = Math.max(0, assignees.length - 3);
  const firstName = assignees[0]?.user?.name ?? "Unassigned";
  const projectLabel =
    showProjectOnCard && (task.project?.name?.trim() || task.project?.code)
      ? (task.project?.name?.trim() || task.project?.code)
      : null;
  const depCount = kanbanActiveDepCount(task);
  const linkKey = taskBoardLinkKey(task);

  return (
    <div
      ref={setNodeRef}
      style={style}
      title={lockMessage}
      {...(!dragDisabled ? listeners : {})}
      {...(!dragDisabled ? attributes : {})}
      className={cn(
        "select-none rounded-md border border-zinc-200 bg-white text-sm shadow-sm transition-[box-shadow,transform]",
        "border-l-[3px] border-l-solid",
        priorityBorderClass(pr),
        isDragging && "z-10 opacity-50 shadow-lg ring-2 ring-sky-400/80",
        !dragDisabled && "cursor-grab touch-none active:cursor-grabbing",
        sprintLocked && "cursor-not-allowed",
      )}
    >
      <div
        className={cn(
          "min-w-0 flex-1 p-3",
          onOpen && "cursor-pointer",
          !readOnly && onOpen && "hover:-translate-y-px hover:shadow-md",
          readOnly && "opacity-[0.92]",
        )}
        {...(onOpen ? ({ role: "button" as const, tabIndex: 0 } as const) : {})}
        onClick={(e) => {
          if (skipClickRef.current) return;
          e.stopPropagation();
          onOpen?.(linkKey);
        }}
        onKeyDown={(e) => {
          if (!onOpen) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(linkKey);
          }
        }}
      >
      <div className="mb-2 flex flex-wrap gap-1">
        <span
          className={cn(typeBadgeClass(), "inline-flex items-center gap-0.5")}
          title={typeLabel(task.type)}
        >
          <TypeIc className="size-3 shrink-0" aria-hidden />
          {typeLabel(task.type)}
        </span>
        <span
          className={cn(
            "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-[18px]",
            priorityBadgeClass(pr),
          )}
        >
          {PRIORITY_STYLE[pr]?.label ?? pr}
        </span>
      </div>
      <p className="mb-2 line-clamp-3 text-sm font-medium leading-snug text-zinc-900">
        {task.title}
      </p>
      {depCount > 0 || refCount > 0 ? (
        <div className="mb-2 space-y-1 rounded-md border border-zinc-100 bg-zinc-50/50 px-2 py-1.5 text-[10px] leading-snug">
          {refCount > 0 ? (
            <p
              className="flex items-start gap-1 font-medium text-sky-800/95"
              title={`${refCount} referensi task`}
            >
              <FileText className="size-3 shrink-0 opacity-90" aria-hidden />
              <span>{refCount} referensi</span>
            </p>
          ) : null}
          {depCount > 0 ? (
            <p
              className="flex items-start gap-1 font-medium text-amber-800/95"
              title="Task ini punya dependensi yang memblokir progres sampai task tersebut selesai."
            >
              <Link2 className="size-3 shrink-0 opacity-90" aria-hidden />
              <span>{depCount} dependensi</span>
            </p>
          ) : null}
        </div>
      ) : null}
      {projectLabel ? (
        <p
          className="mb-2 truncate text-[11px] font-medium text-zinc-600"
          title={
            task.project?.name && task.project.code
              ? `${task.project.name} (${task.project.code})`
              : projectLabel
          }
        >
          {projectLabel}
          {task.project?.name?.trim() && task.project.code ? (
            <span className="font-normal text-zinc-400">
              {" "}
              ({task.project.code})
            </span>
          ) : null}
        </p>
      ) : null}
      {task.tags?.length ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded border border-zinc-200 bg-zinc-50/80 px-1.5 py-0.5 text-[10px] text-zinc-600"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 ? (
            <span className="text-[10px] font-medium text-zinc-500">
              +{task.tags.length - 3}
            </span>
          ) : null}
        </div>
      ) : null}
      {task.sprint ? (
        <div className="mb-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium",
              sprintLocked
                ? "border-zinc-200 bg-zinc-100 text-zinc-600"
                : "border-indigo-200 bg-indigo-50 text-indigo-800",
            )}
            title={lockMessage}
          >
            {sprintLocked ? (
              <Lock className="size-2.5 shrink-0" aria-hidden />
            ) : null}
            {task.sprint.name}
          </span>
        </div>
      ) : null}
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
        <span className="inline-flex flex-wrap items-center gap-2">
          {checks > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <CheckSquare className="size-3 shrink-0" aria-hidden />
              {checks}
            </span>
          ) : null}
          {comments > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <MessageSquare className="size-3 shrink-0" aria-hidden />
              {comments}
            </span>
          ) : null}
        </span>
        {task.dueDate ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5",
              isOverdue ? "font-semibold text-red-600" : "",
            )}
          >
            {isOverdue ? (
              <AlertTriangle className="size-3 shrink-0" aria-hidden />
            ) : (
              <Calendar className="size-3 shrink-0" aria-hidden />
            )}
            {format(new Date(task.dueDate), "d MMM yyyy")}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2">
        {assignees[0]?.user?.id ? (
          <UserProfileTrigger
            userId={assignees[0].user.id}
            className="max-w-[120px] rounded-none"
          >
            <span className="truncate text-[11px] text-zinc-500">{firstName}</span>
          </UserProfileTrigger>
        ) : (
          <span className="max-w-[120px] truncate text-[11px] text-zinc-500">
            {firstName}
          </span>
        )}
        <div className="flex shrink-0 -space-x-1.5">
          {showAssignees.map((a) => (
            <UserProfileTrigger key={a.user.id} userId={a.user.id}>
              <Avatar className="size-6 border-2 border-white ring-1 ring-zinc-200">
                {a.user.image ? (
                  <AvatarImage src={a.user.image} alt="" />
                ) : null}
                <AvatarFallback className="text-[8px]">
                  {a.user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </UserProfileTrigger>
          ))}
          {extraA > 0 ? (
            <span className="flex size-6 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[8px] font-medium text-zinc-600">
              +{extraA}
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-1.5 font-mono text-[10px] font-medium tracking-wide text-zinc-500">
        {formatKanbanTaskPublicId(task)}
      </p>
      </div>
    </div>
  );
}

type Props = {
  tasks: KanbanTask[];
  onMove: (taskId: string, newStatus: string) => void;
  readOnly?: boolean;
  swimlaneMode?: boolean;
  onOpenTask?: (taskId: string) => void;
  /** Tampilkan nama (+ kode) proyek di kartu — dipakai di My tasks lintas proyek. */
  showProjectOnCard?: boolean;
  /** Total tasks per column (server); badge counts use this when set. */
  columnTotals?: Partial<Record<BoardColumnStatus, number>>;
  /** Per-column infinite scroll (disabled in swimlane mode). */
  columnInfinite?: Partial<
    Record<BoardColumnStatus, KanbanColumnInfiniteConfig>
  >;
};

export function KanbanBoard({
  tasks,
  onMove,
  readOnly,
  swimlaneMode = false,
  onOpenTask,
  showProjectOnCard = false,
  columnTotals,
  columnInfinite,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const infiniteByColumn = swimlaneMode ? undefined : columnInfinite;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byColumn = useMemo(() => {
    const map = new Map<BoardColumnStatus, KanbanTask[]>();
    for (const s of BOARD_MAIN_PIPELINE) map.set(s.value, []);
    for (const s of BOARD_PARKING_LOT) map.set(s.value, []);
    for (const t of tasks) {
      const col = statusToBoardColumn(t.status);
      const list = map.get(col);
      if (list) list.push(t);
    }
    for (const [, list] of map) {
      list.sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));
    }
    return map;
  }, [tasks]);

  /** One swimlane row per primary assignee (first assignee) or unassigned. */
  const swimlaneRows = useMemo(() => {
    const m = new Map<string, KanbanTask[]>();
    for (const t of tasks) {
      const first = t.assignees?.[0]?.user?.id;
      const key = first ?? "__unassigned__";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(t);
    }
    const rows = [...m.entries()].sort(([a], [b]) => {
      if (a === "__unassigned__") return -1;
      if (b === "__unassigned__") return 1;
      const na =
        tasks.find((x) => x.assignees?.[0]?.user?.id === a)?.assignees?.[0]
          ?.user.name ?? "";
      const nb =
        tasks.find((x) => x.assignees?.[0]?.user?.id === b)?.assignees?.[0]
          ?.user.name ?? "";
      return na.localeCompare(nb);
    });
    return rows;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  function onDragStart(e: DragStartEvent) {
    if (readOnly) return;
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (readOnly) return;
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    let parsed = parseBoardDropTarget(overId);
    if (!parsed) {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        parsed = { status: statusToBoardColumn(overTask.status) };
      }
    }
    if (!parsed) return;
    const taskId = String(active.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const next = parsed.status;
    const current = statusToBoardColumn(task.status);
    if (current === next) return;
    onMove(taskId, next);
  }

  function renderPipelineColumns(
    getList: (status: BoardColumnStatus) => KanbanTask[],
    droppableIdFn: (status: BoardColumnStatus) => string,
    compact?: boolean,
  ) {
    return (
      <div className="flex min-w-max gap-3 pb-1">
        {BOARD_MAIN_PIPELINE.map(({ value, label }) => {
          const list = getList(value);
          const headerCount = columnTotals?.[value] ?? list.length;
          return (
            <BoardColumnShell
              key={value}
              droppableId={droppableIdFn(value)}
              label={label}
              count={compact ? list.length : headerCount}
              isParking={false}
              compact={compact}
              columnStatus={value}
              infiniteLoad={compact ? undefined : infiniteByColumn?.[value]}
            >
              {list.map((t) => (
                <BoardTaskCard
                  key={t.id}
                  task={t}
                  readOnly={readOnly}
                  onOpen={onOpenTask}
                  showProjectOnCard={showProjectOnCard}
                />
              ))}
            </BoardColumnShell>
          );
        })}
      </div>
    );
  }

  function renderParkingColumns(
    getList: (status: BoardColumnStatus) => KanbanTask[],
    droppableIdFn: (status: BoardColumnStatus) => string,
  ) {
    return (
      <div className="flex min-w-max gap-3 pb-1">
        {BOARD_PARKING_LOT.map(({ value, label }) => {
          const list = getList(value);
          const headerCount = columnTotals?.[value] ?? list.length;
          return (
            <BoardColumnShell
              key={value}
              droppableId={droppableIdFn(value)}
              label={label}
              count={headerCount}
              isParking
              columnStatus={value}
              infiniteLoad={infiniteByColumn?.[value]}
            >
              {list.map((t) => (
                <BoardTaskCard
                  key={t.id}
                  task={t}
                  readOnly={readOnly}
                  onOpen={onOpenTask}
                  showProjectOnCard={showProjectOnCard}
                />
              ))}
            </BoardColumnShell>
          );
        })}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {!swimlaneMode ? (
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Run-in pipeline
            </p>
            <div className="overflow-x-auto pb-2">
              {renderPipelineColumns(
                (st) => byColumn.get(st) ?? [],
                colDroppableId,
              )}
            </div>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-900/80">
              Parking lot
            </p>
            {renderParkingColumns(
              (st) => byColumn.get(st) ?? [],
              colDroppableId,
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Swimlanes by assignee (pipeline)
            </p>
            <div className="overflow-x-auto">
              <div className="min-w-max space-y-3">
                <div className="flex gap-3 border-b border-zinc-200 pb-2">
                  <div className="w-[200px] shrink-0 text-xs font-semibold text-zinc-500">
                    Assignee
                  </div>
                  {BOARD_MAIN_PIPELINE.map(({ label }) => (
                    <div
                      key={label}
                      className="w-[272px] shrink-0 text-center text-xs font-semibold text-zinc-600"
                    >
                      {label}
                    </div>
                  ))}
                </div>
                {swimlaneRows.map(([rowKey, rowTasks]) => {
                  const sample =
                    rowKey === "__unassigned__"
                      ? null
                      : rowTasks.find(
                          (x) => x.assignees?.[0]?.user?.id === rowKey,
                        )?.assignees?.[0]?.user;
                  const name =
                    rowKey === "__unassigned__"
                      ? "Unassigned"
                      : (sample?.name ?? "Member");
                  const img = sample?.image;
                  return (
                    <div
                      key={rowKey}
                      className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-3"
                    >
                      <div className="flex w-[200px] shrink-0 items-start gap-2 pt-1">
                        {rowKey !== "__unassigned__" && sample?.id ? (
                          <UserProfileTrigger userId={sample.id}>
                            <Avatar className="h-8 w-8">
                              {img ? <AvatarImage src={img} alt="" /> : null}
                              <AvatarFallback className="text-[10px]">
                                {name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </UserProfileTrigger>
                        ) : (
                          <Avatar className="h-8 w-8">
                            {img ? <AvatarImage src={img} alt="" /> : null}
                            <AvatarFallback className="text-[10px]">
                              {name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="min-w-0">
                          {rowKey !== "__unassigned__" && sample?.id ? (
                            <UserProfileTrigger
                              userId={sample.id}
                              className="block max-w-full rounded-sm"
                            >
                              <p className="truncate text-sm font-semibold text-zinc-900">
                                {name}
                              </p>
                            </UserProfileTrigger>
                          ) : (
                            <p className="truncate text-sm font-semibold text-zinc-900">
                              {name}
                            </p>
                          )}
                          <Badge variant="secondary" className="mt-1 text-[10px]">
                            {rowTasks.length}
                          </Badge>
                        </div>
                      </div>
                      {BOARD_MAIN_PIPELINE.map(({ value }) => {
                        const cellTasks = rowTasks.filter(
                          (t) => statusToBoardColumn(t.status) === value,
                        );
                        return (
                          <BoardColumnShell
                            key={`${rowKey}-${value}`}
                            droppableId={swimlaneCellDroppableId(rowKey, value)}
                            label=""
                            count={cellTasks.length}
                            isParking={false}
                            compact
                          >
                            {cellTasks.map((t) => (
                              <BoardTaskCard
                                key={t.id}
                                task={t}
                                readOnly={readOnly}
                                onOpen={onOpenTask}
                                showProjectOnCard={showProjectOnCard}
                              />
                            ))}
                          </BoardColumnShell>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-900/80">
              Parking lot
            </p>
            {renderParkingColumns(
              (st) => byColumn.get(st) ?? [],
              colDroppableId,
            )}
          </div>
        </div>
      )}

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <BoardTaskDragPreview
            task={activeTask}
            showProjectOnCard={showProjectOnCard}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/** @deprecated Use statusToBoardColumn from board-constants */
export function statusToColumn(status: string): "todo" | "in_progress" | "completed" {
  const c = statusToBoardColumn(status);
  if (c === "completed") return "completed";
  if (c === "in_progress") return "in_progress";
  return "todo";
}

/** @deprecated Board uses explicit column statuses */
export function columnToApiStatus(
  col: "todo" | "in_progress" | "done",
): string {
  if (col === "done") return "done";
  if (col === "in_progress") return "in_progress";
  return "todo";
}
