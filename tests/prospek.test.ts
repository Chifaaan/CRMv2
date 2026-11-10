import { beforeEach, describe, expect, it } from "vitest";
import {
  canEditFormEntry,
  canEditPitchingContract,
  canEditPitchingRab,
  canEditQuotation,
  canReviewFormEntry,
  formsNeedingAction,
  isProspekAssignee,
  prospekAssigneeCandidates,
  prospekPitchingsFor,
  prospekPaguSummary,
  prospekWorkItemsForUser,
  userById,
  visibleProspeks,
} from "../src/lib/prototype/domain";
import { prospekEventPage } from "../src/lib/prototype/prospek-events";
import { createSeedState } from "../src/lib/prototype/seed";
import { usePrototypeStore } from "../src/lib/prototype/store";
import type {
  FormEntry,
  PitchingContract,
  Prospek,
  ProspekPitching,
} from "../src/lib/prototype/types";
import { FORM_STEP_KEYS } from "../src/lib/prototype/types";

function state() {
  return usePrototypeStore.getState();
}

function prospek(id: string): Prospek {
  return state().prospeks.find((item) => item.id === id)!;
}

function pitching(id: string): ProspekPitching {
  return state().prospekPitchings.find((item) => item.id === id)!;
}

const completeContract: PitchingContract = {
  number: "KTR/TEST/001",
  date: "2026-11-05",
  value: 150_000_000,
  attachment: {
    id: "att-contract",
    fileName: "kontrak.pdf",
    mimeType: "application/pdf",
    size: 1000,
    storageKey: "contract-test",
  },
  termine: [
    {
      id: "termine-test-1",
      label: "DP 50%",
      amount: 75_000_000,
      dueDate: "2026-11-12",
    },
  ],
};

function prepareWinningPitching() {
  state().setCurrentUser("u-assignee2");
  state().savePitchingRab("pp-beta-kol", {
    items: [
      {
        id: "rab-prep-1",
        kind: "cost",
        description: "Produksi",
        category: "Produksi",
        qty: 1,
        unit: "paket",
        unitPrice: 50_000_000,
      },
    ],
    notes: "",
  });
  state().submitPitchingRab("pp-beta-kol");
  state().savePitchingQuotation("pp-beta-kol", {
    mode: "link",
    url: "https://example.com/quotation",
    amount: 60_000_000,
  });
  state().submitPitchingQuotation("pp-beta-kol");
  state().setCurrentUser("u-pm2");
}

describe("prospek management", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("creates a prospek with a unique code and audit event", () => {
    const id = state().createProspek({
      name: "Prospek Uji",
      description: "Deskripsi",
      picId: "u-manager",
      client: "PT Uji",
      periodStart: "2026-11-01",
      periodEnd: "2026-12-31",
      pagu: 100_000_000,
    });
    expect(id).not.toBe("");
    expect(prospek(id).code).toMatch(/^PRS-\d{3}$/);
    expect(prospek(id).status).toBe("active");
    expect(
      state().prospekEvents.some(
        (event) =>
          event.prospekId === id && event.eventType === "prospek.created",
      ),
    ).toBe(true);
  });

  it("rejects invalid periods and empty names", () => {
    expect(
      state().createProspek({
        name: "",
        description: "",
        client: "PT Uji",
        periodStart: "2026-11-01",
        periodEnd: "2026-12-31",
        pagu: 0,
      }),
    ).toBe("");
    expect(
      state().createProspek({
        name: "Prospek Salah",
        description: "",
        client: "PT Uji",
        periodStart: "2026-12-31",
        periodEnd: "2026-11-01",
        pagu: 0,
      }),
    ).toBe("");
  });

  it("limits visibility by role, including no finance access", () => {
    const seed = createSeedState();
    const pm1 = userById(seed, "u-pm1")!;
    const pm2 = userById(seed, "u-pm2")!;
    const manager = userById(seed, "u-manager")!;
    const admin = userById(seed, "u-admin")!;
    const assignee1 = userById(seed, "u-assignee1")!;
    const assignee2 = userById(seed, "u-assignee2")!;
    const finance = userById(seed, "u-finance")!;

    expect(visibleProspeks(seed, pm1).map((item) => item.id)).toEqual([
      "prs-alpha",
    ]);
    expect(visibleProspeks(seed, pm2).map((item) => item.id)).toEqual([
      "prs-beta",
    ]);
    expect(visibleProspeks(seed, manager)).toHaveLength(2);
    expect(visibleProspeks(seed, admin)).toHaveLength(2);
    expect(visibleProspeks(seed, assignee1)).toEqual([]);
    expect(visibleProspeks(seed, assignee2)).toEqual([]);
    expect(visibleProspeks(seed, finance)).toEqual([]);
  });

  it("summarizes pagu and warns without blocking", () => {
    const alpha = prospek("prs-alpha");
    const summary = prospekPaguSummary(state(), alpha);
    expect(summary.rabTotal).toBe(220_000_000);
    expect(summary.quotationTotal).toBe(690_000_000);
    expect(summary.exceeds).toBe(true);

    state().updateProspek("prs-alpha", { pagu: 1_000_000_000 });
    expect(prospek("prs-alpha").pagu).toBe(1_000_000_000);
    expect(prospekPaguSummary(state(), prospek("prs-alpha")).exceeds).toBe(false);
    state().updateProspek("prs-alpha", { pagu: 100_000_000 });
    expect(prospekPaguSummary(state(), prospek("prs-alpha")).exceeds).toBe(true);
    expect(state().savePitchingRab("pp-alpha-kol", { items: [], notes: "" })).toBeUndefined();
  });

  it("cancels a prospek with a required reason and locks it", () => {
    state().cancelProspek("prs-alpha", "");
    expect(prospek("prs-alpha").status).toBe("active");
    state().cancelProspek("prs-alpha", "Klien membatalkan");
    expect(prospek("prs-alpha").status).toBe("cancelled");
    expect(prospek("prs-alpha").cancelReason).toBe("Klien membatalkan");
    expect(
      state().addProspekPitching("prs-alpha", {
        title: "Tidak boleh",
        description: "",
        templateId: "tpl-kol",
      }),
    ).toBe("");
  });

  it("pages prospek events newest first", () => {
    state().updateProspek("prs-alpha", { description: "Baru" });
    state().updateProspek("prs-alpha", { description: "Lebih baru" });
    const first = prospekEventPage(state().prospekEvents, "prs-alpha", 0, 1);
    const second = prospekEventPage(state().prospekEvents, "prs-alpha", 1, 1);
    expect(first.items).toHaveLength(1);
    expect(first.hasMore).toBe(true);
    expect(first.items[0].id).not.toBe(second.items[0].id);
    expect(first.items[0].occurredAt >= second.items[0].occurredAt).toBe(true);
  });
});

describe("prospek pitching flow", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("requires a template when adding a pitching and creates RAB/quotation", () => {
    expect(
      state().addProspekPitching("prs-alpha", {
        title: "Tanpa template",
        description: "",
        templateId: "",
      }),
    ).toBe("");
    const id = state().addProspekPitching("prs-alpha", {
      title: "Pitching Baru",
      description: "Deskripsi",
      templateId: "tpl-kol",
    });
    expect(id).not.toBe("");
    expect(pitching(id).status).toBe("draft");
    expect(
      state().pitchingRabs.some((rab) => rab.pitchingId === id),
    ).toBe(true);
    expect(
      state().pitchingQuotations.some((q) => q.pitchingId === id),
    ).toBe(true);
    expect(prospekPitchingsFor(state(), "prs-alpha")).toHaveLength(3);
  });

  it("assigns, saves, submits, and versions RAB", () => {
    state().assignPitchingRab("pp-beta-kol", "u-assignee2");
    expect(
      state().pitchingRabs.find((rab) => rab.pitchingId === "pp-beta-kol")
        ?.status,
    ).toBe("assigned");

    state().setCurrentUser("u-assignee2");
    state().submitPitchingRab("pp-beta-kol");
    expect(
      state().pitchingRabs.find((rab) => rab.pitchingId === "pp-beta-kol")
        ?.status,
    ).toBe("assigned");

    state().savePitchingRab("pp-beta-kol", {
      items: [
        {
          id: "rab-test-1",
          kind: "manpower",
          description: "KOL Manager",
          category: "Manpower",
          qty: 1,
          unit: "orang",
          unitPrice: 10_000_000,
        },
      ],
      notes: "Final",
    });
    state().submitPitchingRab("pp-beta-kol");
    const rab = state().pitchingRabs.find(
      (item) => item.pitchingId === "pp-beta-kol",
    )!;
    expect(rab.status).toBe("submitted");
    expect(rab.versions).toHaveLength(1);
    expect(rab.submittedById).toBe("u-assignee2");
  });

  it("validates quotation mode and limits approval to the owning PM", () => {
    state().setCurrentUser("u-assignee2");
    state().savePitchingQuotation("pp-beta-kol", {
      mode: "link",
      url: "not-a-url",
    });
    state().submitPitchingQuotation("pp-beta-kol");
    expect(
      state().pitchingQuotations.find(
        (q) => q.pitchingId === "pp-beta-kol",
      )?.status,
    ).toBe("draft");

    state().savePitchingQuotation("pp-beta-kol", {
      mode: "link",
      url: "https://example.com/quotation",
      amount: 200_000_000,
    });
    state().submitPitchingQuotation("pp-beta-kol");
    expect(
      state().pitchingQuotations.find(
        (q) => q.pitchingId === "pp-beta-kol",
      )?.status,
    ).toBe("submitted");

    state().reviewPitchingQuotation("pp-beta-kol", "approved", "");
    expect(
      state().pitchingQuotations.find(
        (q) => q.pitchingId === "pp-beta-kol",
      )?.status,
    ).toBe("submitted");

    state().setCurrentUser("u-pm2");
    state().reviewPitchingQuotation("pp-beta-kol", "approved", "");
    expect(
      state().pitchingQuotations.find(
        (q) => q.pitchingId === "pp-beta-kol",
      )?.status,
    ).toBe("approved");
  });

  it("requires RAB and quotation before a decision and locks losing pitching", () => {
    state().setCurrentUser("u-pm2");
    state().decideProspekPitching("pp-beta-kol", "won");
    expect(pitching("pp-beta-kol").status).toBe("draft");

    state().setCurrentUser("u-assignee2");
    state().savePitchingRab("pp-beta-kol", {
      items: [
        {
          id: "rab-test-2",
          kind: "cost",
          description: "Produksi",
          category: "Produksi",
          qty: 1,
          unit: "paket",
          unitPrice: 50_000_000,
        },
      ],
      notes: "",
    });
    state().submitPitchingRab("pp-beta-kol");
    state().savePitchingQuotation("pp-beta-kol", {
      mode: "link",
      url: "https://example.com/quotation",
      amount: 60_000_000,
    });
    state().submitPitchingQuotation("pp-beta-kol");

    state().setCurrentUser("u-pm2");
    state().decideProspekPitching("pp-beta-kol", "lost");
    expect(pitching("pp-beta-kol").status).toBe("draft");
    state().decideProspekPitching("pp-beta-kol", "lost", "Kalah harga");
    expect(pitching("pp-beta-kol").status).toBe("lost");
    expect(pitching("pp-beta-kol").lostReason).toBe("Kalah harga");
    expect(
      state().prospekEvents.some(
        (event) =>
          event.pitchingId === "pp-beta-kol" &&
          event.eventType === "pitching.lost",
      ),
    ).toBe(true);

    expect(
      canEditPitchingRab(state(), userById(state(), "u-pm2")!, pitching("pp-beta-kol")),
    ).toBe(false);
    expect(
      canEditQuotation(state(), userById(state(), "u-pm2")!, pitching("pp-beta-kol")),
    ).toBe(false);
    state().savePitchingRab("pp-beta-kol", { items: [], notes: "x" });
    expect(
      state().pitchingRabs.find((rab) => rab.pitchingId === "pp-beta-kol")
        ?.notes,
    ).not.toBe("x");
  });

  it("saves a complete contract and converts a winning pitching idempotently", () => {
    state().setCurrentUser("u-pm2");
    state().savePitchingContract("pp-beta-kol", completeContract);
    expect(pitching("pp-beta-kol").contract).toBeUndefined();

    prepareWinningPitching();
    state().setCurrentUser("u-assignee2");
    expect(state().convertPitching("pp-beta-kol")).toBe("");
    state().setCurrentUser("u-pm2");
    state().decideProspekPitching("pp-beta-kol", "won");
    expect(pitching("pp-beta-kol").status).toBe("won");
    expect(state().convertPitching("pp-beta-kol")).toBe("");
    state().savePitchingContract("pp-beta-kol", {
      ...completeContract,
      attachment: undefined,
    });
    expect(pitching("pp-beta-kol").contract).toBeUndefined();

    state().savePitchingContract("pp-beta-kol", completeContract);
    expect(pitching("pp-beta-kol").contract?.number).toBe("KTR/TEST/001");

    const projectId = state().convertPitching("pp-beta-kol");
    expect(projectId).not.toBe("");
    const child = state().projects.find((project) => project.id === projectId)!;
    expect(child.prospekId).toBe("prs-beta");
    expect(child.pitchingId).toBe("pp-beta-kol");
    expect(child.prospekContract?.termine).toHaveLength(1);
    expect(child.inheritedRab?.items).toHaveLength(1);

    const steps = state().steps.filter((step) => step.projectId === projectId);
    const active = steps.find((step) => step.status === "active");
    expect(active?.phase).not.toBe("prospek");
    expect(steps.filter((step) => step.status === "completed").length).toBeGreaterThan(0);

    expect(state().convertPitching("pp-beta-kol")).toBe(projectId);
    expect(
      state().projects.filter(
        (project) => project.pitchingId === "pp-beta-kol",
      ),
    ).toHaveLength(1);
    expect(
      canEditPitchingContract(
        state(),
        userById(state(), "u-pm2")!,
        pitching("pp-beta-kol"),
      ),
    ).toBe(false);
    expect(
      state().prospekEvents.some(
        (event) =>
          event.eventType === "pitching.converted" &&
          event.metadata.projectId === projectId,
      ),
    ).toBe(true);
    expect(prospek("prs-beta").status).toBe("completed");
  });

  it("does not auto-create finance forms on conversion", () => {
    prepareWinningPitching();
    state().decideProspekPitching("pp-beta-kol", "won");
    state().savePitchingContract("pp-beta-kol", completeContract);
    const projectId = state().convertPitching("pp-beta-kol");
    expect(projectId).not.toBe("");
    const childForms = state().forms.filter(
      (form) => form.projectId === projectId,
    );
    expect(childForms).toHaveLength(FORM_STEP_KEYS.length);
    expect(childForms.every((form) => form.status === "unassigned")).toBe(true);
    expect(
      state().forms.some(
        (form) =>
          form.projectId === projectId &&
          (form.type === "invoice" || form.type === "payment") &&
          form.status !== "unassigned",
      ),
    ).toBe(false);
  });
});

describe("refined prospek pitching flow", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("treats finance as a prospek assignee and hides prospek from assignee/finance", () => {
    const seed = createSeedState();
    const finance = userById(seed, "u-finance")!;
    const assignee = userById(seed, "u-assignee1")!;
    const manager = userById(seed, "u-manager")!;
    const pm1 = userById(seed, "u-pm1")!;
    const alpha = seed.prospeks.find((item) => item.id === "prs-alpha")!;

    expect(isProspekAssignee(finance)).toBe(true);
    expect(isProspekAssignee(assignee)).toBe(true);
    expect(isProspekAssignee(manager)).toBe(true);
    expect(
      prospekAssigneeCandidates(seed, pm1, alpha).map((user) => user.role),
    ).toEqual(expect.arrayContaining(["finance", "manager", "assignee"]));
    expect(visibleProspeks(seed, finance)).toEqual([]);
    expect(visibleProspeks(seed, assignee)).toEqual([]);
  });

  it("projects assigned RAB, quotation, contract, and form work into My Tasks items", () => {
    prepareWinningPitching();
    state().decideProspekPitching("pp-beta-kol", "won");
    state().assignPitchingRab("pp-beta-kol", "u-finance");
    state().assignPitchingQuotation("pp-beta-kol", "u-manager");
    state().assignPitchingContract("pp-beta-kol", "u-finance", "2026-11-20");
    const formId = state().createProspekFormEntry(
      "prs-beta",
      "pp-beta-kol",
      "tpl-kol-listing",
      { title: "Presentasi Ramadan" },
    );
    state().assignFormEntry(formId, "u-assignee1");

    expect(
      prospekWorkItemsForUser(state(), "u-finance").map((item) => item.kind),
    ).toEqual(expect.arrayContaining(["rab", "contract"]));
    expect(
      prospekWorkItemsForUser(state(), "u-manager").map((item) => item.kind),
    ).toContain("quotation");
    expect(
      prospekWorkItemsForUser(state(), "u-assignee1").map((item) => item.kind),
    ).toContain("form");
    expect(
      prospekWorkItemsForUser(state(), "u-finance").every((item) =>
        item.href.startsWith("/work/prospek/pp-beta-kol"),
      ),
    ).toBe(true);

    state().setCurrentUser("u-finance");
    state().submitPitchingRab("pp-beta-kol");
    expect(
      prospekWorkItemsForUser(state(), "u-finance").some(
        (item) => item.kind === "rab",
      ),
    ).toBe(false);
  });

  it("allows losing a draft pitching at any time and undo restores it", () => {
    state().setCurrentUser("u-assignee1");
    state().decideProspekPitching("pp-beta-kol", "lost", "Tidak berhak");
    expect(pitching("pp-beta-kol").status).toBe("draft");

    state().setCurrentUser("u-pm2");
    state().decideProspekPitching("pp-beta-kol", "lost", "Batal karena budget");
    expect(pitching("pp-beta-kol").status).toBe("lost");
    expect(pitching("pp-beta-kol").statusBeforeLoss).toBe("draft");
    expect(
      state().prospekEvents.some(
        (event) =>
          event.pitchingId === "pp-beta-kol" &&
          event.eventType === "pitching.lost",
      ),
    ).toBe(true);

    state().undoPitchingLoss("pp-beta-kol");
    expect(pitching("pp-beta-kol").status).toBe("draft");
    expect(pitching("pp-beta-kol").lostReason).toBeUndefined();
    expect(
      state().prospekEvents.some(
        (event) =>
          event.pitchingId === "pp-beta-kol" &&
          event.eventType === "pitching.loss_undone",
      ),
    ).toBe(true);
  });

  it("allows losing a winning pitching and undo restores the win and contract", () => {
    state().setCurrentUser("u-pm1");
    state().decideProspekPitching("pp-alpha-event", "lost", "Klien berubah pikiran");
    expect(pitching("pp-alpha-event").status).toBe("lost");
    expect(pitching("pp-alpha-event").statusBeforeLoss).toBe("won");
    expect(pitching("pp-alpha-event").contract?.number).toBe("KTR/2026/001");

    state().undoPitchingLoss("pp-alpha-event");
    expect(pitching("pp-alpha-event").status).toBe("won");
    expect(pitching("pp-alpha-event").contract?.number).toBe("KTR/2026/001");
  });

  it("blocks losing or undo after conversion", () => {
    prepareWinningPitching();
    state().decideProspekPitching("pp-beta-kol", "won");
    state().savePitchingContract("pp-beta-kol", completeContract);
    const projectId = state().convertPitching("pp-beta-kol");
    expect(projectId).not.toBe("");

    state().decideProspekPitching("pp-beta-kol", "lost", "Tidak boleh");
    expect(pitching("pp-beta-kol").status).toBe("won");
    state().undoPitchingLoss("pp-beta-kol");
    expect(pitching("pp-beta-kol").status).toBe("won");
  });

  it("assigns contract work to finance and lets finance submit it", () => {
    expect(
      canEditPitchingContract(
        state(),
        userById(state(), "u-pm2")!,
        pitching("pp-beta-kol"),
      ),
    ).toBe(false);
    prepareWinningPitching();
    state().decideProspekPitching("pp-beta-kol", "won");
    state().assignPitchingContract("pp-beta-kol", "u-finance", "2026-11-20");
    expect(pitching("pp-beta-kol").contractAssigneeId).toBe("u-finance");
    expect(
      state().notifications.some(
        (item) =>
          item.userId === "u-finance" &&
          item.type === "prospek_assigned" &&
          item.href.includes("/contract"),
      ),
    ).toBe(true);

    state().setCurrentUser("u-assignee1");
    state().assignPitchingContract("pp-beta-kol", "u-assignee1");
    expect(pitching("pp-beta-kol").contractAssigneeId).toBe("u-finance");

    state().setCurrentUser("u-finance");
    expect(
      canEditPitchingContract(
        state(),
        userById(state(), "u-finance")!,
        pitching("pp-beta-kol"),
      ),
    ).toBe(true);
    state().savePitchingContract("pp-beta-kol", completeContract);
    expect(pitching("pp-beta-kol").contractStatus).toBe("submitted");
    expect(pitching("pp-beta-kol").contract?.number).toBe("KTR/TEST/001");
    expect(
      prospekWorkItemsForUser(state(), "u-finance").some(
        (item) => item.kind === "contract",
      ),
    ).toBe(false);
  });

  it("creates a group named after the prospek and reuses an existing group", () => {
    state().setCurrentUser("u-pm2");
    const existing = state().createGroup({
      name: "  kampanye ramadan sehat  ",
      description: "Group manual",
    });
    prepareWinningPitching();
    state().decideProspekPitching("pp-beta-kol", "won");
    state().savePitchingContract("pp-beta-kol", completeContract);
    const projectId = state().convertPitching("pp-beta-kol");
    const child = state().projects.find((project) => project.id === projectId)!;
    expect(child.groupId).toBe(existing);
    expect(
      state().groups.filter(
        (group) =>
          group.name.trim().toLowerCase() === "kampanye ramadan sehat",
      ),
    ).toHaveLength(1);
    expect(
      state().groups.find((group) => group.id === existing)?.prospekId,
    ).toBe("prs-beta");
    expect(
      state().prospekEvents.some(
        (event) =>
          event.pitchingId === "pp-beta-kol" &&
          event.eventType === "prospek.group_linked" &&
          event.metadata.groupId === existing,
      ),
    ).toBe(true);
  });

  it("puts multiple winning pitchings into the same prospek group", () => {
    state().setCurrentUser("u-pm1");
    const secondPitching = state().addProspekPitching("prs-alpha", {
      title: "KOL Launch",
      description: "",
      templateId: "tpl-kol",
    });
    state().assignPitchingRab(secondPitching, "u-assignee1");
    state().assignPitchingQuotation(secondPitching, "u-assignee1");
    state().setCurrentUser("u-assignee1");
    state().savePitchingRab(secondPitching, {
      items: [
        {
          id: "rab-second",
          kind: "cost",
          description: "Produksi",
          category: "Produksi",
          qty: 1,
          unit: "paket",
          unitPrice: 20_000_000,
        },
      ],
      notes: "",
    });
    state().submitPitchingRab(secondPitching);
    state().savePitchingQuotation(secondPitching, {
      mode: "link",
      url: "https://example.com/second",
      amount: 30_000_000,
    });
    state().submitPitchingQuotation(secondPitching);
    state().setCurrentUser("u-pm1");
    state().decideProspekPitching(secondPitching, "won");
    state().savePitchingContract(secondPitching, {
      ...completeContract,
      number: "KTR/SECOND/001",
    });

    const firstProject = state().convertPitching("pp-alpha-event");
    expect(firstProject).not.toBe("");
    const secondProject = state().convertPitching(secondPitching);
    expect(secondProject).not.toBe("");
    const first = state().projects.find(
      (project) => project.id === firstProject,
    )!;
    const second = state().projects.find(
      (project) => project.id === secondProject,
    )!;
    expect(first.groupId).toBeTruthy();
    expect(second.groupId).toBe(first.groupId);
    expect(
      state().groups.filter(
        (group) => group.name === "Peluncuran Produk Nusantara",
      ),
    ).toHaveLength(1);
  });
});

describe("prospek forms and reminders", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("creates and assigns a form entry scoped to a pitching", () => {
    const id = state().createProspekFormEntry(
      "prs-alpha",
      "pp-alpha-event",
      "tpl-event-strategy",
      { title: "Presentasi Grand Launch" },
    );
    expect(id).not.toBe("");
    const entry = state().formEntries.find((item) => item.id === id)!;
    expect(entry.scope).toBe("prospek");
    expect(entry.prospekId).toBe("prs-alpha");
    expect(entry.pitchingId).toBe("pp-alpha-event");

    state().assignFormEntry(id, "u-assignee1");
    expect(
      state().formEntries.find((item) => item.id === id)?.assigneeId,
    ).toBe("u-assignee1");
    expect(formsNeedingAction(state(), "u-assignee1")).toBeGreaterThan(0);
  });

  it("lets an assignee fill and submit, then the owning PM review", () => {
    const seedEntry = state().formEntries.find(
      (item) => item.id === "fentry-prospek-concept",
    )!;
    state().assignFormEntry(seedEntry.id, "u-assignee1");
    state().setCurrentUser("u-assignee1");
    const entry = state().formEntries.find(
      (item) => item.id === "fentry-prospek-concept",
    )!;
    expect(
      canEditFormEntry(
        state(),
        userById(state(), "u-assignee1")!,
        entry,
      ),
    ).toBe(true);
    state().saveFormEntry(entry.id, {
      values: {},
      photos: [],
      notes: "Siap",
    });
    state().submitFormEntry(entry.id);
    expect(
      state().formEntries.find((item) => item.id === entry.id)?.status,
    ).toBe("submitted");

    state().setCurrentUser("u-pm1");
    const submitted = state().formEntries.find((item) => item.id === entry.id)!;
    expect(
      canReviewFormEntry(state(), userById(state(), "u-pm1")!, submitted),
    ).toBe(true);
    state().reviewFormEntry(entry.id, "approved", "OK");
    expect(
      state().formEntries.find((item) => item.id === entry.id)?.status,
    ).toBe("approved");
  });

  it("locks forms for a losing pitching", () => {
    const base = state().formEntries[0];
    const lockedEntry: FormEntry = {
      ...base,
      id: "locked-entry",
      scope: "prospek",
      projectId: undefined,
      prospekId: "prs-alpha",
      pitchingId: "pp-alpha-kol",
      assigneeId: "u-assignee1",
      status: "assigned",
    };
    expect(
      canEditFormEntry(
        state(),
        userById(state(), "u-assignee1")!,
        lockedEntry,
      ),
    ).toBe(false);
    expect(
      state().createProspekFormEntry(
        "prs-alpha",
        "pp-alpha-kol",
        "tpl-kol-listing",
        { title: "Tidak boleh" },
      ),
    ).toBe("");
  });

  it("creates overdue reminders once and never sends email", () => {
    state().syncProspekReminders();
    state().syncProspekReminders();
    const overdue = state().notifications.filter(
      (item) =>
        item.type === "prospek_overdue" && item.userId === "u-assignee1",
    );
    expect(overdue).toHaveLength(1);
    expect(overdue[0].href).toContain("/work/prospek/pp-alpha-event");
    expect(
      state().notifications.some((item) => item.type.includes("email")),
    ).toBe(false);
  });

  it("warns when quotation pushes the total above pagu without blocking", () => {
    state().setCurrentUser("u-assignee2");
    state().savePitchingQuotation("pp-beta-kol", {
      mode: "link",
      url: "https://example.com/quotation",
      amount: 200_000_000,
    });
    state().submitPitchingQuotation("pp-beta-kol");
    const summary = prospekPaguSummary(state(), prospek("prs-beta"));
    expect(summary.exceeds).toBe(true);
    expect(prospek("prs-beta").status).toBe("active");
  });
});
