import type {
  AppState,
  BastPayload,
  FormPayload,
  FormStepKey,
  FormVersion,
  InvoicePayload,
  PaymentPayload,
  RabPayload,
  StepForm,
} from "./types";

function now(): string {
  return new Date().toISOString();
}

export function formHasData(type: FormStepKey, payload: FormPayload): boolean {
  if (type === "rab") {
    return ((payload as RabPayload).items ?? []).length > 0;
  }
  if (type === "mo") {
    return Boolean((payload as { notes?: string }).notes);
  }
  if (type === "bast") {
    const value = payload as BastPayload;
    return Boolean(
      value.number ||
        value.date ||
        value.picId ||
        value.notes ||
        value.documentUrl,
    );
  }
  if (type === "invoice") {
    const value = payload as InvoicePayload;
    return Boolean(
      value.number ||
        value.date ||
        value.amount ||
        value.notes ||
        value.documentUrl,
    );
  }
  if (type === "payment") {
    const value = payload as PaymentPayload;
    return Boolean(
      value.paymentDate ||
        value.amount ||
        value.method ||
        value.proofFileName ||
        value.notes,
    );
  }
  const value = payload as { surveyDate?: string; findings?: string };
  return Boolean(value.surveyDate || value.findings);
}

export function nextVersionNumber(form: StepForm): number {
  return (form.versions?.length ?? 0) + 1;
}

export function buildFormVersion(
  form: StepForm,
  actorId: string,
  source: FormVersion["source"] = "submission",
): FormVersion {
  return {
    id: `version-${form.id}-${nextVersionNumber(form)}-${source}`,
    formId: form.id,
    versionNumber: nextVersionNumber(form),
    status: "submitted",
    payload: form.payload,
    photos: form.photos,
    createdAt: now(),
    createdById: actorId,
    source,
  };
}

export function submitFormVersion(
  form: StepForm,
  actorId: string,
): StepForm {
  const version = buildFormVersion(form, actorId);
  const at = version.createdAt;
  return {
    ...form,
    versions: [...(form.versions ?? []), version],
    status: "submitted",
    submittedAt: at,
    reviewedAt: undefined,
    reviewedById: undefined,
    reviewComment: undefined,
    reviewTarget: undefined,
    updatedAt: at,
    updatedById: actorId,
  };
}

export function reviewFormVersion(
  form: StepForm,
  decision: "approved" | "need_revision",
  comment: string,
  target: string | undefined,
  actorId: string,
): StepForm {
  const at = now();
  return {
    ...form,
    status: decision,
    reviewedAt: at,
    reviewedById: actorId,
    reviewComment: comment,
    reviewTarget: target,
    updatedAt: at,
    updatedById: actorId,
  };
}

/**
 * Convert existing dialog-era data into a deterministic baseline version.
 * Safe to run repeatedly: forms that already have versions are untouched.
 */
export function migrateFormVersions(state: AppState): StepForm[] {
  return state.forms.map((form) => {
    if ((form.versions?.length ?? 0) > 0) return form;
    if (!formHasData(form.type, form.payload)) {
      return { ...form, versions: form.versions ?? [] };
    }
    const createdAt = form.submittedAt ?? form.reviewedAt ?? form.createdAt;
    const createdById =
      form.reviewedById ?? form.assigneeId ?? state.currentUserId;
    const baseline: FormVersion = {
      id: `version-${form.id}-1-migration`,
      formId: form.id,
      versionNumber: 1,
      status: form.status,
      payload: form.payload,
      photos: form.photos,
      createdAt,
      createdById,
      source: "migration",
    };
    return {
      ...form,
      versions: [baseline],
      updatedAt: form.updatedAt ?? createdAt,
      updatedById: form.updatedById ?? createdById,
    };
  });
}

export type ValidationIssue = {
  key: string;
  label: string;
  itemId?: string;
};

export function getValidationErrors(
  type: FormStepKey,
  payload: FormPayload,
): ValidationIssue[] {
  if (type === "rab") {
    const value = payload as RabPayload;
    const items = value.items ?? [];
    const issues: ValidationIssue[] = [];
    if (items.length === 0) {
      issues.push({ key: "items", label: "Minimal 1 item RAB." });
    }
    items.forEach((item, index) => {
      if (!item.description.trim()) {
        issues.push({
          key: `item-${item.id}-description`,
          label: `Item ${index + 1}: nama item wajib diisi.`,
          itemId: item.id,
        });
      }
      if (!item.qty || item.qty <= 0) {
        issues.push({
          key: `item-${item.id}-qty`,
          label: `Item ${index + 1}: kuantitas harus lebih dari 0.`,
          itemId: item.id,
        });
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        issues.push({
          key: `item-${item.id}-price`,
          label: `Item ${index + 1}: harga satuan harus lebih dari 0.`,
          itemId: item.id,
        });
      }
    });
    return issues;
  }

  if (type === "bast") {
    const value = payload as BastPayload;
    const issues: ValidationIssue[] = [];
    if (!value.date) issues.push({ key: "date", label: "Tanggal BAST wajib diisi." });
    if (!value.picId) issues.push({ key: "picId", label: "PIC BAST wajib dipilih." });
    return issues;
  }

  if (type === "invoice") {
    const value = payload as InvoicePayload;
    const issues: ValidationIssue[] = [];
    if (!value.number.trim()) issues.push({ key: "number", label: "Nomor invoice wajib diisi." });
    if (!value.date) issues.push({ key: "date", label: "Tanggal terbit wajib diisi." });
    if (!value.amount || value.amount <= 0) {
      issues.push({ key: "amount", label: "Nilai invoice harus lebih dari 0." });
    }
    return issues;
  }

  if (type === "payment") {
    const value = payload as PaymentPayload;
    const issues: ValidationIssue[] = [];
    if (!value.paymentDate) {
      issues.push({ key: "paymentDate", label: "Tanggal bayar wajib diisi." });
    }
    if (!value.amount || value.amount <= 0) {
      issues.push({ key: "amount", label: "Nominal pembayaran harus lebih dari 0." });
    }
    if (!value.method.trim()) {
      issues.push({ key: "method", label: "Metode pembayaran wajib diisi." });
    }
    if (value.status === "paid" && !value.proofStorageKey) {
      issues.push({ key: "proof", label: "Bukti pembayaran wajib untuk status lunas." });
    }
    return issues;
  }

  return [];
}

export function hasEditConflict(
  form: StepForm,
  expectedUpdatedAt: string | undefined,
  actorId: string,
): boolean {
  return Boolean(
    expectedUpdatedAt &&
      form.updatedAt &&
      form.updatedAt !== expectedUpdatedAt &&
      form.updatedById &&
      form.updatedById !== actorId,
  );
}

export function hasUnsavedChanges(
  draft: FormPayload,
  saved: FormPayload,
): boolean {
  return JSON.stringify(draft) !== JSON.stringify(saved);
}

export function shouldWarnBeforeUnload(dirty: boolean): boolean {
  return dirty;
}

export type DiffField = {
  key: string;
  label: string;
  before: unknown;
  after: unknown;
};

export type DiffRow = {
  key: string;
  kind: "added" | "removed" | "changed";
  label: string;
  before?: string;
  after?: string;
};

export type FormDiff = {
  fields: DiffField[];
  rows: DiffRow[];
};

const FIELD_LABELS: Record<string, string> = {
  number: "Nomor",
  date: "Tanggal",
  dueDate: "Jatuh tempo",
  picId: "PIC",
  notes: "Catatan",
  documentUrl: "Dokumen",
  amount: "Nilai",
  taxPercent: "PPN %",
  taxAmount: "Nominal PPN",
  paymentDate: "Tanggal bayar",
  method: "Metode",
  paymentStatus: "Status pembayaran",
  proofFileName: "Bukti",
};

export function diffFormPayloads(
  type: FormStepKey,
  before: FormPayload,
  after: FormPayload,
): FormDiff {
  if (type === "rab") {
    const beforeItems = (before as RabPayload).items ?? [];
    const afterItems = (after as RabPayload).items ?? [];
    const beforeMap = new Map(beforeItems.map((item) => [item.id, item]));
    const afterMap = new Map(afterItems.map((item) => [item.id, item]));
    const rows: DiffRow[] = [];

    for (const item of beforeItems) {
      if (!afterMap.has(item.id)) {
        rows.push({
          key: item.id,
          kind: "removed",
          label: item.description || "Item tanpa nama",
          before: `${item.qty} ${item.unit} × ${item.unitPrice}`,
        });
      }
    }
    for (const item of afterItems) {
      const previous = beforeMap.get(item.id);
      if (!previous) {
        rows.push({
          key: item.id,
          kind: "added",
          label: item.description || "Item tanpa nama",
          after: `${item.qty} ${item.unit} × ${item.unitPrice}`,
        });
        continue;
      }
      const beforeText = `${previous.description} · ${previous.qty} ${previous.unit} × ${previous.unitPrice}`;
      const afterText = `${item.description} · ${item.qty} ${item.unit} × ${item.unitPrice}`;
      if (beforeText !== afterText) {
        rows.push({
          key: item.id,
          kind: "changed",
          label: item.description || previous.description || "Item",
          before: beforeText,
          after: afterText,
        });
      }
    }
    return { fields: [], rows };
  }

  const beforeRecord = before as unknown as Record<string, unknown>;
  const afterRecord = after as unknown as Record<string, unknown>;
  const fields: DiffField[] = [];
  const keys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]);
  for (const key of keys) {
    if (key === "items") continue;
    const previous = beforeRecord[key];
    const next = afterRecord[key];
    if (JSON.stringify(previous) !== JSON.stringify(next)) {
      fields.push({
        key,
        label: FIELD_LABELS[key] ?? key,
        before: previous,
        after: next,
      });
    }
  }
  return { fields, rows: [] };
}

export type AutosaveController<T> = {
  schedule: (payload: T) => void;
  flush: () => Promise<void>;
  cancel: () => void;
  hasPending: () => boolean;
  isSaving: () => boolean;
};

/**
 * Debounced autosave used by the full form panel. Kept framework-free so it can
 * be tested with fake timers.
 */
export function createDebouncedAutosave<T>(
  delayMs: number,
  save: (payload: T) => void | Promise<void>,
): AutosaveController<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: T | undefined;
  let saving = false;

  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending === undefined) return;
    const payload = pending;
    pending = undefined;
    saving = true;
    try {
      await save(payload);
    } finally {
      saving = false;
    }
  };

  const schedule = (payload: T) => {
    pending = payload;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, delayMs);
  };

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = undefined;
  };

  return {
    schedule,
    flush,
    cancel,
    hasPending: () => pending !== undefined,
    isSaving: () => saving,
  };
}
