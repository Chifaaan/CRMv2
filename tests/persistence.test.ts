import { describe, expect, it } from "vitest";
import { migratePersistedState } from "../src/lib/prototype/store";
import { createSeedState } from "../src/lib/prototype/seed";
import type { Task } from "../src/lib/prototype/types";

describe("persistence migration v10", () => {
  it("normalizes task scopes without deleting legacy prospek form entries", () => {
    const seed = createSeedState();
    const legacyTask: Task = {
      id: "legacy-task",
      code: "LEG-1",
      projectId: "p-alpha",
      stepKey: "running",
      title: "Legacy task",
      description: "",
      priority: "medium",
      status: "todo",
      reporterId: "u-pm1",
      createdAt: "2026-01-01T00:00:00.000Z",
      checklist: [],
      comments: [],
      attachments: [],
    };
    const persisted = {
      ...seed,
      tasks: [...seed.tasks, legacyTask],
      formEntries: [
        {
          id: "legacy-prospek-form",
          scope: "prospek" as const,
          prospekId: "prs-alpha",
          pitchingId: "pp-alpha-event",
          stepKey: "tpl-event-strategy",
          title: "Legacy form",
          status: "assigned" as const,
          payload: { values: {}, photos: [] },
          versions: [],
          createdById: "u-pm1",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    const migrated = migratePersistedState(persisted);
    const projectTask = migrated.tasks.find((task) => task.id === "legacy-task")!;
    expect(projectTask.scope).toBe("project");
    expect(projectTask.stageId).toBeTruthy();
    expect(
      migrated.tasks.find((task) => task.id === "task-pitch-presentasi")?.scope,
    ).toBe("pitching");
    expect(
      migrated.tasks.find((task) => task.id === "task-pitch-presentasi")
        ?.prospekId,
    ).toBe("prs-beta");
    expect(
      migrated.formEntries.some((entry) => entry.id === "legacy-prospek-form"),
    ).toBe(true);
  });

  it("is idempotent for groups, steps, and pitching cards", () => {
    const first = migratePersistedState(createSeedState());
    const second = migratePersistedState(first);
    expect(second.groups).toEqual(first.groups);
    expect(second.steps).toEqual(first.steps);
    expect(second.tasks).toEqual(first.tasks);
    expect(second.formEntries).toEqual(first.formEntries);
  });
});
