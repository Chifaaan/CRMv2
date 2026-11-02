"use client";

import { Fragment } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserProfileTrigger } from "@/components/features/users/UserProfileTrigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { cn } from "@/lib/utils";

export type BacklogTaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  createdAt?: string;
  epicId?: string | null;
  epic?: { id: string; title: string } | null;
  assignees: { user: { id: string; name: string; image: string | null } }[];
};

export type TaskSortKey =
  | "title"
  | "status"
  | "priority"
  | "dueDate"
  | "createdAt"
  | "epic"
  | "assignee";

type TaskTableProps = {
  rows: BacklogTaskRow[];
  canEdit: boolean;
  selected: Set<string>;
  onToggle: (id: string, on: boolean) => void;
  onToggleAllPage: (on: boolean) => void;
  allPageSelected: boolean;
  sortBy: TaskSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: TaskSortKey) => void;
  groupByEpic: boolean;
  onOpenDetail: (id: string) => void;
  onOpenEdit: (id: string) => void;
};

function TaskRows({
  rows,
  canEdit,
  selected,
  onToggle,
  onOpenDetail,
  onOpenEdit,
}: Omit<
  TaskTableProps,
  | "sortBy"
  | "sortDir"
  | "onSort"
  | "groupByEpic"
  | "onToggleAllPage"
  | "allPageSelected"
>) {
  return (
    <>
      {rows.map((t) => (
        <TableRow key={t.id}>
          {canEdit ? (
            <TableCell>
              <Checkbox
                checked={selected.has(t.id)}
                onCheckedChange={(v) => onToggle(t.id, Boolean(v))}
                aria-label={`Pilih ${t.title}`}
              />
            </TableCell>
          ) : null}
          <TableCell>
            <button
              type="button"
              className="text-left font-medium text-primary hover:underline"
              onClick={() => onOpenDetail(t.id)}
            >
              {t.title}
            </button>
          </TableCell>
          <TableCell>
            <Badge variant="outline">{t.status}</Badge>
          </TableCell>
          <TableCell>{t.priority}</TableCell>
          <TableCell className="max-w-[140px] truncate text-sm text-zinc-600">
            {t.epic?.title ?? "—"}
          </TableCell>
          <TableCell className="whitespace-nowrap text-sm text-zinc-600">
            {t.dueDate
              ? format(new Date(t.dueDate), "dd MMM yyyy")
              : "—"}
          </TableCell>
          <TableCell className="whitespace-nowrap text-xs text-zinc-500">
            {t.createdAt
              ? format(new Date(t.createdAt), "dd MMM yy")
              : "—"}
          </TableCell>
          <TableCell>
            <div className="flex -space-x-1">
              {t.assignees?.slice(0, 3).map((a) => (
                <UserProfileTrigger
                  key={a.user.id}
                  userId={a.user.id}
                  title={a.user.name}
                  className="inline-flex"
                >
                  <Avatar className="h-6 w-6 border border-white text-[9px]">
                    {a.user.image ? (
                      <AvatarImage src={a.user.image} alt="" />
                    ) : null}
                    <AvatarFallback>
                      {a.user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </UserProfileTrigger>
              ))}
              {(t.assignees?.length ?? 0) > 3 ? (
                <span
                  className="ml-0.5 self-center text-[10px] text-zinc-500"
                  title={(t.assignees ?? []).slice(3).map((x) => x.user.name).join(", ")}
                >
                  +{(t.assignees?.length ?? 0) - 3}
                </span>
              ) : null}
            </div>
          </TableCell>
          <TableCell className="text-right">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenDetail(t.id)}
            >
              Detail
            </Button>
            {canEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenEdit(t.id)}
              >
                Edit
              </Button>
            ) : null}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function TaskTable({
  rows,
  canEdit,
  selected,
  onToggle,
  onToggleAllPage,
  allPageSelected,
  sortBy,
  sortDir,
  onSort,
  groupByEpic,
  onOpenDetail,
  onOpenEdit,
}: TaskTableProps) {
  const groups = () => {
    const m = new Map<string, BacklogTaskRow[]>();
    for (const t of rows) {
      const k = t.epic?.id ?? "__none__";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    const order = [...m.keys()].sort((a, b) => {
      if (a === "__none__") return 1;
      if (b === "__none__") return -1;
      const ta = m.get(a)![0].epic?.title ?? "";
      const tb = m.get(b)![0].epic?.title ?? "";
      return ta.localeCompare(tb);
    });
    return order.map((k) => ({ key: k, label: k === "__none__" ? "Tanpa epic" : (m.get(k)![0].epic?.title ?? "Epic"), rows: m.get(k)! }));
  };

  return (
    <div className="max-h-[28rem] overflow-y-auto overscroll-y-contain rounded-md border border-zinc-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            {canEdit ? (
              <TableHead className="w-10">
                <Checkbox
                  checked={allPageSelected}
                  onCheckedChange={(v) => onToggleAllPage(Boolean(v))}
                  aria-label="Pilih semua di halaman"
                />
              </TableHead>
            ) : null}
            <SortableTableHead
              label="Judul"
              columnKey="title"
              activeSortKey={sortBy}
              sortDirection={sortDir}
              onSort={(k) => onSort(k as TaskSortKey)}
              className="font-medium text-zinc-800"
            />
            <SortableTableHead
              label="Status"
              columnKey="status"
              activeSortKey={sortBy}
              sortDirection={sortDir}
              onSort={(k) => onSort(k as TaskSortKey)}
              className="font-medium text-zinc-800"
            />
            <SortableTableHead
              label="Prioritas"
              columnKey="priority"
              activeSortKey={sortBy}
              sortDirection={sortDir}
              onSort={(k) => onSort(k as TaskSortKey)}
              className="font-medium text-zinc-800"
            />
            <SortableTableHead
              label="Epic"
              columnKey="epic"
              activeSortKey={sortBy}
              sortDirection={sortDir}
              onSort={(k) => onSort(k as TaskSortKey)}
              className="font-medium text-zinc-800"
            />
            <SortableTableHead
              label="Deadline"
              columnKey="dueDate"
              activeSortKey={sortBy}
              sortDirection={sortDir}
              onSort={(k) => onSort(k as TaskSortKey)}
              className="font-medium text-zinc-800 whitespace-nowrap"
            />
            <SortableTableHead
              label="Dibuat"
              columnKey="createdAt"
              activeSortKey={sortBy}
              sortDirection={sortDir}
              onSort={(k) => onSort(k as TaskSortKey)}
              className="font-medium text-zinc-800 whitespace-nowrap"
            />
            <SortableTableHead
              label="Assignee"
              columnKey="assignee"
              activeSortKey={sortBy}
              sortDirection={sortDir}
              onSort={(k) => onSort(k as TaskSortKey)}
              className="font-medium text-zinc-800"
            />
            <TableHead className="w-[140px] text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupByEpic ? (
            groups().map((g) => (
              <Fragment key={g.key}>
                <TableRow className="bg-zinc-50">
                  <TableCell
                    colSpan={canEdit ? 9 : 8}
                    className="py-2 font-semibold text-zinc-800"
                  >
                    {g.label}
                  </TableCell>
                </TableRow>
                <TaskRows
                  rows={g.rows}
                  canEdit={canEdit}
                  selected={selected}
                  onToggle={onToggle}
                  onOpenDetail={onOpenDetail}
                  onOpenEdit={onOpenEdit}
                />
              </Fragment>
            ))
          ) : (
            <TaskRows
              rows={rows}
              canEdit={canEdit}
              selected={selected}
              onToggle={onToggle}
              onOpenDetail={onOpenDetail}
              onOpenEdit={onOpenEdit}
            />
          )}
        </TableBody>
      </Table>
    </div>
  );
}
