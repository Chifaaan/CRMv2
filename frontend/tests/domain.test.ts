import { describe, expect, it } from "vitest";
import {
  calculateJourneyProgress,
  calculateWorkProgress,
  canViewProject,
  completionStats,
  evaluateGate,
  groupProgress,
  isGroupableProject,
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
    expect(calculateJourneyProgress(state, "p-lemmic")).toBe(0);
    expect(calculateJourneyProgress(state, "p-resear")).toBe(20);
    expect(calculateJourneyProgress(state, "p-cdnv2")).toBe(40);
    expect(calculateJourneyProgress(state, "p-alert")).toBe(60);
    expect(calculateJourneyProgress(state, "p-posrv")).toBe(90);
    expect(calculateJourneyProgress(state, "p-simple")).toBe(100);
  });
});

describe("work progress", () => {
  it("uses task progress for pitching/running and form progress for form steps", () => {
    const state = createSeedState();
    expect(calculateWorkProgress(state, "p-resear", "survey")).toBe(50);
    expect(calculateWorkProgress(state, "p-cdnv2", "rab")).toBe(50);
    expect(calculateWorkProgress(state, "p-posrv", "bast")).toBe(100);
    expect(calculateWorkProgress(state, "p-posrv", "invoice")).toBe(0);
    expect(workProgressForProject(state, "p-posrv")).toBe(50);
    expect(workProgressForProject(state, "p-simple")).toBe(100);
  });
});

describe("gates", () => {
  it("blocks pitching until winner tasks and all pitching tasks are completed", () => {
    const state = createSeedState();
    expect(evaluateGate(state, "p-lemmic", "pitching").ready).toBe(false);
    for (const task of state.tasks) {
      if (task.projectId === "p-lemmic" && !task.archivedAt) {
        task.status = "completed";
      }
    }
    expect(evaluateGate(state, "p-lemmic", "pitching").ready).toBe(true);
  });

  it("blocks running while any task is active", () => {
    const state = createSeedState();
    expect(evaluateGate(state, "p-alert", "running").ready).toBe(false);
    for (const task of state.tasks) {
      if (task.projectId === "p-alert" && task.stepKey === "running") {
        task.status = "completed";
      }
    }
    expect(evaluateGate(state, "p-alert", "running").ready).toBe(true);
  });

  it("requires approved survey and rab", () => {
    const state = createSeedState();
    expect(evaluateGate(state, "p-resear", "survey").ready).toBe(false);
    state.forms.find(
      (form) => form.projectId === "p-resear" && form.stepKey === "survey",
    )!.status = "approved";
    expect(evaluateGate(state, "p-resear", "survey").ready).toBe(true);
  });

  it("requires submitted bast and invoice", () => {
    const state = createSeedState();
    expect(evaluateGate(state, "p-posrv", "bast").ready).toBe(true);
    expect(evaluateGate(state, "p-posrv", "invoice").ready).toBe(false);
  });
});

describe("task transitions", () => {
  it("only manager/admin can assign backlog to todo", () => {
    const state = createSeedState();
    const task = state.tasks.find((item) => item.id === "task-lem-010")!;
    task.assigneeId = "u-assignee1";
    const pm = userById(state, "u-pm1")!;
    const manager = userById(state, "u-manager")!;
    expect(taskTransition(state, pm, task, "todo").ok).toBe(false);
    expect(taskTransition(state, manager, task, "todo").ok).toBe(true);
  });

  it("assignee moves todo to in progress and awaiting approval", () => {
    const state = createSeedState();
    const task = state.tasks.find((item) => item.id === "task-lem-005")!;
    const assignee = userById(state, "u-assignee3")!;
    expect(taskTransition(state, assignee, task, "in_progress").ok).toBe(true);
    task.status = "in_progress";
    expect(taskTransition(state, assignee, task, "awaiting_approval").ok).toBe(true);
  });

  it("only pm owner/admin reviews awaiting approval", () => {
    const state = createSeedState();
    const task = state.tasks.find((item) => item.id === "task-lem-002")!;
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
        state.projects.find((project) => project.id === "p-alert")!,
      ),
    ).toBe(false);
    expect(visibleProjects({ ...state, currentUserId: "u-manager" }).length).toBe(
      state.projects.length,
    );
    expect(
      canViewProject(
        state,
        assignee,
        state.projects.find((project) => project.id === "p-alert")!,
      ),
    ).toBe(true);
    expect(
      canViewProject(
        state,
        assignee,
        state.projects.find((project) => project.id === "p-cdnv2")!,
      ),
    ).toBe(false);
    expect(visibleProjects({ ...state, currentUserId: "u-pm1" }).length).toBe(4);
    expect(manager.role).toBe("manager");
  });
});

describe("workload and groups", () => {
  it("counts only active card tasks by assignee", () => {
    const state = createSeedState();
    const rows = workloadRows(state);
    const eugene = rows.find((row) => row.user.id === "u-assignee1")!;
    const sigit = rows.find((row) => row.user.id === "u-assignee2")!;
    const andi = rows.find((row) => row.user.id === "u-assignee3")!;

    expect(eugene.activeCount).toBe(3);
    expect(sigit.activeCount).toBe(2);
    expect(andi.activeCount).toBe(3);
    expect(eugene.statusCounts.need_revision).toBe(1);
    expect(eugene.overdueCount).toBe(1);
  });

  it("counts completed projects, not average journey progress", () => {
    const state = createSeedState();
    expect(groupProgress(state, "group-q4")).toBe(0);

    state.projects.find((project) => project.id === "p-resear")!.status =
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
        state.projects.find((project) => project.id === "p-lemmic")!,
      ),
    ).toBe(true);
    expect(
      isGroupableProject(
        state.projects.find((project) => project.id === "p-alert")!,
      ),
    ).toBe(false);
    expect(
      isGroupableProject(
        state.projects.find((project) => project.id === "p-oldpro")!,
      ),
    ).toBe(false);
  });
});
