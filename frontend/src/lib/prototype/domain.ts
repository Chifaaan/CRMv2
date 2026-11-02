import {
  ACTIVE_TASK_STATUSES,
  FORM_STEP_KEYS,
  STEP_META,
  TASK_STATUS_LABEL,
  type AppState,
  type FormStepKey,
  type GateResult,
  type Phase,
  type Priority,
  type Project,
  type ProjectStep,
  type Role,
  type StepForm,
  type StepKey,
  type Task,
  type TaskStatus,
  type User,
  type WorkloadRow,
} from "./types";

export function userById(state: AppState, id?: string): User | undefined {
  return state.users.find((user) => user.id === id);
}

export function projectById(state: AppState, id: string): Project | undefined {
  return state.projects.find((project) => project.id === id);
}

export function stepFor(
  state: AppState,
  projectId: string,
  key: StepKey,
): ProjectStep | undefined {
  return state.steps.find(
    (step) => step.projectId === projectId && step.key === key,
  );
}

export function formFor(
  state: AppState,
  projectId: string,
  key: FormStepKey,
): StepForm | undefined {
  return state.forms.find(
    (form) => form.projectId === projectId && form.stepKey === key,
  );
}

export function formsFor(state: AppState, projectId: string): StepForm[] {
  return state.forms.filter((form) => form.projectId === projectId);
}

export function pitchingsFor(state: AppState, projectId: string) {
  return state.pitchings.filter((pitching) => pitching.projectId === projectId);
}

export function rolesForPitching(state: AppState, pitchingId: string) {
  return state.pitchingRoles.filter((role) => role.pitchingId === pitchingId);
}

export function tasksForStep(
  state: AppState,
  projectId: string,
  stepKey: StepKey,
): Task[] {
  return state.tasks.filter(
    (task) =>
      task.projectId === projectId &&
      task.stepKey === stepKey &&
      !task.archivedAt,
  );
}

export function tasksForProject(state: AppState, projectId: string): Task[] {
  return state.tasks.filter(
    (task) => task.projectId === projectId && !task.archivedAt,
  );
}

export function tasksForAssignee(state: AppState, userId: string): Task[] {
  return state.tasks.filter(
    (task) => task.assigneeId === userId && !task.archivedAt,
  );
}

export function isTaskActive(status: TaskStatus): boolean {
  return ACTIVE_TASK_STATUSES.includes(status);
}

export function isOverdue(task: Task, now = new Date()): boolean {
  if (!task.dueDate || task.status === "completed") return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < new Date(now.toDateString()).getTime();
}

export function activeSteps(state: AppState, projectId: string): ProjectStep[] {
  return state.steps
    .filter((step) => step.projectId === projectId && step.status === "active")
    .sort((a, b) => a.order - b.order);
}

export function activeStepKey(
  state: AppState,
  projectId: string,
): StepKey | undefined {
  return activeSteps(state, projectId)[0]?.key;
}

export function phaseOfProject(
  state: AppState,
  projectId: string,
): Phase | undefined {
  return activeStepKey(state, projectId)
    ? STEP_META.find((meta) => meta.key === activeStepKey(state, projectId))
        ?.phase
    : undefined;
}

export function phaseForStep(key: StepKey): Phase {
  return STEP_META.find((meta) => meta.key === key)?.phase ?? "planning";
}

export function calculateJourneyProgress(
  state: AppState,
  projectId: string,
): number {
  let done = 0;
  for (const meta of STEP_META) {
    if (meta.key === "bast" || meta.key === "invoice") {
      const form = formFor(state, projectId, meta.key);
      if (form?.status === "submitted") done += meta.weight;
      continue;
    }
    const step = stepFor(state, projectId, meta.key);
    if (step?.status === "completed") done += meta.weight;
  }
  return Math.round((done / 5) * 100);
}

export function calculateWorkProgress(
  state: AppState,
  projectId: string,
  stepKey: StepKey,
): number {
  if (stepKey === "pitching" || stepKey === "running") {
    const tasks = tasksForStep(state, projectId, stepKey);
    if (tasks.length === 0) return 100;
    const done = tasks.filter((task) => task.status === "completed").length;
    return Math.round((done / tasks.length) * 100);
  }

  if (stepKey === "bast" || stepKey === "invoice") {
    const form = formFor(state, projectId, stepKey);
    return form?.status === "submitted" ? 100 : 0;
  }

  if (stepKey === "survey" || stepKey === "rab") {
    const form = formFor(state, projectId, stepKey);
    if (form?.status === "approved") return 100;
    if (form?.status === "submitted") return 50;
    return 0;
  }

  return 0;
}

export function workProgressForProject(
  state: AppState,
  projectId: string,
): number {
  const project = projectById(state, projectId);
  if (project?.status === "completed") return 100;
  if (project?.status === "cancelled") return 0;
  const active = activeSteps(state, projectId);
  if (active.length === 0) return 0;
  if (active.some((step) => step.key === "bast")) {
    const bast = calculateWorkProgress(state, projectId, "bast");
    const invoice = calculateWorkProgress(state, projectId, "invoice");
    return Math.round((bast + invoice) / 2);
  }
  return calculateWorkProgress(state, projectId, active[0].key);
}

export function evaluateGate(
  state: AppState,
  projectId: string,
  stepKey: StepKey,
): GateResult {
  const project = projectById(state, projectId);
  if (!project) return { ready: false, requirements: [] };

  if (stepKey === "pitching") {
    const pitchings = pitchingsFor(state, projectId);
    const allDecided = pitchings.every(
      (pitching) => pitching.status === "won" || pitching.status === "lost",
    );
    const winners = pitchings.filter((pitching) => pitching.status === "won");
    const winnerTasks = state.tasks.filter(
      (task) =>
        task.projectId === projectId &&
        task.stepKey === "pitching" &&
        !task.archivedAt &&
        task.pitchingId &&
        winners.some((winner) => winner.id === task.pitchingId),
    );
    const winnersDone = winnerTasks.every(
      (task) => task.status === "completed",
    );
    const stepTasks = tasksForStep(state, projectId, "pitching");
    const noActiveTasks = stepTasks.every(
      (task) => task.status === "completed",
    );
    return {
      ready:
        pitchings.length > 0 &&
        allDecided &&
        winners.length > 0 &&
        winnersDone &&
        noActiveTasks,
      requirements: [
        { label: "Semua pitching sudah diputuskan", met: allDecided },
        { label: "Minimal ada 1 pitching menang", met: winners.length > 0 },
        {
          label: "Semua task pitching pemenang selesai",
          met: winnersDone,
        },
        { label: "Tidak ada task Pitching yang aktif", met: noActiveTasks },
      ],
    };
  }

  if (stepKey === "survey") {
    const form = formFor(state, projectId, "survey");
    const approved = form?.status === "approved";
    return {
      ready: approved,
      requirements: [
        { label: "Form Survey sudah approved", met: approved },
      ],
    };
  }

  if (stepKey === "rab") {
    const form = formFor(state, projectId, "rab");
    const approved = form?.status === "approved";
    return {
      ready: approved,
      requirements: [{ label: "Form RAB sudah approved", met: approved }],
    };
  }

  if (stepKey === "running") {
    const tasks = tasksForStep(state, projectId, "running");
    const noActive = tasks.every((task) => task.status === "completed");
    return {
      ready: noActive,
      requirements: [
        {
          label: "Tidak ada task Running yang aktif",
          met: noActive,
        },
      ],
    };
  }

  if (stepKey === "bast") {
    const form = formFor(state, projectId, "bast");
    const submitted = form?.status === "submitted";
    return {
      ready: submitted,
      requirements: [{ label: "BAST sudah submitted", met: submitted }],
    };
  }

  if (stepKey === "invoice") {
    const form = formFor(state, projectId, "invoice");
    const submitted = form?.status === "submitted";
    return {
      ready: submitted,
      requirements: [
        { label: "Invoice sudah submitted", met: submitted },
      ],
    };
  }

  return { ready: false, requirements: [] };
}

export function canViewProject(
  state: AppState,
  user: User,
  project: Project,
): boolean {
  if (user.role === "admin" || user.role === "manager" || user.role === "finance") {
    return true;
  }
  if (user.role === "pm") return project.createdById === user.id;
  if (user.role === "assignee") {
    const hasTask = state.tasks.some(
      (task) =>
        task.projectId === project.id &&
        task.assigneeId === user.id &&
        !task.archivedAt,
    );
    const hasForm = state.forms.some(
      (form) => form.projectId === project.id && form.assigneeId === user.id,
    );
    return hasTask || hasForm;
  }
  return false;
}

export function visibleProjects(state: AppState): Project[] {
  const user = userById(state, state.currentUserId);
  if (!user) return [];
  return state.projects.filter((project) => canViewProject(state, user, project));
}

export function canManageProject(user: User, project?: Project): boolean {
  return user.role === "admin" || (user.role === "pm" && project?.createdById === user.id);
}

export function canCancelProject(user: User, project: Project): boolean {
  if (user.role === "admin" || user.role === "manager") return true;
  return user.role === "pm" && project.createdById === user.id;
}

export function canCreateProject(user: User): boolean {
  return user.role === "admin" || user.role === "pm";
}

export function canAssignTask(user: User): boolean {
  return user.role === "admin" || user.role === "manager";
}

export function canReviewTask(
  state: AppState,
  user: User,
  task: Task,
): boolean {
  if (user.role === "admin") return true;
  if (user.role !== "pm") return false;
  const project = projectById(state, task.projectId);
  return project?.createdById === user.id;
}

export function canCreateTask(
  state: AppState,
  user: User,
  project: Project,
): boolean {
  if (!canManageProject(user, project)) return false;
  const step = activeStepKey(state, project.id);
  return step === "pitching" || step === "running";
}

export function taskTransition(
  state: AppState,
  user: User,
  task: Task,
  to: TaskStatus,
): { ok: boolean; reason?: string } {
  if (task.status === "completed") {
    return { ok: false, reason: "Task Completed terkunci." };
  }

  if (user.role === "admin") return { ok: true };

  if (to === "todo") {
    if (task.status !== "backlog") {
      return { ok: false, reason: "Hanya task Backlog yang bisa di-assign." };
    }
    if (!canAssignTask(user)) {
      return { ok: false, reason: "Hanya Manager/Admin yang bisa assign." };
    }
    if (!task.assigneeId) {
      return { ok: false, reason: "Pilih assignee terlebih dahulu." };
    }
    return { ok: true };
  }

  if (to === "in_progress") {
    const fromRevision = task.status === "need_revision";
    const fromTodo = task.status === "todo";
    if (!fromTodo && !fromRevision) {
      return { ok: false, reason: "Task harus To Do atau Need Revision." };
    }
    if (user.role !== "assignee" || task.assigneeId !== user.id) {
      return { ok: false, reason: "Hanya assignee task ini yang bisa mulai." };
    }
    return { ok: true };
  }

  if (to === "awaiting_approval") {
    if (task.status !== "in_progress") {
      return { ok: false, reason: "Task harus In Progress." };
    }
    if (user.role !== "assignee" || task.assigneeId !== user.id) {
      return { ok: false, reason: "Hanya assignee task ini yang bisa submit." };
    }
    return { ok: true };
  }

  if (to === "completed" || to === "need_revision") {
    if (task.status !== "awaiting_approval") {
      return { ok: false, reason: "Task harus Awaiting Approval." };
    }
    if (!canReviewTask(state, user, task)) {
      return { ok: false, reason: "Hanya PM pemilik proyek/Admin yang review." };
    }
    return { ok: true };
  }

  return { ok: false, reason: "Transisi status tidak diizinkan." };
}

export function canAssignForm(user: User): boolean {
  return user.role === "admin" || user.role === "manager";
}

export function canEditForm(
  state: AppState,
  user: User,
  form: StepForm,
): boolean {
  const project = projectById(state, form.projectId);
  if (project?.status !== "active") return false;
  const step = stepFor(state, form.projectId, form.stepKey);
  if (step?.status !== "active") return false;
  if (form.status === "approved") return false;
  if (user.role === "admin") return true;
  if (form.assigneeId !== user.id) return false;
  if (form.type === "survey" && user.role !== "assignee") return false;
  if (form.type !== "survey" && user.role !== "finance") return false;
  return true;
}

export function canReviewForm(
  state: AppState,
  user: User,
  form: StepForm,
): boolean {
  if (user.role === "admin") return true;
  if (user.role !== "pm") return false;
  const project = projectById(state, form.projectId);
  return project?.createdById === user.id;
}

export function canSubmitForm(
  state: AppState,
  user: User,
  form: StepForm,
): boolean {
  return canEditForm(state, user, form) && form.status !== "submitted";
}

export function workloadRows(state: AppState): WorkloadRow[] {
  const assignees = state.users.filter((user) => user.role === "assignee");
  return assignees
    .map((user) => {
      const tasks = state.tasks.filter(
        (task) =>
          task.assigneeId === user.id &&
          !task.archivedAt &&
          ACTIVE_TASK_STATUSES.includes(task.status),
      );
      const statusCounts: Record<string, number> = {};
      const priorityCounts: Record<string, number> = {};
      const projectNames = new Set<string>();
      for (const task of tasks) {
        statusCounts[task.status] = (statusCounts[task.status] ?? 0) + 1;
        priorityCounts[task.priority] =
          (priorityCounts[task.priority] ?? 0) + 1;
        const project = projectById(state, task.projectId);
        if (project) projectNames.add(project.name);
      }
      return {
        user,
        activeCount: tasks.length,
        statusCounts,
        priorityCounts,
        projectNames: [...projectNames],
        overdueCount: tasks.filter((task) => isOverdue(task)).length,
      };
    })
    .sort((a, b) => b.activeCount - a.activeCount);
}

export function completionStats(projects: Project[]): {
  completed: number;
  total: number;
  percent: number;
} {
  const members = projects.filter((project) => project.status !== "cancelled");
  const completed = members.filter(
    (project) => project.status === "completed",
  ).length;
  return {
    completed,
    total: members.length,
    percent:
      members.length === 0
        ? 0
        : Math.round((completed / members.length) * 100),
  };
}

export function groupCompletionStats(
  state: AppState,
  groupId: string,
): { completed: number; total: number; percent: number } {
  return completionStats(
    state.projects.filter((project) => project.groupId === groupId),
  );
}

export function groupProgress(state: AppState, groupId: string): number {
  return groupCompletionStats(state, groupId).percent;
}

export function isGroupableProject(project: Project): boolean {
  return !project.groupId && project.status !== "cancelled";
}

export function groupCompleted(state: AppState, groupId: string): boolean {
  const members = state.projects.filter(
    (project) => project.groupId === groupId && project.status !== "cancelled",
  );
  return members.length > 0 && members.every((project) => project.status === "completed");
}

export function projectTasksForUser(state: AppState, userId: string): Task[] {
  return state.tasks.filter(
    (task) => task.assigneeId === userId && !task.archivedAt,
  );
}

export function formAssigneeName(
  state: AppState,
  form: StepForm,
): string {
  return userById(state, form.assigneeId)?.name ?? "Belum di-assign";
}

export function taskStatusLabel(status: TaskStatus): string {
  return TASK_STATUS_LABEL[status];
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function priorityWeight(priority: Priority): number {
  return { low: 1, medium: 2, high: 3, critical: 4 }[priority];
}

export function taskCountsByStatus(tasks: Task[]): Record<TaskStatus, number> {
  const counts = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    awaiting_approval: 0,
    need_revision: 0,
    completed: 0,
  } as Record<TaskStatus, number>;
  for (const task of tasks) counts[task.status] += 1;
  return counts;
}

export function formLabel(key: FormStepKey): string {
  return key === "rab" ? "RAB" : key === "bast" ? "BAST" : key === "invoice" ? "Invoice" : "Survey";
}

export function formTitle(key: FormStepKey): string {
  return formLabel(key);
}

export function allFormKeys(): FormStepKey[] {
  return [...FORM_STEP_KEYS];
}

export function roleCanAccessCrm(role: Role): boolean {
  return role !== "assignee";
}

export function roleCanAccessSimpro(role: Role): boolean {
  return role !== "finance";
}

export function landingForRole(role: Role): string {
  return role === "assignee" ? "/my-tasks" : "/crm";
}
