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

    state().setTaskManager(taskId, "u-manager");
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
    expect(project(projectId).phaseCompletedAt?.planning).toBeTruthy();
    expect(
      steps(projectId).find((step) => step.status === "active")?.phase,
    ).toBe("running");
    expect(state().completeProjectPhase(projectId, "planning")).toBe(false);
  });

  it("auto-advances a finished phase and recovers a missing Manager PIC", () => {
    const projectId = createTemplateProject();
    state().startProject(projectId, "planning", { managerPicId: "u-manager" });
    const activeStep = steps(projectId).find((step) => step.status === "active")!;
    const runningFirst = steps(projectId).find(
      (step) => step.phase === "running",
    )!;
    usePrototypeStore.setState({
      steps: state().steps.map((step) =>
        step.id === runningFirst.id
          ? { ...step, managerPicId: undefined }
          : step,
      ),
      tasks: [
        ...state().tasks,
        {
          ...state().tasks[0],
          id: "task-planning-advance",
          projectId,
          stepKey: activeStep.key,
          stageId: activeStep.id,
          status: "completed" as const,
        },
      ],
    });

    expect(state().completeStep(projectId, activeStep.key)).toBe(true);
    expect(project(projectId).phaseCompletedAt?.planning).toBeTruthy();
    expect(steps(projectId).some((step) => step.status === "active")).toBe(
      false,
    );
    expect(
      steps(projectId).find((step) => step.id === runningFirst.id)?.status,
    ).toBe("pending");

    expect(
      state().updateProjectStep(projectId, runningFirst.id, {
        managerPicId: "u-manager",
      }),
    ).toBe(true);
    expect(
      steps(projectId).find((step) => step.id === runningFirst.id)?.status,
    ).toBe("active");
  });

  it("hands Prospek over to Planning when its last step finishes", () => {
    state().setCurrentUser("u-pm1");
    const projectId = state().createProject({
      name: "Prospek Handoff",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      mode: "manual",
      managerId: "u-manager",
    });
    const prospekStep = {
      id: "step-prospek-test",
      projectId,
      key: "step-prospek-test",
      name: "Prospek Test",
      phase: "prospek" as const,
      order: 1,
      status: "pending" as const,
      kind: "simpro" as const,
      required: true,
      weight: 1,
      tasks: [],
      managerPicId: "u-manager",
    };
    usePrototypeStore.setState({
      steps: [...state().steps, prospekStep],
    });
    expect(
      state().startProject(projectId, "prospek", {
        managerPicId: "u-manager",
      }),
    ).toBe(true);
    usePrototypeStore.setState({
      tasks: [
        ...state().tasks,
        {
          ...state().tasks[0],
          id: "task-prospek-advance",
          projectId,
          stepKey: prospekStep.key,
          stageId: prospekStep.id,
          status: "completed" as const,
        },
      ],
    });

    expect(state().completeStep(projectId, prospekStep.key)).toBe(true);
    expect(project(projectId).phaseCompletedAt?.prospek).toBeTruthy();
    const planningStep = state().addProjectStep(projectId, {
      name: "Planning Setelah Prospek",
      phase: "planning",
      managerPicId: "u-manager",
    });
    expect(planningStep).not.toBe("");
    expect(
      steps(projectId).find((step) => step.id === planningStep)?.status,
    ).toBe("active");
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

  it("auto-creates BAST and Invoice when Running becomes Finance", () => {
    state().setCurrentUser("u-pm1");
    const projectId = state().createProject({
      name: "Finance Auto",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      mode: "manual",
      managerId: "u-manager",
    });
    expect(
      state().startProject(projectId, "running", {
        managerPicId: "u-manager",
      }),
    ).toBe(true);
    const runningId = state().addProjectStep(projectId, {
      name: "Running Step",
      phase: "running",
      managerPicId: "u-manager",
    });
    expect(runningId).not.toBe("");
    usePrototypeStore.setState({
      steps: state().steps.map((step) =>
        step.id === runningId
          ? {
              ...step,
              status: "completed" as const,
              completedAt: new Date().toISOString(),
            }
          : step,
      ),
    });

    expect(state().completeProjectPhase(projectId, "running")).toBe(true);
    const financeSteps = steps(projectId).filter(
      (step) => step.phase === "finance",
    );
    expect(financeSteps.map((step) => step.financeKind)).toEqual([
      "bast",
      "invoice",
    ]);
    expect(
      financeSteps.find((step) => step.financeKind === "bast")?.status,
    ).toBe("active");
    expect(
      financeSteps.find((step) => step.financeKind === "invoice")?.status,
    ).toBe("pending");

    const extra = state().addProjectStep(projectId, {
      name: "Pembayaran",
      phase: "finance",
      financeKind: "payment",
      managerPicId: "u-manager",
    });
    expect(extra).not.toBe("");
    expect(
      steps(projectId).filter((step) => step.phase === "finance"),
    ).toHaveLength(3);
  });

  it("lets PM edit and delete pending steps copied from a template", () => {
    state().setCurrentUser("u-pm1");
    const projectId = createTemplateProject();
    expect(projectId).not.toBe("");
    const pending = steps(projectId).find((step) => step.status === "pending");
    expect(pending).toBeDefined();
    expect(
      state().updateProjectStep(projectId, pending!.id, { name: "Renamed Step" }),
    ).toBe(true);
    expect(state().deleteProjectStep(projectId, pending!.id)).toBe(true);
    expect(state().steps.some((step) => step.id === pending!.id)).toBe(false);
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
    state().setTaskManager(taskId, "u-manager");
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
    state().setTaskManager(taskId, "u-manager");
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
