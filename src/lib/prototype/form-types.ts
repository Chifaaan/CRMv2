import type { FormStatus, FormStepKey } from "./types";

export type SimproFormTypeKey = Extract<FormStepKey, "survey" | "rab">;

export type SimproFormType = {
  key: SimproFormTypeKey;
  label: string;
  shortLabel: string;
  description: string;
  open: "dialog" | "crm";
};

/**
 * SIMPRO Forms page config. Add a new form type here (and, if needed, its
 * opening behaviour) without touching the page layout.
 */
export const SIMPRO_FORM_TYPES: SimproFormType[] = [
  {
    key: "survey",
    label: "Form Survey",
    shortLabel: "Survey",
    description: "Form lapangan yang diisi Assignee dan direview PM.",
    open: "dialog",
  },
  {
    key: "rab",
    label: "Form RAB",
    shortLabel: "RAB",
    description: "RAB diisi Finance dan direview PM di CRM.",
    open: "crm",
  },
];

export function simproFormType(
  key: string,
): SimproFormType | undefined {
  return SIMPRO_FORM_TYPES.find((type) => type.key === key);
}

export function crmFormHref(
  projectId: string,
  key: SimproFormTypeKey,
): string | undefined {
  if (key === "rab") return `/crm/projects/${projectId}?step=rab`;
  return undefined;
}

export type FormDisplayStatus =
  | "empty"
  | "submitted"
  | "need_revision"
  | "done";

export const FORM_DISPLAY_STATUS_LABEL: Record<FormDisplayStatus, string> = {
  empty: "Belum diisi",
  submitted: "Submitted",
  need_revision: "Perlu revisi",
  done: "Selesai",
};

export const FORM_DISPLAY_STATUS_ORDER: FormDisplayStatus[] = [
  "empty",
  "submitted",
  "need_revision",
  "done",
];

export function formDisplayStatus(status: FormStatus): FormDisplayStatus {
  if (status === "approved") return "done";
  if (status === "submitted") return "submitted";
  if (status === "need_revision") return "need_revision";
  return "empty";
}
