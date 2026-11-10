import { describe, expect, it } from "vitest";
import {
  calculateJourneyProgress,
  calculateWorkProgress,
  canDeleteStepFromPhase,
  canViewProject,
  completionStats,
  evaluateGate,
  groupProgress,
  isGroupableProject,
  projectOverview,
  stepHasStartedWork,
  taskTransition,
  userById,
  validateWorkingLink,
  visibleBoardSteps,
  visibleProjects,
  workloadRows,
  workProgressForProject,
} from "../src/lib/prototype/domain";
import { createSeedState } from "../src/lib/prototype/seed";
import type { ProjectStep, Task } from "../src/lib/prototype/types";

describe("journey progress", () => {
  it("uses four full steps plus finance split 0.5/0.5", () => {
    const state = createSeedState();
    expect(calculateJourneyProgress(state, "p-alpha")).toBe(0);
    expect(calculateJourneyProgress(state, "p-beta")).toBe(20);
    expect(calculateJourneyProgress(state, "p-gamma")).toBe(40);
    expect(calculateJourneyProgress(state, "p-delta")).toBe(60);
    expect(calculateJourneyProgress(state, "p-epsilon")).toBe(90);
    expect(calculateJourneyProgress(state, "p-zeta")).toBe(100);
  });
});

describe("work progress", () => {
  it("uses task progress for pitching/running and form progress for form steps", () => {
    const state = createSeedState();
    expect(calculateWorkProgress(state, "p-beta", "survey")).toBe(50);
    expect(calculateWorkProgress(state, "p-gamma", "rab")).toBe(50);
    expect(calculateWorkProgress(state, "p-epsilon", "bast")).toBe(100);
    expect(calculateWorkProgress(state, "p-epsilon", "invoice")).toBe(0);
    expect(workProgressForProject(state, "p-epsilon")).toBe(50);
    expect(workProgressForProject(state, "p-zeta")).toBe(100);
  });
});

describe("gates", () => {
  it("blocks pitching until winner tasks and all pitching tasks are completed", () => {
    const state = createSeedState();
    expect(evaluateGate(state, "p-alpha", "pitching").ready).toBe(false);
    for (const task of state.tasks) {
      if (task.projectId === "p-alpha" && !task.archivedAt) {
        task.status = "completed";
      }
    }
    expect(evaluateGate(state, "p-alpha", "pitching").ready).toBe(true);
  });

  it("blocks running while any task is active", () => {
    const state = createSeedState();
    expect(evaluateGate(state, "p-delta", "running").ready).toBe(false);
    for (const task of state.tasks) {
      if (task.projectId === "p-delta" && task.stepKey === "running") {
        task.status = "completed";
      }
    }
    expect(evaluateGate(state, "p-delta", "running").ready).toBe(true);
  });

  it("requires approved survey and rab", () => {
    const state = createSeedState();
    expect(evaluateGate(state, "p-beta", "survey").ready).toBe(false);
    state.forms.find(
      (form) => form.projectId === "p-beta" && form.stepKey === "survey",
    )!.status = "approved";
    expect(evaluateGate(state, "p-beta", "survey").ready).toBe(true);
  });

  it("requires submitted bast and invoice", () => {
    const state = createSeedState();
    expect(evaluateGate(state, "p-epsilon", "bast").ready).toBe(true);
    expect(evaluateGate(state, "p-epsilon", "invoice").ready).toBe(false);
  });
});

describe("task transitions", () => {
  it("lets the owning PM move an owned card but not an ownerless one", () => {
    const state = createSeedState();
    const task = state.tasks.find((item) => item.id === "task-alpha-010")!;
    const pm = userById(state, "u-pm1")!;
    const manager = userById(state, "u-manager")!;

    expect(taskTransition(state, pm, task, "todo").ok).toBe(false);
    task.assigneeId = "u-assignee1";
    expect(taskTransition(state, pm, task, "todo").ok).toBe(true);
    expect(taskTransition(state, pm, task, "completed").ok).toBe(true);
    task.managerId = "u-manager";
    expect(taskTransition(state, pm, task, "need_revision").ok).toBe(true);
    expect(taskTransition(state, manager, task, "todo").ok).toBe(true);
    expect(taskTransition(state, manager, task, "completed").ok).toBe(false);
  });

  it("assignee moves todo to in progress and awaiting approval", () => {
    const state = createSeedState();
    const task = state.tasks.find((item) => item.id === "task-alpha-005")!;
    task.workingLink = {
      url: "https://docs.google.com/document/d/abc",
      setById: "u-assignee3",
      setAt: "2026-11-01T00:00:00.000Z",
    };
    const assignee = userById(state, "u-assignee3")!;
    expect(taskTransition(state, assignee, task, "in_progress").ok).toBe(true);
    task.status = "in_progress";
    expect(taskTransition(state, assignee, task, "awaiting_approval").ok).toBe(true);
  });

  it("only pm owner/admin reviews awaiting approval", () => {
    const state = createSeedState();
    const task = state.tasks.find((item) => item.id === "task-alpha-002")!;
    const pm = userById(state, "u-pm1")!;
    const manager = userById(state, "u-manager")!;
    expect(taskTransition(state, manager, task, "completed").ok).toBe(false);
    expect(taskTransition(state, pm, task, "completed").ok).toBe(true);
  });
});

describe("visibility", () => {
  it("scopes pm, manager, and assignee projects", () => {
    const state = createSeedState();
    const pm = userById(state, "u-pm1")!;
    const manager = userById(state, "u-manager")!;
    const assignee = userById(state, "u-assignee1")!;

    expect(
      canViewProject(
        state,
        pm,
        state.projects.find((project) => project.id === "p-delta")!,
      ),
    ).toBe(false);
    expect(visibleProjects({ ...state, currentUserId: "u-manager" }).length).toBe(
      state.projects.length,
    );
    expect(
      canViewProject(
        state,
        assignee,
        state.projects.find((project) => project.id === "p-delta")!,
      ),
    ).toBe(true);
    expect(
      canViewProject(
        state,
        assignee,
        state.projects.find((project) => project.id === "p-gamma")!,
      ),
    ).toBe(false);
    expect(visibleProjects({ ...state, currentUserId: "u-pm1" }).length).toBe(4);
    expect(manager.role).toBe("manager");
  });
});

describe("workload and groups", () => {
  it("counts only active card tasks by assignee", () => {
    const state = createSeedState();
    const future = new Date(Date.now() + 86400000).toISOString();
    const past = new Date(Date.now() - 86400000).toISOString();
    for (const task of state.tasks) {
      if (task.status !== "completed") task.dueDate = future;
    }
    state.tasks.find((task) => task.id === "task-delta-004")!.dueDate = past;
    const rows = workloadRows(state);
    const assignee1 = rows.find((row) => row.user.id === "u-assignee1")!;
    const assignee2 = rows.find((row) => row.user.id === "u-assignee2")!;
    const andi = rows.find((row) => row.user.id === "u-assignee3")!;

    expect(assignee1.activeCount).toBe(3);
    expect(assignee2.activeCount).toBe(2);
    expect(andi.activeCount).toBe(3);
    expect(assignee1.statusCounts.need_revision).toBe(1);
    expect(assignee1.overdueCount).toBe(1);
  });

  it("counts completed projects, not average journey progress", () => {
    const state = createSeedState();
    expect(groupProgress(state, "group-q4")).toBe(0);

    state.projects.find((project) => project.id === "p-beta")!.status =
      "completed";
    expect(groupProgress(state, "group-q4")).toBe(33);

    const members = state.projects.filter(
      (project) => project.groupId === "group-q4",
    );
    expect(completionStats(members)).toEqual({
      completed: 1,
      total: 3,
      percent: 33,
    });
  });

  it("allows only ungrouped, non-cancelled projects to join a group", () => {
    const state = createSeedState();
    expect(
      isGroupableProject(
        state.projects.find((project) => project.id === "p-alpha")!,
      ),
    ).toBe(true);
    expect(
      isGroupableProject(
        state.projects.find((project) => project.id === "p-delta")!,
      ),
    ).toBe(false);
    expect(
      isGroupableProject(
        state.projects.find((project) => project.id === "p-legacy")!,
      ),
    ).toBe(false);
  });
});

function testStep(overrides: Partial<ProjectStep> = {}): ProjectStep {
  return {
    id: "step-test",
    projectId: "p-alpha",
    key: "test-step",
    name: "Test Step",
    phase: "prospek",
    order: 900,
    status: "pending",
    kind: "simpro",
    required: true,
    weight: 1,
    tasks: [],
    ...overrides,
  };
}

describe("project overview", () => {
  it("aggregates only non-archived tasks for the opened project", () => {
    const state = createSeedState();
    const tasks = state.tasks.filter(
      (task) => task.projectId === "p-alpha" && !task.archivedAt,
    );
    const overview = projectOverview(state, "p-alpha");

    expect(
      overview.taskDistribution.reduce((sum, row) => sum + row.count, 0),
    ).toBe(tasks.length);
    expect(overview.progress.completed + overview.progress.open).toBe(
      tasks.length,
    );
    expect(overview.recentEvents.every((event) => event.projectId === "p-alpha")).toBe(
      true,
    );
    expect(projectOverview(state, "p-beta")).not.toEqual(overview);
  });

  it("returns zeros for a project without activity", () => {
    const state = createSeedState();
    const empty = {
      ...state,
      tasks: [],
      steps: [],
      projectEvents: [],
      formEntries: [],
      forms: [],
    };
    const overview = projectOverview(empty, "p-alpha");
    expect(overview.stageCompletion).toEqual({
      completed: 0,
      skipped: 0,
      notCompleted: 0,
    });
    expect(overview.progress).toEqual({
      completed: 0,
      open: 0,
      overdue: 0,
      percent: 0,
    });
    expect(
      overview.taskDistribution.every((row) => row.count === 0 && row.percent === 0),
    ).toBe(true);
  });

  it("counts overdue non-completed tasks", () => {
    const state = createSeedState();
    const before = projectOverview(state, "p-alpha").progress.overdue;
    const sample = state.tasks.find((task) => task.projectId === "p-alpha")!;
    state.tasks.push({
      ...sample,
      id: "task-overdue-test",
      code: "PRJ-TEST",
      status: "todo",
      dueDate: "2020-01-01T00:00:00.000Z",
    } as Task);
    expect(projectOverview(state, "p-alpha").progress.overdue).toBe(before + 1);
  });
});

describe("board stage visibility", () => {
  it("hides pending stages from assignees and media", () => {
    const state = createSeedState();
    const assignee = userById(state, "u-assignee1")!;
    const media = userById(state, "u-media")!;
    const pm = userById(state, "u-pm1")!;
    const manager = userById(state, "u-manager")!;

    expect(
      visibleBoardSteps(state, assignee, "p-alpha").map((step) => step.key),
    ).toEqual(["pitching"]);
    expect(
      visibleBoardSteps(state, media, "p-alpha").map((step) => step.key),
    ).toEqual(["pitching"]);
    expect(
      visibleBoardSteps(state, pm, "p-alpha").map((step) => step.key),
    ).toEqual(["pitching", "running"]);
    expect(
      visibleBoardSteps(state, manager, "p-alpha").map((step) => step.key),
    ).toEqual(["pitching", "running"]);

    state.steps.find(
      (step) => step.projectId === "p-alpha" && step.key === "running",
    )!.status = "completed";
    expect(
      visibleBoardSteps(state, assignee, "p-alpha").map((step) => step.key),
    ).toEqual(["pitching", "running"]);
  });
});

describe("structural work guards", () => {
  it("treats draft entries and non-Backlog tasks as started work", () => {
    const state = createSeedState();
    const step = testStep();
    expect(stepHasStartedWork(state, step)).toBe(false);

    const entry = state.formEntries[0];
    const withDraft = {
      ...state,
      formEntries: [
        ...state.formEntries,
        {
          ...entry,
          id: "entry-test",
          projectId: "p-alpha",
          stepKey: step.key,
          templateStageId: step.id,
          status: "draft" as const,
        },
      ],
    };
    expect(stepHasStartedWork(withDraft, step)).toBe(true);

    const sample = state.tasks.find((task) => task.projectId === "p-alpha")!;
    const withTask = {
      ...state,
      tasks: [
        ...state.tasks,
        {
          ...sample,
          id: "task-test",
          projectId: "p-alpha",
          stepKey: step.key,
          stageId: step.id,
          status: "todo" as const,
        },
      ],
    };
    expect(stepHasStartedWork(withTask, step)).toBe(true);
  });

  it("allows deleting an unstarted step but not one with work", () => {
    const state = createSeedState();
    const project = {
      ...state.projects.find((item) => item.id === "p-alpha")!,
      structureLocked: false,
      phaseStates: { prospek: { authoredAt: "2026-01-01T00:00:00.000Z" } },
    };
    const step = testStep();
    expect(canDeleteStepFromPhase(state, project, step)).toBe(true);

    const sample = state.tasks.find((task) => task.projectId === "p-alpha")!;
    const withTask = {
      ...state,
      tasks: [
        ...state.tasks,
        {
          ...sample,
          id: "task-test",
          projectId: "p-alpha",
          stepKey: step.key,
          stageId: step.id,
          status: "in_progress" as const,
        },
      ],
    };
    expect(canDeleteStepFromPhase(withTask, project, step)).toBe(false);
  });
});

describe("opaque working links", () => {
  it("accepts any non-empty text and rejects only empty values", () => {
    expect(validateWorkingLink("").ok).toBe(false);
    expect(validateWorkingLink("   ").ok).toBe(false);
    expect(validateWorkingLink("not-a-url").ok).toBe(true);
    expect(validateWorkingLink("dokumen desain di drive").ok).toBe(true);
    expect(validateWorkingLink("https://docs.google.com/doc").ok).toBe(true);
  });
});

describe("attached manager task rights", () => {
  it("can start and submit but cannot review", () => {
    const state = createSeedState();
    const task = state.tasks.find((item) => item.id === "task-alpha-005")!;
    task.managerId = "u-manager";
    const manager = userById(state, "u-manager")!;

    expect(taskTransition(state, manager, task, "in_progress").ok).toBe(false);
    expect(
      taskTransition(state, manager, task, "in_progress", "folder drive").ok,
    ).toBe(true);
    task.status = "in_progress";
    expect(taskTransition(state, manager, task, "awaiting_approval").ok).toBe(
      true,
    );
    task.status = "awaiting_approval";
    expect(taskTransition(state, manager, task, "completed").ok).toBe(false);
  });
});
