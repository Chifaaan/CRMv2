import { beforeEach, describe, expect, it } from "vitest";
import {
  calculateJourneyProgress,
  canEditProjectStructure,
  canManageTemplates,
  canViewProject,
  phaseOfProject,
  userById,
  validateTemplateStages,
} from "../src/lib/prototype/domain";
import { createSeedState } from "../src/lib/prototype/seed";
import { usePrototypeStore } from "../src/lib/prototype/store";
import { migratePersistedState } from "../src/lib/prototype/store";
import {
  KOL_TEMPLATE_ID,
  UMUM_TEMPLATE_ID,
  createSeedTemplates,
} from "../src/lib/prototype/templates";

function kolStages() {
  return createSeedTemplates().find(
    (template) => template.id === KOL_TEMPLATE_ID,
  )!.stages;
}

function completeFormStage(projectId: string, stepKey: string) {
  usePrototypeStore.getState().setCurrentUser("u-pm1");
  const entryId = usePrototypeStore
    .getState()
    .createFormEntry(projectId, stepKey, { title: "Entri uji" });
  usePrototypeStore.getState().setCurrentUser("u-manager");
  usePrototypeStore.getState().assignFormEntry(entryId, "u-assignee1");
  usePrototypeStore.getState().setCurrentUser("u-assignee1");
  usePrototypeStore
    .getState()
    .saveFormEntry(entryId, { values: {}, photos: [] });
  usePrototypeStore.getState().submitFormEntry(entryId);
  usePrototypeStore.getState().setCurrentUser("u-pm1");
  usePrototypeStore.getState().reviewFormEntry(entryId, "approved", "");
  usePrototypeStore.getState().completeStep(projectId, stepKey);
}

function completeFirstThreeKolStages(projectId: string) {
  for (let index = 0; index < 3; index += 1) {
    const step = usePrototypeStore
      .getState()
      .steps.filter((item) => item.projectId === projectId)
      .sort((a, b) => a.order - b.order)[index];
    completeFormStage(projectId, step.key);
  }
}

describe("template model", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("copies stages and tasks into the project", () => {
    const store = usePrototypeStore.getState();
    const projectId = store.createProject({
      name: "KOL Test",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      templateId: KOL_TEMPLATE_ID,
    });
    const project = usePrototypeStore
      .getState()
      .projects.find((item) => item.id === projectId)!;
    const steps = usePrototypeStore
      .getState()
      .steps.filter((step) => step.projectId === projectId);
    expect(project.templateId).toBe(KOL_TEMPLATE_ID);
    expect(project.structureLocked).toBe(true);
    expect(steps).toHaveLength(12);
    expect(steps[0].formTemplate?.title).toBe("Brief Received");
    expect(steps[0].status).toBe("active");
  });

  it("keeps existing projects independent from later template versions", () => {
    const store = usePrototypeStore.getState();
    const projectId = store.createProject({
      name: "KOL Test",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      templateId: KOL_TEMPLATE_ID,
    });
    const template = usePrototypeStore
      .getState()
      .templates.find((item) => item.id === KOL_TEMPLATE_ID)!;
    const changed = template.stages.map((stage, index) =>
      index === 0 ? { ...stage, name: "Brief Baru" } : stage,
    );
    const id = usePrototypeStore.getState().saveTemplate({
      id: KOL_TEMPLATE_ID,
      name: template.name,
      description: template.description,
      projectType: template.projectType,
      stages: changed,
      note: "ubah nama",
    });
    expect(id).toBe(KOL_TEMPLATE_ID);
    expect(
      usePrototypeStore
        .getState()
        .templates.find((item) => item.id === KOL_TEMPLATE_ID)!.version,
    ).toBe(template.version + 1);
    const step = usePrototypeStore
      .getState()
      .steps.find(
        (item) => item.projectId === projectId && item.order === 1,
      )!;
    expect(step.name).toBe("Brief Received");
  });

  it("rejects structure changes after the project exists", () => {
    const store = usePrototypeStore.getState();
    const projectId = store.createProject({
      name: "KOL Test",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      templateId: KOL_TEMPLATE_ID,
    });
    const project = usePrototypeStore
      .getState()
      .projects.find((item) => item.id === projectId)!;
    expect(canEditProjectStructure(project)).toBe(false);
    expect(
      usePrototypeStore.getState().setProjectStructure(projectId, kolStages()),
    ).toBe(false);
  });
});

describe("template validation", () => {
  it("accepts KOL and legacy Umum", () => {
    const templates = createSeedTemplates();
    const kol = templates.find((item) => item.id === KOL_TEMPLATE_ID)!;
    const umum = templates.find((item) => item.id === UMUM_TEMPLATE_ID)!;
    expect(validateTemplateStages(kol.stages).ok).toBe(true);
    expect(validateTemplateStages(umum.stages, { legacy: true }).ok).toBe(true);
  });

  it("requires one stage per phase and exactly one winning gate", () => {
    const stages = kolStages().filter((stage) => stage.phase !== "planning");
    const result = validateTemplateStages(stages);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("Planning"))).toBe(true);
  });

  it("rejects duplicate stage names and backward phase order", () => {
    const stages = kolStages();
    const duplicate = stages.map((stage, index) =>
      index === 1 ? { ...stage, name: stages[0].name } : stage,
    );
    expect(validateTemplateStages(duplicate).ok).toBe(false);

    const backward = stages.map((stage, index) =>
      index === 2 ? { ...stage, phase: "closing" as const } : stage,
    );
    expect(
      validateTemplateStages(backward).errors.some((error) =>
        error.includes("mundur"),
      ),
    ).toBe(true);
  });
});

describe("gate and lifecycle", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  function createKolProject() {
    return usePrototypeStore.getState().createProject({
      name: "KOL Gate",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      templateId: KOL_TEMPLATE_ID,
    });
  }

  it("approving the winning gate moves the project to Planning and locks RAB", () => {
    const projectId = createKolProject();
    completeFirstThreeKolStages(projectId);
    const gate = usePrototypeStore
      .getState()
      .steps.find(
        (step) =>
          step.projectId === projectId && step.gateKind === "client_approval",
      )!;
    expect(gate.status).toBe("active");
    usePrototypeStore.getState().decideGate(projectId, gate.key, "approved");
    const project = usePrototypeStore
      .getState()
      .projects.find((item) => item.id === projectId)!;
    expect(project.lifecycle).toBe("won");
    expect(project.rabBaselineLockedAt).toBeTruthy();
    expect(phaseOfProject(usePrototypeStore.getState(), projectId)).toBe(
      "planning",
    );
  });

  it("rejecting the gate marks the project Kalah with a reason and read-only", () => {
    const projectId = createKolProject();
    completeFirstThreeKolStages(projectId);
    const gate = usePrototypeStore
      .getState()
      .steps.find(
        (step) =>
          step.projectId === projectId && step.gateKind === "client_approval",
      )!;
    usePrototypeStore
      .getState()
      .decideGate(projectId, gate.key, "rejected", "Harga terlalu tinggi");
    const project = usePrototypeStore
      .getState()
      .projects.find((item) => item.id === projectId)!;
    expect(project.status).toBe("cancelled");
    expect(project.lifecycle).toBe("lost");
    expect(project.lostReason).toBe("Harga terlalu tinggi");
  });

  it("requires a reason for rejection", () => {
    const projectId = createKolProject();
    completeFirstThreeKolStages(projectId);
    const gate = usePrototypeStore
      .getState()
      .steps.find(
        (step) =>
          step.projectId === projectId && step.gateKind === "client_approval",
      )!;
    usePrototypeStore.getState().decideGate(projectId, gate.key, "rejected");
    const project = usePrototypeStore
      .getState()
      .projects.find((item) => item.id === projectId)!;
    expect(project.status).toBe("active");
  });
});

describe("progress and permissions", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("uses weighted stages for non-legacy templates", () => {
    const projectId = usePrototypeStore.getState().createProject({
      name: "KOL Progress",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      templateId: KOL_TEMPLATE_ID,
    });
    completeFirstThreeKolStages(projectId);
    // 3 completed form stages of 11 total weight (4 form + 1 gate + 4 simpro + 1 form + 0.5 + 0.5 + 1 payment).
    expect(
      calculateJourneyProgress(usePrototypeStore.getState(), projectId),
    ).toBe(27);
  });

  it("allows only Admin and PM to manage templates", () => {
    const state = createSeedState();
    expect(canManageTemplates(userById(state, "u-admin")!)).toBe(true);
    expect(canManageTemplates(userById(state, "u-pm1")!)).toBe(true);
    expect(canManageTemplates(userById(state, "u-manager")!)).toBe(false);
    expect(canManageTemplates(userById(state, "u-finance")!)).toBe(false);
    expect(canManageTemplates(userById(state, "u-assignee1")!)).toBe(false);
  });

  it("keeps PM project visibility unchanged", () => {
    const state = createSeedState();
    const pm2 = userById(state, "u-pm2")!;
    const alpha = state.projects.find((project) => project.id === "p-alpha")!;
    expect(canViewProject(state, pm2, alpha)).toBe(false);
  });
});

describe("persistence migration", () => {
  it("is idempotent and adds templates plus lifecycle", () => {
    const seed = createSeedState();
    const legacy = {
      ...seed,
      templates: undefined,
      prospeks: undefined,
      prospekPitchings: undefined,
      pitchingRabs: undefined,
      pitchingQuotations: undefined,
      prospekEvents: undefined,
      prospekPitchings: seed.prospekPitchings.map((pitching) => {
        const copy = { ...pitching };
        delete copy.statusBeforeLoss;
        delete copy.contractStatus;
        return copy;
      }),
      formEntries: seed.formEntries.map((entry) => {
        const copy = { ...entry };
        delete copy.scope;
        return copy;
      }),
      projects: seed.projects.map((project) => {
        const copy = { ...project };
        delete copy.templateId;
        delete copy.templateVersion;
        delete copy.lifecycle;
        delete copy.structureLocked;
        delete copy.managerId;
        return copy;
      }),
      steps: seed.steps.map((step) => ({
        ...step,
        phase:
          step.key === "bast" || step.key === "invoice"
            ? ("finance" as const)
            : step.key === "running"
              ? ("running" as const)
              : ("planning" as const),
        name: undefined,
        kind: undefined,
        tasks: undefined,
      })),
    };
    const once = migratePersistedState(legacy);
    const twice = migratePersistedState(once);
    expect(twice.templates?.length).toBe(3);
    expect(
      twice.projects?.every(
        (project) =>
          project.templateId === UMUM_TEMPLATE_ID &&
          project.lifecycle !== undefined &&
          project.structureLocked === true &&
          project.managerId === undefined,
      ),
    ).toBe(true);
    expect(
      twice.steps?.every((step) => step.kind && step.name && step.tasks),
    ).toBe(true);
    expect(
      twice.steps?.find((step) => step.key === "bast")?.phase,
    ).toBe("closing");
    expect(
      twice.steps?.find((step) => step.key === "pitching")?.phase,
    ).toBe("prospek");
    expect(twice.prospeks).toEqual([]);
    expect(twice.prospekPitchings).toHaveLength(seed.prospekPitchings.length);
    expect(twice.pitchingRabs).toEqual([]);
    expect(twice.pitchingQuotations).toEqual([]);
    expect(twice.prospekEvents).toEqual([]);
    expect(
      twice.prospekPitchings?.every(
        (pitching) =>
          (pitching.status !== "lost" || pitching.statusBeforeLoss !== undefined) &&
          (!pitching.contract || pitching.contractStatus !== undefined),
      ),
    ).toBe(true);
    expect(
      twice.formEntries?.every((entry) => entry.scope === "project"),
    ).toBe(true);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(migratePersistedState(twice)));
  });
});
