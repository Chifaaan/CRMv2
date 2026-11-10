import { describe, expect, it } from "vitest";
import {
  boardVisibleStages,
  calculateJourneyProgress,
  calculateWorkProgress,
  canViewProject,
  completionStats,
  evaluateGate,
  groupProgress,
  isGroupableProject,
  missingFinanceSteps,
  taskProgressSummary,
  taskTransition,
  userById,
  visibleProjects,
  workloadRows,
  workProgressForProject,
} from "../src/lib/prototype/domain";
import { createSeedState } from "../src/lib/prototype/seed";

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

describe("task progress summary", () => {
  it("summarizes one project's tasks without leaking another project's data", () => {
    const state = createSeedState();
    const pool = state.tasks.filter(
      (task) => task.projectId === "p-delta" && !task.archivedAt,
    );
    const statuses = [
      "completed",
      "todo",
      "in_progress",
      "awaiting_approval",
    ] as const;
    const tasks = pool.slice(0, 4).map((task, index) => ({
      ...task,
      status: statuses[index],
      dueDate:
        index === 2
          ? new Date(Date.now() - 86400000).toISOString()
          : new Date(Date.now() + 86400000).toISOString(),
    }));
    const summary = taskProgressSummary(tasks);

    expect(summary.total).toBe(4);
    expect(summary.completed).toBe(1);
    expect(summary.open).toBe(3);
    expect(summary.overdue).toBe(1);
    expect(summary.percent).toBe(25);
    expect(summary.counts.in_progress).toBe(1);
    expect(taskProgressSummary(pool.slice(0, 4)).total).toBe(4);
  });
});

describe("SIMPRO board stages", () => {
  it("only exposes active and completed stages in order", () => {
    const state = createSeedState();
    const stages = boardVisibleStages(state, "p-delta");

    expect(stages.map((stage) => stage.key)).toEqual(["pitching", "running"]);
    expect(stages.map((stage) => stage.status)).toEqual([
      "completed",
      "active",
    ]);
    expect(stages.every((stage) => stage.kind === "simpro")).toBe(true);
    expect(
      boardVisibleStages(state, "p-alpha").map((stage) => stage.key),
    ).toEqual(["pitching"]);
  });
});

describe("automatic Finance steps", () => {
  it("adds only missing BAST and Invoice steps", () => {
    const state = createSeedState();
    const project = state.projects.find((item) => item.id === "p-alpha")!;
    const first = missingFinanceSteps(project, []);
    expect(first.map((step) => step.financeKind)).toEqual(["bast", "invoice"]);
    expect(first.every((step) => step.phase === "finance")).toBe(true);
    expect(first.every((step) => step.status === "pending")).toBe(true);
    expect(first.every((step) => step.managerPicId === "u-manager")).toBe(true);

    const afterBast = missingFinanceSteps(project, [
      { ...first[0], status: "active" },
    ]);
    expect(afterBast).toHaveLength(1);
    expect(afterBast[0].financeKind).toBe("invoice");
    expect(missingFinanceSteps(project, first)).toEqual([]);
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
  it("only manager/admin can assign backlog to todo", () => {
    const state = createSeedState();
    const task = state.tasks.find((item) => item.id === "task-alpha-010")!;
    task.assigneeId = "u-assignee1";
    const pm = userById(state, "u-pm1")!;
    const manager = userById(state, "u-manager")!;
    expect(taskTransition(state, pm, task, "todo").ok).toBe(false);
    expect(taskTransition(state, manager, task, "todo").ok).toBe(true);
  });

  it("assignee moves todo to in progress and awaiting approval", () => {
    const state = createSeedState();
    const task = state.tasks.find((item) => item.id === "task-alpha-005")!;
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

describe("forms visibility", () => {
  function formEntry(projectId: string, assigneeId: string) {
    return {
      id: `fentry-${projectId}-${assigneeId}`,
      scope: "project" as const,
      projectId,
      stepKey: "survey",
      title: "Form entry assignment",
      assigneeId,
      status: "assigned" as const,
      payload: { values: {}, photos: [] },
      versions: [],
      createdById: "u-pm1",
      createdAt: new Date().toISOString(),
    };
  }

  it("makes a project visible to an assignee from a form entry assignment", () => {
    const state = createSeedState();
    const projectId = "p-gamma";
    state.tasks = state.tasks.filter(
      (task) =>
        !(task.projectId === projectId && task.assigneeId === "u-assignee2"),
    );
    state.forms = state.forms.filter(
      (form) =>
        !(form.projectId === projectId && form.assigneeId === "u-assignee2"),
    );
    state.formEntries = state.formEntries.filter(
      (entry) =>
        !(entry.projectId === projectId && entry.assigneeId === "u-assignee2"),
    );
    const assignee = userById(state, "u-assignee2")!;
    const project = state.projects.find((item) => item.id === projectId)!;

    expect(canViewProject(state, assignee, project)).toBe(false);
    state.formEntries.push(formEntry(projectId, "u-assignee1"));
    expect(canViewProject(state, assignee, project)).toBe(false);
    state.formEntries.push(formEntry(projectId, assignee.id));
    expect(canViewProject(state, assignee, project)).toBe(true);
  });

  it("makes a new-lifecycle project visible to Finance from a form entry assignment", () => {
    const state = createSeedState();
    const project = state.projects.find((item) => item.id === "p-gamma")!;
    project.creationMode = "manual";
    state.forms = state.forms.filter(
      (form) =>
        !(form.projectId === project.id && form.assigneeId === "u-finance"),
    );
    state.formEntries = state.formEntries.filter(
      (entry) =>
        !(entry.projectId === project.id && entry.assigneeId === "u-finance"),
    );
    const finance = userById(state, "u-finance")!;

    expect(canViewProject(state, finance, project)).toBe(false);
    state.formEntries.push(formEntry(project.id, finance.id));
    expect(canViewProject(state, finance, project)).toBe(true);
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
