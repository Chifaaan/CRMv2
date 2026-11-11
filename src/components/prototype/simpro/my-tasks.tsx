"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Kanban, LayoutList, Rows3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  assignmentQueueForUser,
  formatDate,
  isOverdue,
  isScheduledTask,
  operationalAssigneeCandidates,
  pitchingTaskAssignees,
  prospekWorkItemsForUser,
  tasksForAssignee,
  userById,
} from "@/lib/prototype/domain";
import {
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  type Project,
  type Task,
} from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  NativeSelect,
  PageHeader,
  PriorityBadge,
  TaskStatusBadge,
} from "../ui";
import { TaskDialog } from "../dialogs";
import { TaskBoard } from "./board";
import { ProjectAccordion } from "./project-accordion";
import { toast } from "sonner";

type View = "board" | "list" | "swimlane";

function sortByStatus(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      TASK_STATUS_ORDER[a.status] - TASK_STATUS_ORDER[b.status] ||
      a.code.localeCompare(b.code),
  );
}

export function MyTasksPage() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const tasks = useMemo(
    () =>
      currentUser
        ? tasksForAssignee(store, currentUser.id).filter(
            (task) => !isScheduledTask(store, task),
          )
        : [],
    [store, currentUser],
  );
  const prospekWork = useMemo(
    () => (currentUser ? prospekWorkItemsForUser(store, currentUser.id) : []),
    [store, currentUser],
  );
  const [view, setView] = useState<View>("board");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | undefined>();
  const [queueUser, setQueueUser] = useState<Record<string, string>>({});
  const queue = useMemo(
    () => (currentUser ? assignmentQueueForUser(store, currentUser) : []),
    [store, currentUser],
  );

  const projectOptions = useMemo(() => {
    const ids = [...new Set(tasks.map((task) => task.projectId))];
    return ids
      .map((id) => store.projects.find((project) => project.id === id))
      .filter((project): project is Project => Boolean(project))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks, store.projects]);

  const filtered = useMemo(
    () =>
      tasks.filter((task) => {
        if (
          search &&
          !`${task.title} ${task.code}`
            .toLowerCase()
            .includes(search.toLowerCase())
        ) {
          return false;
        }
        if (status && task.status !== status) return false;
        if (projectId && task.projectId !== projectId) return false;
        return true;
      }),
    [tasks, search, status, projectId],
  );

  const groups = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of filtered) {
      if (!task.projectId) continue;
      map.set(task.projectId, [...(map.get(task.projectId) ?? []), task]);
    }
    return [...map.entries()]
      .map(([id, list]) => ({
        project: store.projects.find((project) => project.id === id),
        tasks: sortByStatus(list),
      }))
      .filter(
        (group): group is { project: Project; tasks: Task[] } =>
          Boolean(group.project),
      )
      .sort((a, b) => a.project.name.localeCompare(b.project.name));
  }, [filtered, store.projects]);

  const pitchingGroups = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of filtered) {
      if (task.projectId || !task.pitchingId) continue;
      map.set(task.pitchingId, [
        ...(map.get(task.pitchingId) ?? []),
        task,
      ]);
    }
    return [...map.entries()].flatMap(([id, list]) => {
      const pitching = store.prospekPitchings.find((item) => item.id === id);
      if (!pitching) return [];
      const prospek = store.prospeks.find(
        (item) => item.id === pitching.prospekId,
      );
      return [{ pitching, prospek, tasks: sortByStatus(list) }];
    });
  }, [filtered, store.prospekPitchings, store.prospeks]);

  if (!currentUser) return null;

  const openTask = (task: Task) => {
    setActiveTask(task);
    setDialogOpen(true);
  };

  const toggleGroup = (id: string) => {
    setCollapsed((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const candidatesFor = (item: (typeof queue)[number]) => {
    if (item.kind === "form") {
      return operationalAssigneeCandidates(store, currentUser, item.project);
    }
    if (item.pitching) {
      return pitchingTaskAssignees(store, currentUser, item.pitching);
    }
    return operationalAssigneeCandidates(store, currentUser, item.project);
  };

  const assignQueueItem = (item: (typeof queue)[number]) => {
    const itemId = item.kind === "task" ? item.task.id : item.entry.id;
    const userId = queueUser[itemId];
    if (!userId) return;
    if (item.kind === "task") {
      store.assignTask(item.task.id, userId);
    } else {
      store.assignFormEntry(item.entry.id, userId);
    }
    setQueueUser((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    toast.success("Pekerjaan di-assign.");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="My tasks"
        description="Task yang di-assign kepada Anda, dikelompokkan per proyek. Sinkron dengan board tiap proyek."
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

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px]">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari judul task…"
        />
        <NativeSelect value={projectId} onChange={setProjectId}>
          <option value="">Semua proyek</option>
          {projectOptions.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={status} onChange={setStatus}>
          <option value="">Semua status</option>
          {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {queue.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Perlu di-assign</h2>
            <span className="text-muted-foreground text-[11px]">
              {queue.length} pekerjaan
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {queue.map((item) => {
              const itemId =
                item.kind === "task" ? item.task.id : item.entry.id;
              const title =
                item.kind === "task" ? item.task.title : item.entry.title;
              const context =
                item.kind === "task"
                  ? item.pitching
                    ? `${item.pitching.title}`
                    : (item.project?.name ?? "Proyek")
                  : (item.project?.name ?? "Proyek");
              const scheduled =
                item.kind === "task"
                  ? item.scheduled
                  : item.scheduled;
              const candidates = candidatesFor(item);
              return (
                <div
                  key={`${item.kind}-${itemId}`}
                  className="bg-card rounded-lg border p-3 text-xs shadow-sm"
                >
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                    {item.kind === "task" ? "Task" : "Form"} · {context}
                  </p>
                  <p className="mt-1 font-semibold">{title}</p>
                  {scheduled ? (
                    <p className="mt-1 text-[10px] font-medium text-amber-600">
                      Terjadwal · menunggu step aktif
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center gap-2">
                    <NativeSelect
                      value={queueUser[itemId] ?? ""}
                      onChange={(value) =>
                        setQueueUser((current) => ({
                          ...current,
                          [itemId]: value,
                        }))
                      }
                    >
                      <option value="">Pilih assignee</option>
                      {candidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </option>
                      ))}
                    </NativeSelect>
                    <button
                      type="button"
                      className="bg-primary text-primary-foreground rounded-md px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-50"
                      disabled={!queueUser[itemId]}
                      onClick={() => assignQueueItem(item)}
                    >
                      Assign
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {prospekWork.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pekerjaan Prospek</h2>
            <span className="text-muted-foreground text-[11px]">
              {prospekWork.length} pekerjaan
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {prospekWork.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="bg-card hover:border-primary/40 rounded-lg border p-3 text-xs shadow-sm transition-colors"
              >
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                  {item.kind} · {item.context}
                </p>
                <p className="mt-1 font-semibold">{item.title}</p>
                <p className="text-muted-foreground mt-1 text-[10px]">
                  {item.status.replace(/_/g, " ")}
                  {item.dueDate ? ` · Due ${formatDate(item.dueDate)}` : ""}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {tasks.length === 0 && prospekWork.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title="Belum ada task"
          description="Manager/Admin akan meng-assign task kepada Anda."
        />
      ) : tasks.length === 0 ? null : groups.length === 0 &&
        pitchingGroups.length === 0 ? (
        <EmptyState
          icon={LayoutList}
          title="Tidak ada task yang cocok"
          description="Ubah pencarian atau filter proyek/status untuk melihat task lain."
        />
      ) : (
        <div className="space-y-3">
          {groups.map(({ project, tasks: projectTasks }) => {
            const open = !collapsed.includes(project.id);
            return (
              <ProjectAccordion
                key={project.id}
                projectId={project.id}
                name={project.name}
                code={project.code}
                color={project.coverColor}
                count={projectTasks.length}
                unit="task"
                open={open}
                onToggle={() => toggleGroup(project.id)}
              >
                {view === "board" ? (
                  <TaskBoard
                    tasks={projectTasks}
                    onTaskClick={openTask}
                  />
                ) : view === "list" ? (
                  <div className="overflow-x-auto rounded-xl border bg-card">
                    <table className="w-full text-left text-xs">
                      <thead className="text-muted-foreground border-b bg-muted/30 text-[10px] uppercase tracking-wide">
                        <tr>
                          <th className="px-3 py-2">Task</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Priority</th>
                          <th className="px-3 py-2">Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectTasks.map((task) => (
                          <tr
                            key={task.id}
                            className="hover:bg-muted/40 cursor-pointer border-b last:border-0"
                            onClick={() => openTask(task)}
                          >
                            <td className="px-3 py-2">
                              <p className="font-medium">{task.title}</p>
                              <p className="text-muted-foreground text-[10px]">
                                {task.code}
                              </p>
                            </td>
                            <td className="px-3 py-2">
                              <TaskStatusBadge status={task.status} />
                            </td>
                            <td className="px-3 py-2">
                              <PriorityBadge priority={task.priority} />
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2",
                                isOverdue(task) && "font-medium text-rose-600",
                              )}
                            >
                              {formatDate(task.dueDate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                    {TASK_STATUSES.map((columnStatus) => {
                      const list = projectTasks.filter(
                        (task) => task.status === columnStatus,
                      );
                      return (
                        <div
                          key={columnStatus}
                          className="rounded-lg bg-muted/30 p-2"
                        >
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
                                <span className="line-clamp-2 font-medium">
                                  {task.title}
                                </span>
                                <span className="text-muted-foreground mt-1 block">
                                  {task.code}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ProjectAccordion>
            );
          })}
          {pitchingGroups.map(({ pitching, prospek, tasks: pitchingTasks }) => {
            const open = !collapsed.includes(pitching.id);
            return (
              <ProjectAccordion
                key={pitching.id}
                projectId={pitching.id}
                name={prospek?.name ?? pitching.title}
                code="PITCHING"
                color="#0f766e"
                count={pitchingTasks.length}
                unit="task"
                open={open}
                onToggle={() => toggleGroup(pitching.id)}
              >
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {pitchingTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => {
                        window.location.href = `/work/prospek/${pitching.id}/form`;
                      }}
                      className="bg-card hover:border-primary/40 rounded-lg border p-3 text-left text-xs shadow-sm"
                    >
                      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                        Form Pitching · {pitching.title}
                      </p>
                      <p className="mt-1 font-semibold">{task.title}</p>
                      <p className="text-muted-foreground mt-1 text-[10px]">
                        {TASK_STATUS_LABEL[task.status]}
                        {task.dueDate ? ` · Due ${formatDate(task.dueDate)}` : ""}
                        {isScheduledTask(store, task)
                          ? " · Terjadwal"
                          : ""}
                      </p>
                    </button>
                  ))}
                </div>
              </ProjectAccordion>
            );
          })}
        </div>
      )}

      {activeTask?.projectId ? (
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
