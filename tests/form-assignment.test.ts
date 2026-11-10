import { beforeEach, describe, expect, it } from "vitest";
import {
  canOpenFinanceForm,
  canReceiveFormEntry,
  userById,
} from "../src/lib/prototype/domain";
import { usePrototypeStore } from "../src/lib/prototype/store";
import { KOL_TEMPLATE_ID } from "../src/lib/prototype/templates";

function createBriefEntry(projectId: string) {
  usePrototypeStore.getState().setCurrentUser("u-pm1");
  const step = usePrototypeStore
    .getState()
    .steps.filter((item) => item.projectId === projectId)
    .sort((a, b) => a.order - b.order)[0];
  return usePrototypeStore.getState().createFormEntry(projectId, step.key, {
    title: "Entri assignment",
  });
}

describe("form assignment", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
    usePrototypeStore.getState().setCurrentUser("u-manager");
  });

  it("assigns a BAST to Media and notifies the assignee", () => {
    const state = usePrototypeStore.getState();
    const media = userById(state, "u-media")!;
    const bast = state.forms.find((item) => item.id === "form-p-epsilon-bast")!;
    expect(canOpenFinanceForm(state, media, bast)).toBe(false);

    state.assignForm(bast.id, media.id);

    const after = usePrototypeStore.getState();
    const assigned = after.forms.find((item) => item.id === bast.id)!;
    const notification = after.notifications.find(
      (item) =>
        item.userId === media.id &&
        item.type === "form_assigned" &&
        item.href === `/forms/finance/${bast.projectId}/${bast.type}`,
    );
    expect(assigned.assigneeId).toBe("u-media");
    expect(notification).toBeTruthy();
    expect(notification?.readAt).toBeUndefined();
    expect(canOpenFinanceForm(after, media, assigned)).toBe(true);
    expect(
      after.projectEvents.some(
        (event) =>
          event.eventType === "bast.assigned" &&
          event.metadata.after &&
          (event.metadata.after as { assigneeId?: string }).assigneeId ===
            "u-media",
      ),
    ).toBe(true);
  });

  it("rejects RAB assignment to Media", () => {
    const state = usePrototypeStore.getState();
    const rab = state.forms.find((item) => item.id === "form-p-epsilon-rab")!;
    const before = rab.assigneeId;

    state.assignForm(rab.id, "u-media");

    const after = usePrototypeStore.getState();
    expect(after.forms.find((item) => item.id === rab.id)?.assigneeId).toBe(
      before,
    );
    expect(
      after.notifications.some(
        (item) => item.userId === "u-media" && item.type === "form_assigned",
      ),
    ).toBe(false);
  });

  it("rejects PM assignment", () => {
    const state = usePrototypeStore.getState();
    const bast = state.forms.find((item) => item.id === "form-p-epsilon-bast")!;
    const before = bast.assigneeId;
    usePrototypeStore.getState().setCurrentUser("u-pm2");

    usePrototypeStore.getState().assignForm(bast.id, "u-media");

    expect(
      usePrototypeStore
        .getState()
        .forms.find((item) => item.id === bast.id)?.assigneeId,
    ).toBe(before);
  });

  it("assigns a form entry to an Assignee and rejects Finance", () => {
    usePrototypeStore.getState().setCurrentUser("u-pm1");
    const projectId = usePrototypeStore.getState().createProject({
      name: "KOL Entry Assign",
      client: "Klien",
      description: "",
      priority: "medium",
      startDate: "",
      targetEndDate: "",
      coverColor: "#000000",
      templateId: KOL_TEMPLATE_ID,
    });
    usePrototypeStore.getState().startPhase(projectId, "prospek");
    const entryId = createBriefEntry(projectId);
    expect(entryId).toBeTruthy();
    expect(canReceiveFormEntry(userById(usePrototypeStore.getState(), "u-finance")!)).toBe(
      false,
    );

    usePrototypeStore.getState().setCurrentUser("u-manager");
    usePrototypeStore.getState().assignFormEntry(entryId, "u-assignee1");
    const assigned = usePrototypeStore
      .getState()
      .formEntries.find((item) => item.id === entryId)!;
    expect(assigned.assigneeId).toBe("u-assignee1");
    expect(
      usePrototypeStore.getState().notifications.some(
        (item) =>
          item.userId === "u-assignee1" &&
          item.type === "form_entry_assigned" &&
          item.href === `/forms?entry=${entryId}` &&
          !item.readAt,
      ),
    ).toBe(true);

    usePrototypeStore.getState().assignFormEntry(entryId, "u-finance");
    expect(
      usePrototypeStore
        .getState()
        .formEntries.find((item) => item.id === entryId)?.assigneeId,
    ).toBe("u-assignee1");
  });
});
