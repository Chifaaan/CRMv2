import { beforeEach, describe, expect, it } from "vitest";
import {
  calculateJourneyProgress,
  canEditPhaseStructure,
  createManualStage,
  journeyPhaseErrors,
  journeyStartErrors,
} from "../src/lib/prototype/domain";
import { usePrototypeStore } from "../src/lib/prototype/store";
import {
  closingStagesFor,
  createSeedTemplates,
  formTemplateForTitle,
  KOL_TEMPLATE_ID,
  UMUM_TEMPLATE_ID,
} from "../src/lib/prototype/templates";
import type {
  Project,
  ProjectStep,
  ProjectTemplate,
  TemplateStage,
} from "../src/lib/prototype/types";

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p-test",
    code: "TEST",
    name: "Proyek Uji",
    client: "Klien",
    description: "",
    priority: "medium",
    status: "active",
    startDate: "",
    targetEndDate: "",
    coverColor: "#000000",
    createdById: "u-pm1",
    createdAt: "2026-01-01T00:00:00.000Z",
    lifecycle: "active",
    structureLocked: false,
    phaseStates: {
      prospek: { authoredAt: "2026-01-01T00:00:00.000Z" },
    },
    ...overrides,
  };
}

function step(overrides: Partial<ProjectStep> = {}): ProjectStep {
  return {
    id: `step-${Math.random().toString(36).slice(2, 8)}`,
    projectId: "p-test",
    key: "step",
    name: "Tahap",
    phase: "prospek",
    order: 1,
    status: "pending",
    kind: "form",
    required: true,
    weight: 1,
    formTemplate: formTemplateForTitle("Tahap"),
    tasks: [],
    ...overrides,
  };
}

function createProject(input: { templateId?: string } = {}) {
  return usePrototypeStore.getState().createProject({
    name: "Proyek Uji",
    client: "Klien",
    description: "",
    priority: "medium",
    startDate: "",
    targetEndDate: "",
    coverColor: "#000000",
    ...input,
  });
}

function financeStage(
  id: string,
  financeKind: TemplateStage["financeKind"],
  phase: TemplateStage["phase"] = "closing",
): TemplateStage {
  return {
    id,
    name: financeKind === "bast"
      ? "BAST"
      : financeKind === "invoice"
        ? "Invoice"
        : "Pembayaran",
    phase,
    order: 1,
    kind: "finance_form",
    required: true,
    weight: financeKind === "payment" ? 1 : 0.5,
    financeKind,
    parallelGroup:
      financeKind === "bast" || financeKind === "invoice"
        ? "finance"
        : undefined,
    tasks: [],
  };
}

describe("journey phase validation", () => {
  it("rejects steps from another phase", () => {
    const result = journeyPhaseErrors(
      project(),
      "prospek",
      [createManualStage("planning", 1, "stage-wrong")],
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("fase yang dipilih"))).toBe(
      true,
    );
  });

  it("rejects duplicate finance kinds inside and across phases", () => {
    const inside = journeyPhaseErrors(
      project(),
      "closing",
      [financeStage("fin-1", "rab"), financeStage("fin-2", "rab")],
    );
    expect(inside.ok).toBe(false);
    expect(
      inside.errors.some((error) => error.includes("hanya boleh ada satu")),
    ).toBe(true);

    const across = journeyPhaseErrors(
      project(),
      "prospek",
      [financeStage("fin-3", "rab", "prospek")],
      [step({ id: "existing-rab", phase: "running", kind: "finance_form", financeKind: "rab" })],
    );
    expect(across.ok).toBe(false);
    expect(across.errors.some((error) => error.includes("fase lain"))).toBe(true);
  });

  it("requires a gate kind and a form template", () => {
    const missingGate = journeyPhaseErrors(project(), "prospek", [
      {
        ...createManualStage("prospek", 1, "gate-1"),
        kind: "gate",
        gateKind: undefined,
        formTemplate: undefined,
      },
    ]);
    expect(missingGate.ok).toBe(false);
    expect(
      missingGate.errors.some((error) => error.includes("jenis gerbang")),
    ).toBe(true);

    const missingForm = journeyPhaseErrors(project(), "prospek", [
      {
        ...createManualStage("prospek", 1, "form-1"),
        formTemplate: undefined,
      },
    ]);
    expect(missingForm.ok).toBe(false);
    expect(
      missingForm.errors.some((error) => error.includes("judul form")),
    ).toBe(true);
  });

  it("rejects manual Closing edits", () => {
    const result = journeyPhaseErrors(project(), "closing", []);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("Closing"))).toBe(true);
  });
});

describe("journey start validation", () => {
  it("requires at least one Prospek step", () => {
    const result = journeyStartErrors(project(), []);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("minimal satu"))).toBe(
      true,
    );
  });

  it("requires exactly one winning gate", () => {
    const missing = journeyStartErrors(project(), [
      step({ kind: "form", order: 1 }),
    ]);
    expect(missing.ok).toBe(false);
    expect(missing.errors.some((error) => error.includes("Gerbang"))).toBe(true);

    const duplicate = journeyStartErrors(project(), [
      step({ kind: "gate", gateKind: "client_approval", order: 1 }),
      step({ kind: "gate", gateKind: "client_approval", order: 2 }),
    ]);
    expect(duplicate.ok).toBe(false);
    expect(
      duplicate.errors.some((error) => error.includes("hanya boleh punya satu")),
    ).toBe(true);
  });

  it("requires the winning gate to be the final Prospek step", () => {
    const result = journeyStartErrors(project(), [
      step({ kind: "gate", gateKind: "client_approval", order: 1 }),
      step({ kind: "form", order: 2 }),
    ]);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some((error) => error.includes("tahap terakhir")),
    ).toBe(true);
  });

  it("accepts a final winning gate and exempts legacy Umum", () => {
    const valid = journeyStartErrors(project(), [
      step({ kind: "form", order: 1 }),
      step({ kind: "gate", gateKind: "client_approval", order: 2 }),
    ]);
    expect(valid.ok).toBe(true);

    const legacyTemplate = createSeedTemplates().find(
      (template) => template.id === UMUM_TEMPLATE_ID,
    );
    const legacy = journeyStartErrors(
      project({ templateId: UMUM_TEMPLATE_ID }),
      [step({ kind: "form" })],
      legacyTemplate,
    );
    expect(legacy.ok).toBe(true);
  });
});

describe("closing stages", () => {
  it("falls back to BAST, Invoice, and Pembayaran without a template", () => {
    const stages = closingStagesFor();
    expect(stages.map((stage) => stage.financeKind).sort()).toEqual([
      "bast",
      "invoice",
      "payment",
    ]);
    const bast = stages.find((stage) => stage.financeKind === "bast")!;
    const invoice = stages.find((stage) => stage.financeKind === "invoice")!;
    expect(bast.weight).toBe(0.5);
    expect(invoice.weight).toBe(0.5);
    expect(bast.parallelGroup).toBe("finance");
    expect(invoice.parallelGroup).toBe("finance");
  });

  it("keeps template Closing stages without duplicating BAST or Invoice", () => {
    const template = createSeedTemplates().find(
      (item) => item.id === KOL_TEMPLATE_ID,
    )!;
    const stages = closingStagesFor(template);
    expect(
      stages.filter((stage) => stage.financeKind === "bast"),
    ).toHaveLength(1);
    expect(
      stages.filter((stage) => stage.financeKind === "invoice"),
    ).toHaveLength(1);
  });

  it("adds missing BAST and Invoice to a template with partial Closing", () => {
    const template = createSeedTemplates().find(
      (item) => item.id === KOL_TEMPLATE_ID,
    )!;
    const partial: ProjectTemplate = {
      ...template,
      id: "tpl-partial",
      stages: template.stages.filter(
        (stage) => stage.phase !== "closing" || stage.financeKind === "payment",
      ),
    };
    const stages = closingStagesFor(partial);
    expect(stages.some((stage) => stage.financeKind === "bast")).toBe(true);
    expect(stages.some((stage) => stage.financeKind === "invoice")).toBe(true);
  });
});

describe("project creation and start", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("creates an empty manual journey without a template", () => {
    const projectId = createProject();
    const state = usePrototypeStore.getState();
    const created = state.projects.find((item) => item.id === projectId)!;
    const steps = state.steps.filter((item) => item.projectId === projectId);

    expect(created.templateId).toBeUndefined();
    expect(steps).toHaveLength(0);
    expect(created.phaseStates?.prospek?.authoredAt).toBeTruthy();
    expect(created.phaseStates?.prospek?.startedAt).toBeUndefined();
    expect(canEditPhaseStructure(created, "prospek")).toBe(true);
    expect(state.startPhase(projectId, "prospek")).toBe(false);
    expect(calculateJourneyProgress(state, projectId)).toBe(0);
    state.completeProject(projectId);
    expect(
      usePrototypeStore
        .getState()
        .projects.find((item) => item.id === projectId)?.status,
    ).toBe("active");
  });

  it("pre-fills template steps as pending and starts explicitly", () => {
    const projectId = createProject({ templateId: KOL_TEMPLATE_ID });
    const before = usePrototypeStore.getState();
    const steps = before.steps.filter((item) => item.projectId === projectId);
    expect(steps).toHaveLength(4);
    expect(steps.every((item) => item.status === "pending")).toBe(true);
    expect(steps.every((item) => !item.startedAt)).toBe(true);

    expect(before.startPhase(projectId, "prospek")).toBe(true);
    const after = usePrototypeStore.getState();
    const first = after.steps
      .filter((item) => item.projectId === projectId)
      .sort((a, b) => a.order - b.order)[0];
    const projectAfter = after.projects.find((item) => item.id === projectId)!;
    expect(first.status).toBe("active");
    expect(projectAfter.phaseStates?.prospek?.startedAt).toBeTruthy();
    expect(projectAfter.phaseStates?.prospek?.lockedAt).toBeTruthy();
    expect(
      after.setPhaseStructure(
        projectId,
        "prospek",
        after.templates.find((item) => item.id === KOL_TEMPLATE_ID)!.stages,
      ),
    ).toBe(false);
  });

  it("composes a manual Prospek draft and rejects it after start", () => {
    const projectId = createProject();
    const gate: TemplateStage = {
      ...createManualStage("prospek", 2, "manual-gate"),
      name: "Client Approval",
      kind: "gate",
      gateKind: "client_approval",
      formTemplate: undefined,
    };
    const form = createManualStage("prospek", 1, "manual-form", "Brief");
    expect(
      usePrototypeStore
        .getState()
        .setPhaseStructure(projectId, "prospek", [form, gate]),
    ).toBe(true);
    expect(usePrototypeStore.getState().startPhase(projectId, "prospek")).toBe(
      true,
    );
    expect(
      usePrototypeStore
        .getState()
        .setPhaseStructure(projectId, "prospek", [form, gate]),
    ).toBe(false);
  });
});

describe("Running and Closing materialization", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  function preparePhases(projectId: string) {
    usePrototypeStore.setState((state) => ({
      projects: state.projects.map((item) =>
        item.id === projectId
          ? {
              ...item,
              phaseStates: {
                ...item.phaseStates,
                prospek: {
                  ...item.phaseStates?.prospek,
                  startedAt: "2026-01-01T00:00:00.000Z",
                  lockedAt: "2026-01-01T00:00:00.000Z",
                },
                planning: {},
                running: {},
              },
            }
          : item,
      ),
      steps: state.steps.map((item) =>
        item.projectId === projectId && item.phase === "prospek"
          ? { ...item, status: "completed" as const }
          : item,
      ),
    }));
  }

  it("appends Closing once and keeps BAST and Invoice parallel", () => {
    const projectId = createProject({ templateId: KOL_TEMPLATE_ID });
    preparePhases(projectId);
    const planning = createManualStage("planning", 1, "manual-planning", "Planning");
    const running = createManualStage("running", 1, "manual-running", "Running");
    expect(
      usePrototypeStore
        .getState()
        .setPhaseStructure(projectId, "planning", [planning]),
    ).toBe(true);
    expect(
      usePrototypeStore
        .getState()
        .setPhaseStructure(projectId, "running", [running]),
    ).toBe(true);
    expect(usePrototypeStore.getState().startPhase(projectId, "planning")).toBe(
      true,
    );
    usePrototypeStore.setState((state) => ({
      steps: state.steps.map((item) =>
        item.projectId === projectId && item.phase === "planning"
          ? { ...item, status: "completed" as const }
          : item,
      ),
    }));
    expect(usePrototypeStore.getState().startPhase(projectId, "running")).toBe(
      true,
    );
    const closing = () =>
      usePrototypeStore
        .getState()
        .steps.filter(
          (item) => item.projectId === projectId && item.phase === "closing",
        );
    const first = closing();
    expect(first.some((item) => item.financeKind === "bast")).toBe(true);
    expect(first.some((item) => item.financeKind === "invoice")).toBe(true);
    expect(
      first.find((item) => item.financeKind === "bast")?.parallelGroup,
    ).toBe("finance");
    expect(
      first.find((item) => item.financeKind === "invoice")?.parallelGroup,
    ).toBe("finance");
    expect(usePrototypeStore.getState().startPhase(projectId, "running")).toBe(
      false,
    );
    expect(closing()).toHaveLength(first.length);
  });

  it("adds BAST and Invoice when the template Closing is partial", () => {
    const template = createSeedTemplates().find(
      (item) => item.id === KOL_TEMPLATE_ID,
    )!;
    const partial: ProjectTemplate = {
      ...template,
      id: "tpl-partial-run",
      stages: template.stages.filter(
        (stage) => stage.phase !== "closing" || stage.financeKind === "payment",
      ),
    };
    usePrototypeStore.setState((state) => ({
      templates: [...state.templates, partial],
    }));
    const projectId = createProject({ templateId: "tpl-partial-run" });
    preparePhases(projectId);
    const planning = createManualStage("planning", 1, "partial-planning", "Planning");
    const running = createManualStage("running", 1, "partial-running", "Running");
    usePrototypeStore
      .getState()
      .setPhaseStructure(projectId, "planning", [planning]);
    usePrototypeStore
      .getState()
      .setPhaseStructure(projectId, "running", [running]);
    usePrototypeStore.getState().startPhase(projectId, "planning");
    usePrototypeStore.setState((state) => ({
      steps: state.steps.map((item) =>
        item.projectId === projectId && item.phase === "planning"
          ? { ...item, status: "completed" as const }
          : item,
      ),
    }));
    expect(usePrototypeStore.getState().startPhase(projectId, "running")).toBe(
      true,
    );
    const closing = usePrototypeStore
      .getState()
      .steps.filter(
        (item) => item.projectId === projectId && item.phase === "closing",
      );
    expect(closing.some((item) => item.financeKind === "bast")).toBe(true);
    expect(closing.some((item) => item.financeKind === "invoice")).toBe(true);
  });
});

describe("legacy Umum bridge", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("starts without a gate and opens next phases after RAB", () => {
    const projectId = createProject({ templateId: UMUM_TEMPLATE_ID });
    expect(usePrototypeStore.getState().startPhase(projectId, "prospek")).toBe(
      true,
    );

    usePrototypeStore.setState((state) => ({
      steps: state.steps.map((item) => {
        if (item.projectId !== projectId) return item;
        if (item.key === "rab") {
          return { ...item, status: "active" as const };
        }
        if (item.key === "pitching" || item.key === "survey") {
          return { ...item, status: "completed" as const };
        }
        return item;
      }),
      forms: state.forms.map((form) =>
        form.projectId === projectId && form.type === "rab"
          ? { ...form, status: "approved" as const }
          : form,
      ),
    }));
    usePrototypeStore.getState().completeStep(projectId, "rab");

    const project = usePrototypeStore
      .getState()
      .projects.find((item) => item.id === projectId)!;
    expect(project.phaseStates?.planning).toBeTruthy();
    expect(project.phaseStates?.running).toBeTruthy();
    expect(project.phaseStates?.planning?.startedAt).toBeUndefined();
  });
});
