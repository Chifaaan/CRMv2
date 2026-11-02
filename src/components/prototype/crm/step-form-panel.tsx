"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  History,
  Info,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canAssignForm,
  canEditForm,
  canReviewForm,
  formatCurrency,
  formatDate,
  formatDateTime,
  formFor,
  tasksForStep,
  userById,
} from "@/lib/prototype/domain";
import {
  createDebouncedAutosave,
  diffFormPayloads,
  getValidationErrors,
  hasEditConflict,
  hasUnsavedChanges,
  type AutosaveController,
  type ValidationIssue,
} from "@/lib/prototype/form-versions";
import {
  downloadInvoiceTemplate,
  parseInvoiceFile,
  type InvoiceImport,
} from "@/lib/prototype/excel";
import type {
  BastPayload,
  FormPayload,
  FormStepKey,
  InvoicePayload,
  Project,
  RabItem,
  RabPayload,
  StepForm,
  User,
} from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import {
  DataRow,
  EmptyState,
  FormStatusBadge,
  NativeSelect,
  ProgressBar,
} from "../ui";

type Mode = "fill" | "review" | "history";

const dirtyForms = new Set<string>();

/** Used by the project detail tab switcher to guard unsaved form changes. */
export function hasUnsavedFormChanges(): boolean {
  return dirtyForms.size > 0;
}

function dateInput(value?: string): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function rabTotal(payload: RabPayload): number {
  return (payload.items ?? []).reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0,
  );
}

function versionLabel(form: StepForm): string {
  const count = form.versions?.length ?? 0;
  if (form.status === "submitted" || form.status === "approved") {
    return count > 0 ? `v${count}` : "v1";
  }
  return count > 0 ? `Draft v${count + 1}` : "Draft v1";
}

function fieldId(stepKey: FormStepKey, key: string): string {
  return `${stepKey}-${key}`;
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  );
}

function ReadOnlyText({ value }: { value: string | number | undefined }) {
  return (
    <p className="min-h-8 rounded-lg border border-transparent px-2 py-1.5 text-sm">
      {value === "" || value == null ? "—" : value}
    </p>
  );
}

function ValidationList({
  issues,
  onFocus,
}: {
  issues: ValidationIssue[];
  onFocus: (issue: ValidationIssue) => void;
}) {
  if (issues.length === 0) return null;
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">
      <p className="mb-2 text-xs font-semibold">
        Perlu dilengkapi ({issues.length})
      </p>
      <ul className="space-y-1">
        {issues.map((issue) => (
          <li key={issue.key}>
            <button
              type="button"
              className="text-left text-xs underline-offset-2 hover:underline"
              onClick={() => onFocus(issue)}
            >
              {issue.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RunningSummary({ project }: { project: Project }) {
  const store = usePrototypeStore();
  const tasks = tasksForStep(store, project.id, "running");
  const completed = tasks.filter((task) => task.status === "completed").length;
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        Ringkasan Running
      </p>
      <p className="mt-1 text-xs">
        {completed}/{tasks.length} task selesai
      </p>
      <ProgressBar
        value={tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100)}
        className="mt-2 h-1.5"
      />
    </div>
  );
}

function RabEditor({
  payload,
  onChange,
  readOnly,
  errors,
}: {
  payload: RabPayload;
  onChange: (payload: RabPayload) => void;
  readOnly: boolean;
  errors: ValidationIssue[];
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const items = useMemo(() => payload.items ?? [], [payload.items]);
  const groups = useMemo(() => {
    const map = new Map<string, RabItem[]>();
    for (const item of items) {
      const category = item.category?.trim() || "Umum";
      map.set(category, [...(map.get(category) ?? []), item]);
    }
    return [...map.entries()];
  }, [items]);
  const total = rabTotal(payload);

  const updateItem = (id: string, patch: Partial<RabItem>) => {
    onChange({
      ...payload,
      items: items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };
  const addItem = (category = "Umum") => {
    onChange({
      ...payload,
      items: [
        ...items,
        {
          id: `rab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          description: "",
          category,
          qty: 1,
          unit: "paket",
          unitPrice: 0,
        },
      ],
    });
  };
  const removeItem = (item: RabItem) => {
    onChange({ ...payload, items: items.filter((row) => row.id !== item.id) });
    toast("Baris dihapus", {
      action: {
        label: "Urungkan",
        onClick: () => onChange({ ...payload, items: [...items, item] }),
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border bg-card/95 p-3 shadow-sm backdrop-blur">
        <span className="text-xs font-semibold">Total RAB</span>
        <span className="text-sm font-semibold">{formatCurrency(total)}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-2 py-2">Kategori</th>
              <th className="px-2 py-2">Item</th>
              <th className="px-2 py-2">Qty</th>
              <th className="px-2 py-2">Satuan</th>
              <th className="px-2 py-2">Harga</th>
              <th className="px-2 py-2 text-right">Subtotal</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {groups.map(([category, rows]) => {
              const isCollapsed = collapsed[category] ?? false;
              return (
                <FragmentRows
                  key={category}
                  category={category}
                  rows={rows}
                  isCollapsed={isCollapsed}
                  onToggle={() =>
                    setCollapsed((current) => ({
                      ...current,
                      [category]: !isCollapsed,
                    }))
                  }
                  readOnly={readOnly}
                  errors={errors}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                  onEnter={() => addItem(category)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {!readOnly ? (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" id="rab-add-item" onClick={() => addItem()}>
            <Plus className="size-3.5" /> Tambah baris
          </Button>
          <span className="text-muted-foreground self-center text-[10px]">
            Enter di kolom harga juga menambah baris.
          </span>
        </div>
      ) : null}

      <div className="space-y-1">
        <FieldLabel htmlFor="rab-notes">Catatan RAB</FieldLabel>
        {readOnly ? (
          <ReadOnlyText value={payload.notes} />
        ) : (
          <Textarea
            id="rab-notes"
            value={payload.notes ?? ""}
            onChange={(event) => onChange({ ...payload, notes: event.target.value })}
            rows={2}
          />
        )}
      </div>
    </div>
  );
}

function FragmentRows({
  category,
  rows,
  isCollapsed,
  onToggle,
  readOnly,
  errors,
  onUpdate,
  onRemove,
  onEnter,
}: {
  category: string;
  rows: RabItem[];
  isCollapsed: boolean;
  onToggle: () => void;
  readOnly: boolean;
  errors: ValidationIssue[];
  onUpdate: (id: string, patch: Partial<RabItem>) => void;
  onRemove: (item: RabItem) => void;
  onEnter: () => void;
}) {
  return (
    <>
      <tr className="bg-muted/20">
        <td colSpan={7} className="px-2 py-1.5">
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] font-semibold"
            aria-expanded={!isCollapsed}
            onClick={onToggle}
          >
            <ChevronDown className={cn("size-3.5 transition-transform", isCollapsed && "-rotate-90")} />
            {category}
            <span className="text-muted-foreground font-normal">({rows.length})</span>
          </button>
        </td>
      </tr>
      {!isCollapsed
        ? rows.map((item) => {
            const rowErrors = errors.filter((issue) => issue.itemId === item.id);
            return (
              <tr key={item.id} className={cn("border-t", rowErrors.length > 0 && "bg-rose-50/50")}>
                <td className="px-2 py-1.5">
                  {readOnly ? (
                    <span>{item.category || "Umum"}</span>
                  ) : (
                    <Input
                      value={item.category ?? "Umum"}
                      onChange={(event) => onUpdate(item.id, { category: event.target.value })}
                      className="h-8 w-24"
                      aria-label="Kategori item"
                    />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {readOnly ? (
                    <span>{item.description || "—"}</span>
                  ) : (
                    <Input
                      id={`rab-item-${item.id}-description`}
                      value={item.description}
                      onChange={(event) => onUpdate(item.id, { description: event.target.value })}
                      className="h-8 min-w-40"
                      aria-label="Nama item"
                      aria-invalid={rowErrors.some((issue) => issue.key.endsWith("description"))}
                      aria-describedby={
                        rowErrors.length > 0
                          ? `rab-item-${item.id}-error`
                          : undefined
                      }
                    />
                  )}
                  {!readOnly && rowErrors.length > 0 ? (
                    <p
                      id={`rab-item-${item.id}-error`}
                      className="text-destructive mt-0.5 max-w-48 text-[10px]"
                    >
                      {rowErrors.map((issue) => issue.label).join(" ")}
                    </p>
                  ) : null}
                </td>
                <td className="px-2 py-1.5">
                  {readOnly ? (
                    <span>{item.qty}</span>
                  ) : (
                    <Input
                      id={`rab-item-${item.id}-qty`}
                      type="number"
                      min={0}
                      value={item.qty}
                      onChange={(event) => onUpdate(item.id, { qty: Number(event.target.value) })}
                      className="h-8 w-20"
                      aria-label="Kuantitas"
                      aria-invalid={rowErrors.some((issue) => issue.key.endsWith("qty"))}
                      aria-describedby={
                        rowErrors.length > 0
                          ? `rab-item-${item.id}-error`
                          : undefined
                      }
                    />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {readOnly ? (
                    <span>{item.unit}</span>
                  ) : (
                    <Input
                      value={item.unit}
                      onChange={(event) => onUpdate(item.id, { unit: event.target.value })}
                      className="h-8 w-20"
                      aria-label="Satuan"
                    />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {readOnly ? (
                    <span>{formatCurrency(item.unitPrice)}</span>
                  ) : (
                    <Input
                      id={`rab-item-${item.id}-price`}
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(event) => onUpdate(item.id, { unitPrice: Number(event.target.value) })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          onEnter();
                        }
                      }}
                      className="h-8 w-32"
                      aria-label="Harga satuan"
                      aria-invalid={rowErrors.some((issue) => issue.key.endsWith("price"))}
                      aria-describedby={
                        rowErrors.length > 0
                          ? `rab-item-${item.id}-error`
                          : undefined
                      }
                    />
                  )}
                </td>
                <td className="px-2 py-1.5 text-right font-medium">
                  {formatCurrency(item.qty * item.unitPrice)}
                </td>
                <td className="px-2 py-1.5">
                  {!readOnly ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Hapus baris"
                      onClick={() => onRemove(item)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })
        : null}
    </>
  );
}

function BastEditor({
  project,
  payload,
  onChange,
  readOnly,
  errors,
  users,
}: {
  project: Project;
  payload: BastPayload;
  onChange: (payload: BastPayload) => void;
  readOnly: boolean;
  errors: ValidationIssue[];
  users: User[];
}) {
  const running = tasksForStep(usePrototypeStore.getState(), project.id, "running");
  return (
    <div className="space-y-4">
      <RunningSummary project={project} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor={fieldId("bast", "picId")} required>PIC BAST</FieldLabel>
          {readOnly ? (
            <ReadOnlyText value={users.find((user) => user.id === payload.picId)?.name} />
          ) : (
            <NativeSelect
              id={fieldId("bast", "picId")}
              value={payload.picId ?? ""}
              onChange={(value) => onChange({ ...payload, picId: value })}
            >
              <option value="">Pilih PIC</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </NativeSelect>
          )}
          {errors.some((issue) => issue.key === "picId") ? (
            <p className="text-destructive mt-1 text-[11px]" id={fieldId("bast", "picId-error")}>
              PIC wajib dipilih.
            </p>
          ) : null}
        </div>
        <div>
          <FieldLabel htmlFor={fieldId("bast", "date")} required>Tanggal</FieldLabel>
          {readOnly ? (
            <ReadOnlyText value={formatDate(payload.date)} />
          ) : (
            <Input
              id={fieldId("bast", "date")}
              type="date"
              value={dateInput(payload.date)}
              onChange={(event) => onChange({ ...payload, date: event.target.value })}
            />
          )}
        </div>
        <div>
          <FieldLabel htmlFor={fieldId("bast", "number")}>Nomor BAST</FieldLabel>
          {readOnly ? (
            <ReadOnlyText value={payload.number} />
          ) : (
            <Input
              id={fieldId("bast", "number")}
              value={payload.number}
              onChange={(event) => onChange({ ...payload, number: event.target.value })}
            />
          )}
        </div>
        <div>
          <FieldLabel htmlFor={fieldId("bast", "documentUrl")}>Link dokumen</FieldLabel>
          {readOnly ? (
            payload.documentUrl ? (
              <a href={payload.documentUrl} target="_blank" rel="noreferrer" className="text-primary text-xs underline">
                Buka dokumen
              </a>
            ) : (
              <ReadOnlyText value="" />
            )
          ) : (
            <Input
              id={fieldId("bast", "documentUrl")}
              value={payload.documentUrl}
              onChange={(event) => onChange({ ...payload, documentUrl: event.target.value })}
              placeholder="https://…"
            />
          )}
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor={fieldId("bast", "notes")}>Catatan</FieldLabel>
          {readOnly ? (
            <ReadOnlyText value={payload.notes} />
          ) : (
            <Textarea
              id={fieldId("bast", "notes")}
              value={payload.notes}
              onChange={(event) => onChange({ ...payload, notes: event.target.value })}
              rows={3}
            />
          )}
        </div>
      </div>
      <p className="text-muted-foreground text-[10px]">
        Ringkasan Running: {running.filter((task) => task.status === "completed").length}/{running.length} task selesai.
      </p>
    </div>
  );
}

function InvoiceEditor({
  project,
  form,
  payload,
  onChange,
  readOnly,
  errors,
}: {
  project: Project;
  form: StepForm;
  payload: InvoicePayload;
  onChange: (payload: InvoicePayload) => void;
  readOnly: boolean;
  errors: ValidationIssue[];
}) {
  const store = usePrototypeStore();
  const rab = formFor(store, project.id, "rab");
  const rabTotal = rab ? rabTotalValue(rab.payload) : 0;
  const difference = (payload.amount || 0) - rabTotal;
  const [preview, setPreview] = useState<{
    row?: InvoiceImport;
    error?: string;
    fileName?: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor={fieldId("invoice", "number")} required>Nomor invoice</FieldLabel>
          {readOnly ? (
            <ReadOnlyText value={payload.number} />
          ) : (
            <Input
              id={fieldId("invoice", "number")}
              value={payload.number}
              onChange={(event) => onChange({ ...payload, number: event.target.value })}
              aria-invalid={errors.some((issue) => issue.key === "number")}
              aria-describedby="invoice-number-error"
            />
          )}
          {errors.some((issue) => issue.key === "number") ? (
            <p id="invoice-number-error" className="text-destructive mt-1 text-[11px]">
              Nomor invoice wajib diisi.
            </p>
          ) : null}
        </div>
        <div>
          <FieldLabel htmlFor={fieldId("invoice", "date")} required>Tanggal terbit</FieldLabel>
          {readOnly ? (
            <ReadOnlyText value={formatDate(payload.date)} />
          ) : (
            <Input
              id={fieldId("invoice", "date")}
              type="date"
              value={dateInput(payload.date)}
              onChange={(event) => onChange({ ...payload, date: event.target.value })}
              aria-invalid={errors.some((issue) => issue.key === "date")}
              aria-describedby="invoice-date-error"
            />
          )}
          {errors.some((issue) => issue.key === "date") ? (
            <p id="invoice-date-error" className="text-destructive mt-1 text-[11px]">
              Tanggal terbit wajib diisi.
            </p>
          ) : null}
        </div>
        <div>
          <FieldLabel htmlFor={fieldId("invoice", "dueDate")}>Jatuh tempo</FieldLabel>
          {readOnly ? (
            <ReadOnlyText value={formatDate(payload.dueDate)} />
          ) : (
            <Input
              id={fieldId("invoice", "dueDate")}
              type="date"
              value={dateInput(payload.dueDate)}
              onChange={(event) => onChange({ ...payload, dueDate: event.target.value })}
            />
          )}
        </div>
        <div>
          <FieldLabel htmlFor={fieldId("invoice", "amount")} required>Nilai</FieldLabel>
          {readOnly ? (
            <ReadOnlyText value={formatCurrency(payload.amount)} />
          ) : (
            <Input
              id={fieldId("invoice", "amount")}
              type="number"
              min={0}
              value={payload.amount}
              onChange={(event) => {
                const amount = Number(event.target.value);
                onChange({
                  ...payload,
                  amount,
                  taxAmount: Math.round(amount * ((payload.taxPercent || 0) / 100)),
                });
              }}
              aria-invalid={errors.some((issue) => issue.key === "amount")}
              aria-describedby="invoice-amount-error"
            />
          )}
          {errors.some((issue) => issue.key === "amount") ? (
            <p id="invoice-amount-error" className="text-destructive mt-1 text-[11px]">
              Nilai invoice harus lebih dari 0.
            </p>
          ) : null}
        </div>
        <div>
          <FieldLabel htmlFor={fieldId("invoice", "taxPercent")}>PPN (%)</FieldLabel>
          {readOnly ? (
            <ReadOnlyText value={`${payload.taxPercent}%`} />
          ) : (
            <Input
              id={fieldId("invoice", "taxPercent")}
              type="number"
              min={0}
              value={payload.taxPercent}
              onChange={(event) => {
                const taxPercent = Number(event.target.value);
                onChange({
                  ...payload,
                  taxPercent,
                  taxAmount: Math.round((payload.amount || 0) * (taxPercent / 100)),
                });
              }}
            />
          )}
        </div>
        <div>
          <FieldLabel htmlFor={fieldId("invoice", "taxAmount")}>Nominal PPN</FieldLabel>
          {readOnly ? (
            <ReadOnlyText value={formatCurrency(payload.taxAmount)} />
          ) : (
            <Input
              id={fieldId("invoice", "taxAmount")}
              type="number"
              value={payload.taxAmount}
              onChange={(event) => onChange({ ...payload, taxAmount: Number(event.target.value) })}
            />
          )}
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor={fieldId("invoice", "documentUrl")}>Link dokumen</FieldLabel>
          {readOnly ? (
            payload.documentUrl ? (
              <a href={payload.documentUrl} target="_blank" rel="noreferrer" className="text-primary text-xs underline">
                Buka dokumen
              </a>
            ) : (
              <ReadOnlyText value="" />
            )
          ) : (
            <Input
              id={fieldId("invoice", "documentUrl")}
              value={payload.documentUrl}
              onChange={(event) => onChange({ ...payload, documentUrl: event.target.value })}
            />
          )}
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor={fieldId("invoice", "notes")}>Catatan</FieldLabel>
          {readOnly ? (
            <ReadOnlyText value={payload.notes} />
          ) : (
            <Textarea
              id={fieldId("invoice", "notes")}
              value={payload.notes}
              onChange={(event) => onChange({ ...payload, notes: event.target.value })}
              rows={2}
            />
          )}
        </div>
      </div>

      {difference !== 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Selisih {formatCurrency(Math.abs(difference))} dari total RAB.
        </div>
      ) : null}

      {!readOnly ? (
        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadInvoiceTemplate}>
              <Download className="size-3.5" /> Template
            </Button>
            <label className="text-primary inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium">
              <FileSpreadsheet className="size-3.5" /> Import Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setImporting(true);
                  try {
                    const row = await parseInvoiceFile(file, project.code);
                    setPreview({ row, fileName: file.name });
                  } catch (error) {
                    setPreview({
                      error: error instanceof Error ? error.message : "Import gagal.",
                      fileName: file.name,
                    });
                  } finally {
                    setImporting(false);
                  }
                }}
              />
            </label>
            {importing ? <span className="text-muted-foreground text-[10px]">Membaca file…</span> : null}
          </div>
          {preview ? (
            <div className="space-y-2">
              <div className="overflow-x-auto rounded border bg-background">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-muted/40 text-muted-foreground uppercase">
                    <tr>
                      <th className="px-2 py-1">Status</th>
                      <th className="px-2 py-1">Nomor</th>
                      <th className="px-2 py-1">Tanggal</th>
                      <th className="px-2 py-1">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.error ? (
                      <tr className="bg-rose-50 text-rose-800">
                        <td className="px-2 py-1">Error</td>
                        <td colSpan={3} className="px-2 py-1">{preview.error}</td>
                      </tr>
                    ) : (
                      <tr>
                        <td className="px-2 py-1 text-emerald-700">Valid</td>
                        <td className="px-2 py-1">{preview.row?.number}</td>
                        <td className="px-2 py-1">{preview.row?.date}</td>
                        <td className="px-2 py-1">{formatCurrency(preview.row?.amount ?? 0)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={Boolean(preview.error)}
                  onClick={() => {
                    if (!preview.row) return;
                    const nextPayload: InvoicePayload = {
                      ...payload,
                      number: preview.row.number,
                      date: preview.row.date,
                      amount: preview.row.amount,
                      taxPercent: preview.row.taxPercent,
                      taxAmount: preview.row.taxAmount,
                      notes: preview.row.notes,
                      documentUrl: preview.row.documentUrl,
                    };
                    store.applyInvoiceImport(form.id, nextPayload, preview.fileName);
                    onChange(nextPayload);
                    toast.success("Import diterapkan ke draft.");
                  }}
                >
                  Terapkan ke form
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(null)}>
                  Batal
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function rabTotalValue(payload: FormPayload): number {
  return rabTotal(payload as RabPayload);
}

type FormKey = "rab" | "bast" | "invoice";

const FORM_TITLE: Record<FormKey, string> = {
  rab: "Form RAB",
  bast: "Form BAST",
  invoice: "Form Invoice",
};

const FORM_DESCRIPTION: Record<FormKey, string> = {
  rab: "Diisi Finance di CRM. PM mereview sebelum step RAB selesai.",
  bast: "Finance menunjuk PIC dan melengkapi dokumen BAST. PM mereview.",
  invoice: "Diisi Finance di CRM. Selisih nilai dengan RAB hanya peringatan.",
};

const FORM_EMPTY_HINT: Record<FormKey, string> = {
  rab: "RAB berisi daftar item, kuantitas, satuan, dan harga. Diisi oleh Finance yang di-assign.",
  bast: "BAST berisi PIC, tanggal, catatan, dan link dokumen serah terima. Diisi oleh Finance.",
  invoice: "Invoice berisi nomor, tanggal terbit, jatuh tempo, nilai, dan lampiran. Diisi oleh Finance.",
};

const STATUS_TEXT: Record<string, string> = {
  unassigned: "Belum di-assign",
  assigned: "Draft",
  draft: "Draft",
  submitted: "Menunggu review",
  approved: "Disetujui",
  need_revision: "Perlu revisi",
};

type PanelProps = {
  project: Project;
  form: StepForm;
  currentUser: User;
  readOnly: boolean;
};

function ModeTabs({
  mode,
  onChange,
  canFill,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
  canFill: boolean;
}) {
  const tabs: { id: Mode; label: string }[] = [
    ...(canFill ? [{ id: "fill" as const, label: "Isi" }] : []),
    { id: "review", label: "Review" },
    { id: "history", label: "History" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Mode form"
      className="inline-flex rounded-lg border bg-muted/40 p-0.5"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={mode === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
            mode === tab.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function DiffBlock({
  type,
  before,
  after,
}: {
  type: FormStepKey;
  before: FormPayload;
  after: FormPayload;
}) {
  const diff = diffFormPayloads(type, before, after);
  if (diff.fields.length === 0 && diff.rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
        Tidak ada perubahan nilai dari versi sebelumnya.
      </p>
    );
  }
  const format = (value: unknown) =>
    value == null || value === "" ? "—" : String(value);
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase tracking-wide">
          <tr>
            <th className="px-2 py-1.5">Bagian</th>
            <th className="px-2 py-1.5">Sebelum</th>
            <th className="px-2 py-1.5">Sesudah</th>
          </tr>
        </thead>
        <tbody>
          {diff.fields.map((field) => (
            <tr key={field.key} className="border-t">
              <td className="px-2 py-1.5 font-medium">{field.label}</td>
              <td className="px-2 py-1.5 text-rose-700 line-through">
                {format(field.before)}
              </td>
              <td className="px-2 py-1.5 text-emerald-700">
                {format(field.after)}
              </td>
            </tr>
          ))}
          {diff.rows.map((row) => (
            <tr key={row.key} className="border-t">
              <td className="px-2 py-1.5">
                <span className="font-medium">{row.label}</span>
                <span
                  className={cn(
                    "ml-2 rounded px-1 py-0.5 text-[9px] font-semibold uppercase",
                    row.kind === "added" && "bg-emerald-100 text-emerald-700",
                    row.kind === "removed" && "bg-rose-100 text-rose-700",
                    row.kind === "changed" && "bg-amber-100 text-amber-800",
                  )}
                >
                  {row.kind === "added"
                    ? "Ditambah"
                    : row.kind === "removed"
                      ? "Dihapus"
                      : "Diubah"}
                </span>
              </td>
              <td className="px-2 py-1.5 text-rose-700 line-through">
                {row.before ?? "—"}
              </td>
              <td className="px-2 py-1.5 text-emerald-700">
                {row.after ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubmitSummary({
  type,
  payload,
  users,
}: {
  type: FormStepKey;
  payload: FormPayload;
  users: User[];
}) {
  if (type === "rab") {
    const value = payload as RabPayload;
    return (
      <div className="space-y-2 rounded-xl border bg-muted/20 p-4 text-sm">
        <p className="font-semibold">Ringkasan RAB</p>
        <DataRow label="Jumlah item" value={`${value.items?.length ?? 0} item`} />
        <DataRow label="Total" value={formatCurrency(rabTotal(value))} />
        <DataRow label="Catatan" value={value.notes || "—"} />
      </div>
    );
  }
  if (type === "bast") {
    const value = payload as BastPayload;
    return (
      <div className="space-y-2 rounded-xl border bg-muted/20 p-4 text-sm">
        <p className="font-semibold">Ringkasan BAST</p>
        <DataRow label="Nomor" value={value.number || "—"} />
        <DataRow
          label="PIC"
          value={users.find((user) => user.id === value.picId)?.name ?? "—"}
        />
        <DataRow label="Tanggal" value={formatDate(value.date)} />
        <DataRow label="Dokumen" value={value.documentUrl || "—"} />
      </div>
    );
  }
  const value = payload as InvoicePayload;
  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-4 text-sm">
      <p className="font-semibold">Ringkasan Invoice</p>
      <DataRow label="Nomor" value={value.number || "—"} />
      <DataRow label="Tanggal terbit" value={formatDate(value.date)} />
      <DataRow label="Jatuh tempo" value={formatDate(value.dueDate)} />
      <DataRow label="Nilai" value={formatCurrency(value.amount)} />
      <DataRow
        label="PPN"
        value={`${value.taxPercent}% · ${formatCurrency(value.taxAmount)}`}
      />
      <DataRow
        label="Total"
        value={formatCurrency((value.amount || 0) + (value.taxAmount || 0))}
      />
    </div>
  );
}

function PanelInner({ project, form, currentUser, readOnly }: PanelProps) {
  const store = usePrototypeStore();
  const locked = form.status === "submitted" || form.status === "approved";
  const editable =
    !readOnly && !locked && canEditForm(store, currentUser, form);
  const reviewer = canReviewForm(store, currentUser, form);
  const versions = form.versions ?? [];
  const latestVersion = versions[versions.length - 1];
  const [mode, setMode] = useState<Mode>(editable ? "fill" : "review");
  const [draft, setDraft] = useState<FormPayload>(form.payload);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewTarget, setReviewTarget] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const modePickedRef = useRef(false);

  const draftRef = useRef(draft);
  const savedRef = useRef<FormPayload>(form.payload);
  const baselineRef = useRef<string | undefined>(form.updatedAt);
  const autosaveRef = useRef<AutosaveController<FormPayload> | null>(null);
  draftRef.current = draft;

  const formKey = form.type as FormKey;
  const title = FORM_TITLE[formKey] ?? "Form";
  const [assignUserId, setAssignUserId] = useState(form.assigneeId ?? "");

  useEffect(() => {
    setDraft(form.payload);
    draftRef.current = form.payload;
    savedRef.current = form.payload;
    baselineRef.current = form.updatedAt;
    setDirty(false);
    setSaveState("idle");
    setSavedAt(null);
    setConflict(false);
    setIssues([]);
    setConfirming(false);
    setReviewComment("");
    setReviewTarget("");
    setReviewError("");
    setSelectedVersionId(null);
    setCompare(false);
    setAssignUserId(form.assigneeId ?? "");
    modePickedRef.current = false;
    setMode(editable ? "fill" : "review");
    // Only reset when the form itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id]);

  useEffect(() => {
    if (!editable && mode === "fill") setMode("review");
    else if (editable && !modePickedRef.current) setMode("fill");
  }, [editable, mode]);

  useEffect(() => {
    if (dirty) dirtyForms.add(form.id);
    else dirtyForms.delete(form.id);
    return () => {
      dirtyForms.delete(form.id);
    };
  }, [dirty, form.id]);

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
    const controller = createDebouncedAutosave<FormPayload>(
      1300,
      async (payload) => {
        setSaveState("saving");
        const state = usePrototypeStore.getState();
        const result = state.saveForm(form.id, payload, {
          recordEvent: false,
          expectedUpdatedAt: baselineRef.current,
        });
        if (!result.ok) {
          setSaveState("error");
          if (result.conflict) setConflict(true);
          return;
        }
        const latest = usePrototypeStore
          .getState()
          .forms.find((item) => item.id === form.id);
        baselineRef.current = latest?.updatedAt;
        savedRef.current = payload;
        setSaveState("saved");
        setSavedAt(new Date().toISOString());
        if (!hasUnsavedChanges(draftRef.current, payload)) setDirty(false);
      },
    );
    autosaveRef.current = controller;
    return () => controller.cancel();
  }, [form.id]);

  const updateDraft = (next: FormPayload) => {
    setDraft(next);
    draftRef.current = next;
    const changed = hasUnsavedChanges(next, savedRef.current);
    setDirty(changed);
    if (changed) {
      dirtyForms.add(form.id);
      setSaveState("idle");
      autosaveRef.current?.schedule(next);
    } else {
      dirtyForms.delete(form.id);
      setSaveState("saved");
    }
  };

  const flushAutosave = () => {
    void autosaveRef.current?.flush().catch(() => setSaveState("error"));
  };

  const persist = (recordEvent: boolean): boolean => {
    if (!editable) return false;
    autosaveRef.current?.cancel();
    const state = usePrototypeStore.getState();
    const current = state.forms.find((item) => item.id === form.id);
    if (!current) return false;
    if (hasEditConflict(current, baselineRef.current, state.currentUserId)) {
      setConflict(true);
      setSaveState("error");
      return false;
    }
    const result = state.saveForm(form.id, draftRef.current, {
      recordEvent,
      expectedUpdatedAt: baselineRef.current,
    });
    if (!result.ok) {
      setConflict(Boolean(result.conflict));
      setSaveState("error");
      return false;
    }
    const latest = usePrototypeStore
      .getState()
      .forms.find((item) => item.id === form.id);
    baselineRef.current = latest?.updatedAt;
    savedRef.current = draftRef.current;
    setDirty(false);
    dirtyForms.delete(form.id);
    setSaveState("saved");
    setSavedAt(new Date().toISOString());
    return true;
  };

  const focusIssue = (issue: ValidationIssue) => {
    const id =
      issue.key === "items"
        ? "rab-add-item"
        : issue.itemId
          ? `rab-${issue.key}`
          : `${form.type}-${issue.key}`;
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    (element as HTMLElement | null)?.focus();
  };

  const startSubmit = () => {
    const found = getValidationErrors(form.type, draftRef.current);
    setIssues(found);
    if (found.length > 0) {
      setConfirming(false);
      focusIssue(found[0]);
      return;
    }
    setConfirming(true);
  };

  const confirmSubmit = () => {
    const state = usePrototypeStore.getState();
    const current = state.forms.find((item) => item.id === form.id);
    if (!current) return;
    if (hasEditConflict(current, baselineRef.current, state.currentUserId)) {
      setConflict(true);
      setSaveState("error");
      setConfirming(false);
      return;
    }
    const found = getValidationErrors(current.type, draftRef.current);
    if (found.length > 0) {
      setIssues(found);
      setConfirming(false);
      focusIssue(found[0]);
      return;
    }
    const result = state.saveForm(form.id, draftRef.current, {
      recordEvent: false,
      expectedUpdatedAt: baselineRef.current,
    });
    if (!result.ok) {
      setConflict(Boolean(result.conflict));
      setSaveState("error");
      setConfirming(false);
      return;
    }
    state.submitForm(form.id);
    const latest = usePrototypeStore
      .getState()
      .forms.find((item) => item.id === form.id);
    baselineRef.current = latest?.updatedAt;
    savedRef.current = draftRef.current;
    setDirty(false);
    setConfirming(false);
    setIssues([]);
    setSaveState("saved");
    setSavedAt(new Date().toISOString());
    modePickedRef.current = true;
    setMode("review");
    toast.success(
      `${title.replace("Form ", "")} disubmit dan menunggu review PM.`,
    );
  };

  const decide = (decision: "approved" | "need_revision") => {
    if (decision === "need_revision" && !reviewComment.trim()) {
      setReviewError("Komentar revisi wajib diisi.");
      return;
    }
    setReviewError("");
    store.reviewForm(
      form.id,
      decision,
      reviewComment.trim(),
      reviewTarget.trim() || undefined,
    );
    toast.success(
      decision === "approved" ? "Form disetujui." : "Revisi diminta.",
    );
  };

  const reloadLatest = () => {
    const current = usePrototypeStore
      .getState()
      .forms.find((item) => item.id === form.id);
    if (!current) return;
    setDraft(current.payload);
    draftRef.current = current.payload;
    savedRef.current = current.payload;
    baselineRef.current = current.updatedAt;
    setDirty(false);
    setConflict(false);
    setSaveState("idle");
    setIssues([]);
    toast.success("Versi terbaru dimuat.");
  };

  const candidates = store.users.filter((user) => user.role === "finance");
  const canAssign = canAssignForm(currentUser) && !readOnly;

  const selectedVersion =
    versions.find((version) => version.id === selectedVersionId) ?? latestVersion;
  const historyPayload = selectedVersion?.payload ?? form.payload;
  const reviewPayload =
    form.status === "draft" || form.status === "assigned"
      ? form.payload
      : latestVersion?.payload ?? form.payload;
  const activePayload =
    mode === "history" ? historyPayload : mode === "review" ? reviewPayload : draft;
  const bodyReadOnly = mode !== "fill" || !editable;

  const saveLabel =
    saveState === "saving"
      ? "Menyimpan…"
      : saveState === "saved" && savedAt
        ? `Tersimpan ${new Date(savedAt).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : saveState === "error"
          ? "Gagal menyimpan"
          : dirty
            ? "Belum tersimpan"
            : "";

  const unassigned = form.status === "unassigned" && !form.assigneeId;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{title}</h3>
              <FormStatusBadge
                status={form.status}
                label={STATUS_TEXT[form.status]}
              />
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                {versionLabel(form)}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {FORM_DESCRIPTION[formKey]}
            </p>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Terakhir diubah{" "}
              {form.updatedById
                ? userById(store, form.updatedById)?.name ?? "—"
                : "—"}{" "}
              · {form.updatedAt ? formatDateTime(form.updatedAt) : "—"}
            </p>
          </div>
          {!unassigned ? (
            <ModeTabs
              mode={mode}
              onChange={(next) => {
                modePickedRef.current = true;
                if (next !== "fill") setIssues([]);
                setMode(next);
              }}
              canFill={editable}
            />
          ) : null}
        </div>

        {unassigned ? (
          <div className="p-4">
            <EmptyState
              icon={Info}
              title="Form belum dimulai"
              description={FORM_EMPTY_HINT[formKey]}
              action={
                canAssign ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <NativeSelect
                      value={assignUserId}
                      onChange={setAssignUserId}
                      className="h-8 w-[200px] text-xs"
                    >
                      <option value="">Pilih Finance</option>
                      {candidates.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </NativeSelect>
                    <Button
                      size="sm"
                      disabled={!assignUserId}
                      onClick={() => {
                        if (!assignUserId) return;
                        store.assignForm(form.id, assignUserId);
                        toast.success("Form di-assign.");
                      }}
                    >
                      Assign
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Menunggu penugasan Finance oleh Manager/Admin.
                  </p>
                )
              }
            />
          </div>
        ) : (
          <>
            {form.reviewComment && form.status === "need_revision" ? (
              <div
                role="status"
                className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Perlu revisi</p>
                  <p className="mt-0.5">{form.reviewComment}</p>
                  {form.reviewTarget ? (
                    <p className="mt-1 text-[10px]">
                      Tautan: {form.reviewTarget}
                    </p>
                  ) : null}
                </div>
                {editable ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      modePickedRef.current = true;
                      setMode("fill");
                    }}
                  >
                    Perbaiki
                  </Button>
                ) : null}
              </div>
            ) : null}

            {form.status === "approved" ? (
              <div
                role="status"
                className="flex items-start gap-2 border-b border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
              >
                <Check className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-semibold">Disetujui</p>
                  <p className="mt-0.5">
                    {userById(store, form.reviewedById)?.name ?? "PM"} ·{" "}
                    {formatDateTime(form.reviewedAt)}
                  </p>
                  {form.reviewComment ? (
                    <p className="mt-1">{form.reviewComment}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {conflict ? (
              <div
                role="alert"
                className="flex flex-wrap items-center gap-2 border-b border-rose-200 bg-rose-50 p-3 text-xs text-rose-900"
              >
                <AlertTriangle className="size-4" />
                <span className="min-w-0 flex-1">
                  Form ini baru diubah oleh{" "}
                  <strong>
                    {userById(
                      store,
                      usePrototypeStore
                        .getState()
                        .forms.find((item) => item.id === form.id)?.updatedById,
                    )?.name ?? "pengguna lain"}
                  </strong>
                  . Simpan ditolak agar perubahan mereka tidak tertimpa.
                </span>
                <Button size="sm" variant="outline" onClick={reloadLatest}>
                  <RefreshCw className="size-3.5" /> Muat versi terbaru
                </Button>
              </div>
            ) : null}

            <div className="space-y-3 p-4">
              {confirming ? (
                <>
                  <SubmitSummary
                    type={form.type}
                    payload={draft}
                    users={store.users}
                  />
                  <p className="text-muted-foreground text-xs">
                    Setelah dikonfirmasi, isian dikunci sebagai versi baru dan
                    menunggu review PM.
                  </p>
                </>
              ) : (
                <>
                  {mode === "fill" ? (
                    <ValidationList issues={issues} onFocus={focusIssue} />
                  ) : null}
                  <DraftFields
                    project={project}
                    form={form}
                    payload={activePayload}
                    onChange={updateDraft}
                    readOnly={bodyReadOnly}
                    errors={mode === "fill" ? issues : []}
                    users={store.users}
                    onFieldBlur={mode === "fill" ? flushAutosave : undefined}
                  />
                </>
              )}

              {mode === "review" && versions.length >= 2 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold">
                    Diff v{versions.length - 1} → v{versions.length}
                  </p>
                  <DiffBlock
                    type={form.type}
                    before={versions[versions.length - 2].payload}
                    after={versions[versions.length - 1].payload}
                  />
                </div>
              ) : null}

              {mode === "review" && reviewer && form.status === "submitted" ? (
                <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                  <p className="text-xs font-semibold">Review PM</p>
                  <Textarea
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    rows={2}
                    placeholder="Komentar review (wajib jika minta revisi)"
                    aria-label="Komentar review"
                  />
                  <Input
                    value={reviewTarget}
                    onChange={(event) => setReviewTarget(event.target.value)}
                    placeholder="Tautkan ke field/baris (opsional)"
                    aria-label="Tautan revisi"
                  />
                  {reviewError ? (
                    <p className="text-destructive text-[11px]" role="alert">
                      {reviewError}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => decide("approved")}>
                      <Check className="size-3.5" /> Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decide("need_revision")}
                    >
                      Minta revisi
                    </Button>
                  </div>
                </div>
              ) : null}

              {mode === "review" && !editable && !reviewer && !versions.length ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
                  Belum ada versi yang disubmit. Form akan tampil di sini setelah
                  Finance mengirim draft.
                </p>
              ) : null}

              {mode === "history" ? (
                <div className="space-y-3">
                  {versions.length === 0 ? (
                    <EmptyState
                      icon={History}
                      title="Belum ada versi"
                      description="Versi immutable dibuat setiap kali form disubmit."
                    />
                  ) : (
                    <>
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[220px] flex-1">
                          <FieldLabel htmlFor={`${form.type}-version`}>
                            Pilih versi
                          </FieldLabel>
                          <NativeSelect
                            id={`${form.type}-version`}
                            value={selectedVersion?.id ?? ""}
                            onChange={(value) => setSelectedVersionId(value)}
                          >
                            {versions.map((version) => (
                              <option key={version.id} value={version.id}>
                                v{version.versionNumber} ·{" "}
                                {userById(store, version.createdById)?.name ?? "—"} ·{" "}
                                {formatDateTime(version.createdAt)}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>
                        {versions.length >= 2 ? (
                          <Button
                            variant={compare ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCompare((value) => !value)}
                          >
                            Bandingkan dengan versi sebelumnya
                          </Button>
                        ) : null}
                      </div>

                      {selectedVersion ? (
                        <div className="space-y-1 rounded-lg border bg-muted/20 p-3 text-[11px]">
                          <p>
                            <strong>v{selectedVersion.versionNumber}</strong> ·{" "}
                            {STATUS_TEXT[selectedVersion.status] ??
                              selectedVersion.status}{" "}
                            ·{" "}
                            {userById(store, selectedVersion.createdById)?.name ??
                              "—"}
                          </p>
                          <p className="text-muted-foreground">
                            {formatDateTime(selectedVersion.createdAt)} ·{" "}
                            {selectedVersion.source === "migration"
                              ? "Migrasi data lama"
                              : "Submit"}
                          </p>
                        </div>
                      ) : null}

                      {compare && selectedVersion && versions.length >= 2 ? (
                        <DiffBlock
                          type={form.type}
                          before={
                            versions[
                              Math.max(0, versions.indexOf(selectedVersion) - 1)
                            ].payload
                          }
                          after={selectedVersion.payload}
                        />
                      ) : null}

                      <DraftFields
                        project={project}
                        form={form}
                        payload={historyPayload}
                        onChange={() => undefined}
                        readOnly
                        errors={[]}
                        users={store.users}
                      />
                    </>
                  )}
                </div>
              ) : null}
            </div>

            {mode === "fill" && editable ? (
              <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t bg-card/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur">
                <span
                  aria-live="polite"
                  className={cn(
                    "text-[11px]",
                    saveState === "error"
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {saveLabel}
                </span>
                {confirming ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setConfirming(false)}
                    >
                      Kembali ke edit
                    </Button>
                    <Button onClick={confirmSubmit}>
                      <Send className="size-3.5" /> Konfirmasi submit
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!dirty) {
                          toast("Tidak ada perubahan.");
                          return;
                        }
                        if (persist(true)) toast.success("Draft disimpan.");
                      }}
                    >
                      Simpan draft
                    </Button>
                    <Button className="ml-1 sm:ml-4" onClick={startSubmit}>
                      <Send className="size-3.5" /> Submit
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function DraftFields({
  project,
  form,
  payload,
  onChange,
  readOnly,
  errors,
  users,
  onFieldBlur,
}: {
  project: Project;
  form: StepForm;
  payload: FormPayload;
  onChange: (payload: FormPayload) => void;
  readOnly: boolean;
  errors: ValidationIssue[];
  users: User[];
  onFieldBlur?: () => void;
}) {
  const body = (() => {
    if (form.type === "rab") {
      return (
        <RabEditor
          payload={payload as RabPayload}
          onChange={(next) => onChange(next)}
          readOnly={readOnly}
          errors={errors}
        />
      );
    }
    if (form.type === "bast") {
      return (
        <BastEditor
          project={project}
          payload={payload as BastPayload}
          onChange={(next) => onChange(next)}
          readOnly={readOnly}
          errors={errors}
          users={users}
        />
      );
    }
    return (
      <InvoiceEditor
        project={project}
        form={form}
        payload={payload as InvoicePayload}
        onChange={(next) => onChange(next)}
        readOnly={readOnly}
        errors={errors}
      />
    );
  })();

  return <div onBlur={onFieldBlur}>{body}</div>;
}

export function StepFormPanel({
  project,
  formKey,
  readOnly = false,
}: {
  project: Project;
  formKey: FormKey;
  readOnly?: boolean;
}) {
  const store = usePrototypeStore();
  const form = formFor(store, project.id, formKey);
  const currentUser = userById(store, store.currentUserId);
  if (!form || !currentUser) return null;
  return (
    <PanelInner
      project={project}
      form={form}
      currentUser={currentUser}
      readOnly={readOnly}
    />
  );
}
