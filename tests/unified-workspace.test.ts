import { beforeEach, describe, expect, it } from "vitest";
import { createSeedState } from "../src/lib/prototype/seed";
import { migratePersistedState, usePrototypeStore } from "../src/lib/prototype/store";
import {
  commercialProjectRows,
  formLabel,
  groupProgress,
  landingForRole,
  projectCommercialTotals,
  projectBoardTasks,
  projectWorkspaceTabs,
  roleCanAccessBusiness,
  roleCanBrowseProjects,
  roleCanSeeCommercialTotals,
  roleCanViewUmbrella,
  tasksForAssignee,
} from "../src/lib/prototype/domain";
import { MANDATORY_STEP_SPECS } from "../src/lib/prototype/mandatory-steps";
import type { AppState, ProjectStep, StepForm } from "../src/lib/prototype/types";
import { FORM_STEP_KEYS } from "../src/lib/prototype/types";

function moForm(projectId: string, status: StepForm["status"] = "assigned"): StepForm {
  return {
    id: `form-${projectId}-mo`,
    projectId,
    stepKey: "mo",
    type: "mo",
    status,
    payload: { notes: "" },
    versions: [],
    createdAt: "2026-10-01T00:00:00.000Z",
  };
}

describe("workspace access and tabs", () => {
  it("labels every finance form key", () => {
    for (const key of FORM_STEP_KEYS) {
      expect(formLabel(key).length).toBeGreaterThan(0);
    }
    expect(formLabel("mo")).toBe("Media Order");
  });
  it("lands commercial roles on the unified dashboard", () => {
    expect(landingForRole("admin")).toBe("/dashboard");
    expect(landingForRole("pm")).toBe("/dashboard");
    expect(landingForRole("finance")).toBe("/dashboard");
    expect(landingForRole("assignee")).toBe("/my-tasks");
    expect(landingForRole("bod")).toBe("/business");
  });

  it("opens Business to commercial roles and project browsing to assignees", () => {
    expect(roleCanAccessBusiness("manager")).toBe(true);
    expect(roleCanAccessBusiness("finance")).toBe(true);
    expect(roleCanAccessBusiness("assignee")).toBe(false);
    expect(roleCanBrowseProjects("assignee")).toBe(true);
    expect(roleCanBrowseProjects("media")).toBe(false);
    expect(roleCanSeeCommercialTotals("assignee")).toBe(false);
  });

  it("scopes project detail tabs by role", () => {
    expect(projectWorkspaceTabs("assignee")).toEqual([
      "overview",
      "board",
      "backlog",
    ]);
    expect(projectWorkspaceTabs("finance")).toEqual([
      "overview",
      "journey",
      "forms",
      "media",
    ]);
    expect(projectWorkspaceTabs("pm")).toContain("journey");
    expect(projectWorkspaceTabs("pm")).toContain("media");
    expect(projectWorkspaceTabs("media")).toEqual([]);
    expect(projectWorkspaceTabs("bod")).toEqual([]);
  });

  it("limits Umbrella detail and computes progress without cancelled members", () => {
    expect(roleCanViewUmbrella("pm")).toBe(true);
    expect(roleCanViewUmbrella("finance")).toBe(true);
    expect(roleCanViewUmbrella("assignee")).toBe(false);
    expect(roleCanViewUmbrella("media")).toBe(false);

    const seed = createSeedState();
    const base = seed.projects[0];
    const state: AppState = {
      ...seed,
      projects: [
        { ...base, id: "u-done", groupId: "g", status: "completed" },
        { ...base, id: "u-active", groupId: "g", status: "active" },
        { ...base, id: "u-cancelled", groupId: "g", status: "cancelled" },
      ],
    };
    expect(groupProgress(state, "g")).toBe(50);
  });
});

describe("Media Order Finance form", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("ensures one MO form per project idempotently", () => {
    const store = usePrototypeStore.getState();
    usePrototypeStore.setState({
      forms: store.forms.filter(
        (form) => !(form.projectId === "p-alpha" && form.type === "mo"),
      ),
    });
    const first = usePrototypeStore.getState().ensureMoForm("p-alpha");
    const second = usePrototypeStore.getState().ensureMoForm("p-alpha");
    expect(first).toBe("form-p-alpha-mo");
    expect(second).toBe(first);
    expect(
      usePrototypeStore
        .getState()
        .forms.filter((form) => form.projectId === "p-alpha" && form.type === "mo"),
    ).toHaveLength(1);
  });

  it("blocks submitting an MO form without a document", () => {
    usePrototypeStore.setState({
      currentUserId: "u-finance",
      forms: [moForm("p-beta")],
      mediaOrders: [],
    });
    usePrototypeStore.getState().submitForm("form-p-beta-mo");
    expect(
      usePrototypeStore.getState().forms.find((form) => form.id === "form-p-beta-mo")
        ?.status,
    ).toBe("assigned");
  });

  it("assigns the MO form to Finance and audits it", () => {
    usePrototypeStore.setState({
      currentUserId: "u-manager",
      forms: [moForm("p-beta", "unassigned")],
      projectEvents: [],
    });
    usePrototypeStore.getState().assignForm("form-p-beta-mo", "u-finance");
    const form = usePrototypeStore
      .getState()
      .forms.find((item) => item.id === "form-p-beta-mo");
    expect(form?.assigneeId).toBe("u-finance");
    expect(form?.status).toBe("assigned");
    expect(
      usePrototypeStore
        .getState()
        .projectEvents.some((event) => event.eventType === "mo.assigned"),
    ).toBe(true);
  });

  it("never treats Media Order as a mandatory step", () => {
    expect(
      MANDATORY_STEP_SPECS.some((spec) => spec.financeKind === "mo"),
    ).toBe(false);
  });

  it("submits and approves once a document exists", () => {
    const seed = createSeedState();
    usePrototypeStore.setState({
      currentUserId: "u-finance",
      forms: [moForm("p-beta")],
      mediaOrders: [
        { ...seed.mediaOrders[0], id: "mo-beta", projectId: "p-beta" },
      ],
    });
    usePrototypeStore.getState().submitForm("form-p-beta-mo");
    expect(
      usePrototypeStore.getState().forms.find((form) => form.id === "form-p-beta-mo")
        ?.status,
    ).toBe("submitted");

    usePrototypeStore.setState({ currentUserId: "u-admin" });
    usePrototypeStore.getState().reviewForm("form-p-beta-mo", "approved", "");
    expect(
      usePrototypeStore.getState().forms.find((form) => form.id === "form-p-beta-mo")
        ?.status,
    ).toBe("approved");
  });

  it("ships Umbrella and MO fixtures once", () => {
    const seed = createSeedState();
    expect(seed.groups[0].name).toContain("Umbrella");
    expect(
      seed.forms.filter((form) => form.type === "mo").length,
    ).toBeGreaterThan(0);
    expect(
      seed.mediaOrders.some((order) => order.projectId === "p-gamma"),
    ).toBe(true);
  });

  it("reset leaves one MO form per project and no duplicated umbrella", () => {
    usePrototypeStore.getState().reset();
    const state = usePrototypeStore.getState();
    const moCounts = new Map<string, number>();
    for (const form of state.forms.filter((item) => item.type === "mo")) {
      moCounts.set(form.projectId, (moCounts.get(form.projectId) ?? 0) + 1);
    }
    expect([...moCounts.values()].every((count) => count === 1)).toBe(true);
    expect(new Set(state.groups.map((group) => group.id)).size).toBe(
      state.groups.length,
    );
  });
});

describe("persistence backfill", () => {
  const seed = createSeedState();
  const persisted = {
    ...seed,
    forms: [],
    formEntries: [],
    projectEvents: [],
    notifications: [],
    activityLogs: [],
    templates: seed.templates,
    mediaOrders: [seed.mediaOrders[0]],
    groups: [seed.groups[0]],
  };

  it("adds the MO form and preserves MO documents and umbrella membership", () => {
    const migrated = migratePersistedState(persisted) as AppState;
    expect(
      migrated.forms.filter((form) => form.type === "mo").length,
    ).toBeGreaterThan(0);
    expect(migrated.mediaOrders[0].id).toBe(seed.mediaOrders[0].id);
    expect(migrated.groups[0].id).toBe(seed.groups[0].id);
    expect(migrated.projects.some((project) => project.groupId)).toBe(true);
  });

  it("is idempotent for the MO backfill", () => {
    const once = migratePersistedState(persisted);
    const twice = migratePersistedState(once);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
    expect(
      ((twice as AppState).forms ?? []).filter((form) => form.type === "mo"),
    ).toHaveLength(
      ((once as AppState).forms ?? []).filter((form) => form.type === "mo").length,
    );
  });
});

describe("assignee work aggregation", () => {
  it("returns cards from every project in one list", () => {
    const seed = createSeedState();
    const assignee = seed.users.find((user) => user.role === "assignee")!;
    const tasks = tasksForAssignee(seed, assignee.id);
    expect(new Set(tasks.map((task) => task.projectId)).size).toBeGreaterThan(1);
    expect(tasks.every((task) => task.assigneeId === assignee.id)).toBe(true);

    const withEntry: AppState = {
      ...seed,
      formEntries: [
        {
          id: "entry-assignee",
          projectId: tasks[0].projectId,
          stepKey: "step-form",
          title: "Form entry",
          assigneeId: assignee.id,
          status: "assigned",
          payload: { values: {} },
          versions: [],
          createdById: "u-pm1",
          createdAt: "2026-10-02T09:00:00.000Z",
        },
      ],
    };
    expect(tasksForAssignee(withEntry, assignee.id)).toHaveLength(tasks.length);
  });
});

describe("project Board across stages", () => {
  const seed = createSeedState();
  const project = seed.projects.find((item) => item.id === "p-delta")!;
  const baseStep = seed.steps.find(
    (step) => step.projectId === project.id && step.kind === "simpro",
  )!;
  const baseTask = seed.tasks.find((task) => task.projectId === project.id)!;
  const stage = (id: string, status: ProjectStep["status"]): ProjectStep => ({
    ...baseStep,
    id,
    key: id,
    status,
    order: 1,
  });
  const state: AppState = {
    ...seed,
    projects: [project],
    steps: [
      stage("stage-active", "active"),
      stage("stage-done", "completed"),
      stage("stage-pending", "pending"),
    ],
    tasks: [
      { ...baseTask, id: "task-active", code: "T-1", stageId: "stage-active", stepKey: "stage-active" },
      { ...baseTask, id: "task-done", code: "T-2", stageId: "stage-done", stepKey: "stage-done" },
      { ...baseTask, id: "task-pending", code: "T-3", stageId: "stage-pending", stepKey: "stage-pending" },
    ],
  };

  it("shows all cards from running and completed stages", () => {
    expect(projectBoardTasks(state, project.id).map((task) => task.id)).toEqual([
      "task-active",
      "task-done",
    ]);
  });

  it("filters cards by the selected stage", () => {
    expect(
      projectBoardTasks(state, project.id, "stage-done").map((task) => task.id),
    ).toEqual(["task-done"]);
    expect(
      projectBoardTasks(state, project.id, "stage-pending"),
    ).toEqual([]);
  });
});

describe("Business table rows", () => {
  const seed = createSeedState();

  it("scopes PM rows to their own projects", () => {
    const pm1 = seed.users.find((user) => user.id === "u-pm1")!;
    const pm2 = seed.users.find((user) => user.id === "u-pm2")!;
    const pm1Rows = commercialProjectRows(seed, "rab", pm1);
    const pm2Rows = commercialProjectRows(seed, "rab", pm2);
    expect(pm1Rows.every((row) => row.project.createdById === pm1.id)).toBe(true);
    expect(pm2Rows.every((row) => row.project.createdById === pm2.id)).toBe(true);
  });

  it("derives MO rows from non-cancelled documents only", () => {
    const admin = seed.users.find((user) => user.id === "u-admin")!;
    const rows = commercialProjectRows(seed, "mo", admin);
    const gamma = rows.find((row) => row.project.id === "p-gamma");
    expect(gamma?.moDocuments).toBe(1);
    expect(gamma?.moRevenue).toBe(40_000_000);
    expect(projectCommercialTotals(seed, "p-gamma").mo).toBe(40_000_000);
  });

  it("excludes closed projects from the portfolio", () => {
    const admin = seed.users.find((user) => user.id === "u-admin")!;
    const state: AppState = {
      ...seed,
      projects: seed.projects.map((project) =>
        project.id === "p-delta" ? { ...project, lifecycle: "lost" } : project,
      ),
    };
    expect(
      commercialProjectRows(state, "rab", admin).some(
        (row) => row.project.id === "p-delta",
      ),
    ).toBe(false);
  });
});
