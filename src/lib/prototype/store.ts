"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  activeSteps,
  canAssignFormEntry,
  canAssignTask,
  canCancelFormEntry,
  canCreateFormEntry,
  canCreateTask,
  canEditFormEntry,
  canEditPhaseStructure,
  canManageProject,
  canManageTemplates,
  canReviewFormEntry,
  evaluateGate,
  groupCompleted,
  taskTransition,
  userById,
  validateWorkingLink,
} from "./domain";
import {
  backfillProjectEvents,
  recordProjectEvent,
  type ProjectEventInput,
} from "./events";
import {
  hasEditConflict,
  migrateFormVersions,
  reviewFormVersion,
  submitFormVersion,
} from "./form-versions";
import { createSeedState } from "./seed";
import {
  createSeedTemplates,
  stageTasksForProject,
  UMUM_TEMPLATE_ID,
} from "./templates";
import {
  FORM_STEP_KEYS,
  PHASE_LABEL,
  PHASE_ORDER,
  type AppState,
  type Attachment,
  type FormEntry,
  type FormEntryPayload,
  type FormField,
  type FormStepKey,
  type FormTemplate,
  type MediaOrder,
  type MediaOrderItem,
  type MediaOrderStatus,
  type Phase,
  type Pitching,
  type Priority,
  type Project,
  type ProjectEvent,
  type ProjectStep,
  type ProjectTemplate,
  TASK_STATUS_LABEL,
  type StepForm,
  type Task,
  type TaskStatus,
  type TemplateStage,
  type User,
} from "./types";

type PitchingInput = {
  title: string;
  description: string;
  roles: { label: string; requestedUserId?: string }[];
};

type ProjectInput = {
  name: string;
  client: string;
  description: string;
  priority: Priority;
  startDate: string;
  targetEndDate: string;
  coverColor: string;
};

type CreateProjectInput = ProjectInput & {
  templateId?: string;
  /** Stages customized during creation; omitted means an exact template copy. */
  stages?: TemplateStage[];
};

type TemplateInput = {
  id?: string;
  name: string;
  description: string;
  projectType: string;
  stages: TemplateStage[];
  note?: string;
};

type GroupInput = {
  name: string;
  description: string;
};

type PrototypeActions = {
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setCurrentUser: (userId: string) => void;
  setProjectEvents: (events: ProjectEvent[]) => void;
  setForms: (forms: StepForm[]) => void;
  reset: () => void;

  createProject: (input: CreateProjectInput) => string;
  updateProject: (projectId: string, input: Partial<ProjectInput>) => void;
  cancelProject: (projectId: string, reason: string) => void;
  setProjectStructure: (projectId: string, stages: TemplateStage[]) => boolean;
  setPhaseStructure: (
    projectId: string,
    phase: Phase,
    stages: TemplateStage[],
  ) => boolean;
  startPhase: (projectId: string, phase: Phase) => boolean;

  saveTemplate: (input: TemplateInput) => string;
  archiveTemplate: (templateId: string) => void;
  duplicateTemplate: (templateId: string) => string;

  addPitching: (projectId: string, input: PitchingInput) => void;
  updatePitching: (pitchingId: string, input: PitchingInput) => void;
  decidePitching: (pitchingId: string, decision: "won" | "lost") => void;

  assignForm: (formId: string, userId: string) => void;
  saveForm: (
    formId: string,
    payload: StepForm["payload"],
    options?: { recordEvent?: boolean; expectedUpdatedAt?: string },
  ) => { ok: boolean; conflict?: boolean };
  submitForm: (formId: string) => void;
  reviewForm: (
    formId: string,
    decision: "approved" | "need_revision",
    comment: string,
    target?: string,
  ) => void;
  addFormPhoto: (formId: string, photo: NonNullable<StepForm["photos"]>[number]) => void;
  removeFormPhoto: (formId: string, photoId: string) => void;
  applyInvoiceImport: (
    formId: string,
    payload: StepForm["payload"],
    fileName?: string,
  ) => void;

  createTask: (
    projectId: string,
    input: {
      title: string;
      description: string;
      priority: Priority;
      dueDate?: string;
      stepKey?: string;
    },
  ) => string;
  assignTask: (taskId: string, userId: string) => void;
  transitionTask: (
    taskId: string,
    to: TaskStatus,
    workingLink?: string,
  ) => void;
  setWorkingLink: (taskId: string, url: string) => boolean;
  deleteTask: (taskId: string, reason: string) => void;
  addComment: (taskId: string, body: string) => void;
  addChecklistItem: (taskId: string, text: string) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  addAttachment: (taskId: string, attachment: Attachment) => void;
  removeAttachment: (taskId: string, attachmentId: string) => void;

  completeStep: (projectId: string, stepKey: string) => void;
  confirmNoWork: (projectId: string, stepKey: string, note?: string) => void;
  createFormEntry: (
    projectId: string,
    stepKey: string,
    input: { title: string; dueDate?: string; entryType?: string },
  ) => string;
  assignFormEntry: (entryId: string, userId: string) => void;
  saveFormEntry: (entryId: string, payload: FormEntryPayload) => void;
  submitFormEntry: (entryId: string) => void;
  reviewFormEntry: (
    entryId: string,
    decision: "approved" | "need_revision",
    comment: string,
  ) => void;
  cancelFormEntry: (entryId: string, reason: string) => void;
  createTasksFromTemplate: (
    projectId: string,
    stepKey: string,
    taskIds: string[],
  ) => number;
  createMediaOrder: (
    projectId: string,
    input: { title: string; notes?: string },
  ) => string;
  updateMediaOrder: (
    orderId: string,
    input: Partial<{ title: string; notes: string; status: MediaOrderStatus }>,
  ) => void;
  deleteMediaOrder: (orderId: string) => void;
  addMediaOrderItem: (
    orderId: string,
    item: Omit<MediaOrderItem, "id">,
  ) => void;
  updateMediaOrderItem: (
    orderId: string,
    itemId: string,
    patch: Partial<MediaOrderItem>,
  ) => void;
  removeMediaOrderItem: (orderId: string, itemId: string) => void;
  decideGate: (
    projectId: string,
    stepKey: string,
    decision: "approved" | "rejected",
    reason?: string,
  ) => void;
  completeProject: (projectId: string) => void;

  createGroup: (input: GroupInput) => string;
  updateGroup: (groupId: string, input: GroupInput) => void;
  addProjectToGroup: (groupId: string, projectId: string) => void;
  removeProjectFromGroup: (projectId: string) => void;
  disbandGroup: (groupId: string) => void;

  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
};

type PrototypeStore = AppState & PrototypeActions;

function uid(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

function now(): string {
  return new Date().toISOString();
}

function makeProjectCode(name: string, projects: Project[]): string {
  const base =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6) || "PRJ";
  let code = base;
  let index = 2;
  while (projects.some((project) => project.code === code)) {
    code = `${base.slice(0, 5)}${index}`;
    index += 1;
  }
  return code;
}

function taskCode(project: Project, tasks: Task[]): string {
  const count = tasks.filter((task) => task.projectId === project.id).length + 1;
  return `${project.code}-${String(count).padStart(3, "0")}`;
}

function activity(
  state: AppState,
  input: {
    projectId?: string;
    taskId?: string;
    actorId: string;
    action: string;
    message: string;
  },
) {
  return {
    id: uid("act"),
    projectId: input.projectId,
    taskId: input.taskId,
    actorId: input.actorId,
    action: input.action,
    message: input.message,
    createdAt: now(),
  };
}

function notify(
  state: AppState,
  input: {
    userId: string;
    type: string;
    title: string;
    body: string;
    href: string;
  },
) {
  return {
    id: uid("ntf"),
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href,
    createdAt: now(),
  };
}

function projectEvent(
  state: AppState,
  input: Omit<ProjectEventInput, "actorId">,
): ProjectEvent[] {
  return recordProjectEvent(state.projectEvents, {
    ...input,
    actorId: state.currentUserId,
  });
}

function formSnapshot(form: StepForm): Record<string, unknown> {
  const base = {
    status: form.status,
    assigneeId: form.assigneeId ?? null,
  };
  if (form.type === "rab") {
    const payload = form.payload as { items?: { qty: number; unitPrice: number }[] };
    return {
      ...base,
      total: (payload.items ?? []).reduce(
        (sum, item) => sum + item.qty * item.unitPrice,
        0,
      ),
      itemCount: payload.items?.length ?? 0,
    };
  }
  if (form.type === "bast") {
    const payload = form.payload as {
      number?: string;
      date?: string;
      documentUrl?: string;
    };
    return {
      ...base,
      number: payload.number ?? "",
      date: payload.date ?? "",
      documentUrl: payload.documentUrl ?? "",
    };
  }
  if (form.type === "invoice") {
    const payload = form.payload as {
      number?: string;
      date?: string;
      amount?: number;
      taxAmount?: number;
      documentUrl?: string;
    };
    return {
      ...base,
      number: payload.number ?? "",
      date: payload.date ?? "",
      amount: payload.amount ?? 0,
      taxAmount: payload.taxAmount ?? 0,
      documentUrl: payload.documentUrl ?? "",
    };
  }
  if (form.type === "payment") {
    const payload = form.payload as {
      paymentDate?: string;
      amount?: number;
      method?: string;
      status?: string;
    };
    return {
      ...base,
      paymentDate: payload.paymentDate ?? "",
      amount: payload.amount ?? 0,
      method: payload.method ?? "",
      paymentStatus: payload.status ?? "unpaid",
    };
  }
  const payload = form.payload as {
    surveyDate?: string;
    location?: string;
    findings?: string;
  };
  return {
    ...base,
    surveyDate: payload.surveyDate ?? "",
    location: payload.location ?? "",
    findings: payload.findings ?? "",
  };
}

function stagesForProject(
  projectId: string,
  template: ProjectTemplate,
  overrides?: TemplateStage[],
  phase: Phase = "prospek",
  activateFirst = true,
): ProjectStep[] {
  const source =
    overrides && overrides.length > 0
      ? overrides.filter((stage) => stage.phase === phase)
      : template.stages.filter((stage) => stage.phase === phase);
  const sorted = [...source].sort((a, b) => a.order - b.order);
  const first = sorted[0];
  const offset = PHASE_ORDER.indexOf(phase) * 100;
  return sorted.map((stage, index) => {
    const active =
      activateFirst &&
      (index === 0 ||
        Boolean(
          first?.parallelGroup && stage.parallelGroup === first.parallelGroup,
        ));
    return {
      id: `step-${projectId}-${stage.id}`,
      projectId,
      key: stage.legacyKey ?? stage.financeKind ?? stage.id,
      name: stage.name,
      description: stage.description,
      phase: stage.phase,
      order: offset + index + 1,
      status: active ? ("active" as const) : ("pending" as const),
      kind: stage.kind,
      required: stage.required,
      weight: stage.weight,
      parallelGroup: stage.parallelGroup,
      financeKind: stage.financeKind,
      gateKind: stage.gateKind,
      costBeforeCommitment: stage.costBeforeCommitment,
      legacyKey: stage.legacyKey,
      formTemplate: stage.formTemplate,
      entryTypes: stage.entryTypes,
      tasks: stageTasksForProject(stage.tasks),
      startedAt: active ? now() : undefined,
    };
  });
}

function canManageMediaOrders(
  state: AppState,
  user: User,
  project: Project,
): boolean {
  if (project.status !== "active") return false;
  if (project.lifecycle === "lost" || project.lifecycle === "cancelled") {
    return false;
  }
  if (user.role === "admin" || user.role === "manager" || user.role === "finance") {
    return true;
  }
  return canManageProject(user, project);
}

function mediaOrderSnapshot(order: MediaOrder) {
  return {
    title: order.title,
    status: order.status,
    notes: order.notes,
  };
}

function mediaOrderItemSnapshot(item: MediaOrderItem) {
  return {
    description: item.description,
    qty: item.qty,
    clientUnitPrice: item.clientUnitPrice,
    vendorUnitCost: item.vendorUnitCost,
    businessUnitId: item.businessUnitId ?? null,
  };
}

function normalizeStageOrders(stages: TemplateStage[]): TemplateStage[] {
  return stages.map((stage, index) => ({ ...stage, order: index + 1 }));
}

function stagesDiffer(
  stages: TemplateStage[] | undefined,
  template: ProjectTemplate,
): boolean {
  if (!stages || stages.length === 0) return false;
  const shape = (items: TemplateStage[]) =>
    JSON.stringify(
      items.map((stage) => ({
        id: stage.id,
        name: stage.name,
        phase: stage.phase,
        kind: stage.kind,
        required: stage.required,
        weight: stage.weight,
        financeKind: stage.financeKind,
        gateKind: stage.gateKind,
        parallelGroup: stage.parallelGroup,
        costBeforeCommitment: stage.costBeforeCommitment,
        formTemplate: stage.formTemplate,
        tasks: stage.tasks.map((task) => ({
          id: task.id,
          name: task.name,
          role: task.role,
          required: task.required,
          deliverable: task.deliverable,
        })),
      })),
    );
  return (
    shape(stages) !==
    shape(template.stages.filter((stage) => stages.some((s) => s.phase === stage.phase)))
  );
}

function templateEvent(
  events: ProjectEvent[],
  eventType: string,
  summary: string,
  metadata: Record<string, unknown>,
  actorId: string,
): ProjectEvent[] {
  return recordProjectEvent(events, {
    projectId: "",
    step: null,
    eventType,
    actorId,
    summary,
    metadata,
  });
}

type PersistedState = Partial<AppState> & Record<string, unknown>;

function defaultFormTemplate(
  title: string,
  tasks: { name: string }[] = [],
): FormTemplate {
  const fields: FormField[] =
    tasks.length > 0
      ? [
          {
            id: `field-checklist-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            label: "Daftar centang",
            type: "checklist",
            required: true,
            options: tasks.map((task) => task.name),
          },
        ]
      : [];
  return {
    title,
    defaultFields: {
      executionDate: { enabled: true, required: true },
      location: { enabled: true, required: true },
      notes: { enabled: true, required: false },
      photos: { enabled: true, required: false },
    },
    fields,
  };
}

function seedTemplateFor(id?: string): ProjectTemplate | undefined {
  return createSeedTemplates().find((template) => template.id === id);
}

function migrateTemplateStage(stage: TemplateStage): TemplateStage {
  if ((stage.kind as string) === "checklist") {
    return {
      ...stage,
      kind: "form",
      formTemplate: stage.formTemplate ?? defaultFormTemplate(stage.name, stage.tasks),
    };
  }
  if (stage.kind === "form" && !stage.formTemplate) {
    return {
      ...stage,
      formTemplate: defaultFormTemplate(stage.name, stage.tasks),
    };
  }
  return stage;
}

/**
 * Upgrades localStorage data written before templates existed. Idempotent:
 * fields that are already present are left untouched.
 */
export function migratePersistedState(persisted: unknown): PersistedState {
  const state = (persisted ?? {}) as PersistedState;
  const existingTemplates = Array.isArray(state.templates)
    ? (state.templates as ProjectTemplate[])
    : [];
  const templates =
    existingTemplates.length > 0
      ? existingTemplates.map((template) => {
          const seed = seedTemplateFor(template.id);
          if (seed) {
            return {
              ...seed,
              changelog: [
                ...template.changelog,
                ...seed.changelog.filter(
                  (entry) => !template.changelog.some((old) => old.version === entry.version),
                ),
              ],
            };
          }
          return {
            ...template,
            stages: template.stages.map(migrateTemplateStage),
          };
        })
      : createSeedTemplates();

  const projects = Array.isArray(state.projects)
    ? (state.projects as Project[]).map((project) => {
        const template = templates.find((item) => item.id === project.templateId);
        return {
          ...project,
          templateId: project.templateId ?? UMUM_TEMPLATE_ID,
          templateVersion: template?.version ?? project.templateVersion ?? 1,
          structureLocked: project.structureLocked ?? true,
          lifecycle:
            project.lifecycle ??
            (project.status === "completed"
              ? ("done" as const)
              : project.status === "cancelled"
                ? ("cancelled" as const)
                : ("active" as const)),
        };
      })
    : [];

  const steps = Array.isArray(state.steps)
    ? (state.steps as ProjectStep[]).map((step) => {
        const project = projects.find((item) => item.id === step.projectId);
        const template = templates.find((item) => item.id === project?.templateId);
        const prefix = `step-${step.projectId}-`;
        const stageId = step.id.startsWith(prefix)
          ? step.id.slice(prefix.length)
          : undefined;
        const seedStage = stageId
          ? template?.stages.find((stage) => stage.id === stageId)
          : undefined;
        const legacyPhase =
          (step.phase as string) === "planning"
            ? ("prospek" as const)
            : (step.phase as string) === "finance"
              ? ("closing" as const)
              : step.phase;
        const base: ProjectStep = {
          ...step,
          phase: seedStage?.phase ?? legacyPhase,
          name: step.name ?? seedStage?.name ?? step.key,
          kind:
            seedStage?.kind ??
            (step.legacyKey === "pitching" || step.legacyKey === "running"
              ? "simpro"
              : (step.kind as string) === "checklist"
                ? "form"
                : step.kind ?? "form"),
          required: step.required ?? true,
          weight: step.weight ?? seedStage?.weight ?? 1,
          parallelGroup: step.parallelGroup ?? seedStage?.parallelGroup,
          financeKind: step.financeKind ?? seedStage?.financeKind,
          gateKind: step.gateKind ?? seedStage?.gateKind,
          costBeforeCommitment:
            step.costBeforeCommitment ?? seedStage?.costBeforeCommitment,
          legacyKey: step.legacyKey ?? seedStage?.legacyKey,
          formTemplate:
            seedStage?.formTemplate ??
            step.formTemplate ??
            (((step.kind as string) === "checklist" ||
            (step.kind === "form" && step.legacyKey !== "survey")
              ? defaultFormTemplate(step.name ?? step.key, step.tasks ?? [])
              : undefined)),
          tasks: Array.isArray(step.tasks)
            ? step.tasks
            : stageTasksForProject(seedStage?.tasks ?? []),
        };
        return base;
      })
    : [];

  const tasks = Array.isArray(state.tasks)
    ? (state.tasks as Task[]).map((task) => {
        if (task.stageId) return task;
        const step = steps.find(
          (item) =>
            item.projectId === task.projectId && item.key === task.stepKey,
        );
        return { ...task, stageId: step?.id };
      })
    : [];

  const projectsWithPhases = projects.map((project) => {
    const projectSteps = steps.filter((step) => step.projectId === project.id);
    const phaseStates = { ...(project.phaseStates ?? {}) };
    const hadProspekState = Boolean(project.phaseStates?.prospek);
    for (const phase of PHASE_ORDER) {
      const phaseSteps = projectSteps.filter((step) => step.phase === phase);
      if (phaseSteps.length === 0) continue;
      if (phaseStates[phase]) continue;
      const started = phaseSteps
        .map((step) => step.startedAt ?? step.completedAt)
        .filter((value): value is string => Boolean(value))
        .sort()[0];
      phaseStates[phase] = {
        authoredAt: project.createdAt,
        startedAt: started ?? project.createdAt,
        lockedAt: started ?? project.createdAt,
      };
    }
    if (!phaseStates.prospek) {
      phaseStates.prospek = {
        authoredAt: project.createdAt,
        startedAt: project.createdAt,
        lockedAt: project.createdAt,
      };
    }
    return { ...project, phaseStates, __hadProspekState: hadProspekState };
  });

  const requiredUsers = createSeedState().users.filter(
    (seedUser) => seedUser.id === "u-media" || seedUser.id === "u-bod",
  );
  const existingUsers = Array.isArray(state.users) ? (state.users as User[]) : [];
  const users = [
    ...existingUsers,
    ...requiredUsers.filter(
      (seedUser) => !existingUsers.some((user) => user.id === seedUser.id),
    ),
  ];

  const formEntries = Array.isArray(state.formEntries)
    ? (state.formEntries as FormEntry[]).map((entry) => {
        if (entry.entryType) return entry;
        const step = steps.find(
          (item) =>
            item.projectId === entry.projectId && item.key === entry.stepKey,
        );
        const type = step?.entryTypes?.find(
          (item) => item.label.toLowerCase() === entry.title.trim().toLowerCase(),
        );
        return type ? { ...entry, entryType: type.id } : entry;
      })
    : [];

  const existingEvents = Array.isArray(state.projectEvents)
    ? (state.projectEvents as ProjectEvent[])
    : [];
  const eventIds = new Set(existingEvents.map((event) => event.id));
  const migrationEvents: ProjectEvent[] = [];
  for (const project of projectsWithPhases) {
    if (project.__hadProspekState) continue;
    const id = `phase-migration-${project.id}`;
    if (eventIds.has(id)) continue;
    migrationEvents.push({
      id,
      projectId: project.id,
      step: null,
      eventType: "project.phase_migrated",
      actorId: project.createdById,
      occurredAt: project.createdAt,
      summary: "Struktur proyek dipetakan ke fase-fase baru.",
      metadata: {
        phases: Object.keys(project.phaseStates ?? {}),
        structureLocked: project.structureLocked ?? true,
      },
    });
  }

  return {
    ...state,
    templates,
    projects: projectsWithPhases.map((entry) => {
      const project = { ...entry };
      delete (project as { __hadProspekState?: boolean }).__hadProspekState;
      return project;
    }),
    users,
    steps,
    tasks,
    formEntries,
    mediaOrders: Array.isArray(state.mediaOrders)
      ? (state.mediaOrders as MediaOrder[])
      : [],
    projectEvents: [...existingEvents, ...migrationEvents],
  };
}

function linkProjectsToTemplate(
  events: ProjectEvent[],
  projects: Project[],
): ProjectEvent[] {
  const ids = new Set(events.map((event) => event.id));
  const additions: ProjectEvent[] = [];
  for (const project of projects) {
    if (project.templateId && project.templateId !== UMUM_TEMPLATE_ID) continue;
    const id = `template-link-${project.id}`;
    if (ids.has(id)) continue;
    additions.push({
      id,
      projectId: project.id,
      step: null,
      eventType: "project.template_linked",
      actorId: project.createdById,
      occurredAt: project.createdAt,
      summary: "Dihubungkan ke template Umum.",
      metadata: {
        templateId: project.templateId ?? UMUM_TEMPLATE_ID,
        templateVersion: project.templateVersion ?? 1,
      },
    });
  }
  if (additions.length === 0) return events;
  return [...events, ...additions].sort((a, b) => {
    const byTime = a.occurredAt.localeCompare(b.occurredAt);
    return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
  });
}

function defaultForm(projectId: string, key: FormStepKey): StepForm {
  const base = {
    id: `form-${projectId}-${key}`,
    projectId,
    stepKey: key,
    type: key,
    status: "unassigned" as const,
    createdAt: now(),
    versions: [] as StepForm["versions"],
    updatedAt: now(),
  };
  if (key === "survey") {
    return {
      ...base,
      payload: {
        surveyDate: "",
        location: "",
        pic: "",
        findings: "",
        notes: "",
      },
      photos: [],
    };
  }
  if (key === "rab") {
    return { ...base, payload: { items: [], notes: "" } };
  }
  if (key === "bast") {
    return {
      ...base,
      payload: {
        number: "",
        date: "",
        picId: "",
        notes: "",
        documentUrl: "",
      },
      versions: [],
      updatedAt: now(),
    };
  }
  if (key === "payment") {
    return {
      ...base,
      payload: {
        invoiceId: "",
        paymentDate: "",
        amount: 0,
        method: "",
        proofFileName: "",
        proofStorageKey: "",
        proofMimeType: "",
        proofSize: 0,
        status: "unpaid" as const,
        notes: "",
      },
      versions: [],
      updatedAt: now(),
    };
  }
  return {
    ...base,
    payload: {
      number: "",
      date: "",
      dueDate: "",
      amount: 0,
      taxPercent: 11,
      taxAmount: 0,
      notes: "",
      documentUrl: "",
    },
    versions: [],
    updatedAt: now(),
  };
}

function createPitchingTasks(
  state: AppState,
  projectId: string,
  pitching: Pitching,
  roles: PitchingInput["roles"],
): { roles: PrototypeStore["pitchingRoles"]; tasks: Task[] } {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return { roles: [], tasks: [] };
  const tasks = [...state.tasks];
  const nextRoles = roles.map((role) => {
    const taskId = role.requestedUserId ? uid("task") : undefined;
    if (taskId && role.requestedUserId) {
      tasks.push({
        id: taskId,
        code: taskCode(project, tasks),
        projectId,
        stepKey: "pitching",
        stageId: state.steps.find(
          (step) => step.projectId === projectId && step.key === "pitching",
        )?.id,
        pitchingId: pitching.id,
        title: `[${pitching.title}] ${role.label}`,
        description: "Task otomatis dari pitching.",
        priority: "medium",
        status: "backlog",
        requestedAssigneeId: role.requestedUserId,
        reporterId: state.currentUserId,
        createdAt: now(),
        checklist: [],
        comments: [],
        attachments: [],
      });
    }
    return {
      id: uid("role"),
      pitchingId: pitching.id,
      label: role.label,
      requestedUserId: role.requestedUserId,
      taskId,
    };
  });
  return { roles: nextRoles, tasks };
}

export const usePrototypeStore = create<PrototypeStore>()(
  persist(
    (set, get) => ({
      ...createSeedState(),
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      setCurrentUser: (userId) => set({ currentUserId: userId }),
      setProjectEvents: (events) => set({ projectEvents: events }),
      setForms: (forms) => set({ forms }),
      reset: () => set({ ...createSeedState(), hydrated: true }),

      createProject: (input) => {
        const state = get();
        const template =
          state.templates.find((item) => item.id === input.templateId) ??
          state.templates.find((item) => item.id === UMUM_TEMPLATE_ID) ??
          state.templates[0];
        if (!template) return "";
        const projectId = uid("p");
        const prospekSource = input.stages?.filter(
          (stage) => stage.phase === "prospek",
        );
        const createdAtValue = now();
        const project: Project = {
          id: projectId,
          code: makeProjectCode(input.name, state.projects),
          name: input.name,
          client: input.client,
          description: input.description,
          priority: input.priority,
          status: "active",
          lifecycle: "active",
          startDate: input.startDate,
          targetEndDate: input.targetEndDate,
          coverColor: input.coverColor,
          createdById: state.currentUserId,
          createdAt: createdAtValue,
          templateId: template.id,
          templateVersion: template.version,
          structureLocked: false,
          phaseStates: {
            prospek: {
              authoredAt: createdAtValue,
              startedAt: createdAtValue,
              lockedAt: createdAtValue,
              sourceTemplateVersion: template.version,
            },
          },
        };
        const steps = stagesForProject(
          projectId,
          template,
          prospekSource,
          "prospek",
        );
        const forms = FORM_STEP_KEYS.map((key) => defaultForm(projectId, key));
        let events = projectEvent(state, {
          projectId,
          step: null,
          eventType: "project.created_from_template",
          summary: `Proyek ${project.name} dibuat dari template ${template.name} v${template.version}.`,
          metadata: {
            before: null,
            after: {
              name: project.name,
              client: project.client,
              priority: project.priority,
              status: project.status,
              templateId: template.id,
              templateName: template.name,
              templateVersion: template.version,
            },
          },
        });
        if (stagesDiffer(prospekSource, template)) {
          events = recordProjectEvent(events, {
            projectId,
            step: null,
            eventType: "project.structure_customized",
            actorId: state.currentUserId,
            summary: `Tahapan disesuaikan saat pembuatan (${steps.length} tahap).`,
            metadata: {
              templateId: template.id,
              templateVersion: template.version,
              stageCount: steps.length,
              stageNames: steps.map((step) => step.name),
            },
          });
        }
        const first = steps[0];
        if (first) {
          events = recordProjectEvent(events, {
            projectId,
            step: first.key,
            eventType: "project.step_changed",
            actorId: state.currentUserId,
            summary: `Tahap ${first.name} aktif.`,
            metadata: {
              before: { status: "pending" },
              after: { status: "active" },
            },
          });
        }
        set({
          projects: [...state.projects, project],
          steps: [...state.steps, ...steps],
          forms: [...state.forms, ...forms],
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId,
              actorId: state.currentUserId,
              action: "project_created",
              message: `Proyek ${project.name} dibuat.`,
            }),
          ],
          projectEvents: events,
        });
        return projectId;
      },

      updateProject: (projectId, input) => {
        const state = get();
        const project = state.projects.find((item) => item.id === projectId);
        if (!project) return;
        const before = {
          name: project.name,
          client: project.client,
          description: project.description,
          priority: project.priority,
          startDate: project.startDate,
          targetEndDate: project.targetEndDate,
        };
        const after = { ...before, ...input };
        set({
          projects: state.projects.map((item) =>
            item.id === projectId ? { ...item, ...input } : item,
          ),
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId,
              actorId: state.currentUserId,
              action: "project_updated",
              message: "Data proyek diperbarui.",
            }),
          ],
          projectEvents: projectEvent(state, {
            projectId,
            step: null,
            eventType: "project.updated",
            summary: "Data proyek diperbarui.",
            metadata: { before, after },
          }),
        });
      },

      cancelProject: (projectId, reason) => {
        const state = get();
        const project = state.projects.find((item) => item.id === projectId);
        if (!project) return;
        set({
          projects: state.projects.map((item) =>
            item.id === projectId
              ? {
                  ...item,
                  status: "cancelled",
                  lifecycle: "cancelled" as const,
                  cancelReason: reason,
                }
              : item,
          ),
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId,
              actorId: state.currentUserId,
              action: "project_cancelled",
              message: `Proyek dibatalkan: ${reason}`,
            }),
          ],
          projectEvents: projectEvent(state, {
            projectId,
            step: null,
            eventType: "project.lifecycle_changed",
            summary: `Proyek dibatalkan: ${reason}`,
            metadata: {
              before: { status: project.status, lifecycle: project.lifecycle ?? null },
              after: { status: "cancelled", lifecycle: "cancelled", reason },
            },
          }),
          notifications: [
            ...state.notifications,
            notify(state, {
              userId: project.createdById,
              type: "project_cancelled",
              title: "Proyek dibatalkan",
              body: project.name,
              href: `/crm/projects/${projectId}`,
            }),
          ],
        });
      },

      setProjectStructure: () => false,

      setPhaseStructure: (projectId, phase, stages) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const project = state.projects.find((item) => item.id === projectId);
        if (!actor || !project) return false;
        if (!canManageProject(actor, project)) return false;
        if (!canEditPhaseStructure(project, phase)) return false;
        if (stages.some((stage) => stage.phase !== phase)) return false;
        const template = state.templates.find((item) => item.id === project.templateId);
        if (!template) return false;
        const nextSteps = stagesForProject(
          projectId,
          template,
          stages,
          phase,
          false,
        );
        const authoredAt = now();
        set({
          steps: [
            ...state.steps.filter(
              (step) => !(step.projectId === projectId && step.phase === phase),
            ),
            ...nextSteps,
          ],
          projects: state.projects.map((item) =>
            item.id === projectId
              ? {
                  ...item,
                  phaseStates: {
                    ...item.phaseStates,
                    [phase]: {
                      ...item.phaseStates?.[phase],
                      authoredAt,
                      sourceTemplateVersion: template.version,
                    },
                  },
                }
              : item,
          ),
          projectEvents: projectEvent(state, {
            projectId,
            step: null,
            eventType: "phase.composed",
            summary: `Fase ${PHASE_LABEL[phase]} disusun (${nextSteps.length} tahap).`,
            metadata: {
              phase,
              stageCount: nextSteps.length,
              stageNames: nextSteps.map((step) => step.name),
              templateId: template.id,
              templateVersion: template.version,
            },
          }),
        });
        return true;
      },

      startPhase: (projectId, phase) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const project = state.projects.find((item) => item.id === projectId);
        if (!actor || !project) return false;
        if (!canManageProject(actor, project)) return false;
        if (project.status !== "active") return false;
        if (phase === "prospek") return false;
        const phaseState = project.phaseStates?.[phase];
        if (!phaseState || phaseState.startedAt) return false;
        const template = state.templates.find((item) => item.id === project.templateId);
        if (!template) return false;
        const projectSteps = state.steps.filter(
          (step) => step.projectId === projectId,
        );
        const phaseIndex = PHASE_ORDER.indexOf(phase);
        const priorPhases = PHASE_ORDER.slice(0, phaseIndex);
        for (const prior of priorPhases) {
          const priorSteps = projectSteps.filter((step) => step.phase === prior);
          if (
            priorSteps.length > 0 &&
            priorSteps.some(
              (step) => step.status !== "completed" && step.status !== "skipped",
            )
          ) {
            return false;
          }
          const priorState = project.phaseStates?.[prior];
          if (priorSteps.length === 0 && !(template.legacy && prior === "planning")) {
            return false;
          }
          if (priorSteps.length > 0 && !priorState?.startedAt) return false;
        }

        let phaseSteps = projectSteps.filter((step) => step.phase === phase);
        if (phaseSteps.length === 0 && !(template.legacy && phase === "planning")) {
          return false;
        }

        const startedAt = now();
        let nextSteps = [...state.steps];
        let closingAppended = false;
        if (phase === "running" && !project.phaseStates?.closing?.authoredAt) {
          const closingStages = template.stages.filter(
            (stage) => stage.phase === "closing",
          );
          const existingClosing = projectSteps.filter(
            (step) => step.phase === "closing",
          );
          if (closingStages.length > 0 && existingClosing.length === 0) {
            const closingSteps = stagesForProject(
              projectId,
              template,
              closingStages,
              "closing",
              false,
            );
            nextSteps = [...nextSteps, ...closingSteps];
            closingAppended = true;
          }
        }

        const firstPending = phaseSteps
          .slice()
          .sort((a, b) => a.order - b.order)[0];
        const activeIds = phaseSteps
          .filter(
            (step) =>
              step.id === firstPending?.id ||
              (firstPending?.parallelGroup &&
                step.parallelGroup === firstPending.parallelGroup),
          )
          .map((step) => step.id);
        nextSteps = nextSteps.map((step) =>
          step.projectId === projectId && activeIds.includes(step.id)
            ? {
                ...step,
                status: "active" as const,
                startedAt: step.startedAt ?? startedAt,
              }
            : step,
        );
        phaseSteps = nextSteps.filter(
          (step) => step.projectId === projectId && step.phase === phase,
        );

        let events = projectEvent(state, {
          projectId,
          step: null,
          eventType: "phase.started",
          summary: `Fase ${PHASE_LABEL[phase]} dimulai.`,
          metadata: {
            phase,
            stageCount: phaseSteps.length,
            startedAt,
          },
        });
        if (closingAppended) {
          events = recordProjectEvent(events, {
            projectId,
            step: null,
            eventType: "closing.appended",
            actorId: actor.id,
            summary: "Tahap Closing ditambahkan dari template.",
            metadata: {
              phase: "closing",
              stageNames: nextSteps
                .filter(
                  (step) => step.projectId === projectId && step.phase === "closing",
                )
                .map((step) => step.name),
            },
          });
        }

        set({
          steps: nextSteps,
          projects: state.projects.map((item) =>
            item.id === projectId
              ? {
                  ...item,
                  phaseStates: {
                    ...item.phaseStates,
                    [phase]: {
                      ...item.phaseStates?.[phase],
                      startedAt,
                      lockedAt: startedAt,
                    },
                    ...(closingAppended
                      ? {
                          closing: {
                            authoredAt: startedAt,
                            sourceTemplateVersion: template.version,
                          },
                        }
                      : {}),
                  },
                }
              : item,
          ),
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId,
              actorId: actor.id,
              action: "phase_started",
              message: `Fase ${PHASE_LABEL[phase]} dimulai.`,
            }),
          ],
          projectEvents: events,
        });
        return true;
      },

      saveTemplate: (input) => {
        const state = get();
        const user = userById(state, state.currentUserId);
        if (!user || !canManageTemplates(user)) return "";
        const existing = input.id
          ? state.templates.find((item) => item.id === input.id)
          : undefined;
        const stages = normalizeStageOrders(input.stages);
        if (existing) {
          const next: ProjectTemplate = {
            ...existing,
            name: input.name.trim(),
            description: input.description.trim(),
            projectType: input.projectType.trim() || existing.projectType,
            version: existing.version + 1,
            stages,
            changelog: [
              ...existing.changelog,
              {
                version: existing.version + 1,
                note: input.note?.trim() || "Versi baru.",
                createdAt: now(),
              },
            ],
          };
          set({
            templates: state.templates.map((item) =>
              item.id === existing.id ? next : item,
            ),
            projectEvents: templateEvent(
              state.projectEvents,
              "template.version_published",
              `Template ${next.name} v${next.version} diterbitkan.`,
              {
                templateId: next.id,
                version: next.version,
                note: input.note?.trim() || null,
              },
              state.currentUserId,
            ),
          });
          return next.id;
        }
        const created: ProjectTemplate = {
          id: uid("tpl"),
          name: input.name.trim(),
          description: input.description.trim(),
          projectType: input.projectType.trim() || "Umum",
          version: 1,
          status: "active",
          stages,
          changelog: [
            { version: 1, note: input.note?.trim() || "Versi awal.", createdAt: now() },
          ],
          createdById: state.currentUserId,
          createdAt: now(),
        };
        set({
          templates: [...state.templates, created],
          projectEvents: templateEvent(
            state.projectEvents,
            "template.created",
            `Template ${created.name} dibuat.`,
            { templateId: created.id, version: created.version },
            state.currentUserId,
          ),
        });
        return created.id;
      },

      archiveTemplate: (templateId) => {
        const state = get();
        const user = userById(state, state.currentUserId);
        if (!user || !canManageTemplates(user)) return;
        const template = state.templates.find((item) => item.id === templateId);
        if (!template) return;
        set({
          templates: state.templates.map((item) =>
            item.id === templateId ? { ...item, status: "archived" } : item,
          ),
          projectEvents: templateEvent(
            state.projectEvents,
            "template.archived",
            `Template ${template.name} diarsipkan.`,
            { templateId, version: template.version },
            state.currentUserId,
          ),
        });
      },

      duplicateTemplate: (templateId) => {
        const state = get();
        const user = userById(state, state.currentUserId);
        if (!user || !canManageTemplates(user)) return "";
        const template = state.templates.find((item) => item.id === templateId);
        if (!template) return "";
        const copy: ProjectTemplate = {
          ...template,
          id: uid("tpl"),
          name: `${template.name} (salinan)`,
          version: 1,
          legacy: false,
          status: "active",
          stages: template.stages.map((stage) => ({
            ...stage,
            id: uid("stage"),
            tasks: stage.tasks.map((task) => ({ ...task, id: uid("ttask") })),
          })),
          changelog: [
            { version: 1, note: `Salinan dari ${template.name}.`, createdAt: now() },
          ],
          createdById: state.currentUserId,
          createdAt: now(),
        };
        set({
          templates: [...state.templates, copy],
          projectEvents: templateEvent(
            state.projectEvents,
            "template.created",
            `Template ${copy.name} dibuat dari ${template.name}.`,
            { templateId: copy.id, sourceTemplateId: template.id },
            state.currentUserId,
          ),
        });
        return copy.id;
      },

      addPitching: (projectId, input) => {
        const state = get();
        const pitching: Pitching = {
          id: uid("pitch"),
          projectId,
          title: input.title,
          description: input.description,
          status: "draft",
          createdById: state.currentUserId,
          createdAt: now(),
        };
        const { roles, tasks } = createPitchingTasks(
          state,
          projectId,
          pitching,
          input.roles,
        );
        set({
          pitchings: [...state.pitchings, pitching],
          pitchingRoles: [...state.pitchingRoles, ...roles],
          tasks,
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId,
              actorId: state.currentUserId,
              action: "pitching_created",
              message: `Pitching ${pitching.title} dibuat.`,
            }),
          ],
          projectEvents: projectEvent(state, {
            projectId,
            step: "pitching",
            eventType: "pitching.created",
            summary: `Pitching ${pitching.title} dibuat.`,
            metadata: {
              after: {
                title: pitching.title,
                description: pitching.description,
                roles: roles.length,
              },
            },
          }),
        });
      },

      updatePitching: (pitchingId, input) => {
        const state = get();
        const pitching = state.pitchings.find((item) => item.id === pitchingId);
        if (!pitching || pitching.status !== "draft") return;
        const oldRoles = state.pitchingRoles.filter(
          (role) => role.pitchingId === pitchingId,
        );
        const hasMovedTask = oldRoles.some((role) => {
          const task = role.taskId
            ? state.tasks.find((item) => item.id === role.taskId)
            : undefined;
          return Boolean(task && !task.archivedAt && task.status !== "backlog");
        });
        if (hasMovedTask) return;
        const oldTaskIds = new Set(oldRoles.map((role) => role.taskId));
        const nextPitching = {
          ...pitching,
          title: input.title,
          description: input.description,
        };
        const archived = state.tasks.map((task) =>
          task.pitchingId === pitchingId &&
          oldTaskIds.has(task.id) &&
          task.status !== "completed"
            ? {
                ...task,
                archivedAt: now(),
                archiveReason: "Pitching diedit",
              }
            : task,
        );
        const stateWithoutOldTasks = {
          ...state,
          tasks: archived,
          pitchingRoles: state.pitchingRoles.filter(
            (role) => role.pitchingId !== pitchingId,
          ),
        };
        const { roles, tasks } = createPitchingTasks(
          stateWithoutOldTasks,
          pitching.projectId,
          nextPitching,
          input.roles,
        );
        set({
          pitchings: state.pitchings.map((item) =>
            item.id === pitchingId ? nextPitching : item,
          ),
          pitchingRoles: [...stateWithoutOldTasks.pitchingRoles, ...roles],
          tasks,
          projectEvents: projectEvent(state, {
            projectId: pitching.projectId,
            step: "pitching",
            eventType: "pitching.updated",
            summary: `Pitching ${nextPitching.title} diperbarui.`,
            metadata: {
              before: {
                title: pitching.title,
                description: pitching.description,
                roles: oldRoles.length,
              },
              after: {
                title: nextPitching.title,
                description: nextPitching.description,
                roles: roles.length,
              },
            },
          }),
        });
      },

      decidePitching: (pitchingId, decision) => {
        const state = get();
        const pitching = state.pitchings.find((item) => item.id === pitchingId);
        if (!pitching || pitching.status !== "draft") return;
        const nextPitchings = state.pitchings.map((item) =>
          item.id === pitchingId
            ? { ...item, status: decision, decidedAt: now() }
            : item,
        );
        let nextTasks = state.tasks;
        if (decision === "lost") {
          nextTasks = state.tasks.map((task) =>
            task.pitchingId === pitchingId
              ? {
                  ...task,
                  archivedAt: now(),
                  archiveReason: "Pitching kalah",
                }
              : task,
          );
        }
        set({
          pitchings: nextPitchings,
          tasks: nextTasks,
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId: pitching.projectId,
              actorId: state.currentUserId,
              action: decision === "won" ? "pitching_won" : "pitching_lost",
              message: `Pitching ${pitching.title} ${decision === "won" ? "menang" : "kalah"}.`,
            }),
          ],
          projectEvents: projectEvent(state, {
            projectId: pitching.projectId,
            step: "pitching",
            eventType: decision === "won" ? "pitching.won" : "pitching.lost",
            summary: `Pitching ${pitching.title} ${decision === "won" ? "menang" : "kalah"}.`,
            metadata: {
              before: { status: pitching.status },
              after: { status: decision },
              archivedTaskIds:
                decision === "lost"
                  ? state.tasks
                      .filter((task) => task.pitchingId === pitchingId)
                      .map((task) => task.id)
                  : [],
            },
          }),
        });
      },

      assignForm: (formId, userId) => {
        const state = get();
        const form = state.forms.find((item) => item.id === formId);
        if (!form) return;
        const user = userById(state, userId);
        set({
          forms: state.forms.map((item) =>
            item.id === formId
              ? {
                  ...item,
                  assigneeId: userId,
                  status: "assigned",
                  updatedAt: now(),
                  updatedById: state.currentUserId,
                }
              : item,
          ),
          notifications: user
            ? [
                ...state.notifications,
                notify(state, {
                  userId,
                  type: "form_assigned",
                  title: "Form baru di-assign",
                  body: `${form.type.toUpperCase()} untuk proyek.`,
                  href: form.type === "survey" ? "/forms" : `/crm/projects/${form.projectId}`,
                }),
              ]
            : state.notifications,
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId: form.projectId,
              actorId: state.currentUserId,
              action: "form_assigned",
              message: `${form.type.toUpperCase()} di-assign ke ${user?.name ?? "user"}.`,
            }),
          ],
          projectEvents: projectEvent(state, {
            projectId: form.projectId,
            step: form.stepKey,
            eventType: `${form.type}.assigned`,
            summary: `${form.type.toUpperCase()} di-assign ke ${user?.name ?? "user"}.`,
            metadata: {
              before: { assigneeId: form.assigneeId ?? null, status: form.status },
              after: { assigneeId: userId, status: "assigned" },
            },
          }),
        });
      },

      saveForm: (formId, payload, options) => {
        const state = get();
        const form = state.forms.find((item) => item.id === formId);
        if (!form) return { ok: false };
        const project = state.projects.find(
          (item) => item.id === form.projectId,
        );
        if (form.type === "rab" && project?.rabBaselineLockedAt) {
          return { ok: false };
        }
        if (
          hasEditConflict(form, options?.expectedUpdatedAt, state.currentUserId)
        ) {
          return { ok: false, conflict: true };
        }
        const nextStatus =
          form.status === "unassigned" ||
          form.status === "assigned" ||
          form.status === "submitted" ||
          form.status === "approved"
            ? "draft"
            : form.status;
        const keepReview = form.status === "need_revision";
        const updatedAt = now();
        const shouldRecord = options?.recordEvent ?? true;
        let events = state.projectEvents;
        if (shouldRecord) {
          events = projectEvent(state, {
            projectId: form.projectId,
            step: form.stepKey,
            eventType: `${form.type}.updated`,
            summary: `${form.type.toUpperCase()} diperbarui.`,
            metadata: {
              before: formSnapshot(form),
              after: formSnapshot({ ...form, payload, status: nextStatus }),
            },
          });
        }
        set({
          forms: state.forms.map((item) =>
            item.id === formId
              ? {
                  ...item,
                  payload,
                  status: nextStatus,
                  submittedAt: keepReview ? item.submittedAt : undefined,
                  reviewedAt: keepReview ? item.reviewedAt : undefined,
                  reviewedById: keepReview ? item.reviewedById : undefined,
                  reviewComment: keepReview ? item.reviewComment : undefined,
                  reviewTarget: keepReview ? item.reviewTarget : undefined,
                  updatedAt,
                  updatedById: state.currentUserId,
                }
              : item,
          ),
          activityLogs: shouldRecord
            ? [
                ...state.activityLogs,
                activity(state, {
                  projectId: form.projectId,
                  actorId: state.currentUserId,
                  action: "form_saved",
                  message: `${form.type.toUpperCase()} disimpan sebagai draft.`,
                }),
              ]
            : state.activityLogs,
          projectEvents: events,
        });
        return { ok: true };
      },

      submitForm: (formId) => {
        const state = get();
        const form = state.forms.find((item) => item.id === formId);
        if (!form) return;
        const project = state.projects.find((item) => item.id === form.projectId);
        if (form.type === "rab" && project?.rabBaselineLockedAt) return;
        const nextForm = submitFormVersion(form, state.currentUserId);
        const versionNumber = nextForm.versions?.length ?? 1;
        set({
          forms: state.forms.map((item) =>
            item.id === formId ? nextForm : item,
          ),
          notifications: project
            ? [
                ...state.notifications,
                notify(state, {
                  userId: project.createdById,
                  type: "form_submitted",
                  title: `${form.type.toUpperCase()} menunggu review`,
                  body: project.name,
                  href: `/crm/projects/${project.id}`,
                }),
              ]
            : state.notifications,
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId: form.projectId,
              actorId: state.currentUserId,
              action: "form_submitted",
              message: `${form.type.toUpperCase()} disubmit.`,
            }),
          ],
          projectEvents: projectEvent(state, {
            projectId: form.projectId,
            step: form.stepKey,
            eventType: `${form.type}.submitted`,
            summary: `${form.type.toUpperCase()} v${versionNumber} disubmit.`,
            metadata: {
              before: formSnapshot(form),
              after: formSnapshot(nextForm),
              versionNumber,
            },
          }),
        });
      },

      reviewForm: (formId, decision, comment, target) => {
        const state = get();
        const form = state.forms.find((item) => item.id === formId);
        if (!form) return;
        const nextForm = reviewFormVersion(
          form,
          decision,
          comment,
          target,
          state.currentUserId,
        );
        set({
          forms: state.forms.map((item) =>
            item.id === formId ? nextForm : item,
          ),
          notifications:
            form.assigneeId !== undefined
              ? [
                  ...state.notifications,
                  notify(state, {
                    userId: form.assigneeId,
                    type: decision === "approved" ? "form_approved" : "form_revision",
                    title:
                      decision === "approved"
                        ? `${form.type.toUpperCase()} disetujui`
                        : `${form.type.toUpperCase()} perlu revisi`,
                    body: comment || "Silakan buka form.",
                    href: form.type === "survey" ? "/forms" : `/crm/projects/${form.projectId}`,
                  }),
                ]
              : state.notifications,
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId: form.projectId,
              actorId: state.currentUserId,
              action: decision === "approved" ? "form_approved" : "form_revision",
              message:
                decision === "approved"
                  ? `${form.type.toUpperCase()} disetujui.`
                  : `${form.type.toUpperCase()} dikembalikan untuk revisi.`,
            }),
          ],
          projectEvents: projectEvent(state, {
            projectId: form.projectId,
            step: form.stepKey,
            eventType: `${form.type}.${decision === "approved" ? "approved" : "need_revision"}`,
            summary:
              decision === "approved"
                ? `${form.type.toUpperCase()} disetujui.`
                : `${form.type.toUpperCase()} perlu revisi.`,
            metadata: {
              before: formSnapshot(form),
              after: formSnapshot(nextForm),
              reviewComment: comment,
              reviewTarget: target ?? null,
            },
          }),
        });
      },

      addFormPhoto: (formId, photo) => {
        const state = get();
        const form = state.forms.find((item) => item.id === formId);
        if (!form) return;
        set({
          forms: state.forms.map((item) =>
            item.id === formId
              ? {
                  ...item,
                  photos: [...(item.photos ?? []), photo],
                  updatedAt: now(),
                  updatedById: state.currentUserId,
                }
              : item,
          ),
          projectEvents: projectEvent(state, {
            projectId: form.projectId,
            step: form.stepKey,
            eventType: `${form.type}.photo_added`,
            summary: `Foto ${photo.fileName} ditambahkan.`,
            metadata: { fileName: photo.fileName, photoId: photo.id },
          }),
        });
      },

      removeFormPhoto: (formId, photoId) => {
        const state = get();
        const form = state.forms.find((item) => item.id === formId);
        if (!form) return;
        const photo = form.photos?.find((item) => item.id === photoId);
        set({
          forms: state.forms.map((item) =>
            item.id === formId
              ? {
                  ...item,
                  photos: (item.photos ?? []).filter((photo) => photo.id !== photoId),
                  updatedAt: now(),
                  updatedById: state.currentUserId,
                }
              : item,
          ),
          projectEvents: projectEvent(state, {
            projectId: form.projectId,
            step: form.stepKey,
            eventType: `${form.type}.photo_removed`,
            summary: `Foto ${photo?.fileName ?? photoId} dihapus.`,
            metadata: { fileName: photo?.fileName ?? photoId, photoId },
          }),
        });
      },

      applyInvoiceImport: (formId, payload, fileName) => {
        const state = get();
        const form = state.forms.find((item) => item.id === formId);
        if (!form || form.type !== "invoice") return;
        const updatedAt = now();
        const keepReview = form.status === "need_revision";
        const nextForm: StepForm = {
          ...form,
          payload,
          status: "draft",
          submittedAt: keepReview ? form.submittedAt : undefined,
          reviewedAt: keepReview ? form.reviewedAt : undefined,
          reviewedById: keepReview ? form.reviewedById : undefined,
          reviewComment: keepReview ? form.reviewComment : undefined,
          reviewTarget: keepReview ? form.reviewTarget : undefined,
          updatedAt,
          updatedById: state.currentUserId,
        };
        set({
          forms: state.forms.map((item) =>
            item.id === formId ? nextForm : item,
          ),
          projectEvents: projectEvent(state, {
            projectId: form.projectId,
            step: "invoice",
            eventType: "invoice.import_applied",
            summary: `Import Excel diterapkan${fileName ? ` dari ${fileName}` : ""}.`,
            metadata: {
              before: formSnapshot(form),
              after: formSnapshot(nextForm),
              fileName: fileName ?? null,
            },
          }),
        });
      },

      createTask: (projectId, input) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const project = state.projects.find((item) => item.id === projectId);
        if (!actor || !project || project.status !== "active") return "";
        if (!canCreateTask(state, actor, project)) return "";
        const step =
          (input.stepKey
            ? state.steps.find(
                (item) =>
                  item.projectId === projectId && item.key === input.stepKey,
              )
            : activeSteps(state, projectId).find(
                (item) => item.kind === "simpro",
              )) ?? undefined;
        if (!step || step.kind !== "simpro" || step.status === "completed") {
          return "";
        }
        const taskId = uid("task");
        const task: Task = {
          id: taskId,
          code: taskCode(project, state.tasks),
          projectId,
          stepKey: step.key,
          stageId: step.id,
          title: input.title,
          description: input.description,
          priority: input.priority,
          status: "backlog",
          reporterId: state.currentUserId,
          dueDate: input.dueDate,
          createdAt: now(),
          checklist: [],
          comments: [],
          attachments: [],
        };
        set({
          tasks: [...state.tasks, task],
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId,
              taskId,
              actorId: state.currentUserId,
              action: "task_created",
              message: `Task ${task.code} dibuat.`,
            }),
          ],
          projectEvents: projectEvent(state, {
            projectId,
            step: step.key,
            eventType: "task.created",
            summary: `Task ${task.code} dibuat pada tahap ${step.name}.`,
            metadata: {
              taskId,
              stageId: step.id,
              after: {
                title: task.title,
                priority: task.priority,
                status: task.status,
              },
            },
          }),
        });
        return taskId;
      },

      assignTask: (taskId, userId) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === taskId);
        const actor = userById(state, state.currentUserId);
        if (!task || !actor || !canAssignTask(actor)) return;
        const project = state.projects.find((item) => item.id === task.projectId);
        if (!project || project.status !== "active") return;
        if (task.status !== "backlog") return;
        const user = userById(state, userId);
        if (!user) return;
        set({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? { ...item, assigneeId: userId, status: "todo" }
              : item,
          ),
          notifications: user
            ? [
                ...state.notifications,
                notify(state, {
                  userId,
                  type: "task_assigned",
                  title: "Task baru di-assign",
                  body: task.title,
                  href: `/my-tasks`,
                }),
              ]
            : state.notifications,
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId: task.projectId,
              taskId,
              actorId: state.currentUserId,
              action: "task_assigned",
              message: `Task di-assign ke ${user?.name ?? "user"}.`,
            }),
          ],
          projectEvents: projectEvent(state, {
            projectId: task.projectId,
            step: task.stepKey,
            eventType: "task.assigned",
            summary: `Task ${task.code} di-assign ke ${user?.name ?? "user"}.`,
            metadata: {
              taskId,
              before: { assigneeId: task.assigneeId ?? null, status: task.status },
              after: { assigneeId: userId, status: "todo" },
            },
          }),
        });
      },

      transitionTask: (taskId, to, workingLink) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === taskId);
        const actor = userById(state, state.currentUserId);
        if (!task || !actor) return;
        const guard = taskTransition(state, actor, task, to, workingLink);
        if (!guard.ok) return;
        const link =
          to === "in_progress"
            ? validateWorkingLink(workingLink ?? task.workingLink?.url)
            : undefined;
        const nextWorkingLink =
          link?.ok && link.url
            ? {
                url: link.url,
                setById: actor.id,
                setAt: now(),
              }
            : task.workingLink;
        set({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  status: to,
                  workingLink: nextWorkingLink,
                  workingLinkHistory:
                    nextWorkingLink && link?.ok && link.url
                      ? item.workingLink
                        ? [...(item.workingLinkHistory ?? []), item.workingLink]
                        : item.workingLinkHistory
                      : item.workingLinkHistory,
                }
              : item,
          ),
          notifications:
            to === "awaiting_approval"
              ? [
                  ...state.notifications,
                  notify(state, {
                    userId:
                      state.projects.find((item) => item.id === task.projectId)
                        ?.createdById ?? task.reporterId,
                    type: "task_submitted",
                    title: "Task menunggu review",
                    body: task.title,
                    href: `/projects/${task.projectId}/board`,
                  }),
                ]
              : to === "need_revision" && task.assigneeId
                ? [
                    ...state.notifications,
                    notify(state, {
                      userId: task.assigneeId,
                      type: "task_revision",
                      title: "Task perlu revisi",
                      body: task.title,
                      href: `/my-tasks`,
                    }),
                  ]
                : state.notifications,
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId: task.projectId,
              taskId,
              actorId: state.currentUserId,
              action: "task_status",
              message: `Status task menjadi ${TASK_STATUS_LABEL[to]}.`,
            }),
          ],
          projectEvents: projectEvent(state, {
            projectId: task.projectId,
            step: task.stepKey,
            eventType:
              to === "completed" ? "task.completed" : "task.status_changed",
            summary: `Task ${task.code} menjadi ${TASK_STATUS_LABEL[to]}.`,
            metadata: {
              taskId,
              before: { status: task.status },
              after: { status: to },
              workingLink: nextWorkingLink?.url ?? null,
            },
          }),
        });
      },

      setWorkingLink: (taskId, url) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === taskId);
        const actor = userById(state, state.currentUserId);
        if (!task || !actor) return false;
        if (task.assigneeId !== actor.id && actor.role !== "admin") return false;
        const validation = validateWorkingLink(url);
        if (!validation.ok || !validation.url) return false;
        const nextLink = {
          url: validation.url,
          setById: actor.id,
          setAt: now(),
        };
        set({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  workingLink: nextLink,
                  workingLinkHistory: item.workingLink
                    ? [...(item.workingLinkHistory ?? []), item.workingLink]
                    : item.workingLinkHistory,
                }
              : item,
          ),
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId: task.projectId,
              taskId,
              actorId: actor.id,
              action: "task_working_link",
              message: "Link kerja diperbarui.",
            }),
          ],
          projectEvents: projectEvent(state, {
            projectId: task.projectId,
            step: task.stepKey,
            eventType: "task.working_link_set",
            summary: `Link kerja task ${task.code} diperbarui.`,
            metadata: {
              taskId,
              before: task.workingLink?.url ?? null,
              after: validation.url,
            },
          }),
        });
        return true;
      },

      deleteTask: (taskId, reason) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === taskId);
        if (!task) return;
        set({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? { ...item, archivedAt: now(), archiveReason: reason }
              : item,
          ),
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId: task.projectId,
              taskId,
              actorId: state.currentUserId,
              action: "task_deleted",
              message: `Task dihapus: ${reason}`,
            }),
          ],
          projectEvents: projectEvent(state, {
            projectId: task.projectId,
            step: task.stepKey,
            eventType: "task.deleted",
            summary: `Task ${task.code} dihapus: ${reason}`,
            metadata: {
              taskId,
              before: { status: task.status, title: task.title },
              after: { archived: true, reason },
            },
          }),
        });
      },

      addComment: (taskId, body) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === taskId);
        if (!task) return;
        set({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  comments: [
                    ...item.comments,
                    {
                      id: uid("comment"),
                      authorId: state.currentUserId,
                      body,
                      createdAt: now(),
                    },
                  ],
                }
              : item,
          ),
          projectEvents: projectEvent(state, {
            projectId: task.projectId,
            step: task.stepKey,
            eventType: "task.commented",
            summary: `Komentar baru pada ${task.code}.`,
            metadata: { taskId, comment: body.slice(0, 500) },
          }),
        });
      },

      addChecklistItem: (taskId, text) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === taskId);
        if (!task) return;
        set({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  checklist: [
                    ...item.checklist,
                    { id: uid("check"), text, done: false },
                  ],
                }
              : item,
          ),
          projectEvents: projectEvent(state, {
            projectId: task.projectId,
            step: task.stepKey,
            eventType: "task.checklist_updated",
            summary: `Checklist ${task.code} ditambah: ${text}.`,
            metadata: { taskId, after: { item: text, done: false } },
          }),
        });
      },

      toggleChecklistItem: (taskId, itemId) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === taskId);
        if (!task) return;
        const item = task.checklist.find((check) => check.id === itemId);
        set({
          tasks: state.tasks.map((row) =>
            row.id === taskId
              ? {
                  ...row,
                  checklist: row.checklist.map((check) =>
                    check.id === itemId
                      ? { ...check, done: !check.done }
                      : check,
                  ),
                }
              : row,
          ),
          projectEvents: projectEvent(state, {
            projectId: task.projectId,
            step: task.stepKey,
            eventType: "task.checklist_updated",
            summary: `Checklist ${task.code} diperbarui.`,
            metadata: {
              taskId,
              before: { item: item?.text ?? itemId, done: item?.done ?? false },
              after: { item: item?.text ?? itemId, done: !(item?.done ?? false) },
            },
          }),
        });
      },

      addAttachment: (taskId, attachment) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === taskId);
        if (!task) return;
        set({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? { ...item, attachments: [...item.attachments, attachment] }
              : item,
          ),
          projectEvents: projectEvent(state, {
            projectId: task.projectId,
            step: task.stepKey,
            eventType: "task.attachment_added",
            summary: `Lampiran ${attachment.fileName} ditambahkan ke ${task.code}.`,
            metadata: { taskId, fileName: attachment.fileName, attachmentId: attachment.id },
          }),
        });
      },

      removeAttachment: (taskId, attachmentId) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === taskId);
        if (!task) return;
        const attachment = task.attachments.find((item) => item.id === attachmentId);
        set({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  attachments: item.attachments.filter(
                    (item) => item.id !== attachmentId,
                  ),
                }
              : item,
          ),
          projectEvents: projectEvent(state, {
            projectId: task.projectId,
            step: task.stepKey,
            eventType: "task.attachment_removed",
            summary: `Lampiran ${attachment?.fileName ?? attachmentId} dihapus dari ${task.code}.`,
            metadata: { taskId, fileName: attachment?.fileName ?? attachmentId, attachmentId },
          }),
        });
      },

      completeStep: (projectId, stepKey) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const project = state.projects.find((item) => item.id === projectId);
        if (!actor || !project || !canManageProject(actor, project)) return;
        if (project.status !== "active") return;
        const current = state.steps.find(
          (step) => step.projectId === projectId && step.key === stepKey,
        );
        if (!current || current.status !== "active") return;
        // Gates must go through decideGate so the decision is recorded.
        if (current.kind === "gate") return;
        const gate = evaluateGate(state, projectId, stepKey);
        if (!gate.ready) return;

        const completedAt = now();
        const completedSteps = state.steps.map((step) =>
          step.projectId === projectId && step.key === stepKey
            ? { ...step, status: "completed" as const, completedAt }
            : step,
        );

        const stillActive = completedSteps.some(
          (step) =>
            step.projectId === projectId &&
            step.phase === current.phase &&
            step.status === "active",
        );
        let activatedKeys: string[] = [];
        let autoStartClosing = false;
        if (!stillActive) {
          let nextPending = completedSteps
            .filter(
              (step) =>
                step.projectId === projectId &&
                step.phase === current.phase &&
                step.status === "pending" &&
                step.order > current.order,
            )
            .sort((a, b) => a.order - b.order);
          if (nextPending.length === 0 && current.phase === "running") {
            nextPending = completedSteps
              .filter(
                (step) =>
                  step.projectId === projectId &&
                  step.phase === "closing" &&
                  step.status === "pending",
              )
              .sort((a, b) => a.order - b.order);
            autoStartClosing = nextPending.length > 0;
          }
          if (nextPending[0]) {
            const group = nextPending[0].parallelGroup;
            activatedKeys = nextPending
              .filter(
                (step) =>
                  step.order === nextPending[0].order ||
                  Boolean(group && step.parallelGroup === group),
              )
              .map((step) => step.key);
          }
        }

        const steps = completedSteps.map((step) =>
          step.projectId === projectId && activatedKeys.includes(step.key)
            ? {
                ...step,
                status: "active" as const,
                startedAt: step.startedAt ?? completedAt,
              }
            : step,
        );

        let events = projectEvent(state, {
          projectId,
          step: stepKey,
          eventType: "project.step_changed",
          summary: `Tahap ${current.name} selesai.`,
          metadata: {
            before: { status: "active" },
            after: { status: "completed" },
            startedAt: current.startedAt ?? null,
            completedAt,
          },
        });
        for (const key of activatedKeys) {
          const activated = steps.find(
            (step) => step.projectId === projectId && step.key === key,
          );
          events = recordProjectEvent(events, {
            projectId,
            step: key,
            eventType: "project.step_changed",
            actorId: state.currentUserId,
            summary: `Tahap ${activated?.name ?? key} aktif.`,
            metadata: {
              before: { status: "pending" },
              after: { status: "active" },
              startedAt: completedAt,
            },
          });
        }

        set({
          steps,
          projects: autoStartClosing
            ? state.projects.map((item) =>
                item.id === projectId
                  ? {
                      ...item,
                      phaseStates: {
                        ...item.phaseStates,
                        closing: {
                          ...item.phaseStates?.closing,
                          authoredAt:
                            item.phaseStates?.closing?.authoredAt ?? completedAt,
                          startedAt:
                            item.phaseStates?.closing?.startedAt ?? completedAt,
                          lockedAt:
                            item.phaseStates?.closing?.lockedAt ?? completedAt,
                        },
                      },
                    }
                  : item,
              )
            : state.projects,
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId,
              actorId: state.currentUserId,
              action: "step_completed",
              message: `Tahap ${current.name} selesai.`,
            }),
          ],
          projectEvents: events,
          notifications: [
            ...state.notifications,
            notify(state, {
              userId: project.createdById,
              type: "step_completed",
              title: `Tahap ${current.name} selesai`,
              body: project.name,
              href: `/crm/projects/${projectId}`,
            }),
          ],
        });
      },

      confirmNoWork: (projectId, stepKey, note) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const project = state.projects.find((item) => item.id === projectId);
        if (!actor || !project || project.status !== "active") return;
        if (!canManageProject(actor, project)) return;
        const step = state.steps.find(
          (item) => item.projectId === projectId && item.key === stepKey,
        );
        if (!step || (step.kind !== "form" && step.kind !== "simpro")) return;
        const confirmedAt = now();
        set({
          steps: state.steps.map((item) =>
            item.projectId === projectId && item.key === stepKey
              ? {
                  ...item,
                  noWorkConfirmedAt: confirmedAt,
                  noWorkConfirmedById: actor.id,
                }
              : item,
          ),
          projectEvents: projectEvent(state, {
            projectId,
            step: stepKey,
            eventType: "step.no_work_confirmed",
            summary: `Konfirmasi tidak ada pekerjaan pada tahap ${step.name}.`,
            metadata: { note: note?.trim() || null, confirmedAt },
          }),
        });
      },

      createFormEntry: (projectId, stepKey, input) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const project = state.projects.find((item) => item.id === projectId);
        if (!actor || !project) return "";
        if (!canCreateFormEntry(state, actor, project, stepKey)) return "";
        const step = state.steps.find(
          (item) => item.projectId === projectId && item.key === stepKey,
        );
        if (!step || !input.title.trim()) return "";
        const entry: FormEntry = {
          id: uid("fentry"),
          projectId,
          stepKey,
          templateStageId: step.id,
          entryType: input.entryType,
          title: input.title.trim(),
          dueDate: input.dueDate,
          status: "unassigned",
          payload: { values: {}, photos: [] },
          versions: [],
          createdById: actor.id,
          createdAt: now(),
        };
        set({
          formEntries: [...state.formEntries, entry],
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId,
              actorId: actor.id,
              action: "form_entry_created",
              message: `Entri form ${entry.title} dibuat.`,
            }),
          ],
          projectEvents: projectEvent(state, {
            projectId,
            step: stepKey,
            eventType: "form_entry.created",
            summary: `Entri form ${entry.title} dibuat pada tahap ${step.name}.`,
            metadata: { entryId: entry.id, title: entry.title },
          }),
        });
        return entry.id;
      },

      assignFormEntry: (entryId, userId) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const entry = state.formEntries.find((item) => item.id === entryId);
        if (!actor || !entry || !canAssignFormEntry(actor)) return;
        const assignee = userById(state, userId);
        if (!assignee) return;
        set({
          formEntries: state.formEntries.map((item) =>
            item.id === entryId
              ? {
                  ...item,
                  assigneeId: userId,
                  status: "assigned" as const,
                  updatedAt: now(),
                  updatedById: actor.id,
                }
              : item,
          ),
          notifications: [
            ...state.notifications,
            notify(state, {
              userId,
              type: "form_entry_assigned",
              title: "Form baru di-assign",
              body: entry.title,
              href: `/forms?entry=${entry.id}`,
            }),
          ],
          projectEvents: projectEvent(state, {
            projectId: entry.projectId,
            step: entry.stepKey,
            eventType: "form_entry.assigned",
            summary: `Entri form ${entry.title} di-assign ke ${assignee.name}.`,
            metadata: {
              entryId,
              before: { assigneeId: entry.assigneeId ?? null, status: entry.status },
              after: { assigneeId: userId, status: "assigned" },
            },
          }),
        });
      },

      saveFormEntry: (entryId, payload) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const entry = state.formEntries.find((item) => item.id === entryId);
        if (!actor || !entry || !canEditFormEntry(state, actor, entry)) return;
        set({
          formEntries: state.formEntries.map((item) =>
            item.id === entryId
              ? {
                  ...item,
                  payload,
                  status: "draft" as const,
                  updatedAt: now(),
                  updatedById: actor.id,
                }
              : item,
          ),
          projectEvents: projectEvent(state, {
            projectId: entry.projectId,
            step: entry.stepKey,
            eventType: "form_entry.updated",
            summary: `Entri form ${entry.title} disimpan sebagai draft.`,
            metadata: { entryId },
          }),
        });
      },

      submitFormEntry: (entryId) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const entry = state.formEntries.find((item) => item.id === entryId);
        if (!actor || !entry || !canEditFormEntry(state, actor, entry)) return;
        const submittedAt = now();
        const versionNumber = entry.versions.length + 1;
        set({
          formEntries: state.formEntries.map((item) =>
            item.id === entryId
              ? {
                  ...item,
                  status: "submitted" as const,
                  submittedAt,
                  versions: [
                    ...item.versions,
                    {
                      id: uid("fversion"),
                      entryId,
                      versionNumber,
                      status: "submitted" as const,
                      payload: item.payload,
                      createdAt: submittedAt,
                      createdById: actor.id,
                    },
                  ],
                  updatedAt: submittedAt,
                  updatedById: actor.id,
                }
              : item,
          ),
          notifications: [
            ...state.notifications,
            notify(state, {
              userId:
                state.projects.find((item) => item.id === entry.projectId)
                  ?.createdById ?? actor.id,
              type: "form_entry_submitted",
              title: "Entri form menunggu review",
              body: entry.title,
              href: `/crm/projects/${entry.projectId}?step=${entry.stepKey}`,
            }),
          ],
          projectEvents: projectEvent(state, {
            projectId: entry.projectId,
            step: entry.stepKey,
            eventType: "form_entry.submitted",
            summary: `Entri form ${entry.title} disubmit (v${versionNumber}).`,
            metadata: { entryId, versionNumber },
          }),
        });
      },

      reviewFormEntry: (entryId, decision, comment) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const entry = state.formEntries.find((item) => item.id === entryId);
        if (!actor || !entry || !canReviewFormEntry(state, actor, entry)) return;
        if (decision === "need_revision" && !comment.trim()) return;
        const reviewedAt = now();
        set({
          formEntries: state.formEntries.map((item) =>
            item.id === entryId
              ? {
                  ...item,
                  status: decision,
                  reviewedAt,
                  reviewedById: actor.id,
                  reviewComment: comment.trim(),
                  updatedAt: reviewedAt,
                  updatedById: actor.id,
                }
              : item,
          ),
          notifications: entry.assigneeId
            ? [
                ...state.notifications,
                notify(state, {
                  userId: entry.assigneeId,
                  type:
                    decision === "approved"
                      ? "form_entry_approved"
                      : "form_entry_revision",
                  title:
                    decision === "approved"
                      ? "Entri form disetujui"
                      : "Entri form perlu revisi",
                  body: comment || entry.title,
                  href: `/forms?entry=${entry.id}`,
                }),
              ]
            : state.notifications,
          projectEvents: projectEvent(state, {
            projectId: entry.projectId,
            step: entry.stepKey,
            eventType:
              decision === "approved"
                ? "form_entry.approved"
                : "form_entry.need_revision",
            summary:
              decision === "approved"
                ? `Entri form ${entry.title} disetujui.`
                : `Entri form ${entry.title} perlu revisi.`,
            metadata: { entryId, reviewComment: comment.trim() },
          }),
        });
      },

      cancelFormEntry: (entryId, reason) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const entry = state.formEntries.find((item) => item.id === entryId);
        if (!actor || !entry || !reason.trim()) return;
        if (!canCancelFormEntry(state, actor, entry)) return;
        const cancelledAt = now();
        set({
          formEntries: state.formEntries.map((item) =>
            item.id === entryId
              ? {
                  ...item,
                  status: "cancelled" as const,
                  cancelledAt,
                  cancelReason: reason.trim(),
                  updatedAt: cancelledAt,
                  updatedById: actor.id,
                }
              : item,
          ),
          projectEvents: projectEvent(state, {
            projectId: entry.projectId,
            step: entry.stepKey,
            eventType: "form_entry.cancelled",
            summary: `Entri form ${entry.title} dibatalkan: ${reason.trim()}`,
            metadata: { entryId, reason: reason.trim() },
          }),
        });
      },

      createTasksFromTemplate: (projectId, stepKey, taskIds) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const project = state.projects.find((item) => item.id === projectId);
        if (!actor || !project || !canManageProject(actor, project)) return 0;
        const step = state.steps.find(
          (item) => item.projectId === projectId && item.key === stepKey,
        );
        if (!step || step.kind !== "simpro" || step.status === "completed") {
          return 0;
        }
        const nextTasks = [...state.tasks];
        let created = 0;
        for (const templateTask of step.tasks) {
          if (!taskIds.includes(templateTask.id)) continue;
          const exists = nextTasks.some(
            (task) =>
              task.projectId === projectId &&
              task.stageId === step.id &&
              task.title === templateTask.name &&
              !task.archivedAt,
          );
          if (exists) continue;
          nextTasks.push({
            id: uid("task"),
            code: taskCode(project, nextTasks),
            projectId,
            stepKey: step.key,
            stageId: step.id,
            title: templateTask.name,
            description: templateTask.deliverable ?? "",
            priority: "medium",
            status: "backlog",
            reporterId: actor.id,
            createdAt: now(),
            checklist: [],
            comments: [],
            attachments: [],
          });
          created += 1;
        }
        if (created === 0) return 0;
        set({
          tasks: nextTasks,
          projectEvents: projectEvent(state, {
            projectId,
            step: step.key,
            eventType: "task.created_from_template",
            summary: `${created} task dibuat dari template tahap ${step.name}.`,
            metadata: { stageId: step.id, count: created },
          }),
        });
        return created;
      },

      createMediaOrder: (projectId, input) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const project = state.projects.find((item) => item.id === projectId);
        if (!actor || !project || !canManageMediaOrders(state, actor, project)) {
          return "";
        }
        if (!input.title.trim()) return "";
        const orderId = uid("mo");
        const sequence =
          state.mediaOrders.filter((item) => item.projectId === projectId).length +
          1;
        const order: MediaOrder = {
          id: orderId,
          projectId,
          number: `MO-${project.code}-${sequence}`,
          title: input.title.trim(),
          status: "draft",
          items: [],
          notes: input.notes?.trim() ?? "",
          createdById: actor.id,
          createdAt: now(),
        };
        set({
          mediaOrders: [...state.mediaOrders, order],
          projectEvents: projectEvent(state, {
            projectId,
            step: null,
            eventType: "media_order.created",
            summary: `Media Order ${order.number} dibuat.`,
            metadata: {
              orderId,
              after: mediaOrderSnapshot(order),
            },
          }),
        });
        return orderId;
      },

      updateMediaOrder: (orderId, input) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const order = state.mediaOrders.find((item) => item.id === orderId);
        if (!actor || !order) return;
        const project = state.projects.find((item) => item.id === order.projectId);
        if (!project || !canManageMediaOrders(state, actor, project)) return;
        const next: MediaOrder = {
          ...order,
          ...input,
          updatedAt: now(),
          updatedById: actor.id,
        };
        set({
          mediaOrders: state.mediaOrders.map((item) =>
            item.id === orderId ? next : item,
          ),
          projectEvents: projectEvent(state, {
            projectId: order.projectId,
            step: null,
            eventType: "media_order.updated",
            summary: `Media Order ${order.number} diperbarui.`,
            metadata: {
              orderId,
              before: mediaOrderSnapshot(order),
              after: mediaOrderSnapshot(next),
            },
          }),
        });
      },

      deleteMediaOrder: (orderId) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const order = state.mediaOrders.find((item) => item.id === orderId);
        if (!actor || !order) return;
        const project = state.projects.find((item) => item.id === order.projectId);
        if (!project || !canManageMediaOrders(state, actor, project)) return;
        set({
          mediaOrders: state.mediaOrders.filter((item) => item.id !== orderId),
          projectEvents: projectEvent(state, {
            projectId: order.projectId,
            step: null,
            eventType: "media_order.deleted",
            summary: `Media Order ${order.number} dihapus.`,
            metadata: {
              orderId,
              before: mediaOrderSnapshot(order),
              itemCount: order.items.length,
            },
          }),
        });
      },

      addMediaOrderItem: (orderId, item) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const order = state.mediaOrders.find((entry) => entry.id === orderId);
        if (!actor || !order) return;
        const project = state.projects.find((entry) => entry.id === order.projectId);
        if (!project || !canManageMediaOrders(state, actor, project)) return;
        const nextItem: MediaOrderItem = { ...item, id: uid("moitem") };
        const next: MediaOrder = {
          ...order,
          items: [...order.items, nextItem],
          updatedAt: now(),
          updatedById: actor.id,
        };
        set({
          mediaOrders: state.mediaOrders.map((entry) =>
            entry.id === orderId ? next : entry,
          ),
          projectEvents: projectEvent(state, {
            projectId: order.projectId,
            step: null,
            eventType: "media_order.item_changed",
            summary: `Item Media Order ${order.number} ditambahkan.`,
            metadata: {
              orderId,
              itemId: nextItem.id,
              before: null,
              after: mediaOrderItemSnapshot(nextItem),
            },
          }),
        });
      },

      updateMediaOrderItem: (orderId, itemId, patch) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const order = state.mediaOrders.find((entry) => entry.id === orderId);
        if (!actor || !order) return;
        const project = state.projects.find((entry) => entry.id === order.projectId);
        if (!project || !canManageMediaOrders(state, actor, project)) return;
        const current = order.items.find((entry) => entry.id === itemId);
        if (!current) return;
        const updatedItem: MediaOrderItem = { ...current, ...patch, id: itemId };
        const next: MediaOrder = {
          ...order,
          items: order.items.map((entry) =>
            entry.id === itemId ? updatedItem : entry,
          ),
          updatedAt: now(),
          updatedById: actor.id,
        };
        set({
          mediaOrders: state.mediaOrders.map((entry) =>
            entry.id === orderId ? next : entry,
          ),
          projectEvents: projectEvent(state, {
            projectId: order.projectId,
            step: null,
            eventType: "media_order.item_changed",
            summary: `Item Media Order ${order.number} diperbarui.`,
            metadata: {
              orderId,
              itemId,
              before: mediaOrderItemSnapshot(current),
              after: mediaOrderItemSnapshot(updatedItem),
            },
          }),
        });
      },

      removeMediaOrderItem: (orderId, itemId) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const order = state.mediaOrders.find((entry) => entry.id === orderId);
        if (!actor || !order) return;
        const project = state.projects.find((entry) => entry.id === order.projectId);
        if (!project || !canManageMediaOrders(state, actor, project)) return;
        const removed = order.items.find((entry) => entry.id === itemId);
        if (!removed) return;
        const next: MediaOrder = {
          ...order,
          items: order.items.filter((entry) => entry.id !== itemId),
          updatedAt: now(),
          updatedById: actor.id,
        };
        set({
          mediaOrders: state.mediaOrders.map((entry) =>
            entry.id === orderId ? next : entry,
          ),
          projectEvents: projectEvent(state, {
            projectId: order.projectId,
            step: null,
            eventType: "media_order.item_changed",
            summary: `Item "${removed.description}" dihapus dari Media Order ${order.number}.`,
            metadata: {
              orderId,
              itemId,
              before: mediaOrderItemSnapshot(removed),
              after: null,
            },
          }),
        });
      },

      decideGate: (projectId, stepKey, decision, reason) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const project = state.projects.find((item) => item.id === projectId);
        if (!actor || !project || project.status !== "active") return;
        const current = state.steps.find(
          (step) => step.projectId === projectId && step.key === stepKey,
        );
        if (!current || current.kind !== "gate" || current.status !== "active") {
          return;
        }
        if (!canManageProject(actor, project)) return;
        const trimmed = reason?.trim();
        if (decision === "rejected" && !trimmed) return;
        if (decision === "approved") {
          const gate = evaluateGate(state, projectId, stepKey);
          if (!gate.ready) return;
        }

        const decidedAt = now();
        const gateDecision = {
          decision,
          reason: trimmed,
          actorId: actor.id,
          decidedAt,
        };
        const isWin =
          current.gateKind === "client_approval" && decision === "approved";
        const nextProjects = state.projects.map((item) => {
          if (item.id !== projectId) return item;
          if (isWin) {
            return {
              ...item,
              lifecycle: "won" as const,
              rabBaselineLockedAt: item.rabBaselineLockedAt ?? decidedAt,
              phaseStates: {
                ...item.phaseStates,
                planning: {
                  ...item.phaseStates?.planning,
                  sourceTemplateVersion:
                    item.phaseStates?.planning?.sourceTemplateVersion ??
                    item.templateVersion,
                },
                running: {
                  ...item.phaseStates?.running,
                  sourceTemplateVersion:
                    item.phaseStates?.running?.sourceTemplateVersion ??
                    item.templateVersion,
                },
              },
            };
          }
          if (decision === "rejected") {
            return {
              ...item,
              status: "cancelled" as const,
              lifecycle: "lost" as const,
              lostReason: trimmed,
            };
          }
          return item;
        });

        const completedSteps = state.steps.map((step) =>
          step.projectId === projectId && step.key === stepKey
            ? {
                ...step,
                status: "completed" as const,
                completedAt: decidedAt,
                gateDecision,
              }
            : step,
        );

        let steps = completedSteps;
        let activatedKeys: string[] = [];
        if (decision === "approved" && !isWin) {
          const nextPending = completedSteps
            .filter(
              (step) =>
                step.projectId === projectId &&
                step.phase === current.phase &&
                step.status === "pending" &&
                step.order > current.order,
            )
            .sort((a, b) => a.order - b.order);
          if (nextPending[0]) {
            const group = nextPending[0].parallelGroup;
            activatedKeys = nextPending
              .filter(
                (step) =>
                  step.order === nextPending[0].order ||
                  Boolean(group && step.parallelGroup === group),
              )
              .map((step) => step.key);
          }
          steps = completedSteps.map((step) =>
            step.projectId === projectId && activatedKeys.includes(step.key)
              ? {
                  ...step,
                  status: "active" as const,
                  startedAt: step.startedAt ?? decidedAt,
                }
              : step,
          );
        }

        let events = projectEvent(state, {
          projectId,
          step: stepKey,
          eventType: decision === "approved" ? "gate.approved" : "gate.rejected",
          summary:
            decision === "approved"
              ? `Gerbang ${current.name} disetujui.`
              : `Gerbang ${current.name} ditolak: ${trimmed}`,
          metadata: {
            gateKind: current.gateKind ?? null,
            reason: trimmed ?? null,
            before: { status: "active" },
            after: { status: "completed", decision },
          },
        });
        events = recordProjectEvent(events, {
          projectId,
          step: null,
          eventType: "project.lifecycle_changed",
          actorId: actor.id,
          summary: isWin
            ? "Proyek menang; RAB menjadi baseline dan masuk Planning."
            : decision === "rejected"
              ? `Proyek kalah: ${trimmed}`
              : "Keputusan gerbang dicatat.",
          metadata: {
            before: {
              status: project.status,
              lifecycle: project.lifecycle ?? "active",
            },
            after: {
              status: nextProjects.find((item) => item.id === projectId)?.status,
              lifecycle: nextProjects.find((item) => item.id === projectId)
                ?.lifecycle,
            },
          },
        });

        set({
          projects: nextProjects,
          steps,
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId,
              actorId: actor.id,
              action: decision === "approved" ? "gate_approved" : "gate_rejected",
              message:
                decision === "approved"
                  ? `Gerbang ${current.name} disetujui.`
                  : `Gerbang ${current.name} ditolak.`,
            }),
          ],
          projectEvents: events,
          notifications: [
            ...state.notifications,
            notify(state, {
              userId: project.createdById,
              type: decision === "approved" ? "gate_approved" : "gate_rejected",
              title:
                decision === "approved"
                  ? `Gerbang ${current.name} disetujui`
                  : `Gerbang ${current.name} ditolak`,
              body: project.name,
              href: `/crm/projects/${projectId}`,
            }),
          ],
        });
      },

      completeProject: (projectId) => {
        const state = get();
        const actor = userById(state, state.currentUserId);
        const project = state.projects.find((item) => item.id === projectId);
        if (!project || !actor || project.status !== "active") return;
        if (!canManageProject(actor, project)) return;
        const projectSteps = state.steps.filter(
          (step) => step.projectId === projectId,
        );
        const allDone = projectSteps.every(
          (step) => step.status === "completed" || step.status === "skipped",
        );
        const nonClosingDone = projectSteps
          .filter((step) => step.phase !== "closing")
          .every((step) => step.status === "completed" || step.status === "skipped");
        const bast = state.forms.find(
          (form) => form.projectId === projectId && form.stepKey === "bast",
        );
        const invoice = state.forms.find(
          (form) => form.projectId === projectId && form.stepKey === "invoice",
        );
        const bastReady =
          bast?.status === "submitted" || bast?.status === "approved";
        const invoiceReady =
          invoice?.status === "submitted" || invoice?.status === "approved";
        const hasFinanceStages =
          projectSteps.some((step) => step.key === "bast") &&
          projectSteps.some((step) => step.key === "invoice");
        const legacyReady =
          !allDone &&
          hasFinanceStages &&
          nonClosingDone &&
          bastReady &&
          invoiceReady;
        if (!allDone && !legacyReady) return;

        const completedAt = now();
        const nextSteps = state.steps.map((step) =>
          step.projectId === projectId && step.status === "active"
            ? { ...step, status: "completed" as const, completedAt }
            : step,
        );
        const nextProjects = state.projects.map((item) =>
          item.id === projectId
            ? {
                ...item,
                status: "completed" as const,
                lifecycle: "done" as const,
                actualEndDate: completedAt,
              }
            : item,
        );
        const group = project.groupId
          ? state.groups.find((item) => item.id === project.groupId)
          : undefined;
        const nextGroups = group
          ? state.groups.map((item) =>
              item.id === group.id &&
              groupCompleted(
                { ...state, projects: nextProjects },
                group.id,
              )
                ? { ...item, status: "completed" as const }
                : item,
            )
          : state.groups;
        let events = recordProjectEvent(state.projectEvents, {
          projectId,
          step: null,
          eventType: "project.lifecycle_changed",
          actorId: state.currentUserId,
          summary: `Proyek ${project.name} selesai.`,
          metadata: {
            before: {
              status: project.status,
              lifecycle: project.lifecycle ?? "active",
            },
            after: {
              status: "completed",
              lifecycle: "done",
              actualEndDate: completedAt,
            },
          },
        });
        events = recordProjectEvent(events, {
          projectId,
          step: null,
          eventType: "project.completed",
          actorId: state.currentUserId,
          summary: `Proyek ${project.name} selesai.`,
          metadata: {
            before: { status: project.status },
            after: { status: "completed", actualEndDate: completedAt },
          },
        });
        set({
          projects: nextProjects,
          steps: nextSteps,
          groups: nextGroups,
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId,
              actorId: state.currentUserId,
              action: "project_completed",
              message: `Proyek ${project.name} selesai.`,
            }),
          ],
          projectEvents: events,
          notifications: [
            ...state.notifications,
            notify(state, {
              userId: project.createdById,
              type: "project_completed",
              title: "Proyek selesai",
              body: project.name,
              href: `/crm/projects/${projectId}`,
            }),
          ],
        });
      },

      createGroup: (input) => {
        const state = get();
        const group = {
          id: uid("group"),
          name: input.name,
          description: input.description,
          status: "active" as const,
          createdById: state.currentUserId,
          createdAt: now(),
        };
        set({ groups: [...state.groups, group] });
        return group.id;
      },

      updateGroup: (groupId, input) => {
        const state = get();
        set({
          groups: state.groups.map((group) =>
            group.id === groupId ? { ...group, ...input } : group,
          ),
        });
      },

      addProjectToGroup: (groupId, projectId) => {
        const state = get();
        const project = state.projects.find((item) => item.id === projectId);
        const group = state.groups.find((item) => item.id === groupId);
        if (!project) return;
        set({
          projects: state.projects.map((item) =>
            item.id === projectId ? { ...item, groupId } : item,
          ),
          projectEvents: projectEvent(state, {
            projectId,
            step: null,
            eventType: "project.group_joined",
            groupId,
            summary: `Proyek masuk group ${group?.name ?? groupId}.`,
            metadata: {
              before: { groupId: project.groupId ?? null },
              after: { groupId },
            },
          }),
        });
      },

      removeProjectFromGroup: (projectId) => {
        const state = get();
        const project = state.projects.find((item) => item.id === projectId);
        if (!project) return;
        const group = project.groupId
          ? state.groups.find((item) => item.id === project.groupId)
          : undefined;
        set({
          projects: state.projects.map((item) =>
            item.id === projectId ? { ...item, groupId: undefined } : item,
          ),
          projectEvents: projectEvent(state, {
            projectId,
            step: null,
            eventType: "project.group_left",
            groupId: project.groupId,
            summary: `Proyek keluar dari group ${group?.name ?? project.groupId ?? ""}.`,
            metadata: {
              before: { groupId: project.groupId ?? null },
              after: { groupId: null },
            },
          }),
        });
      },

      disbandGroup: (groupId) => {
        const state = get();
        const group = state.groups.find((item) => item.id === groupId);
        const members = state.projects.filter(
          (project) => project.groupId === groupId,
        );
        let events = state.projectEvents;
        for (const project of members) {
          events = recordProjectEvent(events, {
            projectId: project.id,
            step: null,
            eventType: "project.group_left",
            actorId: state.currentUserId,
            groupId,
            summary: `Group ${group?.name ?? groupId} dibubarkan; proyek keluar dari group.`,
            metadata: {
              before: { groupId },
              after: { groupId: null },
              reason: "disbanded",
            },
          });
        }
        set({
          groups: state.groups.filter((item) => item.id !== groupId),
          projects: state.projects.map((project) =>
            project.groupId === groupId ? { ...project, groupId: undefined } : project,
          ),
          projectEvents: events,
        });
      },

      markNotificationRead: (notificationId) => {
        const state = get();
        set({
          notifications: state.notifications.map((notification) =>
            notification.id === notificationId
              ? { ...notification, readAt: now() }
              : notification,
          ),
        });
      },

      markAllNotificationsRead: () => {
        const state = get();
        set({
          notifications: state.notifications.map((notification) =>
            notification.userId === state.currentUserId && !notification.readAt
              ? { ...notification, readAt: now() }
              : notification,
          ),
        });
      },
    }),
    {
      name: "crm-simpro:v1",
      version: 4,
      migrate: (persisted) =>
        migratePersistedState(persisted) as unknown as PrototypeStore,
      partialize: (state) => ({
        seedVersion: state.seedVersion,
        currentUserId: state.currentUserId,
        users: state.users,
        projects: state.projects,
        steps: state.steps,
        templates: state.templates,
        pitchings: state.pitchings,
        pitchingRoles: state.pitchingRoles,
        tasks: state.tasks,
        forms: state.forms,
        formEntries: state.formEntries,
        mediaOrders: state.mediaOrders,
        groups: state.groups,
        notifications: state.notifications,
        activityLogs: state.activityLogs,
        projectEvents: state.projectEvents,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.seedVersion !== createSeedState().seedVersion) {
          state.reset();
          return;
        }
        const events = state.projectEvents?.length
          ? state.projectEvents
          : backfillProjectEvents({
              ...state,
              projectEvents: state.projectEvents ?? [],
            });
        state.setProjectEvents(linkProjectsToTemplate(events, state.projects));
        state.setForms(migrateFormVersions(state));
        state.setHydrated(true);
      },
    },
  ),
);
