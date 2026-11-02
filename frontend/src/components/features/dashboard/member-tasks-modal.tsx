"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DashboardProjectFilter,
  type AccessibleProject,
} from "@/components/features/dashboard/dashboard-widgets";
import { DashboardInfiniteSentinel } from "@/components/features/dashboard/dashboard-infinite-sentinel";
import {
  OverdueBadge,
  PriorityBadge,
  TaskStatusBadge,
} from "@/components/features/dashboard/dashboard-task-badges";
import {
  dashboardTotalCount,
  flattenDashboardPages,
  useDashboardInfinite,
} from "@/lib/hooks/use-dashboard-infinite";
import { cn } from "@/lib/utils";

const PIPELINE_STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "on_check", label: "On Check" },
  { value: "completed", label: "Completed" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

export type MemberTaskItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  overdueDays: number | null;
  project: { id: string; name: string; coverColor: string | null };
};

export type MemberTasksModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    userId: string;
    name: string;
    image: string | null;
    taskCount: number;
  } | null;
  projects: AccessibleProject[];
  onOpenTask: (task: MemberTaskItem) => void;
};

export function MemberTasksModal({
  open,
  onOpenChange,
  member,
  projects,
  onOpenTask,
}: MemberTasksModalProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [projectId, setProjectId] = useState("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "priority">("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!open) {
      setSearchInput("");
      setDebouncedSearch("");
      setStatusFilter([]);
      setPriorityFilter([]);
      setProjectId("all");
      setSortBy("dueDate");
      setSortDir("asc");
    }
  }, [open]);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {
      sortBy,
      sortDir,
    };
    if (debouncedSearch) p.search = debouncedSearch;
    if (projectId !== "all") p.projectId = projectId;
    if (statusFilter.length) p.status = statusFilter.join(",");
    if (priorityFilter.length) p.priority = priorityFilter.join(",");
    return p;
  }, [debouncedSearch, projectId, statusFilter, priorityFilter, sortBy, sortDir]);

  const tasksQ = useDashboardInfinite<MemberTaskItem>({
    queryKey: [
      "dashboard",
      "member-tasks",
      member?.userId ?? "",
      queryParams,
    ],
    path: member
      ? `/api/reports/dashboard/member-tasks/${member.userId}`
      : "",
    params: queryParams,
    enabled: open && Boolean(member?.userId),
  });

  const tasks = flattenDashboardPages(tasksQ.data);
  const total = dashboardTotalCount(tasksQ.data);
  const activeFilterCount =
    statusFilter.length +
    priorityFilter.length +
    (projectId !== "all" ? 1 : 0);

  function toggleStatus(value: string) {
    setStatusFilter((prev) =>
      prev.includes(value)
        ? prev.filter((s) => s !== value)
        : [...prev, value],
    );
  }

  function togglePriority(value: string) {
    setPriorityFilter((prev) =>
      prev.includes(value)
        ? prev.filter((p) => p !== value)
        : [...prev, value],
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90vh,820px)] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center gap-3 pr-8">
            <Avatar className="size-11">
              {member?.image ? (
                <AvatarImage src={member.image} alt="" />
              ) : null}
              <AvatarFallback className="text-xs">
                {member?.name.slice(0, 2).toUpperCase() ?? "—"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-left text-lg">
                {member?.name ?? "Member"}
              </DialogTitle>
              <p className="text-xs text-zinc-500">Task Detail Member</p>
            </div>
            {member ? (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                {member.taskCount}
              </span>
            ) : null}
          </div>
        </DialogHeader>

        <div className="shrink-0 space-y-3 border-b border-zinc-100 px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari task atau proyek…"
              className="h-9 pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger
                type="button"
                render={
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" />
                }
              >
                <Filter className="size-3.5" />
                Status
                {statusFilter.length > 0 ? (
                  <span className="rounded-full bg-indigo-100 px-1.5 text-[10px] font-bold text-indigo-700">
                    {statusFilter.length}
                  </span>
                ) : null}
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-3">
                <p className="mb-2 text-xs font-semibold text-zinc-500 uppercase">
                  Status
                </p>
                <ul className="space-y-2">
                  {PIPELINE_STATUS_OPTIONS.map((opt) => (
                    <li key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`mts-${opt.value}`}
                        checked={statusFilter.includes(opt.value)}
                        onCheckedChange={() => toggleStatus(opt.value)}
                      />
                      <Label
                        htmlFor={`mts-${opt.value}`}
                        className="cursor-pointer text-sm font-normal"
                      >
                        {opt.label}
                      </Label>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger
                type="button"
                render={
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" />
                }
              >
                <Filter className="size-3.5" />
                Priority
                {priorityFilter.length > 0 ? (
                  <span className="rounded-full bg-indigo-100 px-1.5 text-[10px] font-bold text-indigo-700">
                    {priorityFilter.length}
                  </span>
                ) : null}
              </PopoverTrigger>
              <PopoverContent align="start" className="w-48 p-3">
                <p className="mb-2 text-xs font-semibold text-zinc-500 uppercase">
                  Priority
                </p>
                <ul className="space-y-2">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <li key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`mtp-${opt.value}`}
                        checked={priorityFilter.includes(opt.value)}
                        onCheckedChange={() => togglePriority(opt.value)}
                      />
                      <Label
                        htmlFor={`mtp-${opt.value}`}
                        className="cursor-pointer text-sm font-normal"
                      >
                        {opt.label}
                      </Label>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>

            <DashboardProjectFilter
              id="member-tasks-project"
              projects={projects}
              value={projectId}
              onChange={setProjectId}
            />

            <Select
              value={sortBy}
              onValueChange={(v) =>
                v && setSortBy(v as "dueDate" | "priority")
              }
              items={[
                { value: "dueDate", label: "Due Date" },
                { value: "priority", label: "Priority" },
              ]}
            >
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dueDate">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortDir}
              onValueChange={(v) => v && setSortDir(v as "asc" | "desc")}
              items={[
                { value: "asc", label: "Asc" },
                { value: "desc", label: "Desc" },
              ]}
            >
              <SelectTrigger className="h-8 w-[88px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Asc</SelectItem>
                <SelectItem value="desc">Desc</SelectItem>
              </SelectContent>
            </Select>

            {activeFilterCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-zinc-500"
                onClick={() => {
                  setStatusFilter([]);
                  setPriorityFilter([]);
                  setProjectId("all");
                }}
              >
                Reset filter
              </Button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tasksQ.isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : tasksQ.isError ? (
            <p className="p-4 text-sm text-destructive">Gagal memuat task.</p>
          ) : tasks.length === 0 ? (
            <p className="p-8 text-center text-sm text-zinc-500">
              Tidak ada task Run-in Pipeline untuk member ini.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="sticky top-0 z-10 bg-zinc-50/95 text-left text-xs font-semibold text-zinc-500 uppercase">
                    <tr className="border-b border-zinc-100">
                      <th className="px-4 py-2.5">Task Name</th>
                      <th className="px-4 py-2.5">Project</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Priority</th>
                      <th className="px-4 py-2.5">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {tasks.map((t) => (
                      <tr
                        key={t.id}
                        className="transition-colors hover:bg-zinc-50/80"
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => onOpenTask(t)}
                            className="text-left font-medium text-zinc-900 hover:text-indigo-600"
                          >
                            {t.title}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {t.project.coverColor ? (
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: t.project.coverColor }}
                                aria-hidden
                              />
                            ) : null}
                            <span className="text-zinc-700">
                              {t.project.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <TaskStatusBadge status={t.status} />
                        </td>
                        <td className="px-4 py-3">
                          <PriorityBadge priority={t.priority} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {t.dueDate ? (
                              <time
                                className={cn(
                                  "text-xs tabular-nums",
                                  t.overdueDays != null
                                    ? "font-medium text-red-600"
                                    : "text-zinc-600",
                                )}
                                dateTime={t.dueDate}
                              >
                                {new Date(t.dueDate).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </time>
                            ) : (
                              <span className="text-xs text-zinc-400">—</span>
                            )}
                            {t.overdueDays != null ? (
                              <OverdueBadge days={t.overdueDays} />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <DashboardInfiniteSentinel
                hasMore={tasksQ.hasNextPage}
                isFetchingNextPage={tasksQ.isFetchingNextPage}
                onLoadMore={() => void tasksQ.fetchNextPage()}
              />
              {total > 0 ? (
                <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500">
                  {total} task aktif
                </p>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
