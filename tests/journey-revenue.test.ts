import { describe, expect, it } from "vitest";import {
  businessDashboardRows,
  canEditPhaseStructure,
  canEditForm,
  canEditFormEntry,
  landingForRole,
  mediaOrderLine,
  mediaOrderTotals,
  rabCostByBusinessUnit,
  roleCanAccessBusiness,
  roleCanAccessCrm,
  roleCanAccessSimpro,
  taskTransition,
  userById,
  validateWorkingLink,
} from "../src/lib/prototype/domain";
import { getValidationErrors } from "../src/lib/prototype/form-versions";
import { createSeedState } from "../src/lib/prototype/seed";
import { usePrototypeStore } from "../src/lib/prototype/store";
import { migratePersistedState } from "../src/lib/prototype/store";
import {
  EVENT_TEMPLATE_ID,
  KOL_TEMPLATE_ID,
  createSeedTemplates,
} from "../src/lib/prototype/templates";
import type {
  BusinessUnitId,
  FormEntry,
  MediaOrder,
  MediaOrderItem,
  Project,
  StepForm,
} from "../src/lib/prototype/types";

const roles = [
  "admin",
  "manager",
  "pm",
  "finance",
  "assignee",
  "media",
  "bod",
] as const;

describe("role access matrix", () => {
  it("maps every role to its modules and landing page", () => {
    for (const role of roles) {
      const crm = roleCanAccessCrm(role);
      const simpro = roleCanAccessSimpro(role);
      const business = roleCanAccessBusiness(role);
      if (role === "admin" || role === "manager" || role === "pm") {
        expect(crm).toBe(true);
        expect(simpro).toBe(true);
        expect(business).toBe(role === "admin");
      }
      if (role === "finance") {
        expect(crm).toBe(true);
        expect(simpro).toBe(false);
        expect(business).toBe(false);
      }
      if (role === "assignee" || role === "media") {
        expect(crm).toBe(false);
        expect(simpro).toBe(true);
        expect(business).toBe(false);
      }
      if (role === "bod") {
        expect(crm).toBe(false);
        expect(simpro).toBe(false);
        expect(business).toBe(true);
      }
    }
  });

  it("lands media in SIMPRO and BOD on the business dashboard", () => {
    expect(landingForRole("media")).toBe("/my-tasks");
    expect(landingForRole("bod")).toBe("/business");
    expect(landingForRole("pm")).toBe("/crm");
  });
});

describe("working link validation", () => {
  it("accepts absolute http and https URLs", () => {
    expect(validateWorkingLink("https://docs.google.com/document/d/abc").ok).toBe(
      true,
    );
    expect(validateWorkingLink("http://drive.google.com/file").ok).toBe(true);
  });

  it("rejects empty, relative, and non-http links", () => {
    expect(validateWorkingLink("").ok).toBe(false);
    expect(validateWorkingLink("   ").ok).toBe(false);
    expect(validateWorkingLink("docs.google.com/document").ok).toBe(false);
    expect(validateWorkingLink("ftp://example.com/file").ok).toBe(false);
  });

  it("blocks starting a card without a link", () => {
    const state = createSeedState();
    const task = state.tasks.find((item) => item.id === "task-alpha-005")!;
    const assignee = userById(state, "u-assignee3")!;
    expect(taskTransition(state, assignee, task, "in_progress").ok).toBe(false);
    expect(
      taskTransition(
        state,
        assignee,
        task,
        "in_progress",
        "https://docs.google.com/document/d/abc",
      ).ok,
    ).toBe(true);
  });
});

describe("phase structure locking", () => {
  function projectWith(states: Project["phaseStates"]): Project {
    return {
      id: "p-test",
      code: "TEST",
      name: "Test",
      client: "Client",
      description: "",
      priority: "medium",
      status: "active",
      startDate: "2026-11-01",
      targetEndDate: "2026-11-30",
      coverColor: "#000",
      createdById: "u-pm1",
      createdAt: "2026-11-01T00:00:00.000Z",
      lifecycle: "active",
      structureLocked: false,
      phaseStates: states,
    };
  }

  it("allows composing a phase before it starts", () => {
    expect(
      canEditPhaseStructure(projectWith({ planning: {} }), "planning"),
    ).toBe(true);
  });

  it("rejects started, locked, and missing phases", () => {
    expect(
      canEditPhaseStructure(
        projectWith({ planning: { startedAt: "2026-11-02T00:00:00.000Z" } }),
        "planning",
      ),
    ).toBe(false);
    expect(
      canEditPhaseStructure(
        projectWith({ planning: { lockedAt: "2026-11-02T00:00:00.000Z" } }),
        "planning",
      ),
    ).toBe(false);
    expect(canEditPhaseStructure(projectWith({}), "running")).toBe(false);
  });

  it("rejects edits on a legacy locked project", () => {
    expect(
      canEditPhaseStructure(
        { ...projectWith({ planning: {} }), structureLocked: true },
        "planning",
      ),
    ).toBe(false);
  });
});

describe("media order totals", () => {
  const item = (
    qty: number,
    clientUnitPrice: number,
    vendorUnitCost: number,
    businessUnitId: BusinessUnitId = "makerspace",
  ): MediaOrderItem => ({
    id: `item-${qty}-${clientUnitPrice}-${vendorUnitCost}`,
    description: "Item",
    qty,
    unit: "unit",
    clientUnitPrice,
    vendorUnitCost,
    businessUnitId,
  });

  const order = (items: MediaOrderItem[]): MediaOrder => ({
    id: "mo-1",
    projectId: "p-test",
    number: "MO-1",
    title: "MO",
    status: "draft",
    items,
    notes: "",
    createdById: "u-pm1",
    createdAt: "2026-11-01T00:00:00.000Z",
  });

  it("calculates revenue, cost, margin, and margin percent", () => {
    const line = mediaOrderLine(item(2, 1_000_000, 700_000));
    expect(line.revenue).toBe(2_000_000);
    expect(line.cost).toBe(1_400_000);
    expect(line.margin).toBe(600_000);
    expect(line.marginPercent).toBeCloseTo(30);
  });

  it("handles zero revenue and negative margin", () => {
    expect(mediaOrderLine(item(1, 0, 500_000)).marginPercent).toBe(0);
    expect(mediaOrderLine(item(1, 100_000, 150_000)).margin).toBe(-50_000);
    expect(mediaOrderTotals(order([item(1, 100_000, 150_000)])).margin).toBe(
      -50_000,
    );
  });

  it("sums all items and counts them", () => {
    const totals = mediaOrderTotals(
      order([
        item(2, 1_000_000, 700_000, "makerspace"),
        item(1, 500_000, 400_000, "spektrum"),
      ]),
    );
    expect(totals.revenue).toBe(2_500_000);
    expect(totals.cost).toBe(1_800_000);
    expect(totals.margin).toBe(700_000);
    expect(totals.itemCount).toBe(2);
  });
});

describe("media form permissions", () => {
  const state = createSeedState();
  const media = userById(state, "u-media") ?? {
    id: "u-media",
    name: "Media",
    email: "media@example.com",
    role: "media" as const,
    color: "#000",
  };

  it("allows media to edit an assigned BAST form only", () => {
    const base = state.forms[0];
    const bast: StepForm = {
      ...base,
      id: "form-test-bast",
      type: "bast",
      stepKey: "bast",
      assigneeId: media.id,
      status: "draft",
    };
    const rab: StepForm = {
      ...bast,
      id: "form-test-rab",
      type: "rab",
      stepKey: "rab",
    };
    const invoice: StepForm = {
      ...bast,
      id: "form-test-invoice",
      type: "invoice",
      stepKey: "invoice",
    };
    const activeProject = state.projects.find(
      (project) => project.id === base.projectId,
    )!;
    const activeStep = state.steps.find(
      (step) => step.projectId === base.projectId && step.key === "bast",
    );
    const testState = {
      ...state,
      projects: state.projects.map((project) =>
        project.id === activeProject.id
          ? { ...project, status: "active" as const, lifecycle: "active" as const }
          : project,
      ),
      steps: activeStep
        ? state.steps.map((step) =>
            step.id === activeStep.id ? { ...step, status: "active" as const } : step,
          )
        : state.steps,
    };
    const user = { ...media, role: "media" as const };
    expect(canEditForm(testState, user, bast)).toBe(true);
    expect(canEditForm(testState, user, rab)).toBe(false);
    expect(canEditForm(testState, user, invoice)).toBe(false);
  });

  it("allows media to edit their assigned briefing entry", () => {
    const entry: FormEntry = {
      id: "entry-1",
      projectId: "p-alpha",
      stepKey: "brief",
      title: "Vendor contact",
      assigneeId: "u-media",
      status: "draft",
      payload: { values: {} },
      versions: [],
      createdById: "u-pm1",
      createdAt: "2026-11-01T00:00:00.000Z",
    };
    const user = userById(state, "u-media")!;
    const withStep = {
      ...state,
      steps: [
        ...state.steps,
        {
          id: "step-test-brief",
          projectId: "p-alpha",
          key: "brief",
          name: "Brief Received",
          phase: "prospek" as const,
          order: 99,
          status: "active" as const,
          kind: "form" as const,
          required: true,
          weight: 1,
          tasks: [],
        },
      ],
    };
    expect(canEditFormEntry(withStep, user, entry)).toBe(true);
    expect(
      canEditFormEntry(withStep, user, { ...entry, assigneeId: "u-assignee1" }),
    ).toBe(false);
  });
});

describe("allocation and working link persistence", () => {
  it("lets a manager self-assign a backlog card and blocks PM assignment", () => {
    usePrototypeStore.getState().reset();
    const backlog = usePrototypeStore
      .getState()
      .tasks.find((task) => task.status === "backlog")!;
    usePrototypeStore.getState().setCurrentUser("u-pm1");
    usePrototypeStore.getState().assignTask(backlog.id, "u-assignee1");
    expect(
      usePrototypeStore.getState().tasks.find((task) => task.id === backlog.id)!
        .assigneeId,
    ).toBeUndefined();

    usePrototypeStore.getState().setCurrentUser("u-manager");
    usePrototypeStore.getState().assignTask(backlog.id, "u-manager");
    const assigned = usePrototypeStore
      .getState()
      .tasks.find((task) => task.id === backlog.id)!;
    expect(assigned.assigneeId).toBe("u-manager");
    expect(assigned.status).toBe("todo");
  });

  it("blocks starting without a valid link and stores the link on success", () => {
    usePrototypeStore.getState().reset();
    usePrototypeStore.getState().setCurrentUser("u-assignee3");
    const task = usePrototypeStore
      .getState()
      .tasks.find((item) => item.id === "task-alpha-005")!;
    usePrototypeStore.getState().transitionTask(task.id, "in_progress");
    expect(
      usePrototypeStore.getState().tasks.find((item) => item.id === task.id)!
        .status,
    ).toBe(task.status);

    usePrototypeStore
      .getState()
      .transitionTask(task.id, "in_progress", "not-a-url");
    expect(
      usePrototypeStore.getState().tasks.find((item) => item.id === task.id)!
        .status,
    ).toBe(task.status);

    usePrototypeStore
      .getState()
      .transitionTask(
        task.id,
        "in_progress",
        "https://docs.google.com/document/d/abc",
      );
    const started = usePrototypeStore
      .getState()
      .tasks.find((item) => item.id === task.id)!;
    expect(started.status).toBe("in_progress");
    expect(started.workingLink?.url).toContain("docs.google.com");
    expect(
      usePrototypeStore
        .getState()
        .projectEvents.some(
          (event) =>
            event.eventType === "task.status_changed" &&
            (event.metadata as { workingLink?: string }).workingLink?.includes(
              "docs.google.com",
            ),
        ),
    ).toBe(true);
  });

  it("records working-link replacements while in progress", () => {
    usePrototypeStore.getState().reset();
    usePrototypeStore.getState().setCurrentUser("u-assignee3");
    const task = usePrototypeStore
      .getState()
      .tasks.find((item) => item.id === "task-alpha-005")!;
    usePrototypeStore
      .getState()
      .transitionTask(
        task.id,
        "in_progress",
        "https://docs.google.com/document/d/abc",
      );
    expect(
      usePrototypeStore
        .getState()
        .setWorkingLink(task.id, "https://drive.google.com/file/d/xyz"),
    ).toBe(true);
    const updated = usePrototypeStore
      .getState()
      .tasks.find((item) => item.id === task.id)!;
    expect(updated.workingLink?.url).toContain("drive.google.com");
    expect(updated.workingLinkHistory?.length).toBe(1);
    expect(
      usePrototypeStore
        .getState()
        .projectEvents.some((event) => event.eventType === "task.working_link_set"),
    ).toBe(true);
  });
});

describe("media order storage and dashboard", () => {
  it("rejects RAB items without a business unit", () => {
    const errors = getValidationErrors("rab", {
      notes: "",
      items: [
        {
          id: "rab-1",
          description: "Item",
          qty: 1,
          unit: "paket",
          unitPrice: 1000000,
        },
      ],
    });
    expect(errors.some((issue) => issue.key.includes("businessUnit"))).toBe(true);
    expect(
      getValidationErrors("rab", {
        notes: "",
        items: [
          {
            id: "rab-2",
            description: "Item",
            qty: 1,
            unit: "paket",
            unitPrice: 1000000,
            businessUnitId: "makerspace",
          },
        ],
      }),
    ).toHaveLength(0);
  });

  it("creates, edits, and deletes MO items with audit events", () => {
    usePrototypeStore.getState().reset();
    usePrototypeStore.getState().setCurrentUser("u-pm1");
    const orderId = usePrototypeStore
      .getState()
      .createMediaOrder("p-alpha", { title: "MO Test" });
    expect(orderId).toBeTruthy();
    usePrototypeStore.getState().addMediaOrderItem(orderId, {
      description: "Produksi video",
      qty: 2,
      unit: "video",
      clientUnitPrice: 1000000,
      vendorUnitCost: 700000,
      businessUnitId: "makerspace-video",
    });
    let order = usePrototypeStore
      .getState()
      .mediaOrders.find((item) => item.id === orderId)!;
    const item = order.items[0];
    expect(mediaOrderTotals(order).margin).toBe(600000);
    usePrototypeStore.getState().updateMediaOrderItem(orderId, item.id, {
      clientUnitPrice: 1500000,
      businessUnitId: "spektrum",
    });
    order = usePrototypeStore
      .getState()
      .mediaOrders.find((entry) => entry.id === orderId)!;
    expect(mediaOrderTotals(order).revenue).toBe(3000000);
    expect(order.items[0].businessUnitId).toBe("spektrum");
    const events = usePrototypeStore.getState().projectEvents;
    expect(
      events.some((event) => event.eventType === "media_order.created"),
    ).toBe(true);
    expect(
      events.some((event) => event.eventType === "media_order.item_changed"),
    ).toBe(true);
    usePrototypeStore.getState().removeMediaOrderItem(orderId, item.id);
    order = usePrototypeStore
      .getState()
      .mediaOrders.find((entry) => entry.id === orderId)!;
    expect(order.items).toHaveLength(0);
  });

  it("blocks MO edits on cancelled projects", () => {
    usePrototypeStore.getState().reset();
    usePrototypeStore.getState().setCurrentUser("u-admin");
    usePrototypeStore.setState((state) => ({
      projects: state.projects.map((project) =>
        project.id === "p-alpha"
          ? { ...project, status: "cancelled" as const, lifecycle: "cancelled" as const }
          : project,
      ),
    }));
    expect(
      usePrototypeStore.getState().createMediaOrder("p-alpha", { title: "MO" }),
    ).toBe("");
  });

  it("aggregates dashboard rows by unit, umbrella, and standalone", () => {
    const state = createSeedState();
    const all = businessDashboardRows(state);
    expect(all.length).toBeGreaterThan(0);
    expect(all.reduce((sum, row) => sum + row.revenue, 0)).toBeGreaterThan(0);
    const grouped = businessDashboardRows(state, { groupId: "group-q4" });
    expect(grouped.length).toBeGreaterThan(0);
    const standalone = businessDashboardRows(state, { standalone: true });
    expect(
      standalone.some((row) => row.businessUnitId === "makerspace-video"),
    ).toBe(true);
    expect(businessDashboardRows(state, { groupId: "missing" })).toHaveLength(0);
  });

  it("computes RAB baseline cost per business unit", () => {
    const state = createSeedState();
    const costs = rabCostByBusinessUnit(state, "p-epsilon");
    expect(costs.makerspace).toBe(88000000);
    expect(rabCostByBusinessUnit(state, "p-beta")).toEqual({});
  });
});

describe("event template and phase composition", () => {
  it("groups Event briefing work under Brief Received", () => {
    const event = createSeedTemplates().find(
      (template) => template.id === EVENT_TEMPLATE_ID,
    )!;
    const prospek = event.stages.filter((stage) => stage.phase === "prospek");
    expect(prospek.map((stage) => stage.name)).toEqual([
      "Brief Received",
      "Client Approval",
    ]);
    const brief = prospek[0];
    expect(brief.entryTypes?.map((entry) => entry.id)).toEqual([
      "strategy_concept",
      "kv_assets",
      "vendor_contact",
      "site_survey",
      "budget_quotation",
      "vendor_selection",
    ]);
    expect(
      event.stages.some((stage) =>
        [
          "Create Strategy & Concept",
          "Create KV & Key Visual Assets",
          "Contact Vendor",
          "Site Survey",
          "Budget & Quotation Review",
          "Vendor Selection",
        ].includes(stage.name),
      ),
    ).toBe(false);
    expect(prospek[1].gateKind).toBe("client_approval");
  });

  it("creates Event projects with only Prospek stages", () => {
    usePrototypeStore.getState().reset();
    const projectId = usePrototypeStore.getState().createProject({
      name: "Event Test",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      templateId: EVENT_TEMPLATE_ID,
    });
    const steps = usePrototypeStore
      .getState()
      .steps.filter((step) => step.projectId === projectId);
    expect(steps.every((step) => step.phase === "prospek")).toBe(true);
    expect(steps).toHaveLength(2);
  });

  it("creates Event briefing entries per entry type", () => {
    usePrototypeStore.getState().reset();
    usePrototypeStore.getState().setCurrentUser("u-pm1");
    const projectId = usePrototypeStore.getState().createProject({
      name: "Event Briefing",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      templateId: EVENT_TEMPLATE_ID,
    });
    usePrototypeStore.getState().startPhase(projectId, "prospek");
    const brief = usePrototypeStore
      .getState()
      .steps.find(
        (step) => step.projectId === projectId && step.entryTypes?.length,
      )!;
    const created = (brief.entryTypes ?? []).map((type) =>
      usePrototypeStore
        .getState()
        .createFormEntry(projectId, brief.key, {
          title: type.label,
          entryType: type.id,
        }),
    );
    expect(created).toHaveLength(6);
    const entries = usePrototypeStore
      .getState()
      .formEntries.filter((entry) => entry.projectId === projectId);
    expect(entries.map((entry) => entry.entryType)).toEqual(
      brief.entryTypes?.map((type) => type.id),
    );
    usePrototypeStore.getState().setCurrentUser("u-manager");
    usePrototypeStore.getState().assignFormEntry(created[1], "u-media");
    const assigned = usePrototypeStore
      .getState()
      .formEntries.find((entry) => entry.id === created[1])!;
    expect(assigned.assigneeId).toBe("u-media");
  });

  it("locks phases after they start and appends Closing once", () => {
    usePrototypeStore.getState().reset();
    const projectId = usePrototypeStore.getState().createProject({
      name: "KOL Phase Test",
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
    const planning = template.stages.filter(
      (stage) => stage.phase === "planning",
    );
    const running = template.stages.filter((stage) => stage.phase === "running");

    expect(usePrototypeStore.getState().startPhase(projectId, "planning")).toBe(
      false,
    );
    usePrototypeStore.setState((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              phaseStates: {
                ...project.phaseStates,
                prospek: {
                  ...project.phaseStates?.prospek,
                  startedAt: "2026-11-01T00:00:00.000Z",
                  lockedAt: "2026-11-01T00:00:00.000Z",
                },
                planning: {},
                running: {},
              },
            }
          : project,
      ),
      steps: state.steps.map((step) =>
        step.projectId === projectId && step.phase === "prospek"
          ? { ...step, status: "completed" as const }
          : step,
      ),
    }));
    expect(
      usePrototypeStore
        .getState()
        .setPhaseStructure(projectId, "planning", planning),
    ).toBe(true);
    expect(
      usePrototypeStore
        .getState()
        .setPhaseStructure(projectId, "running", running),
    ).toBe(true);
    expect(usePrototypeStore.getState().startPhase(projectId, "running")).toBe(
      false,
    );
    expect(usePrototypeStore.getState().startPhase(projectId, "planning")).toBe(
      true,
    );
    expect(
      usePrototypeStore
        .getState()
        .setPhaseStructure(projectId, "planning", planning),
    ).toBe(false);
    // Finish Planning so Running can start.
    const planningSteps = usePrototypeStore
      .getState()
      .steps.filter(
        (step) => step.projectId === projectId && step.phase === "planning",
      );
    usePrototypeStore.setState((state) => ({
      steps: state.steps.map((step) =>
        planningSteps.some((item) => item.id === step.id)
          ? { ...step, status: "completed" as const }
          : step,
      ),
    }));
    expect(usePrototypeStore.getState().startPhase(projectId, "running")).toBe(
      true,
    );
    const closing = () =>
      usePrototypeStore
        .getState()
        .steps.filter(
          (step) => step.projectId === projectId && step.phase === "closing",
        );
    const firstClosing = closing();
    expect(firstClosing.length).toBeGreaterThan(0);
    expect(usePrototypeStore.getState().startPhase(projectId, "running")).toBe(
      false,
    );
    expect(closing()).toHaveLength(firstClosing.length);
  });
});

describe("persistence migration", () => {
  it("derives phase states, merges demo roles, and stays idempotent", () => {
    const seed = createSeedState();
    const legacy = {
      ...seed,
      users: seed.users.filter(
        (user) => user.id !== "u-media" && user.id !== "u-bod",
      ),
      projects: seed.projects.map((project) => ({
        ...project,
        phaseStates: undefined,
      })),
      mediaOrders: undefined,
      formEntries: [],
    };
    const once = migratePersistedState(legacy) as typeof seed;
    const twice = migratePersistedState(once) as typeof seed;
    expect(once.users.some((user) => user.id === "u-media")).toBe(true);
    expect(once.users.some((user) => user.id === "u-bod")).toBe(true);
    expect(once.mediaOrders).toEqual([]);
    expect(once.projects[0].phaseStates?.prospek?.startedAt).toBeTruthy();
    const phaseEvents = once.projectEvents.filter(
      (event) => event.eventType === "project.phase_migrated",
    );
    expect(phaseEvents.length).toBe(once.projects.length);
    expect(
      twice.projectEvents.filter(
        (event) => event.eventType === "project.phase_migrated",
      ),
    ).toHaveLength(phaseEvents.length);
    expect(twice.projects[0].phaseStates).toEqual(
      once.projects[0].phaseStates,
    );
  });
});


