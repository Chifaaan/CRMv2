import { formTemplateForTitle, UMUM_TEMPLATE_ID } from "./templates";
import {
  ACTIVE_TASK_STATUSES,
  FORM_STEP_KEYS,
  PHASE_LABEL,
  PHASE_ORDER,
  STEP_META,
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  type AppState,
  type BusinessUnitId,
  type FormEntry,
  type FormStepKey,
  type GateResult,
  type Lifecycle,
  type MediaOrder,
  type MediaOrderItem,
  type Phase,
  type Priority,
  type Project,
  type ProjectEvent,
  type ProjectStep,
  type ProjectTemplate,
  type Role,
  type StepForm,
  type Task,
  type TaskStatus,
  type TemplateStage,
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

/**
 * Assignees and Media only see board stages that are currently running or
 * already completed. PM/Manager/Admin keep the full stage list.
 */
export function visibleBoardSteps(
  state: AppState,
  user: User,
  projectId: string,
): ProjectStep[] {
  const steps = state.steps
    .filter((step) => step.projectId === projectId && step.kind === "simpro")
    .sort((a, b) => a.order - b.order);
  if (user.role === "assignee" || user.role === "media") {
    return steps.filter(
      (step) => step.status === "active" || step.status === "completed",
    );
  }
  return steps;
}

export type ProjectOverview = {
  stageCompletion: {
    completed: number;
    skipped: number;
    notCompleted: number;
  };
  taskDistribution: Array<{
    status: TaskStatus;
    count: number;
    percent: number;
  }>;
  progress: {
    completed: number;
    open: number;
    overdue: number;
    percent: number;
  };
  recentEvents: ProjectEvent[];
};

export function projectOverview(
  state: AppState,
  projectId: string,
): ProjectOverview {
  const steps = state.steps.filter((step) => step.projectId === projectId);
  const tasks = tasksForProject(state, projectId);
  const completed = tasks.filter((task) => task.status === "completed").length;
  const open = tasks.length - completed;
  const overdue = tasks.filter((task) => isOverdue(task)).length;
  const percent =
    tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);

  return {
    stageCompletion: {
      completed: steps.filter((step) => step.status === "completed").length,
      skipped: steps.filter((step) => step.status === "skipped").length,
      notCompleted: steps.filter(
        (step) => step.status === "pending" || step.status === "active",
      ).length,
    },
    taskDistribution: TASK_STATUSES.map((status) => {
      const count = tasks.filter((task) => task.status === status).length;
      return {
        status,
        count,
        percent:
          tasks.length === 0 ? 0 : Math.round((count / tasks.length) * 100),
      };
    }),
    progress: { completed, open, overdue, percent },
    recentEvents: state.projectEvents
      .filter((event) => event.projectId === projectId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 5),
  };
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
  if (user.role === "admin" || user.role === "manager" || user.role === "finance") {
    return true;
  }
  if (user.role === "pm") return project.createdById === user.id;
  if (user.role === "assignee" || user.role === "media") {
    const hasTask = state.tasks.some(
      (task) =>
        task.projectId === project.id &&
        task.assigneeId === user.id &&
        !task.archivedAt,
    );
    const hasForm = state.forms.some(
      (form) => form.projectId === project.id && form.assigneeId === user.id,
    );
    const hasEntry = state.formEntries.some(
      (entry) => entry.projectId === project.id && entry.assigneeId === user.id,
    );
    return hasTask || hasForm || hasEntry;
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

/**
 * A phase may be composed only before it starts. Legacy projects keep the
 * global structure lock, so they stay frozen.
 */
export function canEditPhaseStructure(
  project: Project,
  phase: Phase,
): boolean {
  if (phase === "closing") return false;
  if (project.status !== "active") return false;
  if (
    project.lifecycle === "lost" ||
    project.lifecycle === "cancelled" ||
    project.lifecycle === "done"
  ) {
    return false;
  }
  const state = project.phaseStates?.[phase];
  if (!state) return false;
  if (project.structureLocked) return false;
  return !state.startedAt && !state.lockedAt;
}

/**
 * A step is structurally changeable only while nobody has started working on
 * it. Draft/submitted/review forms, started finance forms, and cards past
 * Backlog all count as work.
 */
export function stepHasStartedWork(
  state: AppState,
  step: ProjectStep,
): boolean {
  if (step.startedAt || step.completedAt) return true;

  const entries = state.formEntries.filter(
    (entry) =>
      entry.projectId === step.projectId &&
      (entry.templateStageId === step.id || entry.stepKey === step.key) &&
      entry.status !== "cancelled",
  );
  if (
    entries.some((entry) =>
      ["draft", "submitted", "approved", "need_revision"].includes(
        entry.status,
      ),
    )
  ) {
    return true;
  }

  const forms = state.forms.filter(
    (form) => form.projectId === step.projectId && form.stepKey === step.key,
  );
  if (
    forms.some(
      (form) =>
        (form.status !== "unassigned" && form.status !== "assigned") ||
        Boolean(form.submittedAt),
    )
  ) {
    return true;
  }

  return state.tasks.some(
    (task) =>
      task.projectId === step.projectId &&
      !task.archivedAt &&
      (task.stageId === step.id || task.stepKey === step.key) &&
      task.status !== "backlog",
  );
}

/** A phase can receive a step before start and, for an opened phase, after start. */
export function canAddStepToPhase(project: Project, phase: Phase): boolean {
  if (phase === "closing") return false;
  if (project.status !== "active") return false;
  if (
    project.lifecycle === "lost" ||
    project.lifecycle === "cancelled" ||
    project.lifecycle === "done"
  ) {
    return false;
  }
  if (project.structureLocked) return false;
  if (phase === "prospek") return true;
  return Boolean(project.phaseStates?.[phase]);
}

export function canDeleteStepFromPhase(
  state: AppState,
  project: Project,
  step: ProjectStep,
): boolean {
  if (step.phase === "closing") return false;
  if (!canAddStepToPhase(project, step.phase)) return false;
  return !stepHasStartedWork(state, step);
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
    for (const phase of PHASE_ORDER) {
      if (!stages.some((stage) => stage.phase === phase)) {
        errors.push(`Fase ${PHASE_LABEL[phase]} harus punya minimal satu tahap.`);
      }
    }
    const winningGates = stages.filter(
      (stage) => stage.kind === "gate" && stage.gateKind === "client_approval",
    );
    if (winningGates.length !== 1) {
      errors.push("Template harus punya tepat satu gerbang menang (persetujuan klien).");
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

export type JourneyValidation = { ok: boolean; errors: string[] };

export function createManualStage(
  phase: Phase,
  order: number,
  id: string,
  name?: string,
): TemplateStage {
  const label = name?.trim() || `Tahap ${order}`;
  return {
    id,
    name: label,
    phase,
    order,
    kind: "form",
    required: false,
    weight: 1,
    formTemplate: formTemplateForTitle(label),
    tasks: [],
  };
}

export function journeyPhaseErrors(
  project: Project | undefined,
  phase: Phase,
  proposedStages: TemplateStage[],
  allSteps: ProjectStep[] = [],
): JourneyValidation {
  const errors: string[] = [];
  if (phase === "closing") {
    errors.push("Fase Closing ditambahkan otomatis dan tidak bisa diubah manual.");
  }
  if (project && (project.status !== "active" || project.lifecycle === "lost" || project.lifecycle === "cancelled" || project.lifecycle === "done")) {
    errors.push("Proyek sudah tidak bisa diubah.");
  }
  if (proposedStages.some((stage) => stage.phase !== phase)) {
    errors.push("Semua tahap harus berada di fase yang dipilih.");
  }

  const names = new Set<string>();
  const financeKinds = new Set<string>();
  const otherFinanceKinds = new Set(
    allSteps
      .filter((step) => step.phase !== phase && step.financeKind)
      .map((step) => step.financeKind as string),
  );
  let clientGates = 0;

  for (const stage of proposedStages) {
    const name = stage.name.trim();
    if (!name) {
      errors.push("Nama tahap wajib diisi.");
    } else if (names.has(name.toLowerCase())) {
      errors.push(`Nama tahap "${name}" duplikat di fase ini.`);
    }
    names.add(name.toLowerCase());

    if (stage.weight <= 0) {
      errors.push(`Bobot tahap "${stage.name}" harus lebih dari 0.`);
    }
    if (stage.kind === "finance_form") {
      if (!stage.financeKind) {
        errors.push(`Tahap "${stage.name}" harus memilih jenis form keuangan.`);
      } else if (
        phase !== "closing" &&
        (stage.financeKind === "bast" ||
          stage.financeKind === "invoice" ||
          stage.financeKind === "payment")
      ) {
        errors.push(
          `Form ${stage.financeKind.toUpperCase()} ditambahkan otomatis di Closing.`,
        );
      } else if (financeKinds.has(stage.financeKind)) {
        errors.push(
          `Form keuangan ${stage.financeKind.toUpperCase()} hanya boleh ada satu.`,
        );
      } else if (otherFinanceKinds.has(stage.financeKind)) {
        errors.push(
          `Form keuangan ${stage.financeKind.toUpperCase()} sudah dipakai di fase lain.`,
        );
      }
      if (stage.financeKind) financeKinds.add(stage.financeKind);
    }
    if (stage.kind === "gate") {
      if (!stage.gateKind) {
        errors.push(`Tahap "${stage.name}" harus memilih jenis gerbang.`);
      }
      if (stage.gateKind === "client_approval") {
        clientGates += 1;
        if (phase !== "prospek") {
          errors.push("Gerbang persetujuan klien hanya boleh berada di Prospek.");
        }
      }
    }
    if (
      stage.kind === "form" &&
      stage.legacyKey !== "survey" &&
      (!stage.formTemplate || !stage.formTemplate.title.trim())
    ) {
      errors.push(`Tahap "${stage.name}" harus punya judul form.`);
    }
  }

  if (phase === "prospek" && clientGates > 1) {
    errors.push("Prospek hanya boleh punya satu gerbang persetujuan klien.");
  }

  return { ok: errors.length === 0, errors };
}

export function journeyStartErrors(
  project: Project,
  steps: ProjectStep[],
  template?: ProjectTemplate,
): JourneyValidation {
  const errors: string[] = [];
  if (project.status !== "active") {
    errors.push("Proyek tidak aktif.");
  }
  if (
    project.lifecycle === "lost" ||
    project.lifecycle === "cancelled" ||
    project.lifecycle === "done"
  ) {
    errors.push("Proyek sudah ditutup.");
  }

  const prospek = [...steps]
    .filter((step) => step.phase === "prospek")
    .sort((a, b) => a.order - b.order);
  if (prospek.length === 0) {
    errors.push("Fase Prospek harus punya minimal satu tahap.");
    return { ok: false, errors };
  }
  if (prospek.some((step) => step.status !== "pending")) {
    errors.push("Prospek sudah dimulai.");
  }
  if (steps.some((step) => step.phase !== "prospek")) {
    errors.push("Hanya tahap Prospek yang bisa memulai journey.");
  }

  const legacy =
    Boolean(template?.legacy) || project.templateId === UMUM_TEMPLATE_ID;
  if (!legacy) {
    const gates = prospek.filter(
      (step) => step.kind === "gate" && step.gateKind === "client_approval",
    );
    if (gates.length === 0) {
      errors.push(
        "Tambahkan satu Gerbang persetujuan klien sebagai tahap terakhir Prospek.",
      );
    } else if (gates.length > 1) {
      errors.push("Prospek hanya boleh punya satu gerbang persetujuan klien.");
    } else if (prospek[prospek.length - 1]?.id !== gates[0].id) {
      errors.push(
        "Gerbang persetujuan klien harus menjadi tahap terakhir Prospek.",
      );
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

export type WorkingLinkValidation = {
  ok: boolean;
  url?: string;
  reason?: string;
};

/** Working links are opaque text. Only an empty value is rejected. */
export function validateWorkingLink(
  input?: string | null,
): WorkingLinkValidation {
  const trimmed = input?.trim() ?? "";
  if (!trimmed) {
    return { ok: false, reason: "Link kerja wajib diisi sebelum memulai." };
  }
  return { ok: true, url: trimmed };
}

export function taskTransition(
  state: AppState,
  user: User,
  task: Task,
  to: TaskStatus,
  workingLink?: string,
): { ok: boolean; reason?: string } {
  if (task.status === "completed") {
    return { ok: false, reason: "Task Completed terkunci." };
  }

  const project = projectById(state, task.projectId);
  const owningPm = user.role === "pm" && project?.createdById === user.id;
  if (owningPm) {
    if (!task.assigneeId && !task.managerId) {
      return {
        ok: false,
        reason: "Card harus memiliki Assignee atau Manager sebelum dipindahkan.",
      };
    }
    if (to === "in_progress") {
      const link = validateWorkingLink(workingLink ?? task.workingLink?.url);
      if (!link.ok) {
        return {
          ok: false,
          reason:
            link.reason ?? "Lampirkan link kerja aktif sebelum memulai task.",
        };
      }
    }
    return { ok: true };
  }

  if (user.role === "admin" && !(to === "in_progress")) return { ok: true };

  if (to === "todo") {
    if (task.status !== "backlog") {
      return { ok: false, reason: "Hanya task Backlog yang bisa di-assign." };
    }
    if (!canAssignTask(user) && task.managerId !== user.id) {
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
    if (
      task.assigneeId !== user.id &&
      task.managerId !== user.id &&
      user.role !== "admin"
    ) {
      return { ok: false, reason: "Hanya assignee task ini yang bisa mulai." };
    }
    const link = validateWorkingLink(workingLink ?? task.workingLink?.url);
    if (!link.ok) {
      return {
        ok: false,
        reason:
          link.reason ?? "Lampirkan link kerja aktif sebelum memulai task.",
      };
    }
    return { ok: true };
  }

  if (to === "awaiting_approval") {
    if (task.status !== "in_progress") {
      return { ok: false, reason: "Task harus In Progress." };
    }
    if (
      task.assigneeId !== user.id &&
      task.managerId !== user.id &&
      user.role !== "admin"
    ) {
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

export function assignableRolesForForm(formType: FormStepKey): Role[] {
  if (formType === "survey") return ["assignee"];
  if (formType === "bast") return ["finance", "media"];
  return ["finance"];
}

export function assignableUsersForForm(
  state: AppState,
  form: StepForm,
): User[] {
  const roles = assignableRolesForForm(form.type);
  return state.users.filter((user) => roles.includes(user.role));
}

export function canAssignFormTo(form: StepForm, user: User): boolean {
  return assignableRolesForForm(form.type).includes(user.role);
}

export function canReceiveFormEntry(user: User): boolean {
  return user.role === "assignee" || user.role === "media";
}

export function canOpenFinanceForm(
  state: AppState,
  user: User,
  form: StepForm,
): boolean {
  if (form.type === "survey") return false;
  const project = projectById(state, form.projectId);
  if (!project) return false;
  if (user.role === "admin" || user.role === "manager") return true;
  if (user.role === "pm") return project.createdById === user.id;
  if (form.assigneeId !== user.id) return false;
  return assignableRolesForForm(form.type).includes(user.role);
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
  if (form.type === "bast") {
    return user.role === "finance" || user.role === "media";
  }
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
  const project = projectById(state, entry.projectId);
  if (project?.status !== "active") return false;
  const step = stepFor(state, entry.projectId, entry.stepKey);
  if (step?.status !== "active") return false;
  if (user.role === "admin") return true;
  return (
    (user.role === "assignee" || user.role === "media") &&
    entry.assigneeId === user.id
  );
}

export function canReviewFormEntry(
  state: AppState,
  user: User,
  entry: FormEntry,
): boolean {
  if (entry.status !== "submitted") return false;
  if (user.role === "admin") return true;
  if (user.role !== "pm") return false;
  const project = projectById(state, entry.projectId);
  return project?.createdById === user.id;
}

export function canCancelFormEntry(
  state: AppState,
  user: User,
  entry: FormEntry,
): boolean {
  if (entry.status === "cancelled") return false;
  const project = projectById(state, entry.projectId);
  if (!project) return false;
  return canManageProject(user, project);
}

export function activeFormEntriesForAssignee(
  state: AppState,
  userId: string,
): FormEntry[] {
  return state.formEntries.filter(
    (entry) =>
      entry.assigneeId === userId &&
      ["assigned", "draft", "need_revision"].includes(entry.status) &&
      projectById(state, entry.projectId)?.status === "active",
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
    const project = projectById(state, entry.projectId);
    if (!project || project.status !== "active") return false;
    return canReviewFormEntry(state, user, entry);
  });
}

export function workloadRows(state: AppState): WorkloadRow[] {
  const assignees = state.users.filter(
    (user) => user.role === "assignee" || user.role === "media",
  );
  return assignees
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
  return role !== "assignee" && role !== "media" && role !== "bod";
}

export function roleCanAccessSimpro(role: Role): boolean {
  return role !== "finance" && role !== "bod";
}

export function roleCanAccessBusiness(role: Role): boolean {
  return role === "admin" || role === "bod";
}

export function landingForRole(role: Role): string {
  if (role === "assignee" || role === "media") return "/my-tasks";
  if (role === "bod") return "/business";
  return "/crm";
}

export type MediaOrderLineTotals = {
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
};

export function mediaOrderLine(
  item: MediaOrderItem,
): MediaOrderLineTotals {
  const revenue = (item.qty || 0) * (item.clientUnitPrice || 0);
  const cost = (item.qty || 0) * (item.vendorUnitCost || 0);
  const margin = revenue - cost;
  return {
    revenue,
    cost,
    margin,
    marginPercent: revenue > 0 ? (margin / revenue) * 100 : 0,
  };
}

export function mediaOrderTotals(
  order: MediaOrder,
): MediaOrderLineTotals & { itemCount: number } {
  const totals = (order.items ?? []).reduce(
    (sum, item) => {
      const line = mediaOrderLine(item);
      return {
        revenue: sum.revenue + line.revenue,
        cost: sum.cost + line.cost,
        margin: sum.margin + line.margin,
        itemCount: sum.itemCount + 1,
      };
    },
    { revenue: 0, cost: 0, margin: 0, itemCount: 0 },
  );
  return {
    ...totals,
    marginPercent: totals.revenue > 0 ? (totals.margin / totals.revenue) * 100 : 0,
  };
}

export function rabCostByBusinessUnit(
  state: AppState,
  projectId: string,
): Partial<Record<BusinessUnitId, number>> {
  const form = formFor(state, projectId, "rab");
  if (!form || form.status !== "approved") return {};
  const items = (form.payload as { items?: { qty: number; unitPrice: number; businessUnitId?: BusinessUnitId }[] }).items ?? [];
  const totals: Partial<Record<BusinessUnitId, number>> = {};
  for (const item of items) {
    if (!item.businessUnitId) continue;
    totals[item.businessUnitId] =
      (totals[item.businessUnitId] ?? 0) + item.qty * item.unitPrice;
  }
  return totals;
}

export type BusinessDashboardRow = {
  businessUnitId: BusinessUnitId;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
  itemCount: number;
  plannedRabCost: number;
  variance: number;
  hasRevenue: boolean;
};

export type BusinessDashboardFilters = {
  groupId?: string;
  standalone?: boolean;
  from?: string;
  to?: string;
};

export function businessDashboardRows(
  state: AppState,
  filters: BusinessDashboardFilters = {},
): BusinessDashboardRow[] {
  const active = state.projects.filter(
    (project) => project.lifecycle !== "lost" && project.lifecycle !== "cancelled",
  );
  const projects = active.filter((project) => {
    if (filters.standalone) return !project.groupId;
    if (filters.groupId) return project.groupId === filters.groupId;
    return true;
  });
  const projectIds = new Set(projects.map((project) => project.id));
  const from = filters.from ? new Date(filters.from).getTime() : undefined;
  const to = filters.to ? new Date(filters.to).getTime() : undefined;
  const rows = new Map<
    BusinessUnitId,
    BusinessDashboardRow
  >();

  for (const order of state.mediaOrders) {
    if (order.status === "cancelled") continue;
    if (!projectIds.has(order.projectId)) continue;
    const created = new Date(order.createdAt).getTime();
    if (from !== undefined && created < from) continue;
    if (to !== undefined && created > to) continue;
    for (const item of order.items) {
      if (!item.businessUnitId) continue;
      const line = mediaOrderLine(item);
      const row =
        rows.get(item.businessUnitId) ??
        {
          businessUnitId: item.businessUnitId,
          revenue: 0,
          cost: 0,
          margin: 0,
          marginPercent: 0,
          itemCount: 0,
          plannedRabCost: 0,
          variance: 0,
          hasRevenue: false,
        };
      row.revenue += line.revenue;
      row.cost += line.cost;
      row.margin += line.margin;
      row.itemCount += 1;
      rows.set(item.businessUnitId, row);
    }
  }

  for (const project of projects) {
    const planned = rabCostByBusinessUnit(state, project.id);
    for (const [unit, cost] of Object.entries(planned) as [
      BusinessUnitId,
      number,
    ][]) {
      const row =
        rows.get(unit) ??
        {
          businessUnitId: unit,
          revenue: 0,
          cost: 0,
          margin: 0,
          marginPercent: 0,
          itemCount: 0,
          plannedRabCost: 0,
          variance: 0,
          hasRevenue: false,
        };
      row.plannedRabCost += cost;
      rows.set(unit, row);
    }
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      marginPercent:
        row.revenue > 0 ? (row.margin / row.revenue) * 100 : 0,
      variance: row.itemCount > 0 ? row.cost - row.plannedRabCost : 0,
      hasRevenue: row.revenue > 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}
