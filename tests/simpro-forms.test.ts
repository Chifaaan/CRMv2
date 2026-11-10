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
    expect(SIMPRO_FINANCE_FORM_LABEL.mo).toBe("Media Order");
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

  it("shows finance forms to Manager and hides them from Assignee", () => {
    const state = createSeedState();
    const manager = userById(state, "u-manager")!;
    const assignee = userById(state, "u-assignee1")!;
    expect(simproFinanceFormRows(state, manager).length).toBeGreaterThan(0);
    expect(simproFinanceFormRows(state, assignee)).toEqual([]);
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
    // p-epsilon invoice is draft; p-gamma Media Order is assigned and has an MO.
    expect(simproFinanceFormsNeedingAction(state, "u-finance")).toBe(2);
    expect(simproFinanceFormsNeedingAction(state, "u-pm1")).toBe(0);
  });

  it("lists Media Order for Finance only when the project has a document", () => {
    const state = createSeedState();
    const finance = userById(state, "u-finance")!;
    const rows = simproFinanceFormRows(state, finance);
    expect(rows.some((row) => row.form.type === "mo")).toBe(true);
    expect(
      rows.find((row) => row.form.type === "mo")?.project.id,
    ).toBe("p-gamma");
    const media = userById(state, "u-media")!;
    expect(
      simproFinanceFormRows(state, media).some((row) => row.form.type === "mo"),
    ).toBe(false);
  });
});
