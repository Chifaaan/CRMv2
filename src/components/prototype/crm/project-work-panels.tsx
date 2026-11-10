"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  boardVisibleStages,
  canCreateTask,
  formEntriesForProject,
  formLabel,
  formsFor,
  formatDate,
  projectBoardTasks,
  projectMediaOrders,
  taskBoardStage,
  tasksForProject,
  userById,
} from "@/lib/prototype/domain";
import {
  FORM_ENTRY_STATUS_LABEL,
  TASK_STATUS_LABEL,
  type Project,
  type Task,
} from "@/lib/prototype/types";
import {
  EmptyState,
  FormStatusBadge,
  NativeSelect,
  PriorityBadge,
  SectionCard,
  TaskStatusBadge,
  UserAvatar,
} from "../ui";
import { TaskBoard } from "../simpro/board";

function visibleTasks(currentUserRole: string, userId: string, tasks: Task[]) {
  return currentUserRole === "assignee" || currentUserRole === "media"
    ? tasks.filter((task) => task.assigneeId === userId)
    : tasks;
}

export function CrmProjectBoardTab({
  project,
  onTaskClick,
  onNewTask,
}: {
  project: Project;
  onTaskClick: (task: Task) => void;
  onNewTask: (stepKey: string) => void;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const stages = boardVisibleStages(store, project.id);
  const [stageKey, setStageKey] = useState("");

  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("stage");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStageKey(fromQuery ?? "");
  }, [project.id]);

  if (!currentUser) return null;
  if (currentUser.role === "finance") {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Board hanya untuk pekerjaan operasional"
        description="Finance mengerjakan Form Keuangan melalui tab Forms."
      />
    );
  }

  if (stages.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Belum ada tahap berjalan"
        description="Tahap SIMPRO muncul di Board setelah berjalan di CRM. Tahap selesai tetap dapat dibuka read-only."
      />
    );
  }

  const selectedStage = stages.find((step) => step.key === stageKey);
  const activeStage = stages.find((step) => step.status === "active");
  const tasks = visibleTasks(
    currentUser.role,
    currentUser.id,
    projectBoardTasks(store, project.id, selectedStage?.key),
  );
  const completedStageIds = new Set(
    stages
      .filter((step) => step.status === "completed")
      .map((step) => step.id),
  );
  const readOnlyTaskIds = new Set(
    tasks
      .filter((task) => {
        const stage = taskBoardStage(store, project.id, task);
        return Boolean(stage && completedStageIds.has(stage.id));
      })
      .map((task) => task.id),
  );
  const boardReadOnly = selectedStage
    ? selectedStage.status === "completed"
    : !activeStage;
  const createStage = selectedStage
    ? selectedStage.status === "active"
      ? selectedStage
      : undefined
    : activeStage;
  const canCreate =
    Boolean(createStage) &&
    !boardReadOnly &&
    canCreateTask(store, currentUser, project);

  return (
    <SectionCard
      title={selectedStage ? `Board · ${selectedStage.name}` : "Board · Semua tahap"}
      description="Seluruh card proyek dari tahap berjalan dan selesai. Pilih tahap untuk memfilter card."
    >
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium">
          Filter tahap
          <NativeSelect
            value={selectedStage?.key ?? ""}
            onChange={(value) => {
              setStageKey(value);
              const url = new URL(window.location.href);
              if (value) url.searchParams.set("stage", value);
              else url.searchParams.delete("stage");
              window.history.replaceState(null, "", url);
            }}
            className="mt-1 w-[260px]"
          >
            <option value="">Semua tahap ({stages.length})</option>
            <optgroup label="Berjalan">
              {stages
                .filter((step) => step.status === "active")
                .map((step) => (
                  <option key={step.id} value={step.key}>
                    {step.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Selesai">
              {stages
                .filter((step) => step.status === "completed")
                .map((step) => (
                  <option key={step.id} value={step.key}>
                    {step.name}
                  </option>
                ))}
            </optgroup>
          </NativeSelect>
        </label>
        <span className="text-muted-foreground pb-2 text-[11px]">
          {tasks.length} card
        </span>
      </div>
      <TaskBoard
        tasks={tasks}
        onTaskClick={onTaskClick}
        onNewTask={
          canCreate && createStage
            ? () => onNewTask(createStage.key)
            : undefined
        }
        readOnly={boardReadOnly}
        readOnlyTaskIds={readOnlyTaskIds}
      />
    </SectionCard>
  );
}

export function CrmProjectBacklogTab({
  project,
  onTaskClick,
  onNewTask,
}: {
  project: Project;
  onTaskClick: (task: Task) => void;
  onNewTask: (stepKey: string) => void;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const tasks = useMemo(
    () =>
      currentUser
        ? visibleTasks(
            currentUser.role,
            currentUser.id,
            tasksForProject(store, project.id),
          )
        : [],
    [currentUser, project, store],
  );
  if (!currentUser) return null;
  if (currentUser.role === "finance") {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Backlog hanya untuk pekerjaan operasional"
        description="Finance mengerjakan Form Keuangan melalui tab Forms."
      />
    );
  }

  const filtered = tasks.filter((task) => {
    if (status && task.status !== status) return false;
    if (
      search &&
      !`${task.title} ${task.code}`.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
  const activeStep = store.steps.find(
    (step) =>
      step.projectId === project.id &&
      step.status === "active" &&
      step.kind === "simpro",
  );
  const canCreate = canCreateTask(store, currentUser, project) && Boolean(activeStep);

  return (
    <SectionCard
      title="Backlog"
      description={`Daftar task proyek ${project.name}.`}
      actions={
        canCreate ? (
          <Button
            size="sm"
            onClick={() => {
              if (activeStep) onNewTask(activeStep.key);
            }}
          >
            <Plus className="size-3.5" /> New task
          </Button>
        ) : null
      }
    >
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_180px]">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks…"
            className="pl-8"
          />
        </div>
        <NativeSelect value={status} onChange={setStatus}>
          <option value="">Semua status</option>
          {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-muted-foreground border-b text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-2 py-2">Judul</th>
              <th className="px-2 py-2">Tahap</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Prioritas</th>
              <th className="px-2 py-2">Due</th>
              <th className="px-2 py-2">Assignee</th>
              <th className="px-2 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => {
              const stage = store.steps.find(
                (step) => step.projectId === task.projectId && step.key === task.stepKey,
              );
              return (
                <tr key={task.id} className="hover:bg-muted/40 border-b last:border-0">
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      className="text-left font-medium hover:underline"
                      onClick={() => onTaskClick(task)}
                    >
                      {task.title}
                    </button>
                    <div className="text-muted-foreground text-[10px]">{task.code}</div>
                  </td>
                  <td className="px-2 py-2">{stage?.name ?? "—"}</td>
                  <td className="px-2 py-2">
                    <TaskStatusBadge status={task.status} />
                  </td>
                  <td className="px-2 py-2">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="px-2 py-2">{formatDate(task.dueDate)}</td>
                  <td className="px-2 py-2">
                    {task.assigneeId ? (
                      <UserAvatar user={userById(store, task.assigneeId)} size="sm" showName />
                    ) : (
                      <span className="text-muted-foreground text-[10px]">Unassigned</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <Button variant="ghost" size="sm" onClick={() => onTaskClick(task)}>
                      Detail
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-xs">Tidak ada task.</p>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function CrmProjectFormsTab({ project }: { project: Project }) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  if (!currentUser) return null;

  const steps = store.steps.filter((step) => step.projectId === project.id);
  const forms = formsFor(store, project.id).filter(
    (form) =>
      steps.some(
        (step) => step.financeKind === form.type || step.legacyKey === form.type,
      ) ||
      (form.type === "mo" && projectMediaOrders(store, project.id).length > 0),
  );
  const entries = formEntriesForProject(store, project.id).filter((entry) =>
    currentUser.role === "assignee" || currentUser.role === "finance"
      ? entry.assigneeId === currentUser.id
      : true,
  );
  const visibleForms = forms.filter((form) => {
    if (currentUser.role === "finance" || currentUser.role === "assignee") {
      return form.assigneeId === currentUser.id;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <SectionCard
        title="Form Keuangan"
        description="RAB, Media Order, BAST, Invoice, dan Pembayaran proyek ini."
      >
        {visibleForms.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Belum ada form keuangan" />
        ) : (
          <div className="space-y-2">
            {visibleForms.map((form) => (
              <div
                key={form.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{formLabel(form.type)}</p>
                  <p className="text-muted-foreground text-[10px]">
                    Assignee {userById(store, form.assigneeId)?.name ?? "Belum di-assign"}
                  </p>
                </div>
                <FormStatusBadge status={form.status} />
                <Link href={`/crm/projects/${project.id}/forms/${form.type}`}>
                  <Button size="xs" variant="outline">
                    Buka
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Form Proyek"
        description="Entri Form dari tahap proyek."
      >
        {entries.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Belum ada entri Form" />
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{entry.title}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {FORM_ENTRY_STATUS_LABEL[entry.status]}
                    {entry.dueDate ? ` · Tenggat ${formatDate(entry.dueDate)}` : ""}
                  </p>
                </div>
                <UserAvatar user={userById(store, entry.assigneeId)} size="sm" />
                <Link href={`/forms?entry=${entry.id}`}>
                  <Button size="xs" variant="outline">
                    Buka
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
