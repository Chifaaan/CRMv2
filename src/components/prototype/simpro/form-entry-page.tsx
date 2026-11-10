"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, FileUp, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canCancelFormEntry,
  canEditFormEntry,
  canReviewFormEntry,
  formEntryTemplate,
  formatDate,
  formatDateTime,
  operationalAssigneeCandidates,
  reviewerCandidates,
  stepFor,
  userById,
} from "@/lib/prototype/domain";
import { createDebouncedAutosave } from "@/lib/prototype/form-versions";
import type { AutosaveController } from "@/lib/prototype/form-versions";
import { putPrototypeFile } from "@/lib/prototype/files";
import {
  FORM_ENTRY_STATUS_LABEL,
  type FormEntry,
  type FormEntryPayload,
  type FormEntryStatus,
  type FormField,
  type SurveyPhoto,
} from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  Field,
  NativeSelect,
  SectionCard,
  UserAvatar,
} from "../ui";

const STATUS_CLASS: Record<FormEntryStatus, string> = {
  unassigned: "bg-slate-100 text-slate-600 ring-slate-200",
  assigned: "bg-sky-100 text-sky-700 ring-sky-200",
  draft: "bg-amber-100 text-amber-800 ring-amber-200",
  submitted: "bg-violet-100 text-violet-700 ring-violet-200",
  approved: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  need_revision: "bg-rose-100 text-rose-700 ring-rose-200",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
};

function StatusBadge({ status }: { status: FormEntryStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1",
        STATUS_CLASS[status],
      )}
    >
      {FORM_ENTRY_STATUS_LABEL[status]}
    </span>
  );
}

function fileLimitMessage(file: File, maxMb = 5): string | null {
  if (file.size > maxMb * 1024 * 1024) {
    return `Maksimal ${maxMb} MB per file.`;
  }
  return null;
}

function fieldValue(
  payload: FormEntryPayload,
  field: FormField,
): string | number | string[] | undefined {
  return payload.values[field.id];
}

function setFieldValue(
  payload: FormEntryPayload,
  field: FormField,
  value: string | number | string[],
): FormEntryPayload {
  return {
    ...payload,
    values: { ...payload.values, [field.id]: value },
  };
}

function validateEntry(
  entry: FormEntry,
  payload: FormEntryPayload,
  fields: FormField[],
  defaultFields: {
    executionDate: { enabled: boolean; required: boolean };
    location: { enabled: boolean; required: boolean };
    notes: { enabled: boolean; required: boolean };
    photos: { enabled: boolean; required: boolean };
  },
): string[] {
  const errors: string[] = [];
  if (defaultFields.executionDate.enabled && defaultFields.executionDate.required && !payload.executionDate) {
    errors.push("Tanggal pelaksanaan wajib diisi.");
  }
  if (defaultFields.location.enabled && defaultFields.location.required && !payload.location?.trim()) {
    errors.push("Lokasi wajib diisi.");
  }
  if (defaultFields.notes.enabled && defaultFields.notes.required && !payload.notes?.trim()) {
    errors.push("Keterangan wajib diisi.");
  }
  if (defaultFields.photos.enabled && defaultFields.photos.required && (payload.photos?.length ?? 0) === 0) {
    errors.push("Minimal satu foto wajib diunggah.");
  }
  for (const field of fields) {
    const value = fieldValue(payload, field);
    if (field.type === "checklist") {
      if (field.required && (!Array.isArray(value) || value.length === 0)) {
        errors.push(`${field.label} wajib dipilih minimal satu.`);
      }
      continue;
    }
    if (field.type === "file") {
      if (field.required && !payload.files?.[field.id]) {
        errors.push(`${field.label} wajib diunggah.`);
      }
      continue;
    }
    if (field.required && (value === undefined || value === "")) {
      errors.push(`${field.label} wajib diisi.`);
    }
  }
  if (entry.status === "unassigned") {
    errors.push("Entri harus di-assign sebelum diisi.");
  }
  return errors;
}

function CustomField({
  field,
  payload,
  readOnly,
  onChange,
}: {
  field: FormField;
  payload: FormEntryPayload;
  readOnly: boolean;
  onChange: (payload: FormEntryPayload) => void;
}) {
  const value = fieldValue(payload, field);
  if (field.type === "checklist") {
    const checked = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-1.5">
        {(field.options ?? []).map((option) => (
          <label key={option} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="size-4"
              checked={checked.includes(option)}
              disabled={readOnly}
              onChange={(event) =>
                onChange(
                  setFieldValue(
                    payload,
                    field,
                    event.target.checked
                      ? [...checked, option]
                      : checked.filter((item) => item !== option),
                  ),
                )
              }
            />
            {option}
          </label>
        ))}
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <NativeSelect
        value={String(value ?? "")}
        disabled={readOnly}
        onChange={(next) => onChange(setFieldValue(payload, field, next))}
      >
        <option value="">Pilih…</option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </NativeSelect>
    );
  }
  if (field.type === "file") {
    const file = payload.files?.[field.id];
    return (
      <div className="space-y-1">
        {readOnly ? (
          <p className="text-xs">{file?.fileName ?? "Belum ada file."}</p>
        ) : (
          <label className="text-primary inline-flex cursor-pointer items-center gap-1 text-xs font-medium">
            <FileUp className="size-3.5" /> Unggah file
            <input
              type="file"
              className="hidden"
              onChange={async (event) => {
                const selected = event.target.files?.[0];
                if (!selected) return;
                const message = fileLimitMessage(selected);
                if (message) {
                  toast.error(message);
                  return;
                }
                const storageKey = `form-${entrySafeId()}-${field.id}`;
                await putPrototypeFile(storageKey, selected);
                onChange({
                  ...payload,
                  files: {
                    ...(payload.files ?? {}),
                    [field.id]: {
                      id: storageKey,
                      fileName: selected.name,
                      mimeType: selected.type,
                      size: selected.size,
                      storageKey,
                    },
                  },
                });
              }}
            />
          </label>
        )}
        {file ? (
          <p className="text-muted-foreground text-[10px]">{file.fileName}</p>
        ) : null}
      </div>
    );
  }
  return (
    <Input
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={String(value ?? "")}
      disabled={readOnly}
      onChange={(event) =>
        onChange(
          setFieldValue(
            payload,
            field,
            field.type === "number" ? Number(event.target.value) : event.target.value,
          ),
        )
      }
    />
  );
}

function entrySafeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function FormEntryPage({
  entryId,
  onBack,
}: {
  entryId: string;
  onBack: () => void;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const entry = store.formEntries.find((item) => item.id === entryId);
  const project = entry?.projectId
    ? store.projects.find((item) => item.id === entry.projectId)
    : undefined;
  const step = entry?.projectId
    ? stepFor(store, entry.projectId, entry.stepKey)
    : undefined;
  const template = entry ? formEntryTemplate(store, entry) : undefined;
  const contextCode = project?.code;
  const contextName = project?.name;
  const contextStage = step?.name;
  const [payload, setPayload] = useState<FormEntryPayload>(
    entry?.payload ?? { values: {}, photos: [] },
  );
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [assignTo, setAssignTo] = useState(entry?.assigneeId ?? "");
  const payloadRef = useRef(payload);
  payloadRef.current = payload;
  const autosaveRef = useRef<AutosaveController<FormEntryPayload> | null>(null);

  useEffect(() => {
    setPayload(entry?.payload ?? { values: {}, photos: [] });
    setDirty(false);
    setSaveState("idle");
    setErrors([]);
    setReviewComment("");
    setAssignTo(entry?.assigneeId ?? "");
    // Only reset when the entry changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    if (!entry) return;
    const controller = createDebouncedAutosave<FormEntryPayload>(
      1000,
      async (next) => {
        setSaveState("saving");
        const state = usePrototypeStore.getState();
        state.saveFormEntry(entry.id, next);
        setSaveState("saved");
        setSavedAt(new Date().toISOString());
        setDirty(false);
      },
    );
    autosaveRef.current = controller;
    return () => controller.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id]);

  if (!entry || !currentUser || !template) {
    return (
      <EmptyState
        icon={FileUp}
        title="Entri form tidak ditemukan"
        description="Entri mungkin sudah dihapus atau bukan bagian dari proyek Anda."
        action={
          <Button variant="outline" size="sm" onClick={onBack}>
            Kembali ke Forms
          </Button>
        }
      />
    );
  }

  if (!project || !step) {
    return (
      <EmptyState
        icon={FileUp}
        title="Entri form tidak ditemukan"
        description="Entri mungkin sudah dihapus atau bukan bagian dari proyek Anda."
        action={
          <Button variant="outline" size="sm" onClick={onBack}>
            Kembali ke Forms
          </Button>
        }
      />
    );
  }

  const editable = canEditFormEntry(store, currentUser, entry);
  const reviewer = canReviewFormEntry(store, currentUser, entry);
  const assignCandidates = project
    ? operationalAssigneeCandidates(store, currentUser, project)
    : [];
  const canAssign = assignCandidates.length > 0;
  const canSetReviewer =
    entry.status !== "approved" &&
    entry.status !== "cancelled" &&
    (currentUser.role === "admin" ||
      currentUser.role === "manager" ||
      (currentUser.role === "pm" && project.createdById === currentUser.id));
  const canCancel = canCancelFormEntry(store, currentUser, entry);
  const defaultFields = template?.defaultFields ?? {
    executionDate: { enabled: true, required: true },
    location: { enabled: true, required: true },
    notes: { enabled: true, required: false },
    photos: { enabled: true, required: false },
  };
  const fields = template?.fields ?? [];

  const update = (next: FormEntryPayload) => {
    setPayload(next);
    payloadRef.current = next;
    setDirty(true);
    setSaveState("idle");
    autosaveRef.current?.schedule(next);
  };

  const submit = () => {
    const found = validateEntry(entry, payloadRef.current, fields, defaultFields);
    setErrors(found);
    if (found.length > 0) {
      toast.error(found[0]);
      return;
    }
    autosaveRef.current?.cancel();
    const state = usePrototypeStore.getState();
    state.saveFormEntry(entry.id, payloadRef.current);
    state.submitFormEntry(entry.id);
    setDirty(false);
    setSaveState("saved");
    toast.success("Form disubmit dan menunggu review PM.");
  };

  const review = (decision: "approved" | "need_revision") => {
    if (decision === "need_revision" && !reviewComment.trim()) {
      toast.error("Komentar revisi wajib diisi.");
      return;
    }
    store.reviewFormEntry(entry.id, decision, reviewComment);
    toast.success(
      decision === "approved" ? "Entri form disetujui." : "Revisi diminta.",
    );
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="size-3.5" /> Kembali ke Forms
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={entry.status} />
            <span className="text-muted-foreground text-[10px]">
              {contextCode} · {contextStage}
            </span>
          </div>
          <h1 className="mt-1 truncate text-xl font-semibold">{entry.title}</h1>
          <p className="text-muted-foreground text-xs">
            {contextName} · Assignee{" "}
            {userById(store, entry.assigneeId)?.name ?? "Belum di-assign"}
            {entry.reviewerId
              ? ` · Reviewer ${userById(store, entry.reviewerId)?.name ?? "—"}`
              : ""}
            {entry.dueDate ? ` · Tenggat ${formatDate(entry.dueDate)}` : ""}
          </p>
        </div>
        <span className="text-muted-foreground text-[10px]" aria-live="polite">
          {saveState === "saving"
            ? "Menyimpan…"
            : saveState === "saved"
              ? `Tersimpan ${savedAt ? formatDateTime(savedAt) : ""}`
              : saveState === "error"
                ? "Gagal menyimpan"
                : dirty
                  ? "Perubahan belum tersimpan"
                  : ""}
        </span>
      </div>

      {entry.status === "need_revision" && entry.reviewComment ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          Perlu revisi: {entry.reviewComment}
        </div>
      ) : null}

      {canAssign && entry.status !== "approved" && entry.status !== "cancelled" ? (
        <SectionCard title="Penugasan" description="Manager/Admin meng-assign entri.">
          <div className="flex flex-wrap items-center gap-2">
            <UserAvatar user={userById(store, entry.assigneeId)} size="sm" showName />
            <NativeSelect
              value={assignTo}
              onChange={setAssignTo}
              className="w-[220px]"
            >
              <option value="">Pilih assignee</option>
              {assignCandidates.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </NativeSelect>
            <Button
              size="sm"
              variant="outline"
              disabled={!assignTo}
              onClick={() => {
                store.assignFormEntry(entry.id, assignTo);
                toast.success("Entri form di-assign.");
              }}
            >
              Assign
            </Button>
          </div>
        </SectionCard>
      ) : null}

      {canSetReviewer ? (
        <SectionCard
          title="Reviewer"
          description="Reviewer dapat menyetujui atau meminta revisi. Hanya PM, Manager, dan Finance."
        >
          <NativeSelect
            value={entry.reviewerId ?? ""}
            onChange={(value) => {
              store.setFormEntryReviewer(entry.id, value || undefined);
              toast.success(
                value ? "Reviewer ditetapkan." : "Reviewer dihapus.",
              );
            }}
            className="w-[240px]"
          >
            <option value="">Belum ditentukan</option>
            {reviewerCandidates(store).map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </NativeSelect>
        </SectionCard>
      ) : null}

      <SectionCard
        title={template?.title ?? "Form"}
        description={`Isi form untuk ${contextName}.`}
      >
        <div className="space-y-3">
          {errors.length > 0 ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {defaultFields.executionDate.enabled ? (
              <Field label="Tanggal pelaksanaan">
                <Input
                  type="date"
                  value={payload.executionDate ?? ""}
                  disabled={!editable}
                  onChange={(event) =>
                    update({ ...payload, executionDate: event.target.value })
                  }
                />
              </Field>
            ) : null}
            {defaultFields.location.enabled ? (
              <Field label="Lokasi">
                <Input
                  value={payload.location ?? ""}
                  disabled={!editable}
                  onChange={(event) =>
                    update({ ...payload, location: event.target.value })
                  }
                />
              </Field>
            ) : null}
            {defaultFields.notes.enabled ? (
              <Field label="Keterangan" className="sm:col-span-2">
                <Textarea
                  value={payload.notes ?? ""}
                  disabled={!editable}
                  rows={3}
                  onChange={(event) =>
                    update({ ...payload, notes: event.target.value })
                  }
                />
              </Field>
            ) : null}
          </div>

          {fields.map((field) => (
            <Field key={field.id} label={`${field.label}${field.required ? " *" : ""}`}>
              <CustomField
                field={field}
                payload={payload}
                readOnly={!editable}
                onChange={update}
              />
            </Field>
          ))}

          {defaultFields.photos.enabled ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium">
                  Foto ({payload.photos?.length ?? 0}/10)
                </span>
                {editable ? (
                  <label className="text-primary inline-flex cursor-pointer items-center gap-1 text-xs font-medium">
                    <FileUp className="size-3.5" /> Tambah foto
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const message = fileLimitMessage(file);
                        if (message) {
                          toast.error(message);
                          return;
                        }
                        if ((payload.photos?.length ?? 0) >= 10) {
                          toast.error("Maksimal 10 foto.");
                          return;
                        }
                        const storageKey = `form-photo-${entrySafeId()}`;
                        await putPrototypeFile(storageKey, file);
                        const photo: SurveyPhoto = {
                          id: storageKey,
                          fileName: file.name,
                          mimeType: file.type,
                          size: file.size,
                          storageKey,
                        };
                        update({
                          ...payload,
                          photos: [...(payload.photos ?? []), photo],
                        });
                      }}
                    />
                  </label>
                ) : null}
              </div>
              {(payload.photos?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
                  Belum ada foto.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(payload.photos ?? []).map((photo) => (
                    <span
                      key={photo.id}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px]"
                    >
                      {photo.fileName}
                      {editable ? (
                        <button
                          type="button"
                          aria-label={`Hapus ${photo.fileName}`}
                          onClick={() =>
                            update({
                              ...payload,
                              photos: (payload.photos ?? []).filter(
                                (item) => item.id !== photo.id,
                              ),
                            })
                          }
                        >
                          <X className="size-3" />
                        </button>
                      ) : null}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </SectionCard>

      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={submit}>
            <Send className="size-3.5" /> Submit
          </Button>
          <span className="text-muted-foreground self-center text-[10px]">
            Draft tersimpan otomatis.
          </span>
        </div>
      ) : null}

      {reviewer ? (
        <SectionCard title="Review" description="Setujui atau minta revisi.">
          <Textarea
            value={reviewComment}
            onChange={(event) => setReviewComment(event.target.value)}
            rows={2}
            placeholder="Komentar review (wajib jika minta revisi)"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => review("approved")}>
              <Check className="size-3.5" /> Setujui
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => review("need_revision")}
            >
              Minta revisi
            </Button>
          </div>
        </SectionCard>
      ) : null}

      {canCancel ? (
        <SectionCard title="Batalkan entri" description="Entri batal tidak dihitung pada penyelesaian tahap.">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Alasan pembatalan" className="flex-1">
              <Input
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
              />
            </Field>
            <Button
              size="sm"
              variant="outline"
              disabled={!cancelReason.trim()}
              onClick={() => {
                store.cancelFormEntry(entry.id, cancelReason);
                setCancelReason("");
                toast.success("Entri form dibatalkan.");
              }}
            >
              <Trash2 className="size-3.5" /> Batalkan
            </Button>
          </div>
        </SectionCard>
      ) : null}

      {entry.versions.length > 0 ? (
        <SectionCard title="Riwayat versi" description="Setiap submit membuat versi immutable.">
          <div className="space-y-1.5">
            {entry.versions.map((version) => (
              <div
                key={version.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1.5 text-[10px]"
              >
                <span className="font-semibold">v{version.versionNumber}</span>
                <span className="text-muted-foreground">
                  {formatDateTime(version.createdAt)}
                </span>
                <span className="text-muted-foreground">
                  {userById(store, version.createdById)?.name ?? "User"}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
