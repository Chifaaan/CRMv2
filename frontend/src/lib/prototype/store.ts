"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { activeSteps, evaluateGate, groupCompleted, userById } from "./domain";
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
  reset: () => void;

  createProject: (input: ProjectInput) => string;
  updateProject: (projectId: string, input: Partial<ProjectInput>) => void;
  cancelProject: (projectId: string, reason: string) => void;

  addPitching: (projectId: string, input: PitchingInput) => void;
  updatePitching: (pitchingId: string, input: PitchingInput) => void;
  decidePitching: (pitchingId: string, decision: "won" | "lost") => void;

  assignForm: (formId: string, userId: string) => void;
  saveForm: (formId: string, payload: StepForm["payload"]) => void;
  submitForm: (formId: string) => void;
  reviewForm: (
    formId: string,
    decision: "approved" | "need_revision",
    comment: string,
  ) => void;
  addFormPhoto: (formId: string, photo: NonNullable<StepForm["photos"]>[number]) => void;
  removeFormPhoto: (formId: string, photoId: string) => void;

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
      payload: { number: "", date: "", notes: "", documentUrl: "" },
    };
  }
  return {
    ...base,
    payload: {
      number: "",
      date: "",
      amount: 0,
      taxPercent: 11,
      taxAmount: 0,
      notes: "",
      documentUrl: "",
    },
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
        });
        return projectId;
      },

      updateProject: (projectId, input) => {
        const state = get();
        set({
          projects: state.projects.map((project) =>
            project.id === projectId ? { ...project, ...input } : project,
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
              ? { ...item, assigneeId: userId, status: "assigned" }
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
        });
      },

      saveForm: (formId, payload) => {
        const state = get();
        const form = state.forms.find((item) => item.id === formId);
        if (!form) return;
        set({
          forms: state.forms.map((item) =>
            item.id === formId
              ? {
                  ...item,
                  payload,
                  status:
                    item.status === "unassigned" || item.status === "assigned"
                      ? "draft"
                      : item.status === "submitted" || item.status === "approved"
                        ? "draft"
                        : item.status,
                  submittedAt: undefined,
                  reviewedAt: undefined,
                  reviewedById: undefined,
                  reviewComment: undefined,
                }
              : item,
          ),
          activityLogs: [
            ...state.activityLogs,
            activity(state, {
              projectId: form.projectId,
              actorId: state.currentUserId,
              action: "form_saved",
              message: `${form.type.toUpperCase()} disimpan sebagai draft.`,
            }),
          ],
        });
      },

      submitForm: (formId) => {
        const state = get();
        const form = state.forms.find((item) => item.id === formId);
        if (!form) return;
        const project = state.projects.find((item) => item.id === form.projectId);
        set({
          forms: state.forms.map((item) =>
            item.id === formId
              ? {
                  ...item,
                  status: "submitted",
                  submittedAt: now(),
                  reviewComment: undefined,
                }
              : item,
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
        });
      },

      reviewForm: (formId, decision, comment) => {
        const state = get();
        const form = state.forms.find((item) => item.id === formId);
        if (!form) return;
        set({
          forms: state.forms.map((item) =>
            item.id === formId
              ? {
                  ...item,
                  status: decision,
                  reviewedAt: now(),
                  reviewedById: state.currentUserId,
                  reviewComment: comment,
                }
              : item,
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
        });
      },

      addFormPhoto: (formId, photo) => {
        const state = get();
        set({
          forms: state.forms.map((item) =>
            item.id === formId
              ? { ...item, photos: [...(item.photos ?? []), photo] }
              : item,
          ),
        });
      },

      removeFormPhoto: (formId, photoId) => {
        const state = get();
        set({
          forms: state.forms.map((item) =>
            item.id === formId
              ? {
                  ...item,
                  photos: (item.photos ?? []).filter((photo) => photo.id !== photoId),
                }
              : item,
          ),
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
        });
      },

      addChecklistItem: (taskId, text) => {
        const state = get();
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
        });
      },

      toggleChecklistItem: (taskId, itemId) => {
        const state = get();
        set({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  checklist: item.checklist.map((check) =>
                    check.id === itemId
                      ? { ...check, done: !check.done }
                      : check,
                  ),
                }
              : item,
          ),
        });
      },

      addAttachment: (taskId, attachment) => {
        const state = get();
        set({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? { ...item, attachments: [...item.attachments, attachment] }
              : item,
          ),
        });
      },

      removeAttachment: (taskId, attachmentId) => {
        const state = get();
        set({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  attachments: item.attachments.filter(
                    (attachment) => attachment.id !== attachmentId,
                  ),
                }
              : item,
          ),
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
        if (
          !nonFinanceDone ||
          bast?.status !== "submitted" ||
          invoice?.status !== "submitted"
        ) {
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
        set({
          projects: state.projects.map((project) =>
            project.id === projectId ? { ...project, groupId } : project,
          ),
        });
      },

      removeProjectFromGroup: (projectId) => {
        const state = get();
        set({
          projects: state.projects.map((project) =>
            project.id === projectId ? { ...project, groupId: undefined } : project,
          ),
        });
      },

      disbandGroup: (groupId) => {
        const state = get();
        set({
          groups: state.groups.filter((group) => group.id !== groupId),
          projects: state.projects.map((project) =>
            project.groupId === groupId ? { ...project, groupId: undefined } : project,
          ),
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
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.seedVersion !== createSeedState().seedVersion) {
          state.reset();
          return;
        }
        state.setHydrated(true);
      },
    },
  ),
);
