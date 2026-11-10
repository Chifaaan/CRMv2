import { describe, expect, it } from "vitest";
import {
  backupPersistedState,
  migratePersistedState,
} from "../src/lib/prototype/store";
import type {
  FormEntry,
  MediaOrder,
  Project,
  ProjectEvent,
  ProjectStep,
  StepForm,
  Task,
  User,
} from "../src/lib/prototype/types";

const mainShapedState = {
  seedVersion: 1,
  currentUserId: "u-pm1",
  users: [
    {
      id: "u-pm1",
      name: "PM Demo 1",
      email: "pm1.demo@example.com",
      role: "pm",
      color: "bg-indigo-500",
    },
    {
      id: "u-manager",
      name: "Manager Demo",
      email: "manager.demo@example.com",
      role: "manager",
      color: "bg-sky-500",
    },
  ],
  projects: [
    {
      id: "p-main",
      code: "PRJ-99",
      name: "Main Project",
      client: "Klien Main",
      description: "",
      priority: "medium",
      status: "active",
      startDate: "2026-10-01T00:00:00.000Z",
      targetEndDate: "2026-12-01T00:00:00.000Z",
      coverColor: "#334155",
      createdById: "u-pm1",
      createdAt: "2026-10-01T09:00:00.000Z",
      templateId: "tpl-kol",
      templateVersion: 3,
      lifecycle: "active",
      structureLocked: false,
      phaseStates: { prospek: { authoredAt: "2026-10-01T09:00:00.000Z" } },
      prospekId: "prs-1",
      pitchingId: "pitch-1",
      prospekSnapshot: { client: "Klien Main", periodStart: "", periodEnd: "", pagu: 0 },
      inheritedRab: { items: [], notes: "" },
      prospekContract: { number: "CTR-1", date: "", value: 0, termine: [] },
    },
  ],
  steps: [
    {
      id: "step-p-main-pitching",
      projectId: "p-main",
      key: "pitching",
      name: "Pitching",
      phase: "prospek",
      order: 1,
      status: "completed",
      kind: "simpro",
      required: true,
      weight: 1,
      tasks: [],
      legacyKey: "pitching",
    },
    {
      id: "step-p-main-planning",
      projectId: "p-main",
      key: "step-kol-brief",
      name: "Brief",
      phase: "planning",
      order: 2,
      status: "active",
      kind: "simpro",
      required: true,
      weight: 1,
      tasks: [],
    },
    {
      id: "step-p-main-bast",
      projectId: "p-main",
      key: "bast",
      name: "BAST",
      phase: "closing",
      order: 3,
      status: "pending",
      kind: "finance_form",
      required: true,
      weight: 0.5,
      financeKind: "bast",
      tasks: [],
    },
  ],
  tasks: [
    {
      id: "task-1",
      code: "TSK-1",
      projectId: "p-main",
      stepKey: "step-kol-brief",
      title: "Brief",
      description: "",
      priority: "medium",
      status: "in_progress",
      reporterId: "u-pm1",
      managerId: "u-manager",
      createdAt: "2026-10-02T09:00:00.000Z",
      checklist: [],
      comments: [],
      attachments: [],
      workingLink: { url: "https://docs.example.com/brief", setById: "u-pm1", setAt: "2026-10-02T10:00:00.000Z" },
      workingLinkHistory: [],
    },
  ],
  templates: [],
  forms: [],
  formEntries: [
    {
      id: "entry-1",
      projectId: "p-main",
      stepKey: "step-kol-brief",
      title: "Brief",
      status: "draft",
      payload: { values: {} },
      versions: [],
      createdById: "u-pm1",
      createdAt: "2026-10-02T09:00:00.000Z",
      scope: "project",
    },
  ],
  mediaOrders: [
    {
      id: "mo-1",
      projectId: "p-main",
      number: "MO-PRJ-99-1",
      title: "Media Order",
      status: "unknown",
      items: [
        {
          id: "mo-item-1",
          description: "Display",
          qty: 1,
          unit: "paket",
          clientUnitPrice: 10000000,
          vendorUnitCost: 7000000,
          businessUnitId: "spektrum",
        },
      ],
      notes: "",
      createdById: "u-pm1",
      createdAt: "2026-10-03T09:00:00.000Z",
    },
  ],
  groups: [],
  prospeks: [{ id: "prs-1", name: "Prospek lama" }],
  prospekPitchings: [{ id: "pitch-1", prospekId: "prs-1" }],
  pitchingRabs: [],
  pitchingQuotations: [],
  prospekEvents: [],
  pitchings: [{ id: "pitch-legacy" }],
  pitchingRoles: [],
  notifications: [],
  activityLogs: [],
  projectEvents: [],
};

describe("port persistence migration", () => {
  it("maps main-shaped state onto the ported model", () => {
    const migrated = migratePersistedState(mainShapedState) as unknown as {
      templates: unknown[];
      users: User[];
      steps: ProjectStep[];
      tasks: Task[];
      projectEvents: ProjectEvent[];
      projects: (Project & Record<string, unknown>)[];
      mediaOrders: MediaOrder[];
      formEntries: FormEntry[];
      prospeks?: unknown;
      prospekPitchings?: unknown;
      pitchings?: unknown;
    };

    expect(migrated.templates).toHaveLength(6);
    expect(migrated.users.map((user) => user.id)).toEqual(
      expect.arrayContaining(["u-media", "u-bod"]),
    );

    const steps = migrated.steps;
    expect(steps.find((step) => step.key === "bast")?.phase).toBe("finance");
    expect(steps.find((step) => step.key === "pitching")?.phase).toBe("prospek");
    expect(steps.find((step) => step.key === "step-kol-brief")?.phase).toBe(
      "planning",
    );

    const task = migrated.tasks[0];
    expect(task.workUrl).toBe("https://docs.example.com/brief");
    const rawTask = task as Task & Record<string, unknown>;
    expect(rawTask.workingLink).toBeUndefined();
    expect(rawTask.workingLinkHistory).toBeUndefined();
    expect(rawTask.managerId).toBeUndefined();
    expect(
      migrated.projectEvents.some(
        (event) => event.eventType === "task.work_link_migrated",
      ),
    ).toBe(true);

    const project = migrated.projects[0];
    expect(project.prospekId).toBeUndefined();
    expect(project.pitchingId).toBeUndefined();
    expect(project.prospekContract).toBeUndefined();
    expect(project.inheritedRab).toBeUndefined();
    expect(migrated.prospeks).toBeUndefined();
    expect(migrated.prospekPitchings).toBeUndefined();
    expect(migrated.pitchings).toBeUndefined();

    const order = migrated.mediaOrders[0];
    expect(order.status).toBe("draft");
    expect(order.items[0].businessUnitId).toBe("spektrum");
    expect(
      (migrated as unknown as { forms: StepForm[] }).forms.filter(
        (form) => form.type === "mo",
      ),
    ).toHaveLength(1);

    const entry = migrated.formEntries[0] as FormEntry & Record<string, unknown>;
    expect(entry.scope).toBeUndefined();
    expect(entry.projectId).toBe("p-main");
  });

  it("is idempotent", () => {
    const once = migratePersistedState(mainShapedState);
    const twice = migratePersistedState(once);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });

  it("keeps the first pre-port backup", () => {
    const storage = new Map<string, string>();
    type TestWindow = {
      localStorage: {
        getItem: (key: string) => string | null;
        setItem: (key: string, value: string) => void;
      };
    };
    const globalWithWindow = globalThis as unknown as {
      window?: TestWindow;
    };
    const previous = globalWithWindow.window;
    globalWithWindow.window = {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    };
    try {
      backupPersistedState({ marker: 1 });
      backupPersistedState({ marker: 2 });
      expect(storage.get("prototype-state-backup")).toBe(
        JSON.stringify({ marker: 1 }),
      );
    } finally {
      if (previous === undefined) {
        delete globalWithWindow.window;
      } else {
        globalWithWindow.window = previous;
      }
    }
  });
});
