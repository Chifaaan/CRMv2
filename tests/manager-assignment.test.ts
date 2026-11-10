import { beforeEach, describe, expect, it } from "vitest";
import {
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
  operationalAssigneeCandidates,
  taskTransition,
  userById,
  workloadRows,
} from "../src/lib/prototype/domain";
import { createSeedState } from "../src/lib/prototype/seed";
import { usePrototypeStore } from "../src/lib/prototype/store";
import {
  KOL_TEMPLATE_ID,
  UMUM_EXECUTION_TEMPLATE_ID,
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

  it("lets PM move a card that has a Manager Tugas but no assignee", () => {
    usePrototypeStore.getState().setCurrentUser("u-pm1");
    const projectId = usePrototypeStore.getState().createProject({
      name: "Manager Tugas Move",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      mode: "template",
      templateId: UMUM_EXECUTION_TEMPLATE_ID,
      managerId: "u-manager",
    });
    const state = usePrototypeStore.getState();
    expect(
      state.projects.find((item) => item.id === projectId)?.creationMode,
    ).toBe("template");
    const pm = userById(state, "u-pm1")!;
    const card: Task = {
      id: "task-manager-only",
      code: "KOL-001",
      projectId,
      stepKey: "step-1",
      title: "Card Manager Tugas",
      description: "",
      priority: "medium",
      status: "todo",
      managerId: "u-manager",
      reporterId: "u-pm1",
      createdAt: new Date().toISOString(),
      checklist: [],
      comments: [],
      attachments: [],
    };
    expect(
      taskTransition(state, pm, card, "in_progress", { workUrl: "catatan" }).ok,
    ).toBe(true);
    expect(
      taskTransition(
        state,
        pm,
        { ...card, managerId: undefined },
        "in_progress",
        { workUrl: "catatan" },
      ).ok,
    ).toBe(false);
  });

  it("moves a backlog card to To Do when the PM sets the Manager Tugas", () => {
    usePrototypeStore.getState().setCurrentUser("u-pm1");
    const projectId = usePrototypeStore.getState().createProject({
      name: "Manager Tugas Flow",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      mode: "template",
      templateId: UMUM_EXECUTION_TEMPLATE_ID,
      managerId: "u-manager",
    });
    usePrototypeStore
      .getState()
      .startProject(projectId, "planning", { managerPicId: "u-manager" });
    const step = usePrototypeStore
      .getState()
      .steps.filter((item) => item.projectId === projectId)
      .find((item) => item.status === "active")!;
    const taskId = usePrototypeStore.getState().createTask(projectId, {
      title: "Card Manager Tugas",
      description: "",
      priority: "medium",
      stepKey: step.key,
    });
    expect(task(taskId).status).toBe("backlog");

    usePrototypeStore.getState().setTaskManager(taskId, "u-manager");
    expect(task(taskId).managerId).toBe("u-manager");
    expect(task(taskId).status).toBe("todo");
    expect(task(taskId).assigneeId).toBeUndefined();
    expect(
      usePrototypeStore
        .getState()
        .projectEvents.some(
          (event) =>
            event.eventType === "task.manager_assigned" &&
            event.metadata.taskId === taskId,
        ),
    ).toBe(true);

    usePrototypeStore.getState().setCurrentUser("u-manager");
    usePrototypeStore.getState().assignTask(taskId, "u-assignee1");
    expect(task(taskId).assigneeId).toBe("u-assignee1");
    usePrototypeStore.getState().assignTask(taskId, "u-manager");
    expect(task(taskId).assigneeId).toBe("u-manager");

    usePrototypeStore.setState({
      tasks: usePrototypeStore
        .getState()
        .tasks.map((item) =>
          item.id === taskId ? { ...item, status: "in_progress" } : item,
        ),
    });
    usePrototypeStore.getState().setCurrentUser("u-pm1");
    usePrototypeStore.getState().setTaskManager(taskId, "u-manager");
    expect(task(taskId).managerId).toBe("u-manager");
    usePrototypeStore.getState().setCurrentUser("u-manager");
    usePrototypeStore.getState().setTaskManager(taskId, undefined);
    expect(task(taskId).managerId).toBe("u-manager");
  });

  it("keeps PM allocation rejected on a new-lifecycle card", () => {
    usePrototypeStore.getState().setCurrentUser("u-pm1");
    const projectId = usePrototypeStore.getState().createProject({
      name: "PM Allocation Guard",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      mode: "template",
      templateId: UMUM_EXECUTION_TEMPLATE_ID,
      managerId: "u-manager",
    });
    usePrototypeStore
      .getState()
      .startProject(projectId, "planning", { managerPicId: "u-manager" });
    const step = usePrototypeStore
      .getState()
      .steps.filter((item) => item.projectId === projectId)
      .find((item) => item.status === "active")!;
    const taskId = usePrototypeStore.getState().createTask(projectId, {
      title: "Card PM Guard",
      description: "",
      priority: "medium",
      stepKey: step.key,
    });
    usePrototypeStore.getState().setTaskManager(taskId, "u-manager");
    usePrototypeStore.getState().assignTask(taskId, "u-assignee1");
    expect(task(taskId).assigneeId).toBeUndefined();
  });

  it("lets Manager assign to Assignee and Manager", () => {    const projectId = createProject("u-manager");
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
    expect(formsNeedingAction(usePrototypeStore.getState(), "u-manager")).toBe(
      1,
    );
    const row = workloadRows(usePrototypeStore.getState()).find(
      (item) => item.user.id === "u-manager",
    )!;
    expect(row.activeFormCount).toBe(1);
  });
});
