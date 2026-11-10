import { describe, expect, it } from "vitest";
import { createSeedState } from "../src/lib/prototype/seed";
import { userById } from "../src/lib/prototype/domain";
import {
  SIMPRO_FINANCE_FORM_LABEL,
  canSeeFinanceFormInSimpro,
  simproFinanceFormRows,
  simproFinanceFormsNeedingAction,
} from "../src/lib/prototype/simpro-forms";

function form(state: ReturnType<typeof createSeedState>, id: string) {
  return state.forms.find((item) => item.id === id)!;
}

describe("finance forms in SIMPRO Forms", () => {
  it("shows RAB/BAST/Invoice as their own form types", () => {
    expect(SIMPRO_FINANCE_FORM_LABEL.rab).toBe("Form RAB");
    expect(SIMPRO_FINANCE_FORM_LABEL.bast).toBe("Form BAST");
    expect(SIMPRO_FINANCE_FORM_LABEL.invoice).toBe("Form Invoice");
  });

  it("shows only assigned finance forms to Finance", () => {
    const state = createSeedState();
    const finance = userById(state, "u-finance")!;
    const rows = simproFinanceFormRows(state, finance);
    const names = rows.map((row) => row.formName);

    expect(names).toContain("Form RAB");
    expect(names).toContain("Form BAST");
    expect(names).toContain("Form Invoice");
    expect(rows.some((row) => row.form.id === "form-p-alpha-rab")).toBe(false);
    expect(
      canSeeFinanceFormInSimpro(
        state,
        finance,
        form(state, "form-p-alpha-rab"),
      ),
    ).toBe(false);
  });

  it("lets the owning PM review and hides other PM projects", () => {
    const state = createSeedState();
    const pm1 = userById(state, "u-pm1")!;
    const pm2 = userById(state, "u-pm2")!;

    expect(
      canSeeFinanceFormInSimpro(state, pm1, form(state, "form-p-gamma-rab")),
    ).toBe(true);
    expect(
      canSeeFinanceFormInSimpro(state, pm1, form(state, "form-p-epsilon-bast")),
    ).toBe(false);
    expect(
      canSeeFinanceFormInSimpro(state, pm2, form(state, "form-p-epsilon-bast")),
    ).toBe(true);
  });

  it("hides finance forms from Manager and Assignee", () => {
    const state = createSeedState();
    const manager = userById(state, "u-manager")!;
    const assignee = userById(state, "u-assignee1")!;
    expect(simproFinanceFormRows(state, manager)).toEqual([]);
    expect(simproFinanceFormRows(state, assignee)).toEqual([]);
  });

  it("shows an assigned BAST to Media and hides other finance forms", () => {
    const state = createSeedState();
    const media = userById(state, "u-media")!;
    state.forms = state.forms.map((item) =>
      item.id === "form-p-epsilon-bast"
        ? { ...item, assigneeId: "u-media", status: "assigned" as const }
        : item,
    );
    expect(
      canSeeFinanceFormInSimpro(
        state,
        media,
        form(state, "form-p-epsilon-bast"),
      ),
    ).toBe(true);
    expect(
      canSeeFinanceFormInSimpro(state, media, form(state, "form-p-epsilon-rab")),
    ).toBe(false);
    expect(
      simproFinanceFormRows(state, media).some(
        (row) => row.form.type === "bast",
      ),
    ).toBe(true);
    expect(simproFinanceFormsNeedingAction(state, "u-media")).toBe(1);
  });

  it("lets Admin see all finance forms", () => {
    const state = createSeedState();
    const admin = userById(state, "u-admin")!;
    const rows = simproFinanceFormRows(state, admin);
    expect(rows.some((row) => row.form.id === "form-p-alpha-rab")).toBe(true);
    expect(rows.some((row) => row.form.id === "form-p-gamma-rab")).toBe(true);
  });

  it("counts only forms Finance still has to fill in the badge", () => {
    const state = createSeedState();
    // p-epsilon invoice is draft and assigned to Finance; RAB/BAST are submitted.
    expect(simproFinanceFormsNeedingAction(state, "u-finance")).toBe(1);
    expect(simproFinanceFormsNeedingAction(state, "u-pm1")).toBe(0);
  });
});
