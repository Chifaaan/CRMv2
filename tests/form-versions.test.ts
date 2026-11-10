import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canEditForm,
  canReviewForm,
  userById,
} from "../src/lib/prototype/domain";
import {
  createDebouncedAutosave,
  diffFormPayloads,
  getValidationErrors,
  hasEditConflict,
  hasUnsavedChanges,
  migrateFormVersions,
  reviewFormVersion,
  shouldWarnBeforeUnload,
  submitFormVersion,
} from "../src/lib/prototype/form-versions";
import { createSeedState } from "../src/lib/prototype/seed";
import type {
  AppState,
  BastPayload,
  InvoicePayload,
  RabPayload,
  StepForm,
} from "../src/lib/prototype/types";

function form(state: AppState, id: string): StepForm {
  const found = state.forms.find((item) => item.id === id);
  if (!found) throw new Error(`Form ${id} not found`);
  return found;
}

const rabPayload: RabPayload = {
  notes: "RAB awal",
  items: [
    {
      id: "row-1",
      description: "Pekerjaan A",
      category: "Persiapan",
      qty: 2,
      unit: "paket",
      unitPrice: 1000,
    },
  ],
};

describe("form version migration", () => {
  it("turns legacy form data into version 1 without changing status", () => {
    const seeded = createSeedState();
    const legacy = {
      ...seeded,
      forms: seeded.forms.map((item) => {
        const copy = { ...item };
        delete copy.versions;
        delete copy.updatedAt;
        delete copy.updatedById;
        return copy;
      }),
    };

    const migrated = migrateFormVersions(legacy);
    const rab = migrated.find((item) => item.id === "form-p-gamma-rab")!;
    const empty = migrated.find((item) => item.id === "form-p-alpha-rab")!;

    expect(rab.versions).toHaveLength(1);
    expect(rab.versions?.[0]).toMatchObject({
      versionNumber: 1,
      status: "submitted",
      source: "migration",
    });
    expect(rab.versions?.[0].payload).toEqual(rab.payload);
    expect(empty.versions).toEqual([]);
  });

  it("is idempotent", () => {
    const seeded = createSeedState();
    const legacy = {
      ...seeded,
      forms: seeded.forms.map((item) => {
        const copy = { ...item };
        delete copy.versions;
        return copy;
      }),
    };
    const once = migrateFormVersions(legacy);
    const twice = migrateFormVersions({ ...legacy, forms: once });

    expect(twice).toEqual(once);
  });
});

describe("form validation", () => {
  it("requires at least one RAB row and valid qty/price per row", () => {
    expect(getValidationErrors("rab", { items: [], notes: "" })).toHaveLength(1);

    const errors = getValidationErrors("rab", {
      notes: "",
      items: [
        {
          id: "row-x",
          description: "",
          qty: 0,
          unit: "paket",
          unitPrice: 0,
        },
      ],
    });
    expect(errors.map((issue) => issue.key)).toEqual([
      "item-row-x-description",
      "item-row-x-qty",
      "item-row-x-price",
      "item-row-x-businessUnit",
    ]);
    expect(errors[0].itemId).toBe("row-x");
  });

  it("requires BAST date and PIC", () => {
    const errors = getValidationErrors("bast", {
      number: "",
      date: "",
      picId: "",
      notes: "",
      documentUrl: "",
    } satisfies BastPayload);
    expect(errors.map((issue) => issue.key)).toEqual(["date", "picId"]);
  });

  it("requires invoice number, date, and amount", () => {
    const errors = getValidationErrors("invoice", {
      number: " ",
      date: "",
      dueDate: "",
      amount: 0,
      taxPercent: 11,
      taxAmount: 0,
      notes: "",
      documentUrl: "",
    } satisfies InvoicePayload);
    expect(errors.map((issue) => issue.key)).toEqual([
      "number",
      "date",
      "amount",
    ]);
  });
});

describe("version flow", () => {
  it("creates immutable snapshots, supports revision, and approval", () => {
    const state = createSeedState();
    const original = form(state, "form-p-gamma-rab");
    const previousCount = original.versions?.length ?? 0;

    const submitted = submitFormVersion(original, "u-finance");
    expect(submitted.status).toBe("submitted");
    expect(submitted.versions).toHaveLength(previousCount + 1);
    const version = submitted.versions![submitted.versions!.length - 1];
    expect(version.payload).toEqual(original.payload);
    expect(version.source).toBe("submission");

    const revisedPayload: RabPayload = {
      ...rabPayload,
      notes: "Revisi setelah komentar PM",
    };
    const revisedForm = { ...submitted, payload: revisedPayload };
    expect(version.payload).toEqual(original.payload);

    const revision = reviewFormVersion(
      revisedForm,
      "need_revision",
      "Harga belum termasuk PPN.",
      "item-row-1-price",
      "u-pm1",
    );
    expect(revision).toMatchObject({
      status: "need_revision",
      reviewComment: "Harga belum termasuk PPN.",
      reviewTarget: "item-row-1-price",
      reviewedById: "u-pm1",
    });

    const resubmitted = submitFormVersion(revision, "u-finance");
    expect(resubmitted.versions).toHaveLength(previousCount + 2);
    expect(resubmitted.versions?.at(-1)?.payload).toEqual(revisedPayload);

    const approved = reviewFormVersion(
      resubmitted,
      "approved",
      "Disetujui.",
      undefined,
      "u-pm1",
    );
    expect(approved.status).toBe("approved");
    expect(approved.reviewComment).toBe("Disetujui.");
  });
});

describe("diff between versions", () => {
  it("marks RAB rows as added, removed, and changed", () => {
    const before: RabPayload = {
      notes: "",
      items: [
        { id: "a", description: "Lama", qty: 1, unit: "unit", unitPrice: 10 },
        { id: "b", description: "Tetap", qty: 1, unit: "unit", unitPrice: 20 },
      ],
    };
    const after: RabPayload = {
      notes: "",
      items: [
        { id: "b", description: "Tetap", qty: 2, unit: "unit", unitPrice: 20 },
        { id: "c", description: "Baru", qty: 1, unit: "unit", unitPrice: 30 },
      ],
    };

    const diff = diffFormPayloads("rab", before, after);
    expect(diff.rows.map((row) => [row.key, row.kind])).toEqual([
      ["a", "removed"],
      ["b", "changed"],
      ["c", "added"],
    ]);
  });

  it("compares BAST fields by label", () => {
    const before: BastPayload = {
      number: "BAST/1",
      date: "2026-10-01",
      picId: "u-assignee1",
      notes: "",
      documentUrl: "",
    };
    const after: BastPayload = { ...before, number: "BAST/2", picId: "u-assignee2" };

    const diff = diffFormPayloads("bast", before, after);
    expect(diff.fields.map((field) => field.key)).toEqual(["number", "picId"]);
    expect(diff.fields[0]).toMatchObject({
      label: "Nomor",
      before: "BAST/1",
      after: "BAST/2",
    });
  });
});

describe("optimistic locking", () => {
  it("only reports a conflict when another actor changed the form", () => {
    const state = createSeedState();
    const target = form(state, "form-p-gamma-rab");
    const baseline = target.updatedAt;

    expect(
      hasEditConflict(
        { ...target, updatedAt: "2026-11-01T10:00:00.000Z", updatedById: "u-admin" },
        baseline,
        "u-finance",
      ),
    ).toBe(true);
    expect(
      hasEditConflict(
        { ...target, updatedAt: "2026-11-01T10:00:00.000Z", updatedById: "u-finance" },
        baseline,
        "u-finance",
      ),
    ).toBe(false);
    expect(hasEditConflict(target, baseline, "u-finance")).toBe(false);
  });
});

describe("autosave and unsaved-change guard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces rapid changes into one save with the latest payload", async () => {
    const save = vi.fn();
    const controller = createDebouncedAutosave<{ value: number }>(1300, save);

    controller.schedule({ value: 1 });
    controller.schedule({ value: 2 });
    expect(controller.hasPending()).toBe(true);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1299);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ value: 2 });
    expect(controller.hasPending()).toBe(false);
  });

  it("flushes immediately and resets the saving flag when a save fails", async () => {
    const save = vi.fn(async () => {
      throw new Error("offline");
    });
    const controller = createDebouncedAutosave<{ value: number }>(1200, save);

    controller.schedule({ value: 3 });
    await expect(controller.flush()).rejects.toThrow("offline");
    expect(save).toHaveBeenCalledWith({ value: 3 });
    expect(controller.hasPending()).toBe(false);
    expect(controller.isSaving()).toBe(false);
  });

  it("detects dirty drafts", () => {
    expect(hasUnsavedChanges(rabPayload, rabPayload)).toBe(false);
    expect(
      hasUnsavedChanges(rabPayload, { ...rabPayload, notes: "berubah" }),
    ).toBe(true);
    expect(shouldWarnBeforeUnload(true)).toBe(true);
    expect(shouldWarnBeforeUnload(false)).toBe(false);
  });
});

describe("per form permissions", () => {
  it("lets the assigned finance edit an active draft but not review it", () => {
    const state = createSeedState();
    const finance = userById(state, "u-finance")!;
    const rab = form(state, "form-p-gamma-rab");

    expect(canEditForm(state, finance, rab)).toBe(true);
    expect(canReviewForm(state, finance, rab)).toBe(false);
  });

  it("only lets the owning PM review, and never lets an assignee edit finance forms", () => {
    const state = createSeedState();
    const pm1 = userById(state, "u-pm1")!;
    const pm2 = userById(state, "u-pm2")!;
    const assignee = userById(state, "u-assignee1")!;
    const rab = form(state, "form-p-gamma-rab");

    expect(canReviewForm(state, pm1, rab)).toBe(true);
    expect(canReviewForm(state, pm2, rab)).toBe(false);
    expect(canEditForm(state, assignee, rab)).toBe(false);
  });

  it("locks approved forms even for admins", () => {
    const state = createSeedState();
    const admin = userById(state, "u-admin")!;
    const approved = form(state, "form-p-delta-rab");

    expect(approved.status).toBe("approved");
    expect(canEditForm(state, admin, approved)).toBe(false);
  });
});
