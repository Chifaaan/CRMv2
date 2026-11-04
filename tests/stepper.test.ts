import { describe, expect, it } from "vitest";
import {
  missingPhaseTooltip,
  phaseStageCounts,
  phaseTransitionBanner,
  phasesPresent,
} from "../src/lib/prototype/stepper";
import { phaseOfProject } from "../src/lib/prototype/domain";
import { createSeedState } from "../src/lib/prototype/seed";
import { PHASE_LABEL, type Phase, type ProjectStep } from "../src/lib/prototype/types";

function step(
  id: string,
  phase: Phase,
  order: number,
  status: ProjectStep["status"],
  completedAt?: string,
): ProjectStep {
  return {
    id,
    projectId: "p-test",
    key: id,
    name: id,
    phase,
    order,
    status,
    kind: "simpro",
    required: true,
    weight: 1,
    tasks: [],
    completedAt,
  };
}

const umumSteps = [
  step("pitching", "prospek", 1, "completed", "2026-10-03"),
  step("survey", "prospek", 2, "completed", "2026-10-03"),
  step("rab", "prospek", 3, "completed", "2026-10-03"),
  step("running", "running", 4, "active"),
  step("bast", "closing", 5, "pending"),
  step("invoice", "closing", 6, "pending"),
];

describe("data-driven stepper", () => {
  it("derives three phases for Umum and four for a full template", () => {
    expect(phasesPresent(umumSteps)).toEqual([
      "prospek",
      "running",
      "closing",
    ]);

    const full = [
      ...umumSteps,
      step("planning", "planning", 7, "pending"),
    ];
    expect(phasesPresent(full)).toEqual([
      "prospek",
      "planning",
      "running",
      "closing",
    ]);
  });

  it("does not render empty phases and reports their absence in the tooltip", () => {
    expect(phasesPresent(umumSteps)).not.toContain("planning");
    expect(missingPhaseTooltip(umumSteps)).toBe(
      "Template ini tidak memiliki fase Planning.",
    );
    expect(
      missingPhaseTooltip([
        ...umumSteps,
        step("planning", "planning", 7, "pending"),
      ]),
    ).toBe("Template ini memiliki semua fase.");
  });

  it("sizes phase groups by their stage count", () => {
    expect(phaseStageCounts(umumSteps)).toEqual({
      prospek: 3,
      running: 1,
      closing: 2,
    });
  });
});

describe("phase transition banner", () => {
  it("uses neutral wording for a transition without a winning gate", () => {
    const banner = phaseTransitionBanner(umumSteps, "active");
    expect(banner?.message).toBe("Proyek masuk fase Running");
    expect(banner?.message).not.toContain("Menang");
  });

  it("does not show a banner when the phase still has an unfinished stage", () => {
    const steps = [
      step("pitching", "prospek", 1, "completed", "2026-10-01"),
      step("survey", "prospek", 2, "active"),
      step("rab", "prospek", 3, "pending"),
      step("running", "running", 4, "pending"),
    ];
    expect(phaseTransitionBanner(steps, "active")).toBeNull();
  });
});

describe("mixed-template group phase badges", () => {
  it("returns the actual phase per project, not one phase for the group", () => {
    const state = createSeedState();
    const alpha = phaseOfProject(state, "p-alpha");
    const delta = phaseOfProject(state, "p-delta");
    expect(alpha).toBe("prospek");
    expect(delta).toBe("running");
    expect(PHASE_LABEL[alpha!]).not.toBe(PHASE_LABEL[delta!]);
  });
});
