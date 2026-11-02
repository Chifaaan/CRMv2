"use client";

import { useMemo, useState } from "react";
import { Kanban, LayoutList, Rows3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  formatDate,
  isOverdue,
  tasksForAssignee,
  userById,
} from "@/lib/prototype/domain";
import {
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  type Task,
} from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  PageHeader,
  PriorityBadge,
  TaskStatusBadge,
} from "../ui";
import { TaskDialog } from "../dialogs";
import { TaskBoard } from "./board";

type View = "board" | "list" | "swimlane";

export function MyTasksPage() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const tasks = currentUser ? tasksForAssignee(store, currentUser.id) : [];
  const [view, setView] = useState<View>("board");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | undefined>();

  const filtered = useMemo(
    () =>
      tasks.filter((task) => {
        if (search && !`${task.title} ${task.code}`.toLowerCase().includes(search.toLowerCase())) return false;
        if (status && task.status !== status) return false;
        return true;
      }),
    [tasks, search, status],
  );

  if (!currentUser) return null;

  const openTask = (task: Task) => {
    setActiveTask(task);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="My tasks"
        description="Task yang di-assign kepada Anda. Sinkron dengan board tiap proyek."
        actions={
          <div className="bg-muted flex items-center rounded-lg p-1">
            {[
              { key: "board", label: "Board", icon: Kanban },
              { key: "list", label: "List", icon: LayoutList },
              { key: "swimlane", label: "Swimlane", icon: Rows3 },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key as View)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  view === item.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <item.icon className="size-3.5" /> {item.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari judul task…"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm"
        >
          <option value="">Semua status</option>
          {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title="Belum ada task"
          description="Manager/Admin akan meng-assign task kepada Anda."
        />
      ) : view === "board" ? (
        <TaskBoard tasks={filtered} onTaskClick={openTask} />
      ) : view === "list" ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground border-b bg-muted/30 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Task</th>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const project = store.projects.find((item) => item.id === task.projectId);
                return (
                  <tr
                    key={task.id}
                    className="hover:bg-muted/40 cursor-pointer border-b last:border-0"
                    onClick={() => openTask(task)}
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium">{task.title}</p>
                      <p className="text-muted-foreground text-[10px]">{task.code}</p>
                    </td>
                    <td className="px-3 py-2">{project?.name}</td>
                    <td className="px-3 py-2"><TaskStatusBadge status={task.status} /></td>
                    <td className="px-3 py-2"><PriorityBadge priority={task.priority} /></td>
                    <td className={cn("px-3 py-2", isOverdue(task) && "font-medium text-rose-600")}>
                      {formatDate(task.dueDate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {[...new Set(filtered.map((task) => task.projectId))].map((projectId) => {
            const project = store.projects.find((item) => item.id === projectId);
            const projectTasks = filtered.filter((task) => task.projectId === projectId);
            return (
              <div key={projectId} className="rounded-xl border bg-card p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="size-7 rounded-md" style={{ backgroundColor: project?.coverColor }} />
                  <p className="text-sm font-semibold">{project?.name}</p>
                  <span className="text-muted-foreground text-xs">{projectTasks.length} task</span>
                </div>
                <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                  {TASK_STATUSES.map((columnStatus) => {
                    const list = projectTasks.filter((task) => task.status === columnStatus);
                    return (
                      <div key={columnStatus} className="rounded-lg bg-muted/30 p-2">
                        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold">
                          <span>{TASK_STATUS_LABEL[columnStatus]}</span>
                          <span>{list.length}</span>
                        </div>
                        <div className="space-y-1">
                          {list.map((task) => (
                            <button
                              key={task.id}
                              type="button"
                              onClick={() => openTask(task)}
                              className="bg-card w-full rounded-md border p-2 text-left text-[10px] shadow-sm"
                            >
                              <span className="line-clamp-2 font-medium">{task.title}</span>
                              <span className="text-muted-foreground mt-1 block">{task.code}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTask ? (
        <TaskDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          projectId={activeTask.projectId}
          taskId={activeTask.id}
        />
      ) : null}
    </div>
  );
}
