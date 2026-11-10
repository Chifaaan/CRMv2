import { beforeEach, describe, expect, it } from "vitest";
import { usePrototypeStore } from "../src/lib/prototype/store";
import {
  businessDashboardRows,
  canAssignFinanceForm,
  financeAssigneeCandidates,
  canEditForm,
  formsNeedingAction,
  canAssignOperational,
  isOperationalAssignee,
  landingForRole,
  mediaOrderLine,
  mediaOrderTotals,
  projectCommercialTotals,
  roleCanAccessBusiness,
  umbrellaCommercialTotals,
  workloadRows,
} from "../src/lib/prototype/domain";
import {
  canSeeFinanceFormInSimpro,
  simproFinanceFormRows,
  simproFinanceFormsNeedingAction,
} from "../src/lib/prototype/simpro-forms";
import { createSeedState } from "../src/lib/prototype/seed";
import type {
  AppState,
  MediaOrder,
  Project,
  ProjectStep,
  StepForm,
  User,
} from "../src/lib/prototype/types";

function mediaUser(seed: AppState): User {
  return seed.users.find((user) => user.role === "media")!;
}

function activeProject(seed: AppState): Project {
  return {
    ...seed.projects[0],
    status: "active",
    lifecycle: "active",
    creationMode: "template",
    startedAt: "2026-10-01T00:00:00.000Z",
  };
}

function financeStep(project: Project, key: "bast" | "rab"): ProjectStep {
  return {
    id: `step-${project.id}-${key}`,
    projectId: project.id,
    key,
    name: key.toUpperCase(),
    phase: "finance",
    order: 1,
    status: "active",
    kind: "finance_form",
    required: true,
    weight: 1,
    financeKind: key,
    tasks: [],
  };
}

function financeForm(
  project: Project,
  key: "bast" | "rab",
  assigneeId: string,
): StepForm {
  return {
    id: `form-${project.id}-${key}`,
    projectId: project.id,
    stepKey: key,
    type: key,
    status: "assigned",
    assigneeId,
    payload:
      key === "bast"
        ? { number: "BAST-1", date: "2026-10-10", picId: "u-assignee1", notes: "", documentUrl: "" }
        : { items: [], notes: "" },
    createdAt: "2026-10-02T09:00:00.000Z",
  };
}

describe("media order math", () => {
  it("derives line and order totals", () => {
    const order: MediaOrder = {
      id: "mo-test",
      projectId: "p-alpha",
      number: "MO-1",
      title: "MO",
      status: "final",
      items: [
        {
          id: "line-1",
          description: "Display",
          qty: 2,
          unit: "paket",
          clientUnitPrice: 1_000_000,
          vendorUnitCost: 700_000,
          businessUnitId: "spektrum",
        },
      ],
      notes: "",
      createdById: "u-pm1",
      createdAt: "2026-10-02T09:00:00.000Z",
    };
    expect(mediaOrderLine(order.items[0])).toEqual({
      revenue: 2_000_000,
      cost: 1_400_000,
      margin: 600_000,
      marginPercent: 30,
    });
    expect(mediaOrderTotals(order)).toMatchObject({
      revenue: 2_000_000,
      cost: 1_400_000,
      margin: 600_000,
      itemCount: 1,
      marginPercent: 30,
    });
  });
});

describe("business dashboard aggregation", () => {
  const seed = createSeedState();
  const project = activeProject(seed);
  const state: AppState = {
    ...seed,
    projects: [project],
    mediaOrders: [
      {
        id: "mo-1",
        projectId: project.id,
        number: "MO-1",
        title: "MO",
        status: "final",
        items: [
          {
            id: "line-makerspace",
            description: "KOL",
            qty: 1,
            unit: "paket",
            clientUnitPrice: 10_000_000,
            vendorUnitCost: 7_000_000,
            businessUnitId: "makerspace",
          },
          {
            id: "line-spektrum",
            description: "Display",
            qty: 1,
            unit: "paket",
            clientUnitPrice: 5_000_000,
            vendorUnitCost: 4_000_000,
            businessUnitId: "spektrum",
          },
          {
            id: "line-unmapped",
            description: "Belum dipetakan",
            qty: 1,
            unit: "paket",
            clientUnitPrice: 9_000_000,
            vendorUnitCost: 1_000_000,
          },
        ],
        notes: "",
        createdById: "u-pm1",
        createdAt: "2026-10-02T09:00:00.000Z",
      },
    ],
  };

  it("aggregates mapped lines per business unit", () => {
    const rows = businessDashboardRows(state);
    expect(rows.find((row) => row.businessUnitId === "makerspace")).toMatchObject({
      revenue: 10_000_000,
      cost: 7_000_000,
      margin: 3_000_000,
      itemCount: 1,
    });
    expect(rows.find((row) => row.businessUnitId === "spektrum")?.revenue).toBe(
      5_000_000,
    );
  });

  it("excludes unmapped lines from totals", () => {
    const rows = businessDashboardRows(state);
    const total = rows.reduce((sum, row) => sum + row.revenue, 0);
    expect(total).toBe(15_000_000);
  });

  it("filters by group and standalone", () => {
    const groupedState: AppState = {
      ...state,
      projects: [{ ...project, groupId: "group-q4" }],
    };
    expect(
      businessDashboardRows(groupedState, { groupId: "group-q4" }).length,
    ).toBeGreaterThan(0);
    expect(
      businessDashboardRows(groupedState, { groupId: "another-group" }).length,
    ).toBe(0);
    expect(
      businessDashboardRows(groupedState, { standalone: true }).length,
    ).toBe(0);
    expect(
      businessDashboardRows(state, { standalone: true }).length,
    ).toBeGreaterThan(0);
  });
});

describe("project and umbrella commercial totals", () => {
  const seed = createSeedState();
  const base = activeProject(seed);
  const p1: Project = { ...base, id: "p-one", groupId: "g-one", createdById: "u-pm1" };
  const p2: Project = { ...base, id: "p-two", groupId: "g-one", createdById: "u-pm1" };
  const rab = (projectId: string, price: number, mapped = true): StepForm => ({
    id: `form-${projectId}-rab`,
    projectId,
    stepKey: "rab",
    type: "rab",
    status: "approved",
    payload: {
      notes: "",
      items: [
        {
          id: `rab-${projectId}`,
          description: "Paket",
          qty: 1,
          unit: "paket",
          unitPrice: price,
          businessUnitId: mapped ? "makerspace" : undefined,
        },
      ],
    },
    createdAt: "2026-10-01T00:00:00.000Z",
  });
  const mo = (projectId: string, status: "final" | "cancelled"): MediaOrder => ({
    id: `mo-${projectId}-${status}`,
    projectId,
    number: "MO-1",
    title: "MO",
    status,
    items: [
      {
        id: `mo-item-${projectId}-${status}`,
        description: "Display",
        qty: 2,
        unit: "paket",
        clientUnitPrice: 5_000_000,
        vendorUnitCost: 3_000_000,
        businessUnitId: "spektrum",
      },
    ],
    notes: "",
    createdById: "u-pm1",
    createdAt: "2026-10-02T00:00:00.000Z",
  });
  const state: AppState = {
    ...seed,
    projects: [p1, p2],
    groups: [{ ...seed.groups[0], id: "g-one", name: "Umbrella One" }],
    forms: [rab("p-one", 8_000_000), rab("p-two", 9_000_000, false)],
    mediaOrders: [mo("p-one", "final"), mo("p-one", "cancelled"), mo("p-two", "final")],
  };

  it("derives project totals from approved RAB and non-cancelled MO", () => {
    const one = projectCommercialTotals(state, "p-one");
    expect(one.rab).toBe(8_000_000);
    expect(one.mo).toBe(10_000_000);
    expect(one.moMargin).toBe(4_000_000);
    expect(one.unmappedRab).toBe(0);
    expect(projectCommercialTotals(state, "p-two").rab).toBe(0);
    expect(projectCommercialTotals(state, "p-two").unmappedRab).toBe(1);
  });

  it("sums the same values into the umbrella and dashboard", () => {
    const umbrella = umbrellaCommercialTotals(state, "g-one");
    expect(umbrella.rab).toBe(8_000_000);
    expect(umbrella.mo).toBe(20_000_000);
    const dashboardRevenue = businessDashboardRows(state).reduce(
      (sum, row) => sum + row.revenue,
      0,
    );
    expect(dashboardRevenue).toBe(umbrella.mo);
  });

  it("excludes closed projects", () => {
    const closed: AppState = {
      ...state,
      projects: [{ ...p1, lifecycle: "lost" }, p2],
    };
    expect(projectCommercialTotals(closed, "p-one")).toMatchObject({
      rab: 0,
      mo: 0,
    });
    expect(umbrellaCommercialTotals(closed, "g-one").mo).toBe(10_000_000);
  });
});

describe("media order store actions", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("creates, edits, and audits a media order", () => {
    const store = usePrototypeStore.getState();
    store.setCurrentUser("u-pm1");
    const orderId = usePrototypeStore
      .getState()
      .createMediaOrder("p-alpha", { title: "MO Test" });
    expect(orderId).not.toBe("");

    usePrototypeStore.getState().addMediaOrderItem(orderId, {
      description: "Item",
      qty: 1,
      unit: "paket",
      clientUnitPrice: 2_000_000,
      vendorUnitCost: 1_000_000,
      businessUnitId: "makerspace",
    });
    const withItem = usePrototypeStore
      .getState()
      .mediaOrders.find((order) => order.id === orderId)!;
    expect(withItem.items).toHaveLength(1);

    usePrototypeStore
      .getState()
      .updateMediaOrderItem(orderId, withItem.items[0].id, { qty: 3 });
    const updated = usePrototypeStore
      .getState()
      .mediaOrders.find((order) => order.id === orderId)!;
    expect(updated.items[0].qty).toBe(3);

    const events = usePrototypeStore
      .getState()
      .projectEvents.filter((event) => event.projectId === "p-alpha");
    expect(events.some((event) => event.eventType === "media_order.created")).toBe(
      true,
    );
    expect(
      events.filter((event) => event.eventType === "media_order.item_changed"),
    ).toHaveLength(2);
  });

  it("rejects media order management for operational assignees", () => {
    usePrototypeStore.getState().setCurrentUser("u-assignee1");
    const orderId = usePrototypeStore
      .getState()
      .createMediaOrder("p-alpha", { title: "Nope" });
    expect(orderId).toBe("");
  });
});

describe("media and BOD roles", () => {
  const seed = createSeedState();

  it("lands media in SIMPRO and BOD on business", () => {
    expect(landingForRole("media")).toBe("/my-tasks");
    expect(landingForRole("bod")).toBe("/business");
    expect(landingForRole("pm")).toBe("/dashboard");
    expect(roleCanAccessBusiness("bod")).toBe(true);
    expect(roleCanAccessBusiness("admin")).toBe(true);
    expect(roleCanAccessBusiness("manager")).toBe(true);
    expect(roleCanAccessBusiness("pm")).toBe(true);
    expect(roleCanAccessBusiness("finance")).toBe(true);
    expect(roleCanAccessBusiness("assignee")).toBe(false);
    expect(roleCanAccessBusiness("media")).toBe(false);
  });

  it("treats media as an operational assignee", () => {
    const media = mediaUser(seed);
    expect(isOperationalAssignee(media)).toBe(true);
    expect(
      canAssignOperational(
        seed.users.find((user) => user.role === "admin")!,
        seed.projects[0],
        media,
      ),
    ).toBe(true);

    const project = activeProject(seed);
    const state: AppState = {
      ...seed,
      projects: [project],
      tasks: [
        {
          ...seed.tasks[0],
          id: "task-media",
          projectId: project.id,
          assigneeId: media.id,
          status: "in_progress",
        },
      ],
    };
    expect(workloadRows(state).some((row) => row.user.role === "media")).toBe(
      true,
    );
  });

  it("lets media fill an assigned BAST but not RAB", () => {
    const project = activeProject(seed);
    const media = mediaUser(seed);
    const bastForm = financeForm(project, "bast", media.id);
    const rabForm = financeForm(project, "rab", media.id);

    const bastState: AppState = {
      ...seed,
      projects: [project],
      steps: [financeStep(project, "bast")],
      forms: [bastForm],
    };
    expect(canEditForm(bastState, media, bastForm)).toBe(true);
    expect(simproFinanceFormsNeedingAction(bastState, media.id)).toBe(1);
    expect(canSeeFinanceFormInSimpro(bastState, media, bastForm)).toBe(true);
    expect(
      simproFinanceFormRows(bastState, media).some(
        (row) => row.form.id === bastForm.id,
      ),
    ).toBe(true);

    const rabState: AppState = {
      ...seed,
      projects: [project],
      steps: [financeStep(project, "rab")],
      forms: [rabForm],
    };
    expect(canEditForm(rabState, media, rabForm)).toBe(false);
    expect(canSeeFinanceFormInSimpro(rabState, media, rabForm)).toBe(false);
  });

  it("counts media form work in the Forms badge and excludes review", () => {
    const project = activeProject(seed);
    const media = mediaUser(seed);
    const formStep: ProjectStep = {
      id: "step-form",
      projectId: project.id,
      key: "step-form",
      name: "Brief",
      phase: "planning",
      order: 1,
      status: "active",
      kind: "form",
      required: true,
      weight: 1,
      tasks: [],
    };
    const state: AppState = {
      ...seed,
      projects: [project],
      steps: [financeStep(project, "bast"), formStep],
      forms: [financeForm(project, "bast", media.id)],
      formEntries: [
        {
          id: "entry-media",
          projectId: project.id,
          stepKey: "step-form",
          title: "Deck",
          assigneeId: media.id,
          status: "draft",
          payload: { values: {} },
          versions: [],
          createdById: "u-pm1",
          createdAt: "2026-10-02T09:00:00.000Z",
        },
        {
          id: "entry-review",
          projectId: project.id,
          stepKey: "step-form",
          title: "Review",
          assigneeId: media.id,
          status: "submitted",
          payload: { values: {} },
          versions: [],
          createdById: "u-pm1",
          createdAt: "2026-10-02T09:00:00.000Z",
        },
      ],
    };
    const entryBadge = formsNeedingAction(state, media.id);
    const financeBadge = simproFinanceFormsNeedingAction(state, media.id);
    expect(entryBadge).toBe(1);
    expect(financeBadge).toBe(1);
    expect(entryBadge + financeBadge).toBe(2);
  });
});

describe("form assignment from Forms", () => {
  it("assigns an unassigned form entry as Manager", () => {
    const seed = createSeedState();
    const project = activeProject(seed);
    const manager = seed.users.find((user) => user.role === "manager")!;
    const state: AppState = {
      ...seed,
      projects: [project],
      steps: [
        {
          id: "step-form",
          projectId: project.id,
          key: "step-form",
          name: "Brief",
          phase: "planning",
          order: 1,
          status: "active",
          kind: "form",
          required: true,
          weight: 1,
          tasks: [],
        },
      ],
      formEntries: [
        {
          id: "entry-unassigned",
          projectId: project.id,
          stepKey: "step-form",
          title: "Brief",
          status: "unassigned",
          payload: { values: {} },
          versions: [],
          createdById: "u-pm1",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    usePrototypeStore.getState().reset();
    usePrototypeStore.setState({
      projects: state.projects,
      steps: state.steps,
      formEntries: state.formEntries,
      users: state.users,
      currentUserId: manager.id,
    });
    usePrototypeStore.getState().assignFormEntry("entry-unassigned", "u-assignee1");
    const entry = usePrototypeStore
      .getState()
      .formEntries.find((item) => item.id === "entry-unassigned")!;
    expect(entry.assigneeId).toBe("u-assignee1");
    expect(entry.status).toBe("assigned");
  });

  const seed = createSeedState();

  it("lets Manager see and assign an unassigned finance form", () => {
    const project = activeProject(seed);
    const manager = seed.users.find((user) => user.role === "manager")!;
    const form = financeForm(project, "bast", "");
    form.assigneeId = undefined;
    form.status = "unassigned";
    const state: AppState = {
      ...seed,
      projects: [project],
      steps: [financeStep(project, "bast")],
      forms: [form],
    };
    expect(canSeeFinanceFormInSimpro(state, manager, form)).toBe(true);
    expect(canAssignFinanceForm(manager)).toBe(true);
    expect(
      financeAssigneeCandidates(state, form)
        .map((user) => user.role)
        .sort(),
    ).toEqual(["finance", "media"]);
    expect(
      financeAssigneeCandidates(state, financeForm(project, "rab", ""))
        .map((user) => user.role),
    ).toEqual(["finance"]);

    usePrototypeStore.getState().reset();
    usePrototypeStore.setState({
      projects: state.projects,
      steps: state.steps,
      forms: state.forms,
      users: state.users,
      currentUserId: manager.id,
    });
    usePrototypeStore.getState().assignForm(form.id, "u-finance");
    const assigned = usePrototypeStore
      .getState()
      .forms.find((item) => item.id === form.id)!;
    expect(assigned.assigneeId).toBe("u-finance");
    expect(assigned.status).toBe("assigned");
    expect(
      usePrototypeStore
        .getState()
        .projectEvents.some((event) => event.eventType === "bast.assigned"),
    ).toBe(true);
  });

  it("lets Manager see unassigned project form entries in Forms", () => {
    const project = activeProject(seed);
    const manager = seed.users.find((user) => user.role === "manager")!;
    const state: AppState = {
      ...seed,
      projects: [project],
      formEntries: [
        {
          id: "entry-unassigned",
          projectId: project.id,
          stepKey: "step-form",
          title: "Brief",
          status: "unassigned",
          payload: { values: {} },
          versions: [],
          createdById: "u-pm1",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    expect(
      state.formEntries.some(
        (entry) =>
          entry.status === "unassigned" &&
          (manager.role === "manager" || entry.assigneeId === manager.id),
      ),
    ).toBe(true);
  });
});
