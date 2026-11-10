import { beforeEach, describe, expect, it } from "vitest";
import { usePrototypeStore } from "../src/lib/prototype/store";
import {
  ensureMandatoryStages,
  mandatoryStagesForPhases,
  missingMandatoryProjectSteps,
  MANDATORY_STEP_SPECS,
} from "../src/lib/prototype/mandatory-steps";
import {
  createSeedTemplates,
  KOL_TEMPLATE_ID,
  KOL_EXECUTION_TEMPLATE_ID,
  EVENT_TEMPLATE_ID,
  EVENT_EXECUTION_TEMPLATE_ID,
} from "../src/lib/prototype/templates";
import { validateTemplateStages } from "../src/lib/prototype/domain";
import type { Project, ProjectStep, TemplateStage } from "../src/lib/prototype/types";

function state() {
  return usePrototypeStore.getState();
}

function steps(projectId: string): ProjectStep[] {
  return state()
    .steps.filter((step) => step.projectId === projectId)
    .sort((a, b) => a.order - b.order);
}

function project(id: string): Project {
  return state().projects.find((item) => item.id === id)!;
}

function prospekStages(): TemplateStage[] {
  const execution = createSeedTemplates().find(
    (template) => template.id === KOL_EXECUTION_TEMPLATE_ID,
  )!;
  return ensureMandatoryStages([
    {
      id: "tpl-prospek-rab",
      name: "RAB",
      phase: "prospek",
      order: 1,
      kind: "finance_form",
      required: true,
      weight: 1,
      financeKind: "rab",
      tasks: [],
    },
    {
      id: "tpl-prospek-decision",
      name: "Decision Win / Loss",
      phase: "prospek",
      order: 2,
      kind: "gate",
      required: true,
      weight: 1,
      gateKind: "client_approval",
      tasks: [],
    },
    ...execution.stages,
  ]);
}

function createProspekTemplate(): string {
  state().setCurrentUser("u-pm1");
  return state().saveTemplate({
    name: "KOL Prospek Uji",
    description: "Template uji dengan fase Prospek.",
    projectType: "KOL",
    stages: prospekStages(),
    note: "Uji mandatory.",
  });
}

function templateProject() {
  state().setCurrentUser("u-pm1");
  return state().createProject({
    name: "Mandatory Test",
    client: "Klien",
    description: "",
    priority: "medium",
    startDate: "",
    targetEndDate: "",
    coverColor: "#000000",
    mode: "template",
    templateId: createProspekTemplate(),
    managerId: "u-manager",
  });
}

function prospekProject() {
  state().setCurrentUser("u-pm1");
  return state().createProject({
    name: "Prospek Project",
    client: "Klien",
    description: "",
    priority: "medium",
    startDate: "",
    targetEndDate: "",
    coverColor: "#000000",
    mode: "template",
    templateId: createProspekTemplate(),
    stages: prospekStages(),
    managerId: "u-manager",
  });
}

describe("mandatory template steps", () => {
  beforeEach(() => {
    state().reset();
  });

  it("adds mandatory steps to a template that includes the phase", () => {
    const stages: TemplateStage[] = [
      {
        id: "s-planning",
        name: "Kickoff",
        phase: "planning",
        order: 1,
        kind: "simpro",
        required: true,
        weight: 1,
        tasks: [],
      },
      {
        id: "s-running",
        name: "Execution",
        phase: "running",
        order: 2,
        kind: "simpro",
        required: true,
        weight: 1,
        tasks: [],
      },
      {
        id: "s-finance",
        name: "Report",
        phase: "finance",
        order: 3,
        kind: "form",
        required: true,
        weight: 1,
        formTemplate: { title: "Report", defaultFields: { executionDate: { enabled: true, required: true }, location: { enabled: true, required: true }, notes: { enabled: true, required: false }, photos: { enabled: true, required: false } }, fields: [] },
        tasks: [],
      },
    ];
    const ensured = ensureMandatoryStages(stages);
    expect(ensured.some((stage) => stage.phase === "finance" && stage.financeKind === "bast")).toBe(true);
    expect(ensured.some((stage) => stage.phase === "finance" && stage.financeKind === "invoice")).toBe(true);

    const withProspek = ensureMandatoryStages([
      ...stages,
      { ...stages[0], id: "s-prospek", phase: "prospek", name: "Brief" },
    ]);
    expect(withProspek.some((stage) => stage.phase === "prospek" && stage.financeKind === "rab")).toBe(true);
    expect(
      withProspek.some(
        (stage) => stage.phase === "prospek" && stage.gateKind === "client_approval",
      ),
    ).toBe(true);
  });

  it("rejects templates that miss a mandatory step", () => {
    const stages = createSeedTemplates()
      .find((template) => template.id === KOL_TEMPLATE_ID)!
      .stages.filter((stage) => !(stage.phase === "prospek" && stage.financeKind === "rab"));
    const result = validateTemplateStages(stages);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("RAB"))).toBe(true);
  });

  it("excludes Prospek by default and keeps Finance mandatory steps", () => {
    const projectId = templateProject();
    const projectSteps = steps(projectId);
    expect(projectSteps.some((step) => step.phase === "prospek")).toBe(false);
    expect(projectSteps.some((step) => step.phase === "finance" && step.financeKind === "bast")).toBe(true);
    expect(projectSteps.some((step) => step.phase === "finance" && step.financeKind === "invoice")).toBe(true);
    expect(project(projectId).managerId).toBe("u-manager");
  });

  it("creates Prospek mandatory steps when included at creation", () => {
    const projectId = prospekProject();
    const projectSteps = steps(projectId);
    expect(projectSteps.some((step) => step.phase === "prospek" && step.financeKind === "rab")).toBe(true);
    expect(projectSteps.some((step) => step.phase === "prospek" && step.gateKind === "client_approval")).toBe(true);
    expect(projectSteps.some((step) => step.phase === "finance" && step.financeKind === "bast")).toBe(true);
    expect(projectSteps.some((step) => step.phase === "finance" && step.financeKind === "invoice")).toBe(true);
  });

  it("creates Finance mandatory steps for manual projects", () => {
    state().setCurrentUser("u-pm1");
    const projectId = state().createProject({
      name: "Manual Finance",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      mode: "manual",
      stages: ensureMandatoryStages(mandatoryStagesForPhases(["finance"])),
      managerId: "u-manager",
    });
    const projectSteps = steps(projectId);
    expect(projectSteps.some((step) => step.phase === "finance" && step.financeKind === "bast")).toBe(true);
    expect(projectSteps.some((step) => step.phase === "finance" && step.financeKind === "invoice")).toBe(true);
    expect(projectSteps.some((step) => step.phase === "prospek")).toBe(false);
    expect(projectSteps.every((step) => step.status === "pending")).toBe(true);
  });

  it("creates Prospek mandatory steps for manual projects when included", () => {
    state().setCurrentUser("u-pm1");
    const stages = ensureMandatoryStages(
      mandatoryStagesForPhases(["prospek", "finance"]),
    );
    const projectId = state().createProject({
      name: "Manual Prospek",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      mode: "manual",
      stages,
      managerId: "u-manager",
    });
    expect(
      steps(projectId).some(
        (step) => step.phase === "prospek" && step.financeKind === "rab",
      ),
    ).toBe(true);
    expect(
      steps(projectId).some(
        (step) => step.phase === "prospek" && step.gateKind === "client_approval",
      ),
    ).toBe(true);
  });

  it("starts a Prospek project from Prospek and blocks skipping to Planning", () => {
    const projectId = prospekProject();
    expect(state().startProject(projectId, "planning", { managerPicId: "u-manager" })).toBe(false);
    expect(state().startProject(projectId, "prospek", { managerPicId: "u-manager" })).toBe(true);
    expect(project(projectId).initialPhase).toBe("prospek");
    expect(steps(projectId)[0].status).toBe("active");
    expect(steps(projectId)[0].phase).toBe("prospek");
  });

  it("adds a step to the requested phase instead of Running", () => {
    const projectId = prospekProject();
    expect(state().startProject(projectId, "prospek", { managerPicId: "u-manager" })).toBe(true);
    state().setCurrentUser("u-pm1");
    const id = state().addProjectStep(projectId, {
      name: "Briefing Tambahan",
      phase: "planning",
      kind: "simpro",
      managerPicId: "u-manager",
    });
    expect(id).not.toBe("");
    const created = steps(projectId).find((step) => step.id === id)!;
    expect(created.phase).toBe("planning");
    expect(created.name).toBe("Briefing Tambahan");
  });

  it("does not duplicate existing mandatory steps", () => {
    const projectId = prospekProject();
    state().setCurrentUser("u-pm1");
    state().addProjectStep(projectId, {
      name: "Prospek Opsional",
      phase: "prospek",
      kind: "simpro",
      managerPicId: "u-manager",
    });
    const rabSteps = steps(projectId).filter(
      (step) => step.phase === "prospek" && step.financeKind === "rab",
    );
    expect(rabSteps).toHaveLength(1);
  });

  it("creates BAST and Invoice when Finance already has another step", () => {
    const current = project(templateProject());
    const projectSteps: ProjectStep[] = [
      {
        id: "step-finance-report",
        projectId: current.id,
        key: "report",
        name: "Report",
        phase: "finance",
        order: 1,
        status: "pending",
        kind: "form",
        required: true,
        weight: 1,
        tasks: [],
      },
    ];
    const missing = missingMandatoryProjectSteps(current, projectSteps);
    expect(missing.map((step) => step.financeKind).sort()).toEqual([
      "bast",
      "invoice",
    ]);
  });

  it("ships Prospek with RAB and Decision on Event templates", () => {
    const templates = createSeedTemplates();
    for (const id of [EVENT_TEMPLATE_ID, EVENT_EXECUTION_TEMPLATE_ID]) {
      const template = templates.find((item) => item.id === id)!;
      expect(template.stages.some((stage) => stage.phase === "prospek" && stage.financeKind === "rab")).toBe(true);
      expect(
        template.stages.some(
          (stage) => stage.phase === "prospek" && stage.gateKind === "client_approval",
        ),
      ).toBe(true);
      expect(validateTemplateStages(template.stages, { legacy: template.legacy }).ok).toBe(true);
    }
  });

  it("keeps mandatory specs stable", () => {
    expect(MANDATORY_STEP_SPECS.map((spec) => spec.name)).toEqual([
      "RAB",
      "Decision Win / Loss",
      "BAST",
      "Invoice",
    ]);
  });
});
