"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDndMonitor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  MAIN_PIPELINE_STATUSES,
  PARKING_LOT_STATUSES,
  statusToBoardColumn,
  type MaintenanceBoardColumnStatus,
  MNT_TYPE_LABELS,
  MNT_PRIORITY_LABELS,
  MNT_SEVERITY_LABELS,
  formatDateID,
} from "./maintenance-constants";
import { isAdminOrPmRole } from "@/lib/role-constants";

export type MaintenanceTicketRow = {
  id: string;
  ticketNumber: string;
  title: string;
  type: string;
  severity: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  /** Internal assignee user id when set */
  assignedTo?: string | null;
  assignedDate?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  picDevs: { user: { id: string; name: string } }[];
  _count?: { attachments: number };
};

export type MaintenanceBoardFilters = {
  priority: string;
  type: string;
  severity: string;
  assigneeId: string;
};

function colDroppableId(status: MaintenanceBoardColumnStatus) {
  return `mnt-col-${status}`;
}

function parseColFromOver(overId: string): MaintenanceBoardColumnStatus | null {
  if (!overId.startsWith("mnt-col-")) return null;
  return overId.replace("mnt-col-", "") as MaintenanceBoardColumnStatus;
}

function todayYmd() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
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

function severityBadgeClass(s: string) {
  return s === "major"
    ? "border border-amber-200 bg-amber-50 text-amber-800"
    : "border border-slate-200 bg-slate-100 text-slate-600";
}

function canUserDragTicket(
  role: string,
  userId: string | undefined,
  ticket: MaintenanceTicketRow,
): boolean {
  if (!userId) return false;
  if (isAdminOrPmRole(role)) return true;
  if (role === "developer") {
    if (ticket.assignedTo === userId) return true;
    const picIds = ticket.picDevs.map((p) => p.user.id);
    return picIds.includes(userId);
  }
  return false;
}

function filterTickets(
  tickets: MaintenanceTicketRow[],
  f: MaintenanceBoardFilters,
): MaintenanceTicketRow[] {
  return tickets.filter((t) => {
    if (f.priority && t.priority !== f.priority) return false;
    if (f.type && t.type !== f.type) return false;
    if (f.severity && (t.severity ?? "") !== f.severity) return false;
    if (f.assigneeId) {
      const picIds = t.picDevs.map((p) => p.user.id);
      if (!picIds.includes(f.assigneeId)) return false;
    }
    return true;
  });
}

function BoardColumn({
  status,
  label,
  count,
  isParking,
  children,
}: {
  status: MaintenanceBoardColumnStatus;
  label: string;
  count: number;
  isParking: boolean;
  children: React.ReactNode;
}) {
  const id = colDroppableId(status);
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <Card
      className={cn(
        "flex max-h-[min(60vh,560px)] w-[260px] shrink-0 flex-col overflow-hidden",
        isParking && "border-amber-200/80 bg-amber-50/40",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
        <span className="text-sm font-semibold">{label}</span>
        <Badge variant="secondary" className="tabular-nums text-[10px]">
          {count}
        </Badge>
      </CardHeader>
      <CardContent
        ref={setNodeRef}
        data-col-status={status}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-md border border-dashed border-transparent p-2 transition-colors",
          isOver && "border-zinc-300 bg-zinc-100/80",
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

function MaintenanceCard({
  ticket,
  canDrag,
  onOpenDetail,
}: {
  ticket: MaintenanceTicketRow;
  canDrag: boolean;
  onOpenDetail?: (id: string) => void;
}) {
  const skipClickRef = useRef(false);
  useDndMonitor({
    onDragEnd(event) {
      if (String(event.active.id) === ticket.id) {
        skipClickRef.current = true;
        window.setTimeout(() => {
          skipClickRef.current = false;
        }, 400);
      }
    },
  });

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: ticket.id,
      disabled: !canDrag,
    });

  const style = transform
    ? { transform: CSS.Transform.toString(transform) }
    : undefined;

  const today = todayYmd();
  const dueStr = ticket.dueDate
    ? `${new Date(ticket.dueDate).getFullYear()}-${String(new Date(ticket.dueDate).getMonth() + 1).padStart(2, "0")}-${String(new Date(ticket.dueDate).getDate()).padStart(2, "0")}`
    : null;
  const isOverdue =
    Boolean(dueStr && dueStr < today) &&
    !["completed", "canceled"].includes(ticket.status);

  const firstDev = ticket.picDevs[0]?.user?.name ?? "Unassigned";
  const pr = ticket.priority || "medium";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "select-none rounded-md border border-zinc-200 bg-white p-3 text-sm shadow-sm transition-[box-shadow,transform]",
        "border-l-[3px] border-l-solid",
        priorityBorderClass(pr),
        canDrag && "cursor-grab touch-none active:cursor-grabbing",
        !canDrag && "cursor-pointer opacity-[0.92]",
        isDragging && "opacity-50 shadow-lg",
        onOpenDetail && "hover:-translate-y-px hover:shadow-md",
      )}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      {...(!canDrag && onOpenDetail
        ? ({ role: "button" as const, tabIndex: 0 } as const)
        : {})}
      onClick={() => {
        if (skipClickRef.current) return;
        onOpenDetail?.(ticket.id);
      }}
      onKeyDown={(e) => {
        if (!onOpenDetail) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail(ticket.id);
        }
      }}
    >
      <div className="mb-2 flex flex-wrap gap-1">
        <span className={typeBadgeClass()}>
          {MNT_TYPE_LABELS[ticket.type] ?? ticket.type}
        </span>
        <span
          className={cn(
            "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-[18px]",
            priorityBadgeClass(pr),
          )}
        >
          {MNT_PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
        </span>
        {ticket.severity ? (
          <span
            className={cn(
              "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-[18px]",
              severityBadgeClass(ticket.severity),
            )}
          >
            {MNT_SEVERITY_LABELS[ticket.severity] ?? ticket.severity}
          </span>
        ) : null}
      </div>
      <p className="mb-2 line-clamp-2 text-sm font-medium leading-snug text-zinc-900">
        {ticket.title}
      </p>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
        <span
          className={cn(
            "inline-flex items-center gap-0.5",
            isOverdue && "font-semibold text-red-600",
          )}
        >
          {isOverdue ? (
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
          ) : (
            <span aria-hidden>📅</span>
          )}
          {formatDateID(ticket.dueDate)}
        </span>
        <span className="max-w-[110px] truncate whitespace-nowrap">
          👤 {firstDev}
        </span>
      </div>
      <p className="font-mono text-[10px] text-zinc-400">
        {ticket.ticketNumber}
      </p>
    </div>
  );
}

type Props = {
  tickets: MaintenanceTicketRow[];
  filters: MaintenanceBoardFilters;
  onMove: (ticketId: string, newStatus: MaintenanceBoardColumnStatus) => void;
  userId: string | undefined;
  role: string;
  onOpenDetail?: (ticketId: string) => void;
};

export function MaintenanceBoard({
  tickets,
  filters,
  onMove,
  userId,
  role,
  onOpenDetail,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const filtered = useMemo(
    () => filterTickets(tickets, filters),
    [tickets, filters],
  );

  const byColumn = useMemo(() => {
    const map = new Map<MaintenanceBoardColumnStatus, MaintenanceTicketRow[]>();
    for (const s of MAIN_PIPELINE_STATUSES) {
      map.set(s.value, []);
    }
    for (const s of PARKING_LOT_STATUSES) {
      map.set(s.value, []);
    }
    for (const t of filtered) {
      const col = statusToBoardColumn(t.status);
      map.get(col)!.push(t);
    }
    return map;
  }, [filtered]);

  const activeTicket = activeId
    ? tickets.find((t) => t.id === activeId)
    : null;

  function resolveDropColumn(overId: string | undefined): MaintenanceBoardColumnStatus | null {
    if (!overId) return null;
    const fromCol = parseColFromOver(overId);
    if (fromCol) return fromCol;
    const target = tickets.find((t) => t.id === overId);
    return target ? statusToBoardColumn(target.status) : null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const ticketId = String(active.id);
    const col = resolveDropColumn(String(over.id));
    if (!col) return;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    if (ticket.status === col) return;
    onMove(ticketId, col);
  }

  function renderColumn(
    status: MaintenanceBoardColumnStatus,
    label: string,
    isParking: boolean,
  ) {
    const list = byColumn.get(status) ?? [];
    return (
      <BoardColumn
        key={status}
        status={status}
        label={label}
        count={list.length}
        isParking={isParking}
      >
        {list.map((t) => (
          <MaintenanceCard
            key={t.id}
            ticket={t}
            canDrag={canUserDragTicket(role, userId, t)}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </BoardColumn>
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
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Pipeline
          </p>
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-3">
              {MAIN_PIPELINE_STATUSES.map((s) =>
                renderColumn(s.value, s.label, false),
              )}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Parking lot
          </p>
          <div className="flex min-w-max gap-3 overflow-x-auto pb-1">
            {PARKING_LOT_STATUSES.map((s) =>
              renderColumn(s.value, s.label, true),
            )}
          </div>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTicket ? (
          <div className="w-[240px] rounded-lg border border-zinc-900 bg-white p-3 text-sm shadow-lg">
            <p className="font-medium">{activeTicket.title}</p>
            <p className="mt-1 font-mono text-[10px] text-zinc-400">
              {activeTicket.ticketNumber}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
