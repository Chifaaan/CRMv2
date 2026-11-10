import type {
  FormStepKey,
  GateKind,
  Phase,
  Project,
  ProjectStep,
  StageKind,
  TemplateStage,
} from "./types";

export type MandatoryStepSpec = {
  phase: Phase;
  name: string;
  kind: StageKind;
  financeKind?: FormStepKey;
  gateKind?: GateKind;
  weight: number;
  description: string;
};

export const MANDATORY_STEP_SPECS: MandatoryStepSpec[] = [
  {
    phase: "prospek",
    name: "RAB",
    kind: "finance_form",
    financeKind: "rab",
    weight: 1,
    description: "RAB wajib pada fase Prospek.",
  },
  {
    phase: "prospek",
    name: "Decision Win / Loss",
    kind: "gate",
    gateKind: "client_approval",
    weight: 1,
    description: "Keputusan menang atau kalah wajib pada fase Prospek.",
  },
  {
    phase: "finance",
    name: "BAST",
    kind: "finance_form",
    financeKind: "bast",
    weight: 0.5,
    description: "BAST wajib pada fase Finance.",
  },
  {
    phase: "finance",
    name: "Invoice",
    kind: "finance_form",
    financeKind: "invoice",
    weight: 0.5,
    description: "Invoice wajib pada fase Finance.",
  },
];

export function matchesMandatorySpec(
  step: Pick<TemplateStage, "phase" | "kind" | "financeKind" | "gateKind">,
  spec: MandatoryStepSpec,
): boolean {
  if (step.phase !== spec.phase || step.kind !== spec.kind) return false;
  if (spec.financeKind) return step.financeKind === spec.financeKind;
  return step.gateKind === spec.gateKind;
}

export function isMandatoryStage(
  step: Pick<TemplateStage, "phase" | "kind" | "financeKind" | "gateKind">,
): boolean {
  return MANDATORY_STEP_SPECS.some((spec) => matchesMandatorySpec(step, spec));
}

export function isMandatoryProjectStep(
  step: Pick<ProjectStep, "phase" | "kind" | "financeKind" | "gateKind">,
): boolean {
  return MANDATORY_STEP_SPECS.some((spec) => matchesMandatorySpec(step, spec));
}

function mandatoryId(spec: MandatoryStepSpec): string {
  return `${spec.phase}-${spec.financeKind ?? spec.gateKind}`;
}

const PHASE_SEQUENCE: Phase[] = ["prospek", "planning", "running", "finance"];

function reorderStages(stages: TemplateStage[]): TemplateStage[] {
  return [...stages]
    .sort((a, b) => {
      const phaseDiff =
        PHASE_SEQUENCE.indexOf(a.phase) - PHASE_SEQUENCE.indexOf(b.phase);
      return phaseDiff !== 0 ? phaseDiff : a.order - b.order;
    })
    .map((stage, index) => ({ ...stage, order: index + 1 }));
}

export function ensureMandatoryStages(
  stages: TemplateStage[],
  legacy = false,
): TemplateStage[] {
  if (legacy) return stages;
  const result = [...stages];
  const phases = new Set(result.map((stage) => stage.phase));
  for (const spec of MANDATORY_STEP_SPECS) {
    if (!phases.has(spec.phase)) continue;
    if (result.some((stage) => matchesMandatorySpec(stage, spec))) continue;
    const phaseOrder = result
      .filter((stage) => stage.phase === spec.phase)
      .reduce((max, stage) => Math.max(max, stage.order), 0);
    result.push({
      id: `mandatory-${mandatoryId(spec)}`,
      name: spec.name,
      description: spec.description,
      phase: spec.phase,
      order: phaseOrder + 1,
      kind: spec.kind,
      required: true,
      weight: spec.weight,
      financeKind: spec.financeKind,
      gateKind: spec.gateKind,
      tasks: [],
    });
  }
  return reorderStages(result);
}

export function missingMandatoryProjectSteps(
  project: Project,
  steps: ProjectStep[],
): ProjectStep[] {
  const projectSteps = steps.filter((step) => step.projectId === project.id);
  const phases = new Set(projectSteps.map((step) => step.phase));
  const additions: ProjectStep[] = [];
  for (const spec of MANDATORY_STEP_SPECS) {
    if (!phases.has(spec.phase)) continue;
    if (projectSteps.some((step) => matchesMandatorySpec(step, spec))) continue;
    const phaseOrder = projectSteps
      .filter((step) => step.phase === spec.phase)
      .reduce((max, step) => Math.max(max, step.order), 0);
    additions.push({
      id: `step-${project.id}-${mandatoryId(spec)}`,
      projectId: project.id,
      key: mandatoryId(spec),
      name: spec.name,
      description: spec.description,
      phase: spec.phase,
      order: phaseOrder + 1,
      status: "pending",
      kind: spec.kind,
      required: true,
      weight: spec.weight,
      financeKind: spec.financeKind,
      gateKind: spec.gateKind,
      tasks: [],
      managerPicId: project.managerId,
    });
  }
  return additions;
}

/** Builds mandatory template stages for the given phases only. */
export function mandatoryStagesForPhases(phases: Phase[]): TemplateStage[] {
  const included = new Set(phases);
  const stages: TemplateStage[] = MANDATORY_STEP_SPECS.filter((spec) =>
    included.has(spec.phase),
  ).map((spec) => ({
    id: `mandatory-${mandatoryId(spec)}`,
    name: spec.name,
    description: spec.description,
    phase: spec.phase,
    order: 0,
    kind: spec.kind,
    required: true,
    weight: spec.weight,
    financeKind: spec.financeKind,
    gateKind: spec.gateKind,
    tasks: [],
  }));
  return reorderStages(stages);
}
