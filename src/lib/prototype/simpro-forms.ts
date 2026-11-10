import type { AppState, Project, StepForm, User } from "./types";

export const SIMPRO_FINANCE_FORM_TYPES = ["rab", "bast", "invoice"] as const;

export type SimproFinanceFormType =
  (typeof SIMPRO_FINANCE_FORM_TYPES)[number];

export const SIMPRO_FINANCE_FORM_LABEL: Record<
  SimproFinanceFormType,
  string
> = {
  rab: "Form RAB",
  bast: "Form BAST",
  invoice: "Form Invoice",
};

export type SimproFinanceFormRow = {
  form: StepForm;
  project: Project;
  formName: string;
};

function isFinanceFormType(type: string): type is SimproFinanceFormType {
  return (SIMPRO_FINANCE_FORM_TYPES as readonly string[]).includes(type);
}

function projectHasFinanceStage(state: AppState, form: StepForm): boolean {
  return state.steps.some(
    (step) =>
      step.projectId === form.projectId &&
      (step.financeKind === form.type || step.legacyKey === form.type),
  );
}

/**
 * Forms SIMPRO visibility for finance forms: only the assigned Finance user,
 * the owning PM (reviewer), and Admin. Manager/Assignee do not get assignment
 * or review on these forms, so they do not see them in this menu.
 */
export function canSeeFinanceFormInSimpro(
  state: AppState,
  user: User,
  form: StepForm,
): boolean {
  if (!isFinanceFormType(form.type)) return false;
  const project = state.projects.find((item) => item.id === form.projectId);
  if (!project) return false;
  if (!projectHasFinanceStage(state, form)) return false;

  if (user.role === "admin") return true;
  if (user.role === "pm") return project.createdById === user.id;
  if (user.role === "finance") return form.assigneeId === user.id;
  if (user.role === "media") {
    return form.type === "bast" && form.assigneeId === user.id;
  }
  return false;
}

export function simproFinanceFormRows(
  state: AppState,
  user: User,
): SimproFinanceFormRow[] {
  return state.forms
    .filter((form) => canSeeFinanceFormInSimpro(state, user, form))
    .map((form) => {
      const project = state.projects.find((item) => item.id === form.projectId);
      if (!project || !isFinanceFormType(form.type)) return null;
      return {
        form,
        project,
        formName: SIMPRO_FINANCE_FORM_LABEL[form.type],
      };
    })
    .filter((row): row is SimproFinanceFormRow => Boolean(row));
}

/** Badge count: finance forms this user still has to fill. */
export function simproFinanceFormsNeedingAction(
  state: AppState,
  userId: string,
): number {
  const user = state.users.find((item) => item.id === userId);
  if (!user) return 0;
  return state.forms.filter((form) => {
    if (!isFinanceFormType(form.type)) return false;
    if (form.assigneeId !== userId) return false;
    if (!["assigned", "draft", "need_revision"].includes(form.status)) {
      return false;
    }
    const project = state.projects.find((item) => item.id === form.projectId);
    if (project?.status !== "active") return false;
    return canSeeFinanceFormInSimpro(state, user, form);
  }).length;
}
