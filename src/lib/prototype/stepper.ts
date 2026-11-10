import {
  PHASE_LABEL,
  PHASE_ORDER,
  NEW_PROJECT_PHASES,
  type Phase,
  type Project,
  type ProjectStep,
} from "./types";
import { isNewLifecycleProject } from "./domain";

export function phasesPresent(steps: ProjectStep[]): Phase[] {
  return PHASE_ORDER.filter((phase) =>
    steps.some((step) => step.phase === phase),
  );
}

/**
 * New-lifecycle projects always expose Planning, Running, and Finance even
 * when a phase has no step. Legacy projects keep their data-driven phases.
 */
export function phasesForProject(
  project: Project | undefined,
  steps: ProjectStep[],
): Phase[] {
  if (project && isNewLifecycleProject(project)) return [...NEW_PROJECT_PHASES];
  return phasesPresent(steps);
}

export function phaseStageCounts(
  steps: ProjectStep[],
): Partial<Record<Phase, number>> {
  const counts: Partial<Record<Phase, number>> = {};
  for (const step of steps) {
    counts[step.phase] = (counts[step.phase] ?? 0) + 1;
  }
  return counts;
}

export function missingPhases(steps: ProjectStep[]): Phase[] {
  return PHASE_ORDER.filter(
    (phase) => !steps.some((step) => step.phase === phase),
  );
}

function listPhases(phases: Phase[]): string {
  const labels = phases.map((phase) => PHASE_LABEL[phase]);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} dan ${labels[labels.length - 1]}`;
}

export function missingPhaseTooltip(steps: ProjectStep[]): string {
  const missing = missingPhases(steps);
  if (missing.length === 0) return "Template ini memiliki semua fase.";
  return `Template ini tidak memiliki fase ${listPhases(missing)}.`;
}

export type PhaseTransitionBanner = {
  /** Stable per completed stage + destination phase, used for dismissal. */
  key: string;
  phase: Phase;
  message: string;
};

/**
 * UI-only detection of the latest completed phase boundary. Returns a neutral
 * message so transitions without a winning gate never imply "Menang".
 */
export function phaseTransitionBanner(
  steps: ProjectStep[],
  projectStatus: string,
): PhaseTransitionBanner | null {
  if (projectStatus !== "active") return null;

  const active = steps
    .filter((step) => step.status === "active")
    .sort((a, b) => a.order - b.order)[0];
  if (!active) return null;

  const completed = steps
    .filter((step) => step.status === "completed" && step.completedAt)
    .sort((a, b) => {
      const byTime = (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
      return byTime !== 0 ? byTime : b.order - a.order;
    })[0];
  if (!completed) return null;

  const phaseSteps = steps.filter((step) => step.phase === completed.phase);
  const lastOrder = Math.max(...phaseSteps.map((step) => step.order));
  if (completed.order !== lastOrder) return null;

  if (
    PHASE_ORDER.indexOf(active.phase) <= PHASE_ORDER.indexOf(completed.phase)
  ) {
    return null;
  }

  return {
    key: `${completed.id}:${active.phase}`,
    phase: active.phase,
    message: `Proyek masuk fase ${PHASE_LABEL[active.phase]}`,
  };
}
