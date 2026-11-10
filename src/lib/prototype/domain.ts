import {
  ACTIVE_TASK_STATUSES,
  FORM_STEP_KEYS,
  PHASE_LABEL,
  PHASE_ORDER,
  NEW_PROJECT_PHASES,
  STEP_META,
  TASK_STATUS_LABEL,
  type AppState,
  type FormEntry,
  type FormStepKey,
  type FormTemplate,
  type GateResult,
  type Lifecycle,
  type Phase,
  type PitchingContract,
  type PitchingQuotation,
  type PitchingRab,
  type Priority,
  type Project,
  type ProjectTemplate,
  type ProjectStep,
  type Prospek,
  type ProspekPitching,
  type Role,
  type StepForm,
  type Task,
  type TaskStatus,
  type TemplateStage,
  type User,
  type WorkloadRow,
} from "./types";
import { isNewProjectTemplate } from "./templates";

export function userById(state: AppState, id?: string): User | undefined {
  return state.users.find((user) => user.id === id);
}

export function projectById(state: AppState, id: string): Project | undefined {
  return state.projects.find((project) => project.id === id);
}

export function stepFor(
  state: AppState,
  projectId: string,
  key: string,
): ProjectStep | undefined {
  return state.steps.find(
    (step) => step.projectId === projectId && step.key === key,
  );
}

export function formFor(
  state: AppState,
  projectId: string,
  key: string,
): StepForm | undefined {
  return state.forms.find(
    (form) => form.projectId === projectId && form.stepKey === key,
  );
}

export function formsFor(state: AppState, projectId: string): StepForm[] {
  return state.forms.filter((form) => form.projectId === projectId);
}

export function formEntriesForStep(
  state: AppState,
  projectId: string,
  stepKey: string,
): FormEntry[] {
  return state.formEntries.filter(
    (entry) =>
      entry.projectId === projectId &&
      entry.stepKey === stepKey &&
      entry.status !== "cancelled",
  );
}

export function formEntriesForProject(
  state: AppState,
  projectId: string,
): FormEntry[] {
  return state.formEntries.filter((entry) => entry.projectId === projectId);
}

export function formEntryProgress(
  state: AppState,
  projectId: string,
  stepKey: string,
): { approved: number; total: number } {
  const entries = formEntriesForStep(state, projectId, stepKey);
  return {
    approved: entries.filter((entry) => entry.status === "approved").length,
    total: entries.length,
  };
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
  stepKey: string,
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
): string | undefined {
  return activeSteps(state, projectId)[0]?.key;
}

export function phaseOfProject(
  state: AppState,
  projectId: string,
): Phase | undefined {
  const active = activeSteps(state, projectId);
  if (active.length > 0) return active[0].phase;
  const steps = state.steps
    .filter((step) => step.projectId === projectId)
    .sort((a, b) => a.order - b.order);
  return steps[steps.length - 1]?.phase;
}

export function stageLabel(state: AppState, projectId: string, key: string): string {
  const step = stepFor(state, projectId, key);
  if (step) return step.name;
  return STEP_META.find((meta) => meta.key === key)?.label ?? key;
}

/**
 * Journey progress is the weighted share of completed stages. Skipped
 * optional stages leave the denominator. Umum weights reproduce the legacy
 * formula exactly: 4 full stages + BAST/Invoice 0.5 each over a total of 5.
 */
export function calculateJourneyProgress(
  state: AppState,
  projectId: string,
): number {
  const steps = state.steps.filter(
    (step) => step.projectId === projectId && step.status !== "skipped",
  );
  const total = steps.reduce((sum, step) => sum + (step.weight || 1), 0);
  if (total === 0) return 0;
  const done = steps.reduce((sum, step) => {
    const weight = step.weight || 1;
    if (step.status === "completed") return sum + weight;
    // Legacy parity: a submitted BAST/Invoice already counted in the old
    // formula even before the step was formally completed.
    if (
      step.kind === "finance_form" &&
      (step.financeKind === "bast" || step.financeKind === "invoice")
    ) {
      const form = formFor(state, projectId, step.financeKind);
      if (form?.status === "submitted" || form?.status === "approved") {
        return sum + weight;
      }
    }
    return sum;
  }, 0);
  return Math.round((done / total) * 100);
}

export function calculateWorkProgress(
  state: AppState,
  projectId: string,
  stepKey: string,
): number {
  const step = stepFor(state, projectId, stepKey);
  if (step) {
    if (step.kind === "simpro") {
      const tasks = tasksForStep(state, projectId, step.key);
      if (tasks.length === 0) return 100;
      const done = tasks.filter((task) => task.status === "completed").length;
      return Math.round((done / tasks.length) * 100);
    }

    if (step.kind === "form") {
      if (step.legacyKey === "survey" && !step.formTemplate) {
        const form = formFor(state, projectId, "survey");
        if (form?.status === "approved") return 100;
        if (form?.status === "submitted") return 50;
        return 0;
      }
      const entries = formEntriesForStep(state, projectId, step.key);
      if (entries.length === 0) {
        const legacyTasks = step.tasks ?? [];
        if (legacyTasks.length > 0) {
          return Math.round(
            (legacyTasks.filter((task) => task.done).length /
              legacyTasks.length) *
              100,
          );
        }
        return step.noWorkConfirmedAt ? 100 : 0;
      }
      const approved = entries.filter(
        (entry) => entry.status === "approved",
      ).length;
      return Math.round((approved / entries.length) * 100);
    }

    if (step.kind === "gate") {
      return step.gateDecision?.decision === "approved" ? 100 : 0;
    }

    const key = step.financeKind ?? step.legacyKey;
    if (!key) return 0;
    const form = formFor(state, projectId, key);
    if (key === "survey" || key === "rab") {
      if (form?.status === "approved") return 100;
      if (form?.status === "submitted") return 50;
      return 0;
    }
    return form?.status === "submitted" || form?.status === "approved" ? 100 : 0;
  }

  if (stepKey === "pitching" || stepKey === "running") {
    const tasks = tasksForStep(state, projectId, stepKey);
    if (tasks.length === 0) return 100;
    const done = tasks.filter((task) => task.status === "completed").length;
    return Math.round((done / tasks.length) * 100);
  }

  if (stepKey === "bast" || stepKey === "invoice") {
    const form = formFor(state, projectId, stepKey);
    return form?.status === "submitted" || form?.status === "approved"
      ? 100
      : 0;
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
  const values = active.map((step) =>
    calculateWorkProgress(state, projectId, step.key),
  );
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function evaluateGate(
  state: AppState,
  projectId: string,
  stepKey: string,
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

  if (stepKey === "bast") {
    const form = formFor(state, projectId, "bast");
    const submitted =
      form?.status === "submitted" || form?.status === "approved";
    return {
      ready: submitted,
      requirements: [{ label: "BAST sudah submitted", met: submitted }],
    };
  }

  if (stepKey === "invoice") {
    const form = formFor(state, projectId, "invoice");
    const submitted =
      form?.status === "submitted" || form?.status === "approved";
    return {
      ready: submitted,
      requirements: [
        { label: "Invoice sudah submitted", met: submitted },
      ],
    };
  }

  const step = stepFor(state, projectId, stepKey);
  if (!step) return { ready: false, requirements: [] };

  if (step.kind === "gate") {
    if (step.gateKind === "go_no_go") {
      return { ready: true, requirements: [{ label: "Keputusan Go/No-Go dicatat", met: true }] };
    }
    const hasRabStage = state.steps.some(
      (item) => item.projectId === projectId && item.financeKind === "rab",
    );
    const rabApproved =
      !hasRabStage || formFor(state, projectId, "rab")?.status === "approved";
    return {
      ready: rabApproved,
      requirements: [
        { label: "RAB disetujui sebagai baseline", met: rabApproved },
      ],
    };
  }

  if (step.kind === "simpro") {
    const tasks = tasksForStep(state, projectId, step.key);
    const hasTasks = tasks.length > 0;
    const noActive = tasks.every((task) => task.status === "completed");
    const confirmed = Boolean(step.noWorkConfirmedAt);
    return {
      ready: (hasTasks && noActive) || (!hasTasks && confirmed),
      requirements: [
        {
          label: "Tidak ada task tersisa",
          met: hasTasks && noActive,
        },
        {
          label: "Minimal satu task atau konfirmasi tidak ada pekerjaan",
          met: hasTasks || confirmed,
        },
      ],
    };
  }

  if (step.kind === "form") {
    if (step.legacyKey === "survey" && !step.formTemplate) {
      const form = formFor(state, projectId, "survey");
      const approved = form?.status === "approved";
      return {
        ready: approved,
        requirements: [
          { label: "Form Survey sudah approved", met: approved },
        ],
      };
    }
    const entries = formEntriesForStep(state, projectId, step.key);
    if (entries.length === 0) {
      const legacyTasks = step.tasks ?? [];
      if (legacyTasks.length > 0) {
        const requiredDone = legacyTasks
          .filter((task) => task.required)
          .every((task) => task.done);
        return {
          ready: requiredDone,
          requirements: [
            { label: "Semua isian wajib selesai", met: requiredDone },
          ],
        };
      }
      return {
        ready: Boolean(step.noWorkConfirmedAt),
        requirements: [
          { label: "Minimal satu entri form", met: false },
          {
            label: "Konfirmasi tidak ada pekerjaan di tahap ini",
            met: Boolean(step.noWorkConfirmedAt),
          },
        ],
      };
    }
    const approvedCount = entries.filter(
      (entry) => entry.status === "approved",
    ).length;
    const allApproved = approvedCount === entries.length;
    return {
      ready: allApproved,
      requirements: [
        {
          label: `${approvedCount} dari ${entries.length} entri disetujui`,
          met: allApproved,
        },
      ],
    };
  }

  const formKey = step.financeKind ?? step.legacyKey;
  if (formKey) {
    const form = formFor(state, projectId, formKey);
    const approved = form?.status === "approved";
    const submitted = form?.status === "submitted" || approved;
    const needsApproval = formKey === "survey" || formKey === "rab";
    return {
      ready: needsApproval ? approved : submitted,
      requirements: [
        {
          label: needsApproval
            ? `Form ${formKey.toUpperCase()} sudah approved`
            : `Form ${formKey.toUpperCase()} sudah submitted`,
          met: needsApproval ? approved : submitted,
        },
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
  if (user.role === "admin" || user.role === "manager") {
    return true;
  }
  if (user.role === "finance") {
    if (!isNewLifecycleProject(project)) return true;
    return state.forms.some(
      (form) => form.projectId === project.id && form.assigneeId === user.id,
    );
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

export function isNewLifecycleProject(project?: Project): boolean {
  return (
    project?.creationMode === "template" || project?.creationMode === "manual"
  );
}

export function canManageProjectSteps(
  user: User,
  project?: Project,
): boolean {
  return canManageProject(user, project);
}

export function projectPhase(
  project: Project,
  steps: ProjectStep[],
): Phase {
  if (project.phaseCompletedAt?.running) return "finance";
  if (project.phaseCompletedAt?.planning) return "running";
  const active = steps
    .filter((step) => step.status === "active")
    .sort((a, b) => a.order - b.order)[0];
  if (active) return active.phase;
  if (project.initialPhase) return project.initialPhase;
  return isNewLifecycleProject(project) ? "planning" : "prospek";
}

export function projectProgress(
  state: AppState,
  projectId: string,
): { mode: "percent" | "count"; value: number; label: string } {
  const project = projectById(state, projectId);
  const steps = state.steps.filter((step) => step.projectId === projectId);
  if (!project || !isNewLifecycleProject(project)) {
    const value = calculateJourneyProgress(state, projectId);
    return { mode: "percent", value, label: `${value}%` };
  }
  if (project.creationMode === "manual") {
    const completed = steps.filter((step) => step.status === "completed").length;
    return {
      mode: "count",
      value: completed,
      label: `${completed} step selesai`,
    };
  }
  const counted = steps.filter((step) => step.status !== "skipped");
  const completed = counted.filter((step) => step.status === "completed").length;
  const value = counted.length === 0 ? 0 : Math.round((completed / counted.length) * 100);
  return { mode: "percent", value, label: `${value}%` };
}

export function isTemplateCompatibleForNewProject(template: ProjectTemplate): boolean {
  return isNewProjectTemplate(template);
}

export function validWorkUrl(value?: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function canAssignKanbanTask(
  user: User,
  project: Project | undefined,
  target: User | undefined,
): boolean {
  if (!project || !target) return false;
  if (!isOperationalAssignee(target)) return false;
  return user.role === "admin" || user.role === "manager";
}

export function canCancelKanbanTask(
  state: AppState,
  user: User,
  task: Task,
): boolean {
  const project = projectById(state, task.projectId);
  if (!project) return false;
  if (!canManageProject(user, project)) return false;
  return task.status === "backlog" || task.status === "todo";
}

export function canAssignProjectManager(
  user: User,
  project?: Project,
): boolean {
  if (!project) return false;
  return (
    user.role === "admin" ||
    (user.role === "pm" && project.createdById === user.id)
  );
}

export function isOperationalAssignee(user: User): boolean {
  return user.role === "assignee" || user.role === "manager";
}

export function isProspekAssignee(user: User): boolean {
  return (
    user.role === "assignee" ||
    user.role === "manager" ||
    user.role === "finance"
  );
}

export function canAssignOperational(
  user: User,
  project: Project | undefined,
  target: User | undefined,
): boolean {
  if (!project || !target || !isOperationalAssignee(target)) return false;
  if (user.role === "admin" || user.role === "manager") return true;
  if (user.role === "pm" && project.createdById === user.id) {
    return Boolean(
      project.managerId &&
        target.role === "manager" &&
        target.id === project.managerId,
    );
  }
  return false;
}

export function operationalAssigneeCandidates(
  state: AppState,
  user: User,
  project: Project | undefined,
): User[] {
  if (!project) return [];
  const eligible = state.users.filter(isOperationalAssignee);
  if (user.role === "admin" || user.role === "manager") return eligible;
  if (user.role === "pm" && project.createdById === user.id) {
    return eligible.filter((candidate) => candidate.id === project.managerId);
  }
  return [];
}

export function canWorkTask(user: User, task: Task): boolean {
  return isOperationalAssignee(user) && task.assigneeId === user.id;
}

export function canWorkFormEntry(user: User, entry: FormEntry): boolean {
  return isOperationalAssignee(user) && entry.assigneeId === user.id;
}

export function prospekById(state: AppState, id?: string): Prospek | undefined {
  return state.prospeks.find((prospek) => prospek.id === id);
}

export function prospekPitchingById(
  state: AppState,
  id?: string,
): ProspekPitching | undefined {
  return state.prospekPitchings.find((pitching) => pitching.id === id);
}

export function prospekPitchingsFor(
  state: AppState,
  prospekId: string,
): ProspekPitching[] {
  return state.prospekPitchings.filter(
    (pitching) => pitching.prospekId === prospekId,
  );
}

export function pitchingRabFor(
  state: AppState,
  pitchingId: string,
): PitchingRab | undefined {
  return state.pitchingRabs.find((rab) => rab.pitchingId === pitchingId);
}

export function pitchingQuotationFor(
  state: AppState,
  pitchingId: string,
): PitchingQuotation | undefined {
  return state.pitchingQuotations.find(
    (quotation) => quotation.pitchingId === pitchingId,
  );
}

export function canCreateProspek(user: User): boolean {
  return user.role === "admin" || user.role === "manager" || user.role === "pm";
}

export function canManageProspek(user: User, prospek?: Prospek): boolean {
  if (!prospek) return false;
  if (user.role === "admin" || user.role === "manager") return true;
  return user.role === "pm" && prospek.createdById === user.id;
}

export function canViewProspek(
  state: AppState,
  user: User,
  prospek?: Prospek,
): boolean {
  if (!prospek) return false;
  if (user.role === "admin" || user.role === "manager") return true;
  if (user.role === "pm") return prospek.createdById === user.id;
  return false;
}

export function visibleProspeks(state: AppState, user?: User): Prospek[] {
  if (!user) return [];
  return state.prospeks.filter((prospek) =>
    canViewProspek(state, user, prospek),
  );
}

export function canAssignProspekWork(
  user: User,
  prospek?: Prospek,
): boolean {
  return canManageProspek(user, prospek);
}

export function prospekAssigneeCandidates(
  state: AppState,
  user: User,
  prospek?: Prospek,
): User[] {
  if (!canAssignProspekWork(user, prospek)) return [];
  return state.users.filter(isProspekAssignee);
}

export function canDecidePitching(
  user: User,
  prospek?: Prospek,
): boolean {
  if (!prospek) return false;
  return (
    user.role === "admin" ||
    (user.role === "pm" && prospek.createdById === user.id)
  );
}

function pitchingWorkLocked(
  state: AppState,
  pitching: ProspekPitching,
): boolean {
  const prospek = prospekById(state, pitching.prospekId);
  if (!prospek || prospek.status !== "active") return true;
  return pitching.status === "lost" || Boolean(pitching.projectId);
}

export function canEditPitchingRab(
  state: AppState,
  user: User,
  pitching?: ProspekPitching,
): boolean {
  if (!pitching || pitchingWorkLocked(state, pitching)) return false;
  const prospek = prospekById(state, pitching.prospekId);
  if (user.role === "admin" || user.role === "manager") return true;
  if (canManageProspek(user, prospek)) return true;
  const rab = pitchingRabFor(state, pitching.id);
  return Boolean(rab?.assigneeId === user.id && isProspekAssignee(user));
}

export function canEditQuotation(
  state: AppState,
  user: User,
  pitching?: ProspekPitching,
): boolean {
  if (!pitching || pitchingWorkLocked(state, pitching)) return false;
  const prospek = prospekById(state, pitching.prospekId);
  if (user.role === "admin" || user.role === "manager") return true;
  if (canManageProspek(user, prospek)) return true;
  const quotation = pitchingQuotationFor(state, pitching.id);
  return Boolean(
    quotation?.assigneeId === user.id && isProspekAssignee(user),
  );
}

export function contractComplete(
  contract?: PitchingContract,
): boolean {
  if (!contract) return false;
  return Boolean(
    contract.number.trim() &&
      contract.date &&
      contract.value > 0 &&
      contract.attachment &&
      contract.termine.length > 0,
  );
}

export function canAssignPitchingContract(
  user: User,
  prospek?: Prospek,
): boolean {
  return canAssignProspekWork(user, prospek);
}

export function canEditPitchingContract(
  state: AppState,
  user: User,
  pitching?: ProspekPitching,
): boolean {
  if (!pitching || pitching.status !== "won" || pitching.projectId) {
    return false;
  }
  const prospek = prospekById(state, pitching.prospekId);
  if (!prospek || prospek.status !== "active") return false;
  if (user.role === "admin" || user.role === "manager") return true;
  if (canManageProspek(user, prospek)) return true;
  return Boolean(
    pitching.contractAssigneeId === user.id && isProspekAssignee(user),
  );
}

export type ProspekWorkSection = "rab" | "quotation" | "form" | "contract";

export type ProspekWorkItem = {
  id: string;
  kind: ProspekWorkSection;
  prospekId: string;
  pitchingId: string;
  title: string;
  context: string;
  status: string;
  dueDate?: string;
  href: string;
};

export function prospekWorkItemsForUser(
  state: AppState,
  userId: string,
): ProspekWorkItem[] {
  const items: ProspekWorkItem[] = [];
  for (const pitching of state.prospekPitchings) {
    const prospek = prospekById(state, pitching.prospekId);
    if (
      !prospek ||
      prospek.status !== "active" ||
      pitching.status === "lost" ||
      pitching.projectId
    ) {
      continue;
    }
    const base = {
      prospekId: prospek.id,
      pitchingId: pitching.id,
      context: pitching.title,
    };
    const rab = pitchingRabFor(state, pitching.id);
    if (
      rab?.assigneeId === userId &&
      ["assigned", "draft"].includes(rab.status)
    ) {
      items.push({
        ...base,
        id: `work-rab-${pitching.id}`,
        kind: "rab",
        title: `RAB ${pitching.title}`,
        status: rab.status,
        dueDate: rab.dueDate,
        href: `/work/prospek/${pitching.id}/rab`,
      });
    }
    const quotation = pitchingQuotationFor(state, pitching.id);
    if (
      quotation?.assigneeId === userId &&
      ["assigned", "draft", "need_revision"].includes(quotation.status)
    ) {
      items.push({
        ...base,
        id: `work-quotation-${pitching.id}`,
        kind: "quotation",
        title: `Quotation ${pitching.title}`,
        status: quotation.status,
        dueDate: quotation.dueDate,
        href: `/work/prospek/${pitching.id}/quotation`,
      });
    }
    if (
      pitching.contractAssigneeId === userId &&
      pitching.status === "won" &&
      !contractComplete(pitching.contract)
    ) {
      items.push({
        ...base,
        id: `work-contract-${pitching.id}`,
        kind: "contract",
        title: `Kontrak ${pitching.title}`,
        status: pitching.contractStatus ?? "assigned",
        dueDate: pitching.contractDueDate,
        href: `/work/prospek/${pitching.id}/contract`,
      });
    }
    for (const entry of state.formEntries) {
      if (
        entry.pitchingId !== pitching.id ||
        entry.assigneeId !== userId ||
        !["assigned", "draft", "need_revision"].includes(entry.status)
      ) {
        continue;
      }
      items.push({
        ...base,
        id: `work-form-${entry.id}`,
        kind: "form",
        title: entry.title,
        status: entry.status,
        dueDate: entry.dueDate,
        href: `/work/prospek/${pitching.id}/form?entry=${entry.id}`,
      });
    }
  }
  return items.sort((a, b) => {
    const aDue = a.dueDate ?? "9999-12-31";
    const bDue = b.dueDate ?? "9999-12-31";
    return aDue.localeCompare(bDue);
  });
}

export function canConvertPitching(
  state: AppState,
  user: User,
  pitching?: ProspekPitching,
): boolean {
  if (!pitching || pitching.projectId) return false;
  const prospek = prospekById(state, pitching.prospekId);
  return (
    canDecidePitching(user, prospek) &&
    pitching.status === "won" &&
    contractComplete(pitching.contract)
  );
}

export type ProspekPaguSummary = {
  pagu: number;
  rabTotal: number;
  quotationTotal: number;
  total: number;
  exceeds: boolean;
  remaining: number;
};

export function prospekPaguSummary(
  state: AppState,
  prospek: Prospek,
): ProspekPaguSummary {
  let rabTotal = 0;
  let quotationTotal = 0;
  for (const pitching of prospekPitchingsFor(state, prospek.id)) {
    const rab = pitchingRabFor(state, pitching.id);
    if (rab?.status === "submitted") {
      rabTotal += rab.items.reduce(
        (sum, item) => sum + item.qty * item.unitPrice,
        0,
      );
    }
    const quotation = pitchingQuotationFor(state, pitching.id);
    if (
      quotation &&
      (quotation.status === "submitted" || quotation.status === "approved")
    ) {
      quotationTotal += quotation.amount ?? 0;
    }
  }
  const total = rabTotal + quotationTotal;
  return {
    pagu: prospek.pagu,
    rabTotal,
    quotationTotal,
    total,
    exceeds: prospek.pagu > 0 && (rabTotal > prospek.pagu || quotationTotal > prospek.pagu),
    remaining: prospek.pagu - total,
  };
}

export function isProspekComplete(
  state: AppState,
  prospekId: string,
): boolean {
  const pitchings = prospekPitchingsFor(state, prospekId);
  if (pitchings.length === 0) return false;
  return pitchings.every(
    (pitching) =>
      pitching.status !== "draft" &&
      (pitching.status !== "won" || Boolean(pitching.projectId)),
  );
}

export function formEntryScope(entry: FormEntry): "project" | "prospek" {
  return entry.scope ?? "project";
}

export function pitchingForFormEntry(
  state: AppState,
  entry: FormEntry,
): ProspekPitching | undefined {
  return entry.pitchingId
    ? prospekPitchingById(state, entry.pitchingId)
    : undefined;
}

export function formEntryTemplate(
  state: AppState,
  entry: FormEntry,
): FormTemplate | undefined {
  if (formEntryScope(entry) === "prospek") {
    const pitching = pitchingForFormEntry(state, entry);
    const template = state.templates.find(
      (item) => item.id === pitching?.templateId,
    );
    return template?.stages.find(
      (stage) => stage.id === entry.templateStageId,
    )?.formTemplate;
  }
  return entry.projectId
    ? stepFor(state, entry.projectId, entry.stepKey)?.formTemplate
    : undefined;
}

export function canWorkProspekFormEntry(
  state: AppState,
  user: User,
  entry: FormEntry,
): boolean {
  const pitching = pitchingForFormEntry(state, entry);
  if (!pitching) return false;
  return !pitchingWorkLocked(state, pitching);
}

export function canCancelProject(user: User, project: Project): boolean {
  if (user.role === "admin" || user.role === "manager") return true;
  return user.role === "pm" && project.createdById === user.id;
}

export function canCreateProject(user: User): boolean {
  return user.role === "admin" || user.role === "pm";
}

/** Template management is a separate right from project access. */
export function canManageTemplates(user: User): boolean {
  return user.role === "admin" || user.role === "pm";
}

export function canApproveGate(
  _state: AppState,
  user: User,
  project: Project,
): boolean {
  return canManageProject(user, project);
}

export function lifecycleOf(project: Project): Lifecycle {
  if (project.lifecycle) return project.lifecycle;
  if (project.status === "completed") return "done";
  if (project.status === "cancelled") return "cancelled";
  return "active";
}

export function isProjectReadOnly(project: Project): boolean {
  return project.status !== "active";
}

/** Structure is frozen once the project exists (FR-15). */
export function canEditProjectStructure(project: Project): boolean {
  return !project.structureLocked;
}

export type TemplateValidation = { ok: boolean; errors: string[] };

/**
 * Validation for template stages and for the copy customized at project
 * creation. Legacy Umum is exempt from the "one stage per phase" and "exactly
 * one winning gate" rules because it keeps the old six-step shape.
 */
export function validateTemplateStages(
  stages: TemplateStage[],
  options: { legacy?: boolean } = {},
): TemplateValidation {
  const errors: string[] = [];
  if (stages.length === 0) errors.push("Template harus punya minimal satu tahap.");

  if (!options.legacy) {
    const hasProspek = stages.some((stage) => stage.phase === "prospek");
    for (const phase of NEW_PROJECT_PHASES) {
      if (!stages.some((stage) => stage.phase === phase)) {
        errors.push(`Fase ${PHASE_LABEL[phase]} harus punya minimal satu tahap.`);
      }
    }
    if (hasProspek) {
      const winningGates = stages.filter(
        (stage) => stage.kind === "gate" && stage.gateKind === "client_approval",
      );
      if (winningGates.length !== 1) {
        errors.push(
          "Template harus punya tepat satu gerbang menang (persetujuan klien).",
        );
      }
    }
  }

  const sorted = [...stages].sort((a, b) => a.order - b.order);
  let lastPhase = -1;
  for (const stage of sorted) {
    const index = PHASE_ORDER.indexOf(stage.phase);
    if (index < lastPhase) {
      errors.push(`Urutan fase mundur pada tahap "${stage.name}".`);
    }
    lastPhase = Math.max(lastPhase, index);
  }

  const names = new Set<string>();
  for (const stage of stages) {
    const name = stage.name.trim();
    if (!name) errors.push("Nama tahap wajib diisi.");
    else if (names.has(name.toLowerCase())) {
      errors.push(`Nama tahap "${name}" duplikat.`);
    }
    names.add(name.toLowerCase());
    if (stage.kind === "finance_form" && !stage.financeKind) {
      errors.push(`Tahap "${stage.name}" harus memilih jenis form keuangan.`);
    }
    if (stage.kind === "gate" && !stage.gateKind) {
      errors.push(`Tahap "${stage.name}" harus memilih jenis gerbang.`);
    }
    if (stage.kind === "form") {
      if (stage.legacyKey !== "survey" && !stage.formTemplate) {
        errors.push(`Tahap "${stage.name}" harus punya template form.`);
      } else if (stage.formTemplate) {
        if (!stage.formTemplate.title.trim()) {
          errors.push(`Judul form tahap "${stage.name}" wajib diisi.`);
        }
        if (stage.formTemplate.fields.length > 20) {
          errors.push(`Tahap "${stage.name}" maksimal 20 isian tambahan.`);
        }
        const fieldIds = new Set<string>();
        for (const field of stage.formTemplate.fields) {
          if (!field.label.trim()) {
            errors.push(`Tahap "${stage.name}" punya isian tanpa label.`);
          }
          if (fieldIds.has(field.id)) {
            errors.push(`Tahap "${stage.name}" punya isian duplikat.`);
          }
          fieldIds.add(field.id);
          if (
            (field.type === "select" || field.type === "checklist") &&
            (field.options ?? []).length === 0
          ) {
            errors.push(
              `Isian "${field.label || field.id}" pada tahap "${stage.name}" butuh pilihan.`,
            );
          }
        }
      }
    }
    if (stage.weight <= 0) {
      errors.push(`Bobot tahap "${stage.name}" harus lebih dari 0.`);
    }
  }

  return { ok: errors.length === 0, errors };
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
  if (project.status !== "active") return false;
  return activeSteps(state, project.id).some((step) => step.kind === "simpro");
}

export function taskTransition(
  state: AppState,
  user: User,
  task: Task,
  to: TaskStatus,
  options?: { comment?: string; workUrl?: string },
): { ok: boolean; reason?: string } {
  if (task.status === "completed") {
    return { ok: false, reason: "Task Completed terkunci." };
  }

  const project = projectById(state, task.projectId);
  if (!project) return { ok: false, reason: "Proyek tidak ditemukan." };

  if (!isNewLifecycleProject(project)) {
    if (user.role === "admin") return { ok: true };

    if (to === "todo") {
      if (task.status !== "backlog") {
        return { ok: false, reason: "Hanya task Backlog yang bisa di-assign." };
      }
      if (!task.assigneeId) {
        return { ok: false, reason: "Pilih assignee terlebih dahulu." };
      }
      const assignee = userById(state, task.assigneeId);
      if (!canAssignOperational(user, project, assignee)) {
        return {
          ok: false,
          reason:
            "Hanya Manager/Admin, atau PM pemilik proyek ke Manager proyek, yang bisa assign.",
        };
      }
      return { ok: true };
    }

    if (to === "in_progress") {
      const fromRevision = task.status === "need_revision";
      const fromTodo = task.status === "todo";
      if (!fromTodo && !fromRevision) {
        return { ok: false, reason: "Task harus To Do atau Need Revision." };
      }
      if (!canWorkTask(user, task)) {
        return { ok: false, reason: "Hanya assignee task ini yang bisa mulai." };
      }
      return { ok: true };
    }

    if (to === "awaiting_approval") {
      if (task.status !== "in_progress") {
        return { ok: false, reason: "Task harus In Progress." };
      }
      if (!canWorkTask(user, task)) {
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

  if (to === "todo") {
    if (task.status !== "backlog") {
      return { ok: false, reason: "Hanya card Backlog yang bisa di-assign." };
    }
    if (!task.assigneeId) {
      return { ok: false, reason: "Pilih assignee terlebih dahulu." };
    }
    if (!canAssignKanbanTask(user, project, userById(state, task.assigneeId))) {
      return {
        ok: false,
        reason: "Hanya Manager/Admin yang dapat meng-assign card.",
      };
    }
    return { ok: true };
  }

  if (to === "in_progress") {
    if (task.status !== "todo" && task.status !== "need_revision") {
      return { ok: false, reason: "Card harus To Do atau Need Revision." };
    }
    if (!canWorkTask(user, task)) {
      return { ok: false, reason: "Hanya assignee card ini yang bisa mulai." };
    }
    if (!validWorkUrl(options?.workUrl ?? task.workUrl)) {
      return {
        ok: false,
        reason: "Link Pekerjaan wajib berupa URL HTTP/HTTPS absolut.",
      };
    }
    return { ok: true };
  }

  if (to === "awaiting_approval") {
    if (task.status !== "in_progress") {
      return { ok: false, reason: "Card harus In Progress." };
    }
    if (!canWorkTask(user, task)) {
      return { ok: false, reason: "Hanya assignee card ini yang bisa submit." };
    }
    return { ok: true };
  }

  if (to === "completed" || to === "need_revision") {
    if (task.status !== "awaiting_approval") {
      return { ok: false, reason: "Card harus Awaiting Approval." };
    }
    if (!canReviewTask(state, user, task)) {
      return {
        ok: false,
        reason: "Hanya PM pemilik proyek/Admin yang dapat review.",
      };
    }
    if (to === "need_revision" && !options?.comment?.trim()) {
      return { ok: false, reason: "Komentar revisi wajib diisi." };
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
  if (project.rabBaselineLockedAt && form.type === "rab") return false;
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

export function canCreateFormEntry(
  state: AppState,
  user: User,
  project: Project,
  stepKey: string,
): boolean {
  if (project.status !== "active") return false;
  if (!canManageProject(user, project)) return false;
  const step = stepFor(state, project.id, stepKey);
  return step?.kind === "form" && step.status === "active";
}

export function canAssignFormEntry(user: User): boolean {
  return user.role === "admin" || user.role === "manager";
}

export function canEditFormEntry(
  state: AppState,
  user: User,
  entry: FormEntry,
): boolean {
  if (entry.status === "submitted" || entry.status === "approved") return false;
  if (entry.status === "cancelled" || entry.status === "unassigned") return false;
  if (formEntryScope(entry) === "prospek") {
    const pitching = pitchingForFormEntry(state, entry);
    if (!pitching || pitchingWorkLocked(state, pitching)) return false;
    if (user.role === "admin") return true;
    return isProspekAssignee(user) && entry.assigneeId === user.id;
  }
  if (!entry.projectId) return false;
  const project = projectById(state, entry.projectId);
  if (project?.status !== "active") return false;
  const step = stepFor(state, entry.projectId, entry.stepKey);
  if (step?.status !== "active") return false;
  if (user.role === "admin") return true;
  return canWorkFormEntry(user, entry);
}

export function canReviewFormEntry(
  state: AppState,
  user: User,
  entry: FormEntry,
): boolean {
  if (entry.status !== "submitted") return false;
  if (user.role === "admin") return true;
  if (user.role !== "pm") return false;
  if (formEntryScope(entry) === "prospek") {
    const prospek = prospekById(state, entry.prospekId);
    return prospek?.createdById === user.id;
  }
  if (!entry.projectId) return false;
  const project = projectById(state, entry.projectId);
  return project?.createdById === user.id;
}

export function canCancelFormEntry(
  state: AppState,
  user: User,
  entry: FormEntry,
): boolean {
  if (entry.status === "cancelled") return false;
  if (formEntryScope(entry) === "prospek") {
    return canManageProspek(user, prospekById(state, entry.prospekId));
  }
  if (!entry.projectId) return false;
  const project = projectById(state, entry.projectId);
  if (!project) return false;
  return canManageProject(user, project);
}

function activeFormEntry(state: AppState, entry: FormEntry): boolean {
  if (formEntryScope(entry) === "prospek") {
    const pitching = pitchingForFormEntry(state, entry);
    return Boolean(
      pitching &&
        prospekById(state, pitching.prospekId)?.status === "active" &&
        !pitchingWorkLocked(state, pitching),
    );
  }
  return entry.projectId
    ? projectById(state, entry.projectId)?.status === "active"
    : false;
}

export function activeFormEntriesForAssignee(
  state: AppState,
  userId: string,
): FormEntry[] {
  return state.formEntries.filter(
    (entry) =>
      entry.assigneeId === userId &&
      ["assigned", "draft", "need_revision"].includes(entry.status) &&
      activeFormEntry(state, entry),
  );
}

/** Badge count: forms this user still has to fill. PM review queue excluded. */
export function formsNeedingAction(state: AppState, userId: string): number {
  const entries = activeFormEntriesForAssignee(state, userId).length;
  const legacy = state.forms.filter(
    (form) =>
      form.assigneeId === userId &&
      form.type === "survey" &&
      ["assigned", "draft", "need_revision"].includes(form.status) &&
      projectById(state, form.projectId)?.status === "active",
  ).length;
  return entries + legacy;
}

export function formEntriesNeedingReview(
  state: AppState,
  userId: string,
): FormEntry[] {
  const user = userById(state, userId);
  if (!user) return [];
  return state.formEntries.filter((entry) => {
    if (entry.status !== "submitted") return false;
    if (!activeFormEntry(state, entry)) return false;
    return canReviewFormEntry(state, user, entry);
  });
}

export function workloadRows(state: AppState): WorkloadRow[] {
  const candidates = state.users.filter(
    (user) => user.role === "assignee" || user.role === "manager",
  );
  return candidates
    .map((user) => {
      const tasks = state.tasks.filter(
        (task) =>
          task.assigneeId === user.id &&
          !task.archivedAt &&
          ACTIVE_TASK_STATUSES.includes(task.status) &&
          projectById(state, task.projectId)?.status === "active",
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
      const activeFormCount = activeFormEntriesForAssignee(state, user.id).length;
      return {
        user,
        activeCount: tasks.length,
        activeFormCount,
        statusCounts,
        priorityCounts,
        projectNames: [...projectNames],
        overdueCount: tasks.filter((task) => isOverdue(task)).length,
      };
    })
    .filter(
      (row) =>
        row.user.role === "assignee" ||
        row.activeCount + row.activeFormCount > 0,
    )
    .sort(
      (a, b) =>
        b.activeCount +
        b.activeFormCount -
        (a.activeCount + a.activeFormCount),
    );
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
