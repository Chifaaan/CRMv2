"use client";

import { useMemo, useState } from "react";
import { Kanban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePrototypeStore } from "@/lib/prototype/store";
import { tasksForAssignee, userById } from "@/lib/prototype/domain";
import {
  TASK_STATUS_LABEL,
  type Project,
  type Task,
} from "@/lib/prototype/types";
import {
  EmptyState,
  NativeSelect,
  PageHeader,
} from "../ui";
import { TaskDialog } from "../dialogs";
import { TaskBoard } from "./board";

export function MyTasksPage() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const tasks = useMemo(
    () => (currentUser ? tasksForAssignee(store, currentUser.id) : []),
    [store, currentUser],
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | undefined>();

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

  if (!currentUser) return null;

  const openTask = (task: Task) => {
    setActiveTask(task);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="My tasks"
        description="Semua card yang di-assign kepada Anda dari seluruh proyek, dalam satu board."
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

      {tasks.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title="Belum ada task"
          description="Manager/Admin akan meng-assign task kepada Anda."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title="Tidak ada task yang cocok"
          description="Ubah pencarian atau filter proyek/status untuk melihat task lain."
        />
      ) : (
        <TaskBoard tasks={filtered} onTaskClick={openTask} showProject />
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
