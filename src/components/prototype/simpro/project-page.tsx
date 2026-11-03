"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  FolderKanban,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  activeStepKey,
  activeSteps,
  calculateJourneyProgress,
  canCreateTask,
  canManageProject,
  canViewProject,
  formatCurrency,
  formatDate,
  formFor,
  formsFor,
  tasksForStep,
  userById,
  workProgressForProject,
} from "@/lib/prototype/domain";
import {
  PHASE_LABEL,
  TASK_STATUS_LABEL,
  type Project,
  type Task,
} from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import {
  DataRow,
  EmptyState,
  FormStatusBadge,
  NativeSelect,
  PriorityBadge,
  ProgressBar,
  SectionCard,
  TaskStatusBadge,
  UserAvatar,
} from "../ui";
import { ProjectDialog, TaskDialog } from "../dialogs";
import { SurveyFormDialog } from "../forms";
import { TaskBoard } from "./board";
import { projectTeam } from "../project-card";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "board", label: "Board" },
  { key: "backlog", label: "Backlog" },
  { key: "rab", label: "RAB" },
  { key: "forms", label: "Forms" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function ProjectHeader({
  project,
  active,
  onEdit,
}: {
  project: Project;
  active: string;
  onEdit: () => void;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const journey = calculateJourneyProgress(store, project.id);
  const work = workProgressForProject(store, project.id);
  const phase = activeSteps(store, project.id)[0]?.phase;
  const canManage = currentUser && canManageProject(currentUser, project);

  return (
    <div className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-foreground/10">
      <div
        className="p-5 text-white"
        style={{
          background: `linear-gradient(135deg, ${project.coverColor}, ${project.coverColor}c9)`,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] text-white/70">
              Projects / <span className="text-white/90">{project.name}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {phase ? (
                <span className="rounded-md bg-violet-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-white/25">
                  {PHASE_LABEL[phase]}
                </span>
              ) : null}
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-white/25">
                {project.status}
              </span>
              <PriorityBadge priority={project.priority} />
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-medium ring-1 ring-white/25">
                {project.code}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{project.name}</h1>
            <p className="mt-1 text-sm text-white/75">{project.client || "Tanpa klien"}</p>
          </div>
          {canManage ? (
            <Button variant="secondary" size="sm" onClick={onEdit}>
              <Pencil className="size-3.5" /> Edit project
            </Button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[1.4fr_0.6fr_0.6fr]">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-white/70">Progress task</span>
              <span className="font-semibold">{work}%</span>
            </div>
            <ProgressBar value={work} className="bg-white/20" tone="bg-white" />
            <p className="mt-1 text-[10px] text-white/60">Journey {journey}%</p>
          </div>
          <div className="text-xs text-white/70">
            <p className="text-[10px] uppercase tracking-wide">Mulai</p>
            <p className="mt-1 font-medium text-white">{formatDate(project.startDate)}</p>
          </div>
          <div className="text-xs text-white/70">
            <p className="text-[10px] uppercase tracking-wide">Selesai</p>
            <p className="mt-1 font-medium text-white">{formatDate(project.targetEndDate)}</p>
          </div>
        </div>
      </div>
      <div className="bg-card flex gap-1 overflow-x-auto px-3 py-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/projects/${project.id}${tab.key === "overview" ? "" : `/${tab.key}`}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              active === tab.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Overview({ project }: { project: Project }) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const tasks = store.tasks.filter(
    (task) =>
      task.projectId === project.id &&
      !task.archivedAt &&
      (currentUser?.role !== "assignee" || task.assigneeId === currentUser.id),
  );
  const done = tasks.filter((task) => task.status === "completed").length;
  const open = tasks.length - done;
  const journey = calculateJourneyProgress(store, project.id);
  const work = workProgressForProject(store, project.id);
  const team = projectTeam(project.id, store, false);
  const rab = formFor(store, project.id, "rab");
  const rabPayload = rab?.payload as { items?: { qty: number; unitPrice: number }[] } | undefined;
  const rabTotal = (rabPayload?.items ?? []).reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-sky-50 p-3">
            <p className="text-muted-foreground text-[10px] uppercase">Journey</p>
            <p className="mt-1 text-2xl font-semibold">{journey}%</p>
          </div>
          <div className="rounded-xl border bg-emerald-50 p-3">
            <p className="text-muted-foreground text-[10px] uppercase">Work</p>
            <p className="mt-1 text-2xl font-semibold">{work}%</p>
          </div>
          <div className="rounded-xl border bg-amber-50 p-3">
            <p className="text-muted-foreground text-[10px] uppercase">Tasks done</p>
            <p className="mt-1 text-2xl font-semibold">{done}</p>
          </div>
          <div className="rounded-xl border bg-violet-50 p-3">
            <p className="text-muted-foreground text-[10px] uppercase">Open tasks</p>
            <p className="mt-1 text-2xl font-semibold">{open}</p>
          </div>
        </div>

        <SectionCard title="Progress" description="Task selesai dibagi total task.">
          <ProgressBar value={work} />
          <p className="text-muted-foreground mt-2 text-xs">
            {done}/{tasks.length} task selesai
          </p>
        </SectionCard>

        <SectionCard title="Description">
          <p className="text-sm">{project.description || "Belum ada deskripsi."}</p>
        </SectionCard>

        <SectionCard title="RAB" description="Ringkasan read-only dari CRM.">
          <div className="grid gap-2 sm:grid-cols-2">
            <DataRow label="Status" value={rab ? <FormStatusBadge status={rab.status} /> : "—"} />
            <DataRow label="Total" value={formatCurrency(rabTotal)} />
          </div>
        </SectionCard>
      </div>

      <div className="space-y-4">
        <SectionCard title="Client">
          <p className="text-sm font-medium">{project.client || "Tanpa klien"}</p>
          <p className="text-muted-foreground mt-1 text-xs">Data klien berupa teks pada prototype.</p>
        </SectionCard>
        <SectionCard title="Team">
          <div className="space-y-2">
            {team.map((user) => (
              <div key={user.id} className="flex items-center gap-2">
                <UserAvatar user={user} size="sm" />
                <span className="text-xs">{user.name}</span>
                <span className="text-muted-foreground ml-auto text-[10px] uppercase">{user.role}</span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Schedule">
          <DataRow label="Start" value={formatDate(project.startDate)} />
          <DataRow label="Target end" value={formatDate(project.targetEndDate)} />
          <DataRow label="Actual end" value={formatDate(project.actualEndDate)} />
        </SectionCard>
      </div>
    </div>
  );
}

function Backlog({
  project,
  tasks,
  onTaskClick,
  onNewTask,
  canCreate,
}: {
  project: Project;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onNewTask: () => void;
  canCreate: boolean;
}) {
  const store = usePrototypeStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const filtered = useMemo(
    () =>
      tasks.filter((task) => {
        if (search && !`${task.title} ${task.code}`.toLowerCase().includes(search.toLowerCase())) return false;
        if (status && task.status !== status) return false;
        return true;
      }),
    [tasks, search, status],
  );

  return (
    <SectionCard
      title="Backlog"
      description={`Task step aktif untuk ${project.name}.`}
      actions={
        canCreate ? (
          <Button size="sm" onClick={onNewTask}>
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
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Prioritas</th>
              <th className="px-2 py-2">Due</th>
              <th className="px-2 py-2">Assignee</th>
              <th className="px-2 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => (
              <tr key={task.id} className="hover:bg-muted/40 border-b last:border-0">
                <td className="px-2 py-2">
                  <button type="button" className="text-left font-medium hover:underline" onClick={() => onTaskClick(task)}>
                    {task.title}
                  </button>
                  <div className="text-muted-foreground text-[10px]">{task.code}</div>
                </td>
                <td className="px-2 py-2"><TaskStatusBadge status={task.status} /></td>
                <td className="px-2 py-2"><PriorityBadge priority={task.priority} /></td>
                <td className="px-2 py-2">{formatDate(task.dueDate)}</td>
                <td className="px-2 py-2">
                  {task.assigneeId ? (
                    <UserAvatar user={userById(store, task.assigneeId)} size="sm" showName />
                  ) : task.requestedAssigneeId ? (
                    <span className="text-muted-foreground text-[10px]">
                      Requested: {userById(store, task.requestedAssigneeId)?.name}
                    </span>
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
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-xs">Tidak ada task.</p>
        ) : null}
      </div>
    </SectionCard>
  );
}

function RabReadOnly({ project }: { project: Project }) {
  const store = usePrototypeStore();
  const form = formFor(store, project.id, "rab");
  const payload = form?.payload as {
    items?: { id: string; description: string; qty: number; unit: string; unitPrice: number }[];
    notes?: string;
  };
  const items = payload?.items ?? [];
  const total = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  return (
    <SectionCard
      title="RAB"
      description="Read-only. Pengisian dan review dilakukan di CRM."
      actions={form ? <FormStatusBadge status={form.status} /> : null}
    >
      {!form || items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Belum ada RAB" description="Finance mengisi RAB di CRM." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground border-b text-[10px] uppercase">
                <tr>
                  <th className="px-2 py-2">Item</th>
                  <th className="px-2 py-2">Qty</th>
                  <th className="px-2 py-2">Satuan</th>
                  <th className="px-2 py-2 text-right">Harga</th>
                  <th className="px-2 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-2 py-2">{item.description}</td>
                    <td className="px-2 py-2">{item.qty}</td>
                    <td className="px-2 py-2">{item.unit}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(item.qty * item.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-right text-sm font-semibold">
            Total: {formatCurrency(total)}
          </div>
          {payload?.notes ? <p className="text-muted-foreground mt-2 text-xs">{payload.notes}</p> : null}
        </>
      )}
    </SectionCard>
  );
}

function FormsTab({ project }: { project: Project }) {
  const store = usePrototypeStore();
  const forms = formsFor(store, project.id);
  const [openFormId, setOpenFormId] = useState<string | null>(null);
  const survey = forms.find((form) => form.type === "survey");
  return (
    <SectionCard title="Forms" description="Form Survey dikelola di SIMPRO; form finance di CRM.">
      {!survey ? (
        <EmptyState icon={ClipboardList} title="Belum ada form" />
      ) : (
        <div className="flex items-center gap-3 rounded-xl border p-3">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
            <ClipboardList className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Survey</p>
            <p className="text-muted-foreground text-xs">
              Assignee: {userById(store, survey.assigneeId)?.name ?? "Belum di-assign"}
            </p>
          </div>
          <FormStatusBadge status={survey.status} />
          <Button size="sm" variant="outline" onClick={() => setOpenFormId(survey.id)}>
            Buka
          </Button>
        </div>
      )}
      <div className="text-muted-foreground mt-3 text-xs">
        RAB, BAST, dan Invoice diisi di CRM.
      </div>
      {openFormId ? (
        <SurveyFormDialog
          open={Boolean(openFormId)}
          onOpenChange={(open) => {
            if (!open) setOpenFormId(null);
          }}
          formId={openFormId}
        />
      ) : null}
    </SectionCard>
  );
}

export function SimproProjectPage({
  projectId,
  tab,
}: {
  projectId: string;
  tab: TabKey;
}) {
  const store = usePrototypeStore();
  const project = store.projects.find((item) => item.id === projectId);
  const currentUser = userById(store, store.currentUserId);
  const [editOpen, setEditOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const taskFromQuery = new URLSearchParams(window.location.search).get("task");
    if (!taskFromQuery) return;
    const exists = store.tasks.some(
      (task) => task.id === taskFromQuery && task.projectId === projectId,
    );
    if (exists) {
      setTaskId(taskFromQuery);
      setTaskDialogOpen(true);
    }
    // Only react to a new project; the query is a one-shot deep link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (!project || !currentUser) {
    return <EmptyState icon={FolderKanban} title="Proyek tidak ditemukan" />;
  }

  if (!canViewProject(store, currentUser, project)) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Akses ditolak"
        description="Anda tidak memiliki akses ke proyek ini."
      />
    );
  }

  if (currentUser.role === "assignee" && (tab === "backlog" || tab === "rab")) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Akses ditolak"
        description="Tab ini hanya tersedia untuk Manager/PM/Admin."
      />
    );
  }

  const stepKey = activeStepKey(store, project.id);
  const isBoardStep = stepKey === "pitching" || stepKey === "running";
  const stepTasks = stepKey ? tasksForStep(store, project.id, stepKey) : [];
  const tasks =
    currentUser.role === "assignee"
      ? stepTasks.filter((task) => task.assigneeId === currentUser.id)
      : stepTasks;
  const canCreate = canCreateTask(store, currentUser, project);

  const openTask = (task: Task) => {
    setTaskId(task.id);
    setTaskDialogOpen(true);
  };
  const openNewTask = () => {
    setTaskId(undefined);
    setTaskDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Link href="/projects" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs">
        <ArrowLeft className="size-3.5" /> Kembali ke projects
      </Link>

      <ProjectHeader project={project} active={tab} onEdit={() => setEditOpen(true)} />

      {tab === "overview" ? <Overview project={project} /> : null}
      {tab === "board" ? (
        isBoardStep ? (
          <SectionCard
            title={`Board · ${stepKey}`}
            description="Hanya task pada step aktif. Drag card sesuai aturan role."
          >
            <TaskBoard tasks={tasks} onTaskClick={openTask} onNewTask={canCreate ? openNewTask : undefined} />
          </SectionCard>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Board tidak tersedia di step ini"
            description="Board hanya dipakai pada step Pitching dan Running. Step form dikelola di CRM."
          />
        )
      ) : null}
      {tab === "backlog" ? (
        <Backlog
          project={project}
          tasks={tasks}
          onTaskClick={openTask}
          onNewTask={openNewTask}
          canCreate={canCreate}
        />
      ) : null}
      {tab === "rab" ? <RabReadOnly project={project} /> : null}
      {tab === "forms" ? <FormsTab project={project} /> : null}

      <ProjectDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        projectId={project.id}
        taskId={taskId}
      />
    </div>
  );
}

export type { TabKey };
