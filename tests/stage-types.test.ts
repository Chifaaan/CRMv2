import { beforeEach, describe, expect, it } from "vitest";
import {
  calculateJourneyProgress,
  canAssignFormEntry,
  canEditFormEntry,
  canReviewFormEntry,
  evaluateGate,
  formsNeedingAction,
  tasksForAssignee,
  userById,
  validateTemplateStages,
  workloadRows,
} from "../src/lib/prototype/domain";
import { createSeedState } from "../src/lib/prototype/seed";
import { usePrototypeStore } from "../src/lib/prototype/store";
import { migratePersistedState } from "../src/lib/prototype/store";
import { getValidationErrors } from "../src/lib/prototype/form-versions";
import {
  KOL_TEMPLATE_ID,
  createSeedTemplates,
} from "../src/lib/prototype/templates";
import type {
  AppState,
  PaymentPayload,
  ProjectStep,
  Task,
  TemplateStage,
} from "../src/lib/prototype/types";

function createKolProject() {
  const projectId = usePrototypeStore.getState().createProject({
    name: "KOL Stage Test",
    client: "Klien",
    description: "",
    priority: "medium",
    startDate: "",
    targetEndDate: "",
    coverColor: "#000000",
    templateId: KOL_TEMPLATE_ID,
  });
  usePrototypeStore.getState().startPhase(projectId, "prospek");
  return projectId;
}

function firstStep(projectId: string) {
  return usePrototypeStore
    .getState()
    .steps.filter((step) => step.projectId === projectId)
    .sort((a, b) => a.order - b.order)[0];
}

function createAssignedSubmittedEntry(projectId: string, stepKey: string) {
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
  return entryId;
}

function task(partial: Partial<Task>): Task {
  return {
    id: `task-${Math.random().toString(36).slice(2, 8)}`,
    code: "T-1",
    projectId: "p-epsilon",
    stepKey: "running",
    title: "Task uji",
    description: "",
    priority: "medium",
    status: "backlog",
    reporterId: "u-pm2",
    createdAt: new Date().toISOString(),
    checklist: [],
    comments: [],
    attachments: [],
    ...partial,
  };
}

describe("stage type validation", () => {
  it("requires a form template for Form stages", () => {
    const stage: TemplateStage = {
      id: "stage-1",
      name: "Brief",
      phase: "prospek",
      order: 1,
      kind: "form",
      required: true,
      weight: 1,
      tasks: [],
    };
    expect(validateTemplateStages([stage], { legacy: true }).ok).toBe(false);
  });

  it("accepts all four stage kinds and payment finance form", () => {
    const templates = createSeedTemplates();
    const kol = templates.find((item) => item.id === KOL_TEMPLATE_ID)!;
    const kinds = new Set(kol.stages.map((stage) => stage.kind));
    expect(kinds.has("form")).toBe(true);
    expect(kinds.has("simpro")).toBe(true);
    expect(kinds.has("gate")).toBe(true);
    expect(kinds.has("finance_form")).toBe(true);
    expect(
      kol.stages.some(
        (stage) =>
          stage.kind === "finance_form" && stage.financeKind === "payment",
      ),
    ).toBe(true);
  });
});

describe("form stage completion", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("requires every entry approved and ignores cancelled entries", () => {
    const projectId = createKolProject();
    const step = firstStep(projectId);
    expect(evaluateGate(usePrototypeStore.getState(), projectId, step.key).ready).toBe(false);

    const entryId = createAssignedSubmittedEntry(projectId, step.key);
    expect(evaluateGate(usePrototypeStore.getState(), projectId, step.key).ready).toBe(false);

    usePrototypeStore.getState().reviewFormEntry(entryId, "approved", "");
    expect(evaluateGate(usePrototypeStore.getState(), projectId, step.key).ready).toBe(true);

    const secondId = usePrototypeStore
      .getState()
      .createFormEntry(projectId, step.key, { title: "Entri batal" });
    usePrototypeStore.getState().cancelFormEntry(secondId, "Tidak dipakai");
    expect(evaluateGate(usePrototypeStore.getState(), projectId, step.key).ready).toBe(true);
  });

  it("allows closing an empty form stage only with explicit confirmation", () => {
    const projectId = createKolProject();
    const step = firstStep(projectId);
    expect(evaluateGate(usePrototypeStore.getState(), projectId, step.key).ready).toBe(false);
    usePrototypeStore.getState().confirmNoWork(projectId, step.key, "Tidak ada brief");
    expect(evaluateGate(usePrototypeStore.getState(), projectId, step.key).ready).toBe(true);
  });
});

describe("SIMPRO stage completion", () => {
  it("requires no remaining tasks or explicit confirmation", () => {
    const state = createSeedState();
    const step = state.steps.find(
      (item) => item.projectId === "p-epsilon" && item.key === "running",
    )!;
    expect(evaluateGate(state, "p-epsilon", "running").ready).toBe(false);

    state.steps = state.steps.map((item) =>
      item.id === step.id ? { ...item, noWorkConfirmedAt: "2026-11-01" } : item,
    );
    expect(evaluateGate(state, "p-epsilon", "running").ready).toBe(true);

    state.tasks = [
      ...state.tasks,
      task({ status: "completed", stageId: step.id }),
    ];
    expect(evaluateGate(state, "p-epsilon", "running").ready).toBe(true);

    state.tasks = [...state.tasks, task({ status: "backlog", stageId: step.id })];
    expect(evaluateGate(state, "p-epsilon", "running").ready).toBe(false);
  });
});

describe("form permissions and separation", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("keeps assign, edit, and review rights separate", () => {
    const projectId = createKolProject();
    const step = firstStep(projectId);
    const entryId = usePrototypeStore
      .getState()
      .createFormEntry(projectId, step.key, { title: "Entri izin" });
    let entry = usePrototypeStore
      .getState()
      .formEntries.find((item) => item.id === entryId)!;
    const state = usePrototypeStore.getState();
    const assignee1 = userById(state, "u-assignee1")!;
    const assignee2 = userById(state, "u-assignee2")!;
    const pm2 = userById(state, "u-pm2")!;

    expect(canEditFormEntry(state, assignee1, entry)).toBe(false);
    expect(canAssignFormEntry(assignee1)).toBe(false);
    expect(canAssignFormEntry(userById(state, "u-manager")!)).toBe(true);

    usePrototypeStore.getState().setCurrentUser("u-manager");
    usePrototypeStore.getState().assignFormEntry(entryId, "u-assignee1");
    entry = usePrototypeStore
      .getState()
      .formEntries.find((item) => item.id === entryId)!;
    const assignedState = usePrototypeStore.getState();
    expect(canEditFormEntry(assignedState, assignee1, entry)).toBe(true);
    expect(canEditFormEntry(assignedState, assignee2, entry)).toBe(false);

    usePrototypeStore.getState().setCurrentUser("u-assignee1");
    usePrototypeStore
      .getState()
      .saveFormEntry(entryId, { values: {}, photos: [] });
    usePrototypeStore.getState().submitFormEntry(entryId);
    entry = usePrototypeStore
      .getState()
      .formEntries.find((item) => item.id === entryId)!;
    const submitted = usePrototypeStore.getState();
    expect(canReviewFormEntry(submitted, userById(submitted, "u-pm1")!, entry)).toBe(true);
    expect(canReviewFormEntry(submitted, pm2, entry)).toBe(false);
  });

  it("counts forms for the badge and workload but never in My Tasks", () => {
    const projectId = createKolProject();
    const step = firstStep(projectId);
    const entryId = usePrototypeStore
      .getState()
      .createFormEntry(projectId, step.key, { title: "Entri badge" });
    usePrototypeStore.getState().setCurrentUser("u-manager");
    usePrototypeStore.getState().assignFormEntry(entryId, "u-assignee1");

    const state = usePrototypeStore.getState();
    expect(formsNeedingAction(state, "u-assignee1")).toBe(1);
    expect(
      tasksForAssignee(state, "u-assignee1").some((task) => task.id === entryId),
    ).toBe(false);
    const row = workloadRows(state).find((item) => item.user.id === "u-assignee1")!;
    expect(row.activeFormCount).toBe(1);
  });
});

describe("checklist to form migration", () => {
  it("is idempotent and keeps journey progress identical", () => {
    const seed = createSeedState();
    const project = seed.projects.find((item) => item.id === "p-alpha")!;
    const step: ProjectStep = {
      id: "step-p-alpha-custom-stage",
      projectId: "p-alpha",
      key: "custom-stage",
      name: "Tahap lama",
      phase: "prospek",
      order: 1,
      status: "completed",
      kind: "checklist" as unknown as ProjectStep["kind"],
      required: true,
      weight: 1,
      tasks: [
        { id: "t1", name: "Cek brief", role: "PM", required: true, done: true },
      ],
      legacyKey: undefined,
    };
    const legacy: AppState = {
      ...seed,
      templates: [],
      projects: [{ ...project, templateId: "tpl-custom", templateVersion: 1 }],
      steps: [step],
      forms: [],
      tasks: [],
      formEntries: [],
    };
    const before = calculateJourneyProgress(legacy, "p-alpha");
    const once = migratePersistedState(legacy);
    const twice = migratePersistedState(once);
    const migratedStep = (once.steps as ProjectStep[])[0];
    expect(migratedStep.kind).toBe("form");
    expect(migratedStep.formTemplate?.fields[0].type).toBe("checklist");
    expect(migratedStep.formTemplate?.fields[0].options).toEqual(["Cek brief"]);
    expect(
      calculateJourneyProgress(once as unknown as AppState, "p-alpha"),
    ).toBe(before);
    expect(JSON.stringify((twice.steps as ProjectStep[])[0])).toBe(
      JSON.stringify(migratedStep),
    );
  });
});

describe("payment finance form", () => {
  it("validates payment fields", () => {
    const payload: PaymentPayload = {
      paymentDate: "",
      amount: 0,
      method: "",
      status: "paid",
      notes: "",
    };
    const issues = getValidationErrors("payment", payload);
    expect(issues.map((issue) => issue.key)).toEqual(
      expect.arrayContaining(["paymentDate", "amount", "method", "proof"]),
    );
  });

  it("keeps the legacy finance forms working", () => {
    const state = createSeedState();
    expect(evaluateGate(state, "p-epsilon", "bast").ready).toBe(true);
    expect(evaluateGate(state, "p-epsilon", "invoice").ready).toBe(false);
  });
});
