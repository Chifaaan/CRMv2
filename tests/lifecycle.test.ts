import { beforeEach, describe, expect, it } from "vitest";
import { usePrototypeStore } from "../src/lib/prototype/store";
import { UMUM_EXECUTION_TEMPLATE_ID } from "../src/lib/prototype/templates";
import type { Project } from "../src/lib/prototype/types";

function state() {
  return usePrototypeStore.getState();
}

function project(id: string): Project {
  return state().projects.find((item) => item.id === id)!;
}

function createTemplateProject() {
  state().setCurrentUser("u-pm1");
  return state().createProject({
    name: "Lifecycle Test",
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
}

function steps(projectId: string) {
  return state().steps
    .filter((step) => step.projectId === projectId)
    .sort((a, b) => a.order - b.order);
}

describe("post-prospek project lifecycle", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("creates template and manual projects unstarted", () => {
    const templateId = createTemplateProject();
    expect(project(templateId).creationMode).toBe("template");
    expect(project(templateId).startedAt).toBeUndefined();
    expect(steps(templateId).every((step) => step.status === "pending")).toBe(
      true,
    );

    state().setCurrentUser("u-pm1");
    const manualId = state().createProject({
      name: "Manual Test",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      mode: "manual",
    });
    expect(project(manualId).creationMode).toBe("manual");
    expect(project(manualId).startedAt).toBeUndefined();
    expect(steps(manualId)).toHaveLength(0);
  });

  it("starts in Planning or bypasses Planning to Running", () => {
    const planningId = createTemplateProject();
    expect(
      state().startProject(planningId, "planning", { managerPicId: "u-manager" }),
    ).toBe(true);
    const planningSteps = steps(planningId);
    expect(planningSteps.find((step) => step.status === "active")?.phase).toBe(
      "planning",
    );

    const runningId = createTemplateProject();
    expect(
      state().startProject(runningId, "running", { managerPicId: "u-manager" }),
    ).toBe(true);
    const runningSteps = steps(runningId);
    expect(
      runningSteps
        .filter((step) => step.phase === "planning")
        .every((step) => step.status === "skipped"),
    ).toBe(true);
    expect(runningSteps.find((step) => step.status === "active")?.phase).toBe(
      "running",
    );
  });

  it("manages pending steps and restricts started steps", () => {
    const projectId = createTemplateProject();
    state().startProject(projectId, "planning", { managerPicId: "u-manager" });
    const before = steps(projectId).length;
    const added = state().addProjectStep(projectId, {
      name: "Extra Planning",
      phase: "planning",
      managerPicId: "u-manager",
    });
    expect(added).not.toBe("");
    expect(steps(projectId)).toHaveLength(before + 1);

    expect(
      state().updateProjectStep(projectId, added, { name: "Renamed" }),
    ).toBe(true);
    const added2 = state().addProjectStep(projectId, {
      name: "Extra Planning 2",
      phase: "planning",
      managerPicId: "u-manager",
    });
    expect(state().reorderProjectStep(projectId, added2, "up")).toBe(true);
    expect(state().deleteProjectStep(projectId, added2)).toBe(true);
    expect(state().deleteProjectStep(projectId, added)).toBe(true);

    const active = steps(projectId).find((step) => step.status === "active")!;
    expect(
      state().updateProjectStep(projectId, active.id, {
        name: "Active Renamed",
        managerPicId: "u-manager",
      }),
    ).toBe(true);
    expect(
      state().updateProjectStep(projectId, active.id, { phase: "running" }),
    ).toBe(false);

    state().setCurrentUser("u-manager");
    expect(
      state().addProjectStep(projectId, {
        name: "Unauthorized",
        phase: "planning",
        managerPicId: "u-manager",
      }),
    ).toBe("");
  });

  it("runs the Kanban link, revision, step, and phase gates", () => {
    const projectId = createTemplateProject();
    state().startProject(projectId, "planning", { managerPicId: "u-manager" });
    const activeStep = steps(projectId).find((step) => step.status === "active")!;

    state().setCurrentUser("u-pm1");
    const taskId = state().createTask(projectId, {
      title: "Card",
      description: "",
      priority: "medium",
      stepKey: activeStep.key,
    });
    expect(taskId).not.toBe("");

    state().setCurrentUser("u-manager");
    state().assignTask(taskId, "u-assignee1");
    state().setCurrentUser("u-assignee1");
    state().transitionTask(taskId, "in_progress");
    expect(
      state().tasks.find((task) => task.id === taskId)?.status,
    ).toBe("todo");
    state().transitionTask(taskId, "in_progress", {
      workUrl: "catatan pekerjaan",
    });
    expect(
      state().tasks.find((task) => task.id === taskId)?.status,
    ).toBe("in_progress");
    state().transitionTask(taskId, "awaiting_approval");

    state().setCurrentUser("u-pm1");
    state().transitionTask(taskId, "need_revision");
    expect(
      state().tasks.find((task) => task.id === taskId)?.status,
    ).toBe("awaiting_approval");
    state().transitionTask(taskId, "need_revision", { comment: "Perbaiki" });
    expect(
      state().tasks.find((task) => task.id === taskId)?.status,
    ).toBe("need_revision");

    state().setCurrentUser("u-assignee1");
    state().transitionTask(taskId, "in_progress", {
      workUrl: "catatan pekerjaan v2",
    });
    state().transitionTask(taskId, "awaiting_approval");
    state().setCurrentUser("u-pm1");
    state().transitionTask(taskId, "completed");
    state().completeStep(projectId, activeStep.key);
    expect(
      steps(projectId).find((step) => step.id === activeStep.id)?.status,
    ).toBe("completed");
    expect(state().completeProjectPhase(projectId, "planning")).toBe(true);
    expect(project(projectId).phaseCompletedAt?.planning).toBeTruthy();
  });

  it("keeps Running empty for a manual Planning start and allows next-phase steps", () => {
    state().setCurrentUser("u-pm1");
    const projectId = state().createProject({
      name: "Manual Journey",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      mode: "manual",
    });
    expect(state().startProject(projectId, "planning", { managerPicId: "u-manager" })).toBe(true);
    expect(steps(projectId)).toHaveLength(0);
    const planning = state().addProjectStep(projectId, {
      name: "Planning Bebas",
      phase: "planning",
      managerPicId: "u-manager",
    });
    expect(planning).not.toBe("");
    expect(steps(projectId).find((step) => step.id === planning)?.status).toBe("active");
    const running = state().addProjectStep(projectId, {
      name: "Running Nanti",
      phase: "running",
      managerPicId: "u-manager",
    });
    expect(running).not.toBe("");
    expect(steps(projectId).find((step) => step.id === running)?.status).toBe("pending");
  });

  it("lets PM move a card to any status when an assignee exists", () => {
    state().setCurrentUser("u-pm1");
    const projectId = state().createProject({
      name: "PM Kanban",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      mode: "manual",
    });
    state().startProject(projectId, "planning", { managerPicId: "u-manager" });
    const stepId = state().addProjectStep(projectId, {
      name: "Step",
      phase: "planning",
      managerPicId: "u-manager",
    });
    const step = state().steps.find((item) => item.id === stepId)!;
    const taskId = state().createTask(projectId, {
      title: "Card PM",
      description: "",
      priority: "medium",
      stepKey: step.key,
    });
    state().setCurrentUser("u-manager");
    state().assignTask(taskId, "u-assignee1");

    state().setCurrentUser("u-pm1");
    state().transitionTask(taskId, "in_progress");
    expect(state().tasks.find((task) => task.id === taskId)?.status).toBe("todo");
    state().transitionTask(taskId, "in_progress", { workUrl: "catatan link" });
    expect(state().tasks.find((task) => task.id === taskId)?.status).toBe(
      "in_progress",
    );
    state().transitionTask(taskId, "need_revision", { comment: "Revisi" });
    expect(state().tasks.find((task) => task.id === taskId)?.status).toBe(
      "need_revision",
    );
    state().transitionTask(taskId, "completed");
    expect(state().tasks.find((task) => task.id === taskId)?.status).toBe(
      "completed",
    );
    state().transitionTask(taskId, "todo");
    expect(state().tasks.find((task) => task.id === taskId)?.status).toBe(
      "completed",
    );
  });

  it("rejects completing an empty SIMPRO step and cancelling started cards", () => {
    const projectId = createTemplateProject();
    state().startProject(projectId, "planning", { managerPicId: "u-manager" });
    const activeStep = steps(projectId).find((step) => step.status === "active")!;
    state().completeStep(projectId, activeStep.key);
    expect(
      steps(projectId).find((step) => step.id === activeStep.id)?.status,
    ).toBe("active");

    state().setCurrentUser("u-pm1");
    const taskId = state().createTask(projectId, {
      title: "Card",
      description: "",
      priority: "medium",
      stepKey: activeStep.key,
    });
    state().setCurrentUser("u-manager");
    state().assignTask(taskId, "u-assignee1");
    state().setCurrentUser("u-assignee1");
    state().transitionTask(taskId, "in_progress", {
      workUrl: "catatan pekerjaan",
    });
    state().setCurrentUser("u-pm1");
    state().deleteTask(taskId, "Batal");
    expect(
      state().tasks.find((task) => task.id === taskId)?.archivedAt,
    ).toBeUndefined();
  });
});
