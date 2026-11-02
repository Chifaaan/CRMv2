"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Bug,
  CheckSquare,
  Layers,
  MessageSquare,
  Zap,
  Sparkles,
  SlidersHorizontal,
  LifeBuoy,
  Database,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { KanbanTask } from "./KanbanBoard";
import {
  boardListColumnToSortKey,
  boardListSortKeyToColumn,
  type TaskListSortKey,
} from "./board-task-utils";
import {
  formatKanbanTaskPublicId,
  formatLastUpdated,
  formatTaskOpenDuration,
  taskBoardLinkKey,
} from "./board-task-utils";
import { TASK_STATUS_OPTIONS } from "./BoardTaskModal";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import {
  cmpOptionalDateDir,
  cmpOptionalStringDir,
  toggleColumnSort,
} from "@/lib/column-sort";
import type { SortDirection } from "@/lib/column-sort";

function typeIcon(type: string) {
  switch (type) {
    case "story":
      return BookOpen;
    case "bug":
      return Bug;
    case "enhancement":
      return Zap;
    case "epic":
      return Layers;
    case "new_feature":
      return Sparkles;
    case "adjustment":
      return SlidersHorizontal;
    case "troubleshooting":
      return LifeBuoy;
    case "inject_data":
      return Database;
    case "data_update":
      return RefreshCw;
    default:
      return CheckSquare;
  }
}

function statusLabel(status: string) {
  return TASK_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

type Props = {
  tasks: KanbanTask[];
  readOnly?: boolean;
  selectable?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (id: string, on: boolean) => void;
  onToggleSelectAll?: (on: boolean) => void;
  allPageSelected?: boolean;
  onOpenTask: (id: string) => void;
  /** When set, column sort drives server-side list pagination instead of client re-sort. */
  serverSort?: {
    sortKey: TaskListSortKey;
    sortDir: SortDirection;
    onSortChange: (sortKey: TaskListSortKey, sortDir: SortDirection) => void;
  };
};

export function BoardTaskListView({
  tasks,
  readOnly: _readOnly,
  selectable = false,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  allPageSelected = false,
  onOpenTask,
  serverSort,
}: Props) {
  const [localSortCol, setLocalSortCol] = useState<string>("taskNo");
  const [localSortDir, setLocalSortDir] = useState<SortDirection>("asc");

  const sortCol = serverSort
    ? (boardListSortKeyToColumn(serverSort.sortKey) ?? "taskNo")
    : localSortCol;
  const sortDir = serverSort ? serverSort.sortDir : localSortDir;

  const sorted = useMemo(() => {
    if (serverSort) return tasks;
    const dir = localSortDir;
    const rows = [...tasks];
    rows.sort((a, b) => {
      switch (localSortCol) {
        case "title":
          return cmpOptionalStringDir(a.title, b.title, dir);
        case "status":
          return cmpOptionalStringDir(a.status, b.status, dir);
        case "priority":
          return cmpOptionalStringDir(a.priority, b.priority, dir);
        case "assignees": {
          const la = (a.assignees ?? []).map((x) => x.user.name).join(", ");
          const lb = (b.assignees ?? []).map((x) => x.user.name).join(", ");
          return cmpOptionalStringDir(la, lb, dir);
        }
        case "openFor":
          return cmpOptionalDateDir(a.createdAt, b.createdAt, dir);
        case "lastUpdate":
          return cmpOptionalDateDir(a.updatedAt ?? a.createdAt, b.updatedAt ?? b.createdAt, dir);
        case "start":
          return cmpOptionalDateDir(a.startDate, b.startDate, dir);
        case "due":
          return cmpOptionalDateDir(a.dueDate, b.dueDate, dir);
        case "taskNo":
        default: {
          const sa = formatKanbanTaskPublicId(a);
          const sb = formatKanbanTaskPublicId(b);
          return cmpOptionalStringDir(sa, sb, dir);
        }
      }
    });
    return rows;
  }, [tasks, localSortCol, localSortDir, serverSort]);

  function onSort(key: string) {
    if (serverSort) {
      const apiKey = boardListColumnToSortKey(key);
      if (!apiKey) return;
      const next = toggleColumnSort(sortCol, sortDir, key);
      const nextApiKey = boardListColumnToSortKey(next.key);
      if (!nextApiKey) return;
      serverSort.onSortChange(nextApiKey, next.dir);
      return;
    }
    const next = toggleColumnSort(localSortCol, localSortDir, key);
    setLocalSortCol(next.key);
    setLocalSortDir(next.dir);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {selectable ? (
              <TableHead className="w-10">
                <Checkbox
                  checked={allPageSelected}
                  onCheckedChange={(v) => onToggleSelectAll?.(Boolean(v))}
                  aria-label="Pilih semua task di halaman"
                />
              </TableHead>
            ) : null}
            <SortableTableHead
              label="No. task"
              columnKey="taskNo"
              activeSortKey={sortCol}
              sortDirection={sortDir}
              onSort={onSort}
              className="w-[108px]"
            />
            <SortableTableHead
              label="Task"
              columnKey="title"
              activeSortKey={sortCol}
              sortDirection={sortDir}
              onSort={onSort}
            />
            <SortableTableHead
              label="Status"
              columnKey="status"
              activeSortKey={sortCol}
              sortDirection={sortDir}
              onSort={onSort}
              className="w-[120px]"
            />
            <SortableTableHead
              label="Priority"
              columnKey="priority"
              activeSortKey={sortCol}
              sortDirection={sortDir}
              onSort={onSort}
              className="w-[100px]"
            />
            <SortableTableHead
              label="Assignees"
              columnKey="assignees"
              activeSortKey={sortCol}
              sortDirection={sortDir}
              onSort={onSort}
              className="min-w-[120px]"
            />
            <SortableTableHead
              label="Open for"
              columnKey="openFor"
              activeSortKey={sortCol}
              sortDirection={sortDir}
              onSort={onSort}
              className="w-[110px] text-right [&_button]:w-full [&_button]:justify-end"
            />
            <SortableTableHead
              label="Last update"
              columnKey="lastUpdate"
              activeSortKey={sortCol}
              sortDirection={sortDir}
              onSort={onSort}
              className="w-[110px] text-right [&_button]:w-full [&_button]:justify-end"
            />
            <SortableTableHead
              label="Mulai"
              columnKey="start"
              activeSortKey={sortCol}
              sortDirection={sortDir}
              onSort={onSort}
              className="w-[110px] whitespace-nowrap"
            />
            <SortableTableHead
              label="Due"
              columnKey="due"
              activeSortKey={sortCol}
              sortDirection={sortDir}
              onSort={onSort}
              className="w-[110px]"
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((t) => {
            const TypeIc = typeIcon(t.type);
            const assigneeNames = (t.assignees ?? [])
              .map((a) => a.user.name)
              .join(", ");
            const openFor = formatTaskOpenDuration(t.createdAt, t.status);
            const updatedAt = t.updatedAt ?? t.createdAt;
            const lastUp = formatLastUpdated(updatedAt);
            const comments = t._count?.comments ?? 0;

            return (
              <TableRow
                key={t.id}
                className={cn(
                  "cursor-pointer",
                  selected?.has(t.id) && "bg-primary/5",
                  "hover:bg-zinc-50/90",
                )}
                onClick={() => onOpenTask(taskBoardLinkKey(t))}
              >
                {selectable ? (
                  <TableCell
                    className="align-top"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selected?.has(t.id) ?? false}
                      onCheckedChange={(v) =>
                        onToggleSelect?.(t.id, Boolean(v))
                      }
                      aria-label={`Pilih ${t.title}`}
                    />
                  </TableCell>
                ) : null}
                <TableCell className="align-top font-mono text-xs font-medium text-zinc-600">
                  {formatKanbanTaskPublicId(t)}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex items-start gap-2">
                    <TypeIc
                      className="mt-0.5 size-4 shrink-0 text-zinc-500"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900">{t.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {(t.tags ?? []).slice(0, 4).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px] font-normal"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {comments > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-zinc-500">
                            <MessageSquare className="size-3" />
                            {comments}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant="secondary" className="font-normal">
                    {statusLabel(t.status)}
                  </Badge>
                </TableCell>
                <TableCell className="align-top text-sm capitalize text-zinc-700">
                  {t.priority}
                </TableCell>
                <TableCell className="align-top text-sm text-zinc-600">
                  <span className="line-clamp-2">
                    {assigneeNames || (
                      <span className="text-zinc-400">Unassigned</span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="align-top text-right text-xs text-zinc-600">
                  {openFor}
                </TableCell>
                <TableCell className="align-top text-right text-xs text-zinc-600">
                  {lastUp}
                </TableCell>
                <TableCell className="align-top text-xs text-zinc-600 whitespace-nowrap">
                  {t.startDate
                    ? format(new Date(t.startDate), "MMM d, yyyy")
                    : "—"}
                </TableCell>
                <TableCell className="align-top text-xs text-zinc-600">
                  {t.dueDate
                    ? format(new Date(t.dueDate), "MMM d, yyyy")
                    : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
