"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FileText,
  FolderKanban,
  History,
  Link2,
  Plus,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canDecidePitching,
  canManageProspek,
  canViewProspek,
  contractComplete,
  formatCurrency,
  formatDate,
  formatDateTime,
  pitchingFormComplete,
  pitchingQuotationFor,
  pitchingRabFor,
  prospekAssigneeCandidates,
  prospekFinanceCandidates,
  prospekById,
  prospekPitchingsFor,
  prospekPaguSummary,
  userById,
} from "@/lib/prototype/domain";
import { prospekEventPage as eventPage } from "@/lib/prototype/prospek-events";
import { putPrototypeFile } from "@/lib/prototype/files";
import type {
  Attachment,
  PitchingContract,
  PitchingQuotationMode,
  PitchingRabItem,
  Prospek,
  ProspekPitching,
  Termine,
} from "@/lib/prototype/types";
import {
  EmptyState,
  Field,
  NativeSelect,
  SectionCard,
  StatCard,
} from "../ui";
import { ProspekStatusBadge } from "./prospek";

const PITCHING_STATUS_CLASS: Record<ProspekPitching["status"], string> = {
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  won: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  lost: "bg-rose-100 text-rose-700 ring-rose-200",
};

const PITCHING_STATUS_LABEL: Record<ProspekPitching["status"], string> = {
  draft: "Draft",
  won: "Menang",
  lost: "Kalah",
};

function PitchingStatusBadge({ status }: { status: ProspekPitching["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${PITCHING_STATUS_CLASS[status]}`}
    >
      {PITCHING_STATUS_LABEL[status]}
    </span>
  );
}

function statusTone(status: string): string {
  if (["submitted", "approved"].includes(status)) {
    return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  }
  if (["assigned", "draft", "need_revision"].includes(status)) {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function SimpleStatus({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${statusTone(status)}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

async function uploadAttachment(
  file: File,
  prefix: string,
): Promise<Attachment> {
  const storageKey = `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  await putPrototypeFile(storageKey, file);
  return {
    id: storageKey,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    storageKey,
  };
}

export function RabPanel({
  pitching,
  editable,
  canReview = false,
}: {
  pitching: ProspekPitching;
  editable: boolean;
  canReview?: boolean;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const rab = pitchingRabFor(store, pitching.id);
  const prospek = prospekById(store, pitching.prospekId);
  const [items, setItems] = useState<PitchingRabItem[]>(rab?.items ?? []);
  const [notes, setNotes] = useState(rab?.notes ?? "");
  const [dueDate, setDueDate] = useState(
    rab?.dueDate ? rab.dueDate.slice(0, 10) : "",
  );
  const [assignTo, setAssignTo] = useState(rab?.assigneeId ?? "");
  const [reviewComment, setReviewComment] = useState("");

  if (!rab) return null;
  const candidates = currentUser
    ? prospekFinanceCandidates(store, currentUser, prospek)
    : [];
  const total = items.reduce(
    (sum, item) => sum + Number(item.qty || 0) * Number(item.unitPrice || 0),
    0,
  );

  const patch = (index: number, value: Partial<PitchingRabItem>) =>
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...value } : item,
      ),
    );

  return (
    <SectionCard
      title="RAB Pitching"
      description="Manpower dan item biaya. Setiap submit membuat versi baru."
      actions={<SimpleStatus status={rab.status} />}
    >
      <div className="space-y-3">
        {editable ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Assignee RAB">
              <NativeSelect
                value={assignTo}
                onChange={(value) => {
                  setAssignTo(value);
                  if (value) store.assignPitchingRab(pitching.id, value);
                }}
              >
                <option value="">Belum di-assign</option>
                {candidates.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Due date RAB">
              <Input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </Field>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-xs">
            <thead className="text-muted-foreground border-b text-left">
              <tr>
                <th className="py-1.5 pr-2 font-medium">Jenis</th>
                <th className="py-1.5 pr-2 font-medium">Deskripsi</th>
                <th className="py-1.5 pr-2 font-medium">Qty</th>
                <th className="py-1.5 pr-2 font-medium">Satuan</th>
                <th className="py-1.5 pr-2 font-medium">Harga</th>
                <th className="py-1.5 pr-2 text-right font-medium">Total</th>
                {editable ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={editable ? 7 : 6}
                    className="text-muted-foreground py-3 text-center"
                  >
                    Belum ada item RAB.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-2">
                      {editable ? (
                        <NativeSelect
                          value={item.kind}
                          onChange={(value) =>
                            patch(index, {
                              kind: value as PitchingRabItem["kind"],
                            })
                          }
                          className="h-7 w-[110px] text-[11px]"
                        >
                          <option value="manpower">Manpower</option>
                          <option value="cost">Biaya</option>
                        </NativeSelect>
                      ) : (
                        item.kind
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      {editable ? (
                        <Input
                          value={item.description}
                          onChange={(event) =>
                            patch(index, { description: event.target.value })
                          }
                          className="h-7 text-[11px]"
                        />
                      ) : (
                        item.description
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      {editable ? (
                        <Input
                          type="number"
                          min={0}
                          value={item.qty}
                          onChange={(event) =>
                            patch(index, { qty: Number(event.target.value) })
                          }
                          className="h-7 w-16 text-[11px]"
                        />
                      ) : (
                        item.qty
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      {editable ? (
                        <Input
                          value={item.unit}
                          onChange={(event) =>
                            patch(index, { unit: event.target.value })
                          }
                          className="h-7 w-20 text-[11px]"
                        />
                      ) : (
                        item.unit
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      {editable ? (
                        <Input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={(event) =>
                            patch(index, {
                              unitPrice: Number(event.target.value),
                            })
                          }
                          className="h-7 w-28 text-[11px]"
                        />
                      ) : (
                        formatCurrency(item.unitPrice)
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {formatCurrency(item.qty * item.unitPrice)}
                    </td>
                    {editable ? (
                      <td className="py-1.5 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6"
                          onClick={() =>
                            setItems((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <X className="size-3" />
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={editable ? 5 : 4}
                  className="pt-2 text-right font-medium"
                >
                  Total RAB
                </td>
                <td className="pt-2 text-right font-semibold tabular-nums">
                  {formatCurrency(total)}
                </td>
                {editable ? <td /> : null}
              </tr>
            </tfoot>
          </table>
        </div>

        {editable ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setItems((prev) => [
                ...prev,
                {
                  id: `rab-item-${Math.random().toString(36).slice(2, 8)}`,
                  kind: "cost",
                  description: "",
                  category: "Biaya",
                  qty: 1,
                  unit: "paket",
                  unitPrice: 0,
                },
              ])
            }
          >
            <Plus className="size-3.5" /> Tambah item
          </Button>
        ) : null}

        <Field label="Catatan RAB">
          <Textarea
            rows={2}
            value={notes}
            disabled={!editable}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        {editable ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                store.savePitchingRab(pitching.id, {
                  items,
                  notes,
                  dueDate: dueDate || undefined,
                });
                toast.success("RAB disimpan sebagai draft.");
              }}
            >
              Simpan draft
            </Button>
            <Button
              size="sm"
              onClick={() => {
                store.savePitchingRab(pitching.id, {
                  items,
                  notes,
                  dueDate: dueDate || undefined,
                });
                store.submitPitchingRab(pitching.id);
                toast.success("RAB disubmit.");
              }}
            >
              <Send className="size-3.5" /> Submit RAB
            </Button>
          </div>
        ) : null}

        {canReview && rab.status === "submitted" ? (
          <div className="space-y-2 border-t pt-2">
            <Textarea
              rows={2}
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              placeholder="Komentar review (wajib jika minta revisi)"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  store.reviewPitchingRab(pitching.id, "approved", reviewComment);
                  toast.success("RAB disetujui.");
                }}
              >
                <Check className="size-3.5" /> Setujui RAB
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  store.reviewPitchingRab(
                    pitching.id,
                    "need_revision",
                    reviewComment,
                  );
                  toast.success("RAB dikembalikan untuk revisi.");
                }}
              >
                Minta revisi
              </Button>
            </div>
          </div>
        ) : null}

        {rab.reviewComment ? (
          <p className="text-muted-foreground rounded-lg bg-muted/40 p-2 text-[11px]">
            Review RAB: {rab.reviewComment}
          </p>
        ) : null}

        {rab.versions.length > 0 ? (
          <div className="space-y-1">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase">
              Versi RAB
            </p>
            {rab.versions.map((version) => (
              <p key={version.id} className="text-muted-foreground text-[10px]">
                v{version.versionNumber} · {formatDateTime(version.createdAt)} ·{" "}
                {userById(store, version.createdById)?.name ?? "User"}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function QuotationPanel({
  pitching,
  editable,
  canReview,
}: {
  pitching: ProspekPitching;
  editable: boolean;
  canReview: boolean;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const quotation = pitchingQuotationFor(store, pitching.id);
  const prospek = prospekById(store, pitching.prospekId);
  const [mode, setMode] = useState<PitchingQuotationMode>(
    quotation?.mode ?? "link",
  );
  const [url, setUrl] = useState(quotation?.url ?? "");
  const [amount, setAmount] = useState(String(quotation?.amount ?? ""));
  const [dueDate, setDueDate] = useState(
    quotation?.dueDate ? quotation.dueDate.slice(0, 10) : "",
  );
  const [assignTo, setAssignTo] = useState(quotation?.assigneeId ?? "");
  const [attachment, setAttachment] = useState<Attachment | undefined>(
    quotation?.attachment,
  );
  const [reviewComment, setReviewComment] = useState("");

  if (!quotation) return null;
  const candidates = currentUser
    ? prospekFinanceCandidates(store, currentUser, prospek)
    : [];

  return (
    <SectionCard
      title="Quotation"
      description="Submit link atau import PDF, lalu submit untuk direview."
      actions={<SimpleStatus status={quotation.status} />}
    >
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Mode quotation">
            <NativeSelect
              value={mode}
              disabled={!editable}
              onChange={(value) => setMode(value as PitchingQuotationMode)}
            >
              <option value="link">Submit Link</option>
              <option value="pdf">Import PDF</option>
            </NativeSelect>
          </Field>
          <Field label="Nilai quotation" hint="Opsional; dipakai untuk peringatan pagu.">
            <Input
              type="number"
              min={0}
              value={amount}
              disabled={!editable}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          <Field label="Assignee">
            <NativeSelect
              value={assignTo}
              disabled={!editable}
              onChange={(value) => {
                setAssignTo(value);
                if (value) store.assignPitchingQuotation(pitching.id, value);
              }}
            >
              <option value="">Belum di-assign</option>
              {candidates.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Due date">
            <Input
              type="date"
              value={dueDate}
              disabled={!editable}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </Field>
        </div>

        {mode === "link" ? (
          <Field label="URL quotation">
            <Input
              value={url}
              disabled={!editable}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
            />
          </Field>
        ) : (
          <div className="space-y-1">
            <p className="text-xs font-medium">Berkas PDF</p>
            {attachment ? (
              <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <FileText className="size-3.5" /> {attachment.fileName}
              </p>
            ) : (
              <p className="text-muted-foreground text-[11px]">
                Belum ada berkas.
              </p>
            )}
            {editable ? (
              <label className="text-primary inline-flex cursor-pointer items-center gap-1 text-xs font-medium">
                <Upload className="size-3.5" /> Unggah PDF
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.type !== "application/pdf") {
                      toast.error("Berkas harus PDF.");
                      return;
                    }
                    setAttachment(
                      await uploadAttachment(file, `quotation-${pitching.id}`),
                    );
                  }}
                />
              </label>
            ) : null}
          </div>
        )}

        {quotation.reviewComment ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
            Catatan review: {quotation.reviewComment}
          </p>
        ) : null}

        {editable ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                store.savePitchingQuotation(pitching.id, {
                  mode,
                  url: mode === "link" ? url : undefined,
                  attachment: mode === "pdf" ? attachment : undefined,
                  amount: amount ? Number(amount) : undefined,
                  dueDate: dueDate || undefined,
                });
                toast.success("Quotation disimpan sebagai draft.");
              }}
            >
              Simpan draft
            </Button>
            <Button
              size="sm"
              onClick={() => {
                store.savePitchingQuotation(pitching.id, {
                  mode,
                  url: mode === "link" ? url : undefined,
                  attachment: mode === "pdf" ? attachment : undefined,
                  amount: amount ? Number(amount) : undefined,
                  dueDate: dueDate || undefined,
                });
                store.submitPitchingQuotation(pitching.id);
                toast.success("Quotation disubmit.");
              }}
            >
              <Send className="size-3.5" /> Submit
            </Button>
          </div>
        ) : null}

        {canReview && quotation.status === "submitted" ? (
          <div className="space-y-2 border-t pt-2">
            <Textarea
              rows={2}
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              placeholder="Komentar (wajib jika minta revisi)"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  store.reviewPitchingQuotation(
                    pitching.id,
                    "approved",
                    reviewComment,
                  );
                  toast.success("Quotation disetujui.");
                }}
              >
                <Check className="size-3.5" /> Setujui
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  store.reviewPitchingQuotation(
                    pitching.id,
                    "need_revision",
                    reviewComment,
                  );
                  toast.success("Quotation dikembalikan untuk revisi.");
                }}
              >
                Minta revisi
              </Button>
            </div>
          </div>
        ) : null}

        {quotation.versions.length > 0 ? (
          <div className="space-y-1">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase">
              Versi quotation
            </p>
            {quotation.versions.map((version) => (
              <p key={version.id} className="text-muted-foreground text-[10px]">
                v{version.versionNumber} · {version.mode} ·{" "}
                {formatDateTime(version.createdAt)}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function FormPanel({ pitching, locked }: { pitching: ProspekPitching; locked: boolean }) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const prospek = prospekById(store, pitching.prospekId);
  const entries = store.formEntries.filter(
    (entry) => entry.pitchingId === pitching.id,
  );
  const template = store.templates.find(
    (item) => item.id === pitching.templateId,
  );
  const formStages = (template?.stages ?? []).filter(
    (stage) => stage.kind === "form",
  );
  const [stageId, setStageId] = useState(formStages[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [assignTo, setAssignTo] = useState<Record<string, string>>({});
  const canCreate =
    currentUser && prospek ? canManageProspek(currentUser, prospek) : false;
  const candidates = currentUser
    ? prospekAssigneeCandidates(store, currentUser, prospek)
    : [];

  return (
    <SectionCard
      title="Form Pitching"
      description="Presentasi, concept deck, dan tugas lain memakai template Form."
    >
      <div className="space-y-3">
        {canCreate && !locked && formStages.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
            <NativeSelect
              value={stageId}
              onChange={setStageId}
              className="h-8 text-xs"
            >
              {formStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </NativeSelect>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Judul entri, mis. Concept Deck"
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              disabled={!stageId || !title.trim()}
              onClick={() => {
                const id = store.createProspekFormEntry(
                  pitching.prospekId,
                  pitching.id,
                  stageId,
                  { title },
                );
                if (!id) {
                  toast.error("Gagal membuat entri Form.");
                  return;
                }
                setTitle("");
                toast.success("Entri Form dibuat.");
              }}
            >
              <Plus className="size-3.5" /> Form
            </Button>
          </div>
        ) : null}

        {entries.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
            Belum ada entri Form pada Pitching ini.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{entry.title}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {entry.stepKey} ·{" "}
                    {userById(store, entry.assigneeId)?.name ??
                      "Belum di-assign"}
                    {entry.dueDate ? ` · ${formatDate(entry.dueDate)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <SimpleStatus status={entry.status} />
                  {canCreate && !locked ? (
                    <>
                      <NativeSelect
                        value={assignTo[entry.id] ?? entry.assigneeId ?? ""}
                        onChange={(value) =>
                          setAssignTo((prev) => ({
                            ...prev,
                            [entry.id]: value,
                          }))
                        }
                        className="h-7 w-[140px] text-[11px]"
                      >
                        <option value="">Assign…</option>
                        {candidates.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </NativeSelect>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        disabled={!assignTo[entry.id]}
                        onClick={() => {
                          store.assignFormEntry(entry.id, assignTo[entry.id]);
                          toast.success("Entri Form di-assign.");
                        }}
                      >
                        Assign
                      </Button>
                    </>
                  ) : null}
                  <Link
                    href={`/crm/prospek/${pitching.prospekId}/forms/${entry.id}`}
                    className={buttonVariants({
                      variant: "ghost",
                      size: "sm",
                      className: "h-7 text-[11px]",
                    })}
                  >
                    Buka
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export function ContractPanel({
  pitching,
  editable,
  canAssign = false,
}: {
  pitching: ProspekPitching;
  editable: boolean;
  canAssign?: boolean;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const prospek = prospekById(store, pitching.prospekId);
  const contract = pitching.contract;
  const [number, setNumber] = useState(contract?.number ?? "");
  const [date, setDate] = useState(
    contract?.date ? contract.date.slice(0, 10) : "",
  );
  const [value, setValue] = useState(String(contract?.value ?? ""));
  const [attachment, setAttachment] = useState<Attachment | undefined>(
    contract?.attachment,
  );
  const [termine, setTermine] = useState<Termine[]>(contract?.termine ?? []);
  const [saving, setSaving] = useState(false);
  const [assignTo, setAssignTo] = useState(pitching.contractAssigneeId ?? "");
  const [dueDate, setDueDate] = useState(
    pitching.contractDueDate ? pitching.contractDueDate.slice(0, 10) : "",
  );
  const candidates = currentUser
    ? prospekAssigneeCandidates(store, currentUser, prospek)
    : [];

  if (pitching.status === "lost") return null;

  if (pitching.status !== "won") {
    return (
      <SectionCard
        title="Kontrak & Termine"
        description="Kontrak diisi setelah Pitching dinyatakan menang."
      >
        <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          Section Kontrak terkunci. Tandai Pitching sebagai menang di Finishing
          terlebih dahulu, lalu isi nomor, nilai, berkas, dan Termine.
        </p>
      </SectionCard>
    );
  }

  const updateTermine = (index: number, patch: Partial<Termine>) =>
    setTermine((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );

  return (
    <SectionCard
      title="Kontrak & Termine"
      description="Wajib lengkap agar Pitching menang dikonversi otomatis menjadi proyek."
      actions={
        contractComplete(contract) ? (
          <span className="text-[10px] font-semibold text-emerald-700">
            Lengkap
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-amber-700">
            Belum lengkap
          </span>
        )
      }
    >
      <div className="space-y-3">
        {canAssign && !pitching.projectId ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Assignee kontrak">
              <NativeSelect
                value={assignTo}
                onChange={(next) => {
                  setAssignTo(next);
                  if (next) {
                    store.assignPitchingContract(
                      pitching.id,
                      next,
                      dueDate || undefined,
                    );
                  }
                }}
              >
                <option value="">Belum di-assign</option>
                {candidates.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Due date kontrak">
              <Input
                type="date"
                value={dueDate}
                disabled={!editable}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </Field>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Nomor kontrak">
            <Input
              value={number}
              disabled={!editable}
              onChange={(event) => setNumber(event.target.value)}
            />
          </Field>
          <Field label="Tanggal kontrak">
            <Input
              type="date"
              value={date}
              disabled={!editable}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label="Nilai kontrak">
            <Input
              type="number"
              min={0}
              value={value}
              disabled={!editable}
              onChange={(event) => setValue(event.target.value)}
            />
          </Field>
        </div>

        <div>
          <p className="text-xs font-medium">Berkas kontrak</p>
          {attachment ? (
            <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
              <FileText className="size-3.5" /> {attachment.fileName}
            </p>
          ) : (
            <p className="text-muted-foreground text-[11px]">Belum ada berkas.</p>
          )}
          {editable ? (
            <label className="text-primary mt-1 inline-flex cursor-pointer items-center gap-1 text-xs font-medium">
              <Upload className="size-3.5" /> Unggah berkas
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setAttachment(
                    await uploadAttachment(file, `contract-${pitching.id}`),
                  );
                }}
              />
            </label>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">Termine</p>
            {editable ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() =>
                  setTermine((prev) => [
                    ...prev,
                    {
                      id: `termine-${Math.random().toString(36).slice(2, 8)}`,
                      label: "",
                      amount: 0,
                      dueDate: "",
                    },
                  ])
                }
              >
                <Plus className="size-3" /> Termine
              </Button>
            ) : null}
          </div>
          {termine.length === 0 ? (
            <p className="text-muted-foreground text-[11px]">
              Minimal satu Termine wajib diisi.
            </p>
          ) : (
            <div className="space-y-1.5">
              {termine.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-1.5 sm:grid-cols-[1.4fr_1fr_1fr_auto]"
                >
                  <Input
                    value={item.label}
                    disabled={!editable}
                    placeholder="Label termine"
                    onChange={(event) =>
                      updateTermine(index, { label: event.target.value })
                    }
                    className="h-8 text-xs"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={item.amount}
                    disabled={!editable}
                    onChange={(event) =>
                      updateTermine(index, {
                        amount: Number(event.target.value),
                      })
                    }
                    className="h-8 text-xs"
                  />
                  <Input
                    type="date"
                    value={item.dueDate ? item.dueDate.slice(0, 10) : ""}
                    disabled={!editable}
                    onChange={(event) =>
                      updateTermine(index, { dueDate: event.target.value })
                    }
                    className="h-8 text-xs"
                  />
                  {editable ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() =>
                        setTermine((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {editable ? (
          <Button
            size="sm"
            disabled={saving}
            onClick={() => {
              const next: PitchingContract = {
                number: number.trim(),
                date,
                value: Number(value) || 0,
                attachment,
                termine,
              };
              if (!contractComplete(next)) {
                toast.error(
                  "Lengkapi nomor, tanggal, nilai, berkas, dan minimal satu Termine.",
                );
                return;
              }
              setSaving(true);
              store.savePitchingContract(pitching.id, next);
              setSaving(false);
              toast.success("Kontrak disimpan.");
            }}
          >
            Simpan kontrak
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function DecisionPanel({
  prospek,
  pitching,
  locked,
}: {
  prospek: Prospek;
  pitching: ProspekPitching;
  locked: boolean;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const rab = pitchingRabFor(store, pitching.id);
  const quotation = pitchingQuotationFor(store, pitching.id);
  const [reason, setReason] = useState("");
  const canDecide = currentUser ? canDecidePitching(currentUser, prospek) : false;
  const rabReady = rab?.status === "approved";
  const quotationReady = quotation?.status === "approved";
  const formReady = pitchingFormComplete(store, pitching.id);
  const contractReady = contractComplete(pitching.contract);
  const decisionReady = rabReady && quotationReady && formReady;

  return (
    <SectionCard
      title="Decision"
      description="Putuskan menang/kalah setelah RAB, Quotation, dan Form Pitching selesai. Kontrak diisi setelah menang dan dikonversi otomatis saat lengkap."
      actions={<PitchingStatusBadge status={pitching.status} />}
    >
      <div className="space-y-3">
        <div className="grid gap-2 text-[11px] sm:grid-cols-4">
          <p className={rabReady ? "text-emerald-700" : "text-rose-700"}>
            {rabReady ? "✓" : "✕"} RAB approved
          </p>
          <p className={quotationReady ? "text-emerald-700" : "text-rose-700"}>
            {quotationReady ? "✓" : "✕"} Quotation approved
          </p>
          <p className={formReady ? "text-emerald-700" : "text-rose-700"}>
            {formReady ? "✓" : "✕"} Form Pitching approved
          </p>
          <p className={contractReady ? "text-emerald-700" : "text-rose-700"}>
            {contractReady ? "✓" : "✕"} Kontrak lengkap
          </p>
        </div>

        {pitching.status === "draft" && canDecide && !locked ? (
          <Button
            size="sm"
            disabled={!decisionReady}
            onClick={() => {
              store.decideProspekPitching(pitching.id, "won");
              toast.success("Pitching ditandai menang.");
            }}
          >
            <Check className="size-3.5" /> Menang
          </Button>
        ) : null}

        {pitching.status !== "lost" && !pitching.projectId && canDecide ? (
          <div className="flex flex-wrap items-end gap-2 border-t pt-2">
            <Field label="Alasan kalah" className="min-w-[240px] flex-1">
              <Input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Wajib diisi untuk menandai kalah"
                className="h-8 text-xs"
              />
            </Field>
            <Button
              size="sm"
              variant="destructive"
              disabled={!reason.trim() || !decisionReady}
              onClick={() => {
                store.decideProspekPitching(pitching.id, "lost", reason);
                toast.success("Pitching ditandai kalah dan masuk arsip.");
              }}
            >
              <X className="size-3.5" /> Kalah
            </Button>
          </div>
        ) : null}

        {pitching.status === "lost" ? (
          <div className="space-y-2">
            <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
              Pitching kalah: {pitching.lostReason} Data Pitching ini read-only
              dan tersimpan di arsip.
            </p>
            {canDecide && !pitching.projectId && prospek.status !== "cancelled" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  store.undoPitchingLoss(pitching.id);
                  toast.success("Keputusan kalah dibatalkan.");
                }}
              >
                Undo kalah
              </Button>
            ) : null}
          </div>
        ) : null}

        {pitching.status === "won" ? (
          <div className="flex flex-wrap items-center gap-2">
            {pitching.projectId ? (
              <Link
                href={`/crm/projects/${pitching.projectId}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <FolderKanban className="size-3.5" /> Buka anak proyek
              </Link>
            ) : contractReady ? (
              <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                Kontrak lengkap. Proyek sedang dikonversi otomatis.
              </span>
            ) : (
              <span className="text-muted-foreground text-[11px]">
                Lengkapi kontrak untuk memicu konversi otomatis.
              </span>
            )}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function HistoryPanel({ prospekId, pitchingId }: { prospekId: string; pitchingId: string }) {
  const store = usePrototypeStore();
  const page = eventPage(store.prospekEvents, prospekId, 0, 20);
  const items = page.items.filter((event) => event.pitchingId === pitchingId);

  return (
    <SectionCard title="Riwayat Pitching" description="Audit trail Pitching dan pekerjaannya.">
      {items.length === 0 ? (
        <p className="text-muted-foreground text-xs">Belum ada event.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((event) => (
            <div
              key={event.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1.5 text-[10px]"
            >
              <History className="text-muted-foreground size-3" />
              <span className="font-semibold">{event.eventType}</span>
              <span className="text-muted-foreground">
                {formatDateTime(event.occurredAt)}
              </span>
              <span>{userById(store, event.actorId)?.name ?? "User"}</span>
              <span className="text-muted-foreground">{event.summary}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function PitchingCard({
  prospek,
  pitching,
}: {
  prospek: Prospek;
  pitching: ProspekPitching;
}) {
  const store = usePrototypeStore();
  const router = useRouter();
  const rab = pitchingRabFor(store, pitching.id);
  const quotation = pitchingQuotationFor(store, pitching.id);
  const template = store.templates.find(
    (item) => item.id === pitching.templateId,
  );
  const rabTotal = (rab?.items ?? []).reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0,
  );
  const assigneeIds = [
    rab?.assigneeId,
    quotation?.assigneeId,
    pitching.contractAssigneeId,
  ].filter((id): id is string => Boolean(id));
  const assigneeNames = [
    ...new Set(
      assigneeIds.map((id) => userById(store, id)?.name ?? "User"),
    ),
  ];
  const dueDates = [rab?.dueDate, quotation?.dueDate, pitching.contractDueDate]
    .filter((date): date is string => Boolean(date))
    .sort();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() =>
        router.push(`/crm/prospek/${prospek.id}/pitching/${pitching.id}`)
      }
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/crm/prospek/${prospek.id}/pitching/${pitching.id}`);
        }
      }}
      className="bg-card hover:border-primary/40 cursor-pointer rounded-xl border p-3 shadow-sm transition-colors"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PitchingStatusBadge status={pitching.status} />
            <span className="text-muted-foreground text-[10px]">
              {template?.name ?? pitching.templateId} v{pitching.templateVersion}
            </span>
          </div>
          <h3 className="mt-1 truncate text-sm font-semibold">
            {pitching.title}
          </h3>
          <p className="text-muted-foreground line-clamp-1 text-[11px]">
            {pitching.description || "Tanpa deskripsi"}
          </p>
        </div>
        <span className="text-primary text-[11px] font-medium">Buka →</span>
      </div>

      <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-muted/40 p-2">
          <p className="text-muted-foreground">RAB</p>
          <p className="font-semibold">{formatCurrency(rabTotal)}</p>
          <p className="text-muted-foreground">{rab?.status ?? "belum ada"}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <p className="text-muted-foreground">Quotation</p>
          <p className="font-semibold">
            {quotation?.amount ? formatCurrency(quotation.amount) : "—"}
          </p>
          <p className="text-muted-foreground">
            {quotation?.status ?? "belum ada"}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <p className="text-muted-foreground">Kontrak</p>
          <p className="font-semibold">
            {contractComplete(pitching.contract) ? "Lengkap" : "Belum lengkap"}
          </p>
          <p className="text-muted-foreground">
            {pitching.contract?.number ?? "Belum diisi"}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <p className="text-muted-foreground">Assignee</p>
          <p className="truncate font-semibold">
            {assigneeNames.length > 0 ? assigneeNames.join(", ") : "Belum ada"}
          </p>
          <p className="text-muted-foreground">
            {dueDates[0] ? `Due ${formatDate(dueDates[0])}` : "Tanpa due date"}
          </p>
        </div>
      </div>

      {pitching.status === "lost" ? (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[10px] text-rose-800">
          Kalah: {pitching.lostReason}
        </p>
      ) : null}

      {pitching.projectId ? (
        <div className="mt-2 flex justify-end">
          <Link
            href={`/crm/projects/${pitching.projectId}`}
            onClick={(event) => event.stopPropagation()}
            className="text-[10px] font-medium text-emerald-700 hover:underline"
          >
            Buka anak proyek →
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function CrmProspekDetail({ prospekId }: { prospekId: string }) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const prospek = prospekById(store, prospekId);
  const [addOpen, setAddOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [pitchingDraft, setPitchingDraft] = useState({
    title: "",
    description: "",
    templateId: store.templates.find((item) => item.status === "active")?.id ?? "",
  });

  const pitchings = useMemo(() => {
    if (!prospek) return [];
    return prospekPitchingsFor(store, prospek.id);
  }, [store, prospek]);

  if (!prospek || !currentUser || !canViewProspek(store, currentUser, prospek)) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Prospek tidak ditemukan"
        description="Prospek tidak tersedia atau Anda tidak memiliki akses."
        action={
          <Link
            href="/crm/prospek"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Kembali ke Prospek
          </Link>
        }
      />
    );
  }

  const manage = canManageProspek(currentUser, prospek);
  const summary = prospekPaguSummary(store, prospek);
  const pic = userById(store, prospek.picId);
  const activeTemplates = store.templates.filter(
    (item) => item.status === "active",
  );

  return (
    <div className="space-y-5">
      <Link
        href="/crm/prospek"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="size-3.5" /> Kembali ke Prospek
      </Link>

      <div className="rounded-xl border bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold">
                {prospek.code}
              </span>
              <ProspekStatusBadge status={prospek.status} />
            </div>
            <h1 className="mt-2 truncate text-xl font-semibold">{prospek.name}</h1>
            <p className="mt-1 text-xs text-white/70">
              {prospek.client} · PIC {pic?.name ?? "Belum ditetapkan"} ·{" "}
              {formatDate(prospek.periodStart)} – {formatDate(prospek.periodEnd)}
            </p>
            {prospek.description ? (
              <p className="mt-1 max-w-2xl text-xs text-white/60">
                {prospek.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {manage && prospek.status === "active" ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
                  <Plus className="size-3.5" /> Pitching
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCancelOpen(true)}>
                  Batalkan
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pagu" value={formatCurrency(prospek.pagu)} sub="Peringatan, bukan batas" icon={AlertTriangle} />
        <StatCard label="RAB submitted" value={formatCurrency(summary.rabTotal)} sub={`${pitchings.length} Pitching`} icon={FileText} accent="from-sky-500 to-blue-600" />
        <StatCard label="Quotation" value={formatCurrency(summary.quotationTotal)} sub="Submitted/approved" icon={Link2} accent="from-violet-500 to-indigo-600" />
        <StatCard
          label={summary.exceeds ? "Pagu terlampaui" : "Sisa pagu"}
          value={formatCurrency(Math.abs(summary.remaining))}
          sub={summary.exceeds ? "Peringatan saja" : "Di bawah pagu"}
          icon={AlertTriangle}
          accent={summary.exceeds ? "from-rose-500 to-red-600" : "from-emerald-500 to-green-600"}
        />
      </div>

      {summary.exceeds ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
          Total RAB/Quotation melampaui pagu Prospek. Data tetap dapat disimpan;
          pagu hanya peringatan.
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Daftar Pitching</h2>
        <span className="text-muted-foreground text-[11px]">
          {pitchings.length} Pitching
        </span>
      </div>

      {pitchings.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada Pitching"
          description={
            manage
              ? "Tambahkan Pitching untuk mulai menyusun RAB dan Quotation."
              : "Belum ada Pitching yang terkait dengan pekerjaan Anda."
          }
          action={
            manage && prospek.status === "active" ? (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="size-3.5" /> Tambah Pitching
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {pitchings
              .filter((pitching) => pitching.status !== "lost")
              .map((pitching) => (
                <PitchingCard
                  key={pitching.id}
                  prospek={prospek}
                  pitching={pitching}
                />
              ))}
          </div>
          {pitchings.some((pitching) => pitching.status === "lost") ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Arsip Pitching
                </h3>
                <span className="text-muted-foreground text-[11px]">
                  {pitchings.filter((pitching) => pitching.status === "lost").length} Pitching
                </span>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {pitchings
                  .filter((pitching) => pitching.status === "lost")
                  .map((pitching) => (
                    <PitchingCard
                      key={pitching.id}
                      prospek={prospek}
                      pitching={pitching}
                    />
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <Dialog
        open={addOpen}
        onOpenChange={(value) => {
          setAddOpen(value);
          if (!value) {
            setPitchingDraft({
              title: "",
              description: "",
              templateId: activeTemplates[0]?.id ?? "",
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Tambah Pitching</DialogTitle>
            <DialogDescription>
              Pilih template proyek yang akan dipakai anak proyek jika Pitching menang.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Judul Pitching">
              <Input
                value={pitchingDraft.title}
                onChange={(event) =>
                  setPitchingDraft((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Template proyek">
              <NativeSelect
                value={pitchingDraft.templateId}
                onChange={(value) =>
                  setPitchingDraft((prev) => ({ ...prev, templateId: value }))
                }
              >
                {activeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} (v{template.version})
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Deskripsi">
              <Textarea
                rows={3}
                value={pitchingDraft.description}
                onChange={(event) =>
                  setPitchingDraft((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!pitchingDraft.title.trim() || !pitchingDraft.templateId}
              onClick={() => {
                const id = store.addProspekPitching(prospek.id, pitchingDraft);
                if (!id) {
                  toast.error("Gagal menambah Pitching.");
                  return;
                }
                setAddOpen(false);
                setPitchingDraft({
                  title: "",
                  description: "",
                  templateId: activeTemplates[0]?.id ?? "",
                });
                toast.success("Pitching ditambahkan.");
              }}
            >
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Batalkan Prospek</DialogTitle>
            <DialogDescription>
              Prospek dan seluruh isinya menjadi read-only.
            </DialogDescription>
          </DialogHeader>
          <Field label="Alasan pembatalan">
            <Textarea
              rows={3}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim()}
              onClick={() => {
                store.cancelProspek(prospek.id, cancelReason);
                setCancelOpen(false);
                setCancelReason("");
                toast.success("Prospek dibatalkan.");
              }}
            >
              Batalkan Prospek
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {prospek.status === "cancelled" ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
          Prospek dibatalkan: {prospek.cancelReason}
        </p>
      ) : null}
    </div>
  );
}
