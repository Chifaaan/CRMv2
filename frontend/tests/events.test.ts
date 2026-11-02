import { describe, expect, it } from "vitest";
import {
  backfillProjectEvents,
  maskProjectEventForViewer,
  readProjectEvents,
  recordProjectEvent,
} from "../src/lib/prototype/events";
import { createSeedState } from "../src/lib/prototype/seed";

describe("recordProjectEvent", () => {
  it("appends an append-only event with actor and metadata", () => {
    const state = createSeedState();
    const events = recordProjectEvent(state.projectEvents, {
      projectId: "p-lemmic",
      step: "pitching",
      eventType: "pitching.decided",
      actorId: "u-pm1",
      summary: "Pitching diputuskan.",
      metadata: { before: { status: "draft" }, after: { status: "won" } },
    });

    expect(events).toHaveLength(state.projectEvents.length + 1);
    const event = events.at(-1)!;
    expect(event.projectId).toBe("p-lemmic");
    expect(event.step).toBe("pitching");
    expect(event.actorId).toBe("u-pm1");
    expect(event.metadata).toEqual({
      before: { status: "draft" },
      after: { status: "won" },
    });
    expect(event.occurredAt).toBeTruthy();
  });
});

describe("backfillProjectEvents", () => {
  it("maps legacy activity logs into project events", () => {
    const state = createSeedState();
    const events = backfillProjectEvents(state);
    const pitching = events.find((event) => event.id === "backfill-act-1");
    const task = events.find((event) => event.id === "backfill-act-2");
    const bast = events.find((event) => event.id === "backfill-act-3");

    expect(pitching?.eventType).toBe("pitching.decided");
    expect(pitching?.step).toBe("pitching");
    expect(task?.eventType).toBe("task.status_changed");
    expect(task?.step).toBe("running");
    expect(bast?.eventType).toBe("bast.submitted");
    expect(bast?.step).toBe("bast");
  });

  it("adds a synthetic event when a project has no history", () => {
    const state = createSeedState();
    const events = backfillProjectEvents(state);
    const synthetic = events.find(
      (event) => event.id === "backfill-project-p-resear",
    );

    expect(synthetic?.eventType).toBe("project.backfill");
    expect(synthetic?.step).toBeNull();
    expect(synthetic?.projectId).toBe("p-resear");
  });

  it("is idempotent", () => {
    const state = createSeedState();
    const once = backfillProjectEvents(state);
    const twice = backfillProjectEvents({ ...state, projectEvents: once });

    expect(twice.map((event) => event.id)).toEqual(
      once.map((event) => event.id),
    );
    expect(new Set(twice.map((event) => event.id)).size).toBe(twice.length);
  });
});

describe("readProjectEvents", () => {
  it("uses project visibility and masks metadata for an assignee", () => {
    const state = createSeedState();
    const pmForbidden = readProjectEvents(state, {
      projectId: "p-alert",
      viewerId: "u-pm1",
    });
    expect(pmForbidden.events).toEqual([]);

    const assignee = readProjectEvents(state, {
      projectId: "p-alert",
      viewerId: "u-assignee1",
    });
    expect(assignee.events.length).toBeGreaterThan(0);
    expect(assignee.events.every((event) => Object.keys(event.metadata).length === 0)).toBe(true);

    const manager = readProjectEvents(state, {
      projectId: "p-alert",
      viewerId: "u-manager",
    });
    expect(manager.events.length).toBeGreaterThan(0);
  });

  it("filters by step, includes project-level events, and paginates", () => {
    const state = createSeedState();
    let events = recordProjectEvent(state.projectEvents, {
      projectId: "p-posrv",
      step: null,
      eventType: "project.updated",
      actorId: "u-pm2",
      summary: "Proyek diperbarui.",
      metadata: {},
    });
    events = recordProjectEvent(events, {
      projectId: "p-posrv",
      step: "invoice",
      eventType: "invoice.updated",
      actorId: "u-finance",
      summary: "Invoice diperbarui.",
      metadata: {},
    });
    const withEvents = { ...state, projectEvents: events };

    const page1 = readProjectEvents(withEvents, {
      projectId: "p-posrv",
      viewerId: "u-pm2",
      step: "invoice",
      includeProjectLevel: true,
      limit: 1,
    });
    expect(page1.events).toHaveLength(1);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = readProjectEvents(withEvents, {
      projectId: "p-posrv",
      viewerId: "u-pm2",
      step: "invoice",
      includeProjectLevel: true,
      limit: 10,
      cursor: page1.nextCursor ?? undefined,
    });
    expect(page2.events.length).toBeGreaterThan(0);
    expect(page2.events[0].id).not.toBe(page1.events[0].id);
  });

  it("masks metadata for assignee viewers", () => {
    const state = createSeedState();
    const event = state.projectEvents.find((item) => item.projectId === "p-alert");
    expect(event).toBeDefined();
    const assignee = state.users.find((user) => user.id === "u-assignee1")!;
    expect(maskProjectEventForViewer(event!, assignee).metadata).toEqual({});
  });
});
