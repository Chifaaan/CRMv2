"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { activeSteps, evaluateGate, groupCompleted, userById } from "./domain";
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
  FORM_STEP_KEYS,
  STEP_META,
  type AppState,
  type Attachment,
  type FormStepKey,
  type Pitching,
  type Priority,
  type Project,
  type ProjectEvent,
  type ProjectStep,
  TASK_STATUS_LABEL,
  type StepForm,
  type Task,
  type TaskStatus,
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

  createProject: (input: ProjectInput) => string;
  updateProject: (projectId: string, input: Partial<ProjectInput>) => void;
  cancelProject: (projectId: string, reason: string) => void;

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
    },
  ) => string;
  assignTask: (taskId: string, userId: string) => void;
  transitionTask: (taskId: string, to: TaskStatus) => void;
  deleteTask: (taskId: string, reason: string) => void;
  addComment: (taskId: string, body: string) => void;
  addChecklistItem: (taskId: string, text: string) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  addAttachment: (taskId: string, attachment: Attachment) => void;
  removeAttachment: (taskId: string, attachmentId: string) => void;

  completeStep: (projectId: string, stepKey: StepKey) => void;
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

type StepKey = ProjectStep["key"];

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

function makeSteps(projectId: string): ProjectStep[] {
  return STEP_META.map((meta, index) => ({
    id: `step-${projectId}-${meta.key}-${index}`,
    projectId,
    key: meta.key,
    phase: meta.phase,
    order: meta.order,
    status: meta.key === "pitching" ? ("active" as const) : ("pending" as const),
    startedAt: meta.key === "pitching" ? now() : undefined,
  }));
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
        const projectId = uid("p");
        const project: Project = {
          id: projectId,
          code: makeProjectCode(input.name, state.projects),
          name: input.name,
          client: input.client,
          description: input.description,
          priority: input.priority,
          status: "active",
          startDate: input.startDate,
          targetEndDate: input.targetEndDate,
          coverColor: input.coverColor,
          createdById: state.currentUserId,
          createdAt: now(),
        };
        const forms = FORM_STEP_KEYS.map((key) => defaultForm(projectId, key));
        let events = projectEvent(state, {
          projectId,
          step: null,
          eventType: "project.created",
          summary: `Proyek ${project.name} dibuat.`,
          metadata: {
            before: null,
            after: {
              name: project.name,
              client: project.client,
              priority: project.priority,
              status: project.status,
            },
          },
        });
        events = recordProjectEvent(events, {
          projectId,
          step: "pitching",
          eventType: "project.step_changed",
          actorId: state.currentUserId,
          summary: "Step Pitching aktif.",
          metadata: {
            before: { status: "pending" },
            after: { status: "active" },
          },
        });
        set({
          projects: [...state.projects, project],
          steps: [...state.steps, ...makeSteps(projectId)],
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
              ? { ...item, status: "cancelled", cancelReason: reason }
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
            eventType: "project.cancelled",
            summary: `Proyek dibatalkan: ${reason}`,
            metadata: {
              before: { status: project.status },
              after: { status: "cancelled", reason },
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
        const project = state.projects.find((item) => item.id === projectId);
        const step = activeSteps(state, projectId)[0];
        if (!project || !step) return "";
        const taskId = uid("task");
        const task: Task = {
          id: taskId,
          code: taskCode(project, state.tasks),
          projectId,
          stepKey: step.key,
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
            summary: `Task ${task.code} dibuat.`,
            metadata: {
              taskId,
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
        if (!task) return;
        const user = userById(state, userId);
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

      transitionTask: (taskId, to) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === taskId);
        if (!task) return;
        set({
          tasks: state.tasks.map((item) =>
            item.id === taskId ? { ...item, status: to } : item,
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
            },
          }),
        });
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
        if (!actor || !project) return;
        const canComplete =
          actor.role === "admin" ||
          (actor.role === "pm" && project.createdById === actor.id);
        if (!canComplete) return;
        const gate = evaluateGate(state, projectId, stepKey);
        if (!gate.ready) return;
        const current = state.steps.find(
          (step) => step.projectId === projectId && step.key === stepKey,
        );
        if (!current || current.status !== "active") return;

        const completedSteps = state.steps.map((step) =>
          step.projectId === projectId && step.key === stepKey
            ? { ...step, status: "completed" as const, completedAt: now() }
            : step,
        );

        const nextPending = completedSteps
          .filter(
            (step) =>
              step.projectId === projectId &&
              step.status === "pending" &&
              step.order > current.order,
          )
          .sort((a, b) => a.order - b.order);

        let activatedKeys: StepKey[] = [];
        if (nextPending[0]?.key === "bast") {
          activatedKeys = ["bast", "invoice"];
        } else if (nextPending[0]) {
          activatedKeys = [nextPending[0].key];
        }

        const steps = completedSteps.map((step) =>
          step.projectId === projectId && activatedKeys.includes(step.key)
            ? {
                ...step,
                status: "active" as const,
                startedAt: step.startedAt ?? now(),
              }
            : step,
        );

        const stepLabel =
          STEP_META.find((meta) => meta.key === stepKey)?.label ?? stepKey;
        const completedAt = now();
        let events = projectEvent(state, {
          projectId,
          step: stepKey,
          eventType: "project.step_changed",
          summary: `Step ${stepLabel} selesai.`,
          metadata: {
            before: { status: "active" },
            after: { status: "completed" },
            startedAt: current.startedAt ?? null,
            completedAt,
          },
        });
        for (const key of activatedKeys) {
          const label = STEP_META.find((meta) => meta.key === key)?.label ?? key;
          events = recordProjectEvent(events, {
            projectId,
            step: key,
            eventType: "project.step_changed",
            actorId: state.currentUserId,
            summary: `Step ${label} aktif.`,
            metadata: {
              before: { status: "pending" },
              after: { status: "active" },
              startedAt: completedAt,
            },
          });
        }

        set({
          steps,
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId,
              actorId: state.currentUserId,
              action: "step_completed",
              message: `Step ${stepKey} selesai.`,
            }),
          ],
          projectEvents: events,
          notifications: project
            ? [
                ...state.notifications,
                notify(state, {
                  userId: project.createdById,
                  type: "step_completed",
                  title: `Step ${stepKey} selesai`,
                  body: project.name,
                  href: `/crm/projects/${projectId}`,
                }),
              ]
            : state.notifications,
        });
      },

      completeProject: (projectId) => {
        const state = get();
        const project = state.projects.find((item) => item.id === projectId);
        if (!project || project.status !== "active") return;
        const steps = state.steps.filter((step) => step.projectId === projectId);
        const nonFinanceDone = steps
          .filter((step) => step.phase !== "finance")
          .every((step) => step.status === "completed");
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
        if (!nonFinanceDone || !bastReady || !invoiceReady) {
          return;
        }
        const nextSteps = state.steps.map((step) =>
          step.projectId === projectId &&
          (step.key === "bast" || step.key === "invoice")
            ? { ...step, status: "completed" as const, completedAt: now() }
            : step,
        );
        const nextProjects = state.projects.map((item) =>
          item.id === projectId
            ? { ...item, status: "completed" as const, actualEndDate: now() }
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
        const completedAt = now();
        let events = state.projectEvents;
        for (const key of ["bast", "invoice"] as StepKey[]) {
          events = recordProjectEvent(events, {
            projectId,
            step: key,
            eventType: "project.step_changed",
            actorId: state.currentUserId,
            summary: `Step ${key === "bast" ? "BAST" : "Invoice"} selesai.`,
            metadata: {
              before: { status: "active" },
              after: { status: "completed" },
              completedAt,
            },
          });
        }
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
      version: 1,
      partialize: (state) => ({
        seedVersion: state.seedVersion,
        currentUserId: state.currentUserId,
        users: state.users,
        projects: state.projects,
        steps: state.steps,
        pitchings: state.pitchings,
        pitchingRoles: state.pitchingRoles,
        tasks: state.tasks,
        forms: state.forms,
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
        if (!state.projectEvents?.length) {
          state.setProjectEvents(
            backfillProjectEvents({
              ...state,
              projectEvents: state.projectEvents ?? [],
            }),
          );
        }
        state.setForms(migrateFormVersions(state));
        state.setHydrated(true);
      },
    },
  ),
);
