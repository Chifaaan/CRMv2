import { beforeEach, describe, expect, it } from "vitest";
import {
  activeFormEntriesForAssignee,
  assignmentQueueForUser,
  canAssignOperational,
  canAssignProjectManager,
  canEditFormEntry,
  canReviewFormEntry,
  canReviewTask,
  canViewProject,
  canWorkFormEntry,
  canWorkTask,
  formsNeedingAction,
  isOperationalAssignee,
  isScheduledFormEntry,
  isScheduledTask,
  landingForRole,
  operationalAssigneeCandidates,
  roleCanAccessCrm,
  roleCanAccessSimpro,
  taskTransition,
  userById,
  workloadRows,
} from "../src/lib/prototype/domain";
import { createSeedState } from "../src/lib/prototype/seed";
import { usePrototypeStore } from "../src/lib/prototype/store";
import {
  KOL_TEMPLATE_ID,
  UMUM_TEMPLATE_ID,
} from "../src/lib/prototype/templates";
import type { Project, Task } from "../src/lib/prototype/types";

function createProject(managerId?: string, templateId = UMUM_TEMPLATE_ID) {
  usePrototypeStore.getState().setCurrentUser("u-pm1");
  return usePrototypeStore.getState().createProject({
    name: "Manager Assignment Test",
    client: "Klien",
    description: "",
    priority: "medium",
    startDate: "",
    targetEndDate: "",
    coverColor: "#000000",
    templateId,
    managerId,
  });
}

function project(id: string): Project {
  return usePrototypeStore
    .getState()
    .projects.find((item) => item.id === id)!;
}

function task(id: string): Task {
  return usePrototypeStore.getState().tasks.find((item) => item.id === id)!;
}

describe("project manager assignment", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("stores one manager, notifies them, and writes an audit event", () => {
    const projectId = createProject("u-manager");
    const state = usePrototypeStore.getState();
    expect(project(projectId).managerId).toBe("u-manager");
    expect(
      state.projectEvents.some(
        (event) =>
          event.projectId === projectId &&
          event.eventType === "project.manager_assigned" &&
          event.metadata.after &&
          (event.metadata.after as { managerId?: string }).managerId ===
            "u-manager",
      ),
    ).toBe(true);
    expect(
      state.notifications.some(
        (notification) =>
          notification.userId === "u-manager" &&
          notification.type === "project_manager_assigned",
      ),
    ).toBe(true);
  });

  it("lets the owning PM change or clear the manager with an audit event", () => {
    const projectId = createProject("u-manager");
    usePrototypeStore.getState().updateProject(projectId, { managerId: "" });
    expect(project(projectId).managerId).toBeUndefined();
    expect(
      usePrototypeStore
        .getState()
        .projectEvents.some(
          (event) =>
            event.projectId === projectId &&
            event.eventType === "project.manager_changed",
        ),
    ).toBe(true);
  });

  it("rejects manager changes by another PM and invalid roles", () => {
    const projectId = createProject();
    usePrototypeStore.getState().setCurrentUser("u-pm2");
    usePrototypeStore.getState().updateProject(projectId, {
      managerId: "u-manager",
    });
    expect(project(projectId).managerId).toBeUndefined();

    usePrototypeStore.getState().setCurrentUser("u-pm1");
    usePrototypeStore.getState().updateProject(projectId, {
      managerId: "u-assignee1",
    });
    expect(project(projectId).managerId).toBeUndefined();
  });

  it("allows Admin to set a manager", () => {
    const projectId = createProject();
    usePrototypeStore.getState().setCurrentUser("u-admin");
    usePrototypeStore.getState().updateProject(projectId, {
      managerId: "u-manager",
    });
    expect(project(projectId).managerId).toBe("u-manager");
  });

  it("keeps Manager project visibility unchanged", () => {
    const state = createSeedState();
    const manager = userById(state, "u-manager")!;
    expect(
      state.projects.every((item) => canViewProject(state, manager, item)),
    ).toBe(true);
    expect(canAssignProjectManager(manager, state.projects[0])).toBe(false);
  });
});

describe("operational assignment helpers", () => {
  it("treats Manager and Assignee as operational assignees", () => {
    const state = createSeedState();
    expect(isOperationalAssignee(userById(state, "u-manager")!)).toBe(true);
    expect(isOperationalAssignee(userById(state, "u-assignee1")!)).toBe(true);
    expect(isOperationalAssignee(userById(state, "u-pm1")!)).toBe(false);
  });

  it("limits PM assignment to the project manager", () => {
    const state = createSeedState();
    const pm1 = userById(state, "u-pm1")!;
    const manager = userById(state, "u-manager")!;
    const assignee = userById(state, "u-assignee1")!;
    const pm2 = userById(state, "u-pm2")!;
    const alpha = state.projects.find((item) => item.id === "p-alpha")!;
    const delta = state.projects.find((item) => item.id === "p-delta")!;
    const deltaWithManager = { ...delta, managerId: "u-manager" };

    expect(canAssignOperational(pm1, alpha, manager)).toBe(true);
    expect(canAssignOperational(pm1, alpha, assignee)).toBe(false);
    expect(canAssignOperational(pm1, delta, manager)).toBe(false);
    expect(canAssignOperational(pm2, deltaWithManager, manager)).toBe(true);
    expect(canAssignOperational(manager, alpha, assignee)).toBe(true);
    expect(
      operationalAssigneeCandidates(state, pm1, alpha).map((user) => user.id),
    ).toEqual(["u-manager"]);
    expect(operationalAssigneeCandidates(state, pm1, delta)).toEqual([]);
  });
});

describe("task assignment and execution", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("lets PM assign a task to the project manager only", () => {
    const projectId = createProject("u-manager");
    const taskId = usePrototypeStore.getState().createTask(projectId, {
      title: "Task Manager",
      description: "",
      priority: "medium",
    });
    usePrototypeStore.getState().assignTask(taskId, "u-manager");
    expect(task(taskId).assigneeId).toBe("u-manager");
    expect(task(taskId).status).toBe("todo");

    usePrototypeStore.getState().assignTask(taskId, "u-assignee1");
    expect(task(taskId).assigneeId).toBe("u-manager");
  });

  it("lets Manager assign to Assignee and Manager", () => {
    const projectId = createProject("u-manager");
    const taskId = usePrototypeStore.getState().createTask(projectId, {
      title: "Task Manager",
      description: "",
      priority: "medium",
    });
    usePrototypeStore.getState().setCurrentUser("u-manager");
    usePrototypeStore.getState().assignTask(taskId, "u-assignee1");
    expect(task(taskId).assigneeId).toBe("u-assignee1");
    usePrototypeStore.getState().assignTask(taskId, "u-manager");
    expect(task(taskId).assigneeId).toBe("u-manager");
  });

  it("lets Manager assignee work the task but not review it", () => {
    const projectId = createProject("u-manager");
    const taskId = usePrototypeStore.getState().createTask(projectId, {
      title: "Task Manager",
      description: "",
      priority: "medium",
    });
    usePrototypeStore.getState().assignTask(taskId, "u-manager");
    usePrototypeStore.getState().setCurrentUser("u-manager");
    const manager = userById(usePrototypeStore.getState(), "u-manager")!;
    const state = usePrototypeStore.getState();
    const current = task(taskId);
    expect(canWorkTask(manager, current)).toBe(true);
    expect(taskTransition(state, manager, current, "in_progress").ok).toBe(
      true,
    );
    usePrototypeStore.getState().transitionTask(taskId, "in_progress");
    expect(
      taskTransition(
        usePrototypeStore.getState(),
        manager,
        task(taskId),
        "awaiting_approval",
      ).ok,
    ).toBe(true);
    usePrototypeStore.getState().transitionTask(taskId, "awaiting_approval");
    expect(
      canReviewTask(usePrototypeStore.getState(), manager, task(taskId)),
    ).toBe(false);
  });

  it("counts Manager workload when they have active work", () => {
    const projectId = createProject("u-manager");
    const taskId = usePrototypeStore.getState().createTask(projectId, {
      title: "Task Manager",
      description: "",
      priority: "medium",
    });
    usePrototypeStore.getState().assignTask(taskId, "u-manager");
    const row = workloadRows(usePrototypeStore.getState()).find(
      (item) => item.user.id === "u-manager",
    )!;
    expect(row.activeCount).toBe(1);
  });

  it("does not list managers without active work", () => {
    const rows = workloadRows(createSeedState());
    expect(rows.some((row) => row.user.role === "manager")).toBe(false);
  });
});

describe("form entry assignment and execution", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("lets PM assign a form entry to the project manager", () => {
    const projectId = createProject("u-manager", KOL_TEMPLATE_ID);
    const step = usePrototypeStore
      .getState()
      .steps.filter((item) => item.projectId === projectId)
      .sort((a, b) => a.order - b.order)[0];
    const entryId = usePrototypeStore
      .getState()
      .createFormEntry(projectId, step.key, { title: "Entri Manager" });
    usePrototypeStore.getState().assignFormEntry(entryId, "u-manager");
    const entry = usePrototypeStore
      .getState()
      .formEntries.find((item) => item.id === entryId)!;
    expect(entry.assigneeId).toBe("u-manager");

    usePrototypeStore.getState().assignFormEntry(entryId, "u-assignee1");
    expect(
      usePrototypeStore
        .getState()
        .formEntries.find((item) => item.id === entryId)!.assigneeId,
    ).toBe("u-manager");
  });

  it("lets Manager assign an unassigned project form entry", () => {
    const projectId = createProject("u-manager", KOL_TEMPLATE_ID);
    const step = usePrototypeStore
      .getState()
      .steps.filter((item) => item.projectId === projectId)
      .sort((a, b) => a.order - b.order)[0];
    const entryId = usePrototypeStore
      .getState()
      .createFormEntry(projectId, step.key, { title: "Entri Forms" });
    usePrototypeStore.getState().setCurrentUser("u-manager");
    usePrototypeStore.getState().assignFormEntry(entryId, "u-assignee1");
    const entry = usePrototypeStore
      .getState()
      .formEntries.find((item) => item.id === entryId)!;
    expect(entry.assigneeId).toBe("u-assignee1");
    expect(entry.status).toBe("assigned");
  });

  it("lets Manager fill and submit but not review the entry", () => {
    const projectId = createProject("u-manager", KOL_TEMPLATE_ID);
    const step = usePrototypeStore
      .getState()
      .steps.filter((item) => item.projectId === projectId)
      .sort((a, b) => a.order - b.order)[0];
    const entryId = usePrototypeStore
      .getState()
      .createFormEntry(projectId, step.key, { title: "Entri Manager" });
    usePrototypeStore.getState().assignFormEntry(entryId, "u-manager");
    usePrototypeStore.getState().setCurrentUser("u-manager");
    const manager = userById(usePrototypeStore.getState(), "u-manager")!;
    let entry = usePrototypeStore
      .getState()
      .formEntries.find((item) => item.id === entryId)!;
    expect(canEditFormEntry(usePrototypeStore.getState(), manager, entry)).toBe(
      true,
    );
    expect(canWorkFormEntry(manager, entry)).toBe(true);
    usePrototypeStore
      .getState()
      .saveFormEntry(entryId, { values: {}, photos: [] });
    usePrototypeStore.getState().submitFormEntry(entryId);
    entry = usePrototypeStore
      .getState()
      .formEntries.find((item) => item.id === entryId)!;
    expect(entry.status).toBe("submitted");
    expect(
      canReviewFormEntry(usePrototypeStore.getState(), manager, entry),
    ).toBe(false);
    expect(formsNeedingAction(usePrototypeStore.getState(), "u-manager")).toBe(
      0,
    );

    usePrototypeStore.getState().setCurrentUser("u-pm1");
    expect(
      canReviewFormEntry(
        usePrototypeStore.getState(),
        userById(usePrototypeStore.getState(), "u-pm1")!,
        entry,
      ),
    ).toBe(true);
  });

  it("counts assigned form entries in Manager badge and workload", () => {
    const projectId = createProject("u-manager", KOL_TEMPLATE_ID);
    const step = usePrototypeStore
      .getState()
      .steps.filter((item) => item.projectId === projectId)
      .sort((a, b) => a.order - b.order)[0];
    const entryId = usePrototypeStore
      .getState()
      .createFormEntry(projectId, step.key, { title: "Entri Manager" });
    usePrototypeStore.getState().assignFormEntry(entryId, "u-manager");
    usePrototypeStore.setState((state) => ({
      steps: state.steps.map((item) =>
        item.id === step.id ? { ...item, status: "active" as const } : item,
      ),
    }));
    expect(formsNeedingAction(usePrototypeStore.getState(), "u-manager")).toBe(
      1,
    );
    const row = workloadRows(usePrototypeStore.getState()).find(
      (item) => item.user.id === "u-manager",
    )!;
    expect(row.activeFormCount).toBe(1);
  });
});

describe("media role and scheduled work", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("treats Media as an operational worker with limited access", () => {
    const state = createSeedState();
    const media = userById(state, "u-media")!;
    expect(media.role).toBe("media");
    expect(isOperationalAssignee(media)).toBe(true);
    expect(roleCanAccessCrm("media")).toBe(false);
    expect(roleCanAccessSimpro("media")).toBe(true);
    expect(landingForRole("media")).toBe("/my-tasks");
    expect(canWorkTask(media, { ...state.tasks[0], assigneeId: "u-media" })).toBe(
      true,
    );
    expect(
      operationalAssigneeCandidates(state, userById(state, "u-manager")!, state.projects[0])
        .some((user) => user.id === "u-media"),
    ).toBe(true);
  });

  it("derives scheduled work from a pending step", () => {
    const state = createSeedState();
    const pending = state.steps.find((step) => step.status === "pending");
    expect(pending).toBeTruthy();
    const task = state.tasks[0];
    const entry = state.formEntries[0];
    expect(
      isScheduledTask(state, {
        ...task,
        projectId: pending!.projectId,
        stageId: pending!.id,
      }),
    ).toBe(true);
    expect(
      isScheduledFormEntry(state, {
        ...entry,
        projectId: pending!.projectId,
        templateStageId: pending!.id,
        stepKey: pending!.key,
      }),
    ).toBe(true);
  });

  it("builds an assignment queue for managers and admins only", () => {
    const state = createSeedState();
    const manager = userById(state, "u-manager")!;
    const assignee = userById(state, "u-assignee1")!;
    const projectTask = state.tasks.find((task) => task.projectId);
    expect(projectTask).toBeTruthy();
    const queued = {
      ...state,
      tasks: state.tasks.map((task) =>
        task.id === projectTask!.id
          ? { ...task, status: "backlog" as const, assigneeId: undefined }
          : task,
      ),
    };
    expect(
      assignmentQueueForUser(queued, manager).some(
        (item) => item.kind === "task" && item.task.id === projectTask!.id,
      ),
    ).toBe(true);
    expect(assignmentQueueForUser(queued, assignee)).toHaveLength(0);
  });

  it("excludes scheduled forms from the badge and workload", () => {
    const projectId = createProject("u-manager", KOL_TEMPLATE_ID);
    const step = usePrototypeStore
      .getState()
      .steps.filter((item) => item.projectId === projectId)
      .sort((a, b) => a.order - b.order)[0];
    const entryId = usePrototypeStore
      .getState()
      .createFormEntry(projectId, step.key, { title: "Entri Terjadwal" });
    usePrototypeStore.getState().assignFormEntry(entryId, "u-manager");
    usePrototypeStore.setState((state) => ({
      steps: state.steps.map((item) =>
        item.id === step.id ? { ...item, status: "active" as const } : item,
      ),
    }));
    expect(formsNeedingAction(usePrototypeStore.getState(), "u-manager")).toBe(
      1,
    );
    const scheduledStep = usePrototypeStore
      .getState()
      .steps.find((item) => item.status === "pending");
    expect(scheduledStep).toBeTruthy();
    const state = usePrototypeStore.getState();
    const entry = state.formEntries.find((item) => item.id === entryId)!;
    expect(
      activeFormEntriesForAssignee(
        {
          ...state,
          formEntries: state.formEntries.map((item) =>
            item.id === entryId
              ? {
                  ...item,
                  projectId: scheduledStep!.projectId,
                  templateStageId: scheduledStep!.id,
                  stepKey: scheduledStep!.key,
                }
              : item,
          ),
        },
        "u-manager",
      ),
    ).toHaveLength(0);
    expect(entry.status).toBe("assigned");
  });

  it("pre-assigns a pending-step card without starting it", () => {
    const projectId = createProject("u-manager", KOL_TEMPLATE_ID);
    const pendingStep = usePrototypeStore
      .getState()
      .steps.find(
        (item) =>
          item.projectId === projectId &&
          item.kind === "simpro" &&
          item.status === "pending",
      )!;
    expect(pendingStep).toBeTruthy();
    const taskId = usePrototypeStore.getState().createTask(projectId, {
      title: "Kartu Terjadwal",
      description: "",
      priority: "medium",
      stepKey: pendingStep.key,
    });
    expect(taskId).not.toBe("");
    usePrototypeStore.getState().setCurrentUser("u-manager");
    usePrototypeStore.getState().assignTask(taskId, "u-assignee1");
    const task = usePrototypeStore
      .getState()
      .tasks.find((item) => item.id === taskId)!;
    expect(task.assigneeId).toBe("u-assignee1");
    expect(task.status).toBe("backlog");
    usePrototypeStore.getState().setCurrentUser("u-assignee1");
    expect(
      taskTransition(
        usePrototypeStore.getState(),
        userById(usePrototypeStore.getState(), "u-assignee1")!,
        task,
        "in_progress",
        { workUrl: "https://example.com/work" },
      ).ok,
    ).toBe(false);
  });

  it("adds Media to the workload rows", () => {
    const media = workloadRows(createSeedState()).find(
      (row) => row.user.id === "u-media",
    )!;
    expect(media.user.role).toBe("media");
    expect(media.activeCount).toBe(0);
  });

  it("creates and assigns a pending-step form entry without allowing fill", () => {
    const projectId = createProject("u-manager", KOL_TEMPLATE_ID);
    const pendingForm = usePrototypeStore
      .getState()
      .steps.find(
        (item) =>
          item.projectId === projectId &&
          item.kind === "form" &&
          item.status === "pending",
      )!;
    expect(pendingForm).toBeTruthy();
    const entryId = usePrototypeStore
      .getState()
      .createFormEntry(projectId, pendingForm.key, { title: "Form Terjadwal" });
    expect(entryId).not.toBe("");
    usePrototypeStore.getState().setCurrentUser("u-manager");
    usePrototypeStore.getState().assignFormEntry(entryId, "u-manager");
    const entry = usePrototypeStore
      .getState()
      .formEntries.find((item) => item.id === entryId)!;
    expect(entry.assigneeId).toBe("u-manager");
    expect(canEditFormEntry(usePrototypeStore.getState(), userById(usePrototypeStore.getState(), "u-manager")!, entry)).toBe(false);
    expect(formsNeedingAction(usePrototypeStore.getState(), "u-manager")).toBe(0);
  });
});
