"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import {
  Check,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Plus,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canEditForm,
  canReviewForm,
  formatDate,
  userById,
} from "@/lib/prototype/domain";
import {
  downloadBastTemplate,
  downloadInvoiceTemplate,
  parseBastFile,
  parseInvoiceFile,
} from "@/lib/prototype/excel";
import { getPrototypeFile, putPrototypeFile } from "@/lib/prototype/files";
import type {
  BastPayload,
  InvoicePayload,
  RabItem,
  RabPayload,
  SurveyPayload,
  SurveyPhoto,
} from "@/lib/prototype/types";
import { Field, FormStatusBadge, Money } from "./ui";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function FilePreview({ photo }: { photo: SurveyPhoto }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    if (!photo.storageKey) {
      setUrl(null);
      return;
    }
    getPrototypeFile(photo.storageKey).then((blob) => {
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo.storageKey]);

  if (url) {
    return (
      <img
        src={url}
        alt={photo.fileName}
        className="h-20 w-24 rounded-lg object-cover ring-1 ring-foreground/10"
      />
    );
  }
  return (
    <div className="from-primary/15 to-primary/5 flex h-20 w-24 flex-col items-center justify-center rounded-lg bg-gradient-to-br text-primary ring-1 ring-foreground/10">
      <ImageIcon className="size-5" />
      <span className="mt-1 line-clamp-1 px-1 text-[9px]">{photo.fileName}</span>
    </div>
  );
}

export function SurveyFormDialog({
  open,
  onOpenChange,
  formId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
}) {
  const store = usePrototypeStore();
  const form = store.forms.find((item) => item.id === formId);
  const project = form ? store.projects.find((item) => item.id === form.projectId) : undefined;
  const currentUser = userById(store, store.currentUserId);
  const payload = (form?.payload ?? {}) as SurveyPayload;
  const [surveyDate, setSurveyDate] = useState("");
  const [location, setLocation] = useState("");
  const [pic, setPic] = useState("");
  const [findings, setFindings] = useState("");
  const [notes, setNotes] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    if (!open || !form) return;
    setSurveyDate(payload.surveyDate ?? "");
    setLocation(payload.location ?? "");
    setPic(payload.pic ?? "");
    setFindings(payload.findings ?? "");
    setNotes(payload.notes ?? "");
    setReviewComment("");
  }, [open, form?.id, payload.surveyDate, payload.location, payload.pic, payload.findings, payload.notes]);

  if (!form || !project || !currentUser) return null;

  const editable = canEditForm(store, currentUser, form);
  const reviewer = canReviewForm(store, currentUser, form);
  const photos = form.photos ?? [];

  const currentPayload: SurveyPayload = {
    surveyDate,
    location,
    pic,
    findings,
    notes,
  };

  const save = (submit: boolean) => {
    if (!editable) return;
    if (submit) {
      if (!surveyDate || !location || !findings) {
        toast.error("Tanggal, lokasi, dan temuan wajib diisi.");
        return;
      }
      if (photos.length === 0) {
        toast.error("Minimal 1 foto survey.");
        return;
      }
    }
    store.saveForm(form.id, currentPayload);
    if (submit) {
      store.submitForm(form.id);
      toast.success("Survey disubmit dan menunggu review PM.");
    } else {
      toast.success("Survey disimpan sebagai draft.");
    }
  };

  const review = (decision: "approved" | "need_revision") => {
    if (decision === "need_revision" && !reviewComment.trim()) {
      toast.error("Komentar revisi wajib diisi.");
      return;
    }
    store.reviewForm(form.id, decision, reviewComment.trim());
    toast.success(decision === "approved" ? "Survey disetujui." : "Survey dikembalikan.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Form Survey</DialogTitle>
          <DialogDescription>
            {project.name} · {project.code}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <FormStatusBadge status={form.status} />
          <span className="text-muted-foreground text-xs">
            Assignee: {userById(store, form.assigneeId)?.name ?? "Belum di-assign"}
          </span>
          {form.submittedAt ? (
            <span className="text-muted-foreground text-xs">
              Submit {formatDate(form.submittedAt)}
            </span>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tanggal survey">
            <Input type="date" value={surveyDate} disabled={!editable} onChange={(event) => setSurveyDate(event.target.value)} />
          </Field>
          <Field label="Lokasi">
            <Input value={location} disabled={!editable} onChange={(event) => setLocation(event.target.value)} />
          </Field>
          <Field label="PIC lapangan">
            <Input value={pic} disabled={!editable} onChange={(event) => setPic(event.target.value)} />
          </Field>
          <Field label="Temuan / hasil survey" className="sm:col-span-2">
            <Textarea value={findings} disabled={!editable} onChange={(event) => setFindings(event.target.value)} rows={4} />
          </Field>
          <Field label="Kesimpulan / catatan" className="sm:col-span-2">
            <Textarea value={notes} disabled={!editable} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>Foto survey ({photos.length}/10)</Label>
            {editable ? (
              <label className="text-primary inline-flex cursor-pointer items-center gap-1 text-xs font-medium">
                <Upload className="size-3.5" /> Tambah foto
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (photos.length >= 10) {
                      toast.error("Maksimal 10 foto.");
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Maksimal 5 MB per foto.");
                      return;
                    }
                    const storageKey = uid("survey");
                    await putPrototypeFile(storageKey, file);
                    store.addFormPhoto(form.id, {
                      id: uid("photo"),
                      fileName: file.name,
                      mimeType: file.type,
                      size: file.size,
                      storageKey,
                    });
                    toast.success("Foto ditambahkan.");
                  }}
                />
              </label>
            ) : null}
          </div>
          {photos.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs">
              Belum ada foto.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative">
                  <FilePreview photo={photo} />
                  {editable ? (
                    <button
                      type="button"
                      className="bg-background absolute -top-1 -right-1 rounded-full p-1 shadow ring-1 ring-foreground/10"
                      onClick={() => store.removeFormPhoto(form.id, photo.id)}
                      aria-label="Hapus foto"
                    >
                      <X className="size-3" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {reviewer && form.status === "submitted" ? (
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <Label>Review PM</Label>
            <Textarea
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              rows={2}
              placeholder="Komentar review (wajib jika need revision)"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => review("approved")}>
                <Check className="size-3.5" /> Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => review("need_revision")}>
                Need Revision
              </Button>
            </div>
          </div>
        ) : null}

        {form.reviewComment ? (
          <p className="text-muted-foreground rounded-lg bg-muted/40 p-2 text-xs">
            Review terakhir: {form.reviewComment}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          {editable ? (
            <>
              <Button variant="outline" onClick={() => save(false)}>
                Simpan draft
              </Button>
              <Button onClick={() => save(true)}>
                <Send className="size-3.5" /> Submit
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RabFormDialog({
  open,
  onOpenChange,
  formId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
}) {
  const store = usePrototypeStore();
  const form = store.forms.find((item) => item.id === formId);
  const project = form ? store.projects.find((item) => item.id === form.projectId) : undefined;
  const currentUser = userById(store, store.currentUserId);
  const initial = (form?.payload ?? { items: [], notes: "" }) as RabPayload;
  const [items, setItems] = useState<RabItem[]>([]);
  const [notes, setNotes] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    if (!open || !form) return;
    setItems(initial.items ?? []);
    setNotes(initial.notes ?? "");
    setReviewComment("");
  }, [open, form?.id]);

  if (!form || !project || !currentUser) return null;

  const editable = canEditForm(store, currentUser, form);
  const reviewer = canReviewForm(store, currentUser, form);
  const total = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

  const save = (submit: boolean) => {
    if (!editable) return;
    if (submit && (items.length === 0 || total <= 0)) {
      toast.error("RAB minimal memiliki 1 item dengan total > 0.");
      return;
    }
    store.saveForm(form.id, { items, notes });
    if (submit) {
      store.submitForm(form.id);
      toast.success("RAB disubmit dan menunggu review PM.");
    } else {
      toast.success("RAB disimpan sebagai draft.");
    }
  };

  const review = (decision: "approved" | "need_revision") => {
    if (decision === "need_revision" && !reviewComment.trim()) {
      toast.error("Komentar revisi wajib diisi.");
      return;
    }
    store.reviewForm(form.id, decision, reviewComment.trim());
    toast.success(decision === "approved" ? "RAB disetujui." : "RAB dikembalikan.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Form RAB</DialogTitle>
          <DialogDescription>
            {project.name} · {project.code}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <FormStatusBadge status={form.status} />
          <span className="text-muted-foreground text-xs">
            Finance: {userById(store, form.assigneeId)?.name ?? "Belum di-assign"}
          </span>
        </div>

        <div className="rounded-lg border">
          <div className="grid grid-cols-[1fr_80px_90px_130px_130px_40px] gap-2 border-b bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">
            <span>Item</span>
            <span>Qty</span>
            <span>Satuan</span>
            <span>Harga</span>
            <span>Total</span>
            <span />
          </div>
          {items.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-xs">
              Belum ada item RAB.
            </p>
          ) : (
            items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[1fr_80px_90px_130px_130px_40px] gap-2 border-b px-3 py-2 last:border-0">
                <Input
                  value={item.description}
                  disabled={!editable}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, description: event.target.value } : row,
                      ),
                    )
                  }
                  className="h-8"
                />
                <Input
                  type="number"
                  min={0}
                  value={item.qty}
                  disabled={!editable}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, qty: Number(event.target.value) } : row,
                      ),
                    )
                  }
                  className="h-8"
                />
                <Input
                  value={item.unit}
                  disabled={!editable}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, unit: event.target.value } : row,
                      ),
                    )
                  }
                  className="h-8"
                />
                <Input
                  type="number"
                  min={0}
                  value={item.unitPrice}
                  disabled={!editable}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, unitPrice: Number(event.target.value) } : row,
                      ),
                    )
                  }
                  className="h-8"
                />
                <span className="flex items-center justify-end text-xs tabular-nums">
                  <Money value={item.qty * item.unitPrice} />
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={!editable}
                  aria-label="Hapus item"
                  onClick={() => setItems((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))
          )}
          <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-2">
            {editable ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    {
                      id: uid("rab"),
                      description: "",
                      qty: 1,
                      unit: "paket",
                      unitPrice: 0,
                    },
                  ])
                }
              >
                <Plus className="size-3.5" /> Item
              </Button>
            ) : (
              <span />
            )}
            <span className="text-sm font-semibold">
              Total: <Money value={total} />
            </span>
          </div>
        </div>

        <Field label="Catatan RAB">
          <Textarea value={notes} disabled={!editable} onChange={(event) => setNotes(event.target.value)} rows={3} />
        </Field>

        {reviewer && form.status === "submitted" ? (
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <Label>Review PM</Label>
            <Textarea
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              rows={2}
              placeholder="Komentar review (wajib jika need revision)"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => review("approved")}>
                <Check className="size-3.5" /> Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => review("need_revision")}>
                Need Revision
              </Button>
            </div>
          </div>
        ) : null}

        {form.reviewComment ? (
          <p className="text-muted-foreground rounded-lg bg-muted/40 p-2 text-xs">
            Review terakhir: {form.reviewComment}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          {editable ? (
            <>
              <Button variant="outline" onClick={() => save(false)}>
                Simpan draft
              </Button>
              <Button onClick={() => save(true)}>
                <Send className="size-3.5" /> Submit
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FinanceFormDialog({
  open,
  onOpenChange,
  formId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
}) {
  const store = usePrototypeStore();
  const form = store.forms.find((item) => item.id === formId);
  const project = form ? store.projects.find((item) => item.id === form.projectId) : undefined;
  const currentUser = userById(store, store.currentUserId);
  const isBast = form?.type === "bast";
  const initial = (form?.payload ?? {}) as BastPayload | InvoicePayload;

  const [number, setNumber] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [amount, setAmount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(11);
  const [taxAmount, setTaxAmount] = useState(0);

  useEffect(() => {
    if (!open || !form) return;
    setNumber(initial.number ?? "");
    setDate(initial.date ?? "");
    setNotes(initial.notes ?? "");
    setDocumentUrl(initial.documentUrl ?? "");
    if (form.type === "invoice") {
      const invoice = initial as InvoicePayload;
      setAmount(invoice.amount ?? 0);
      setTaxPercent(invoice.taxPercent ?? 11);
      setTaxAmount(invoice.taxAmount ?? 0);
    }
  }, [open, form?.id]);

  if (!form || !project || !currentUser) return null;

  const editable = canEditForm(store, currentUser, form);
  const submitted = form.status === "submitted";

  const payload = (): BastPayload | InvoicePayload =>
    isBast
      ? { number, date, notes, documentUrl }
      : { number, date, amount, taxPercent, taxAmount, notes, documentUrl };

  const save = (submit: boolean) => {
    if (!editable) return;
    if (submit) {
      if (!number.trim() || !date) {
        toast.error("Nomor dan tanggal wajib diisi.");
        return;
      }
      if (!isBast && amount <= 0) {
        toast.error("Nominal invoice wajib lebih dari 0.");
        return;
      }
    }
    store.saveForm(form.id, payload());
    if (submit) {
      store.submitForm(form.id);
      toast.success(`${isBast ? "BAST" : "Invoice"} disubmit.`);
    } else {
      toast.success("Form disimpan sebagai draft.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isBast ? "Form BAST" : "Form Invoice"}</DialogTitle>
          <DialogDescription>
            {project.name} · {project.code}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <FormStatusBadge status={form.status} />
          <span className="text-muted-foreground text-xs">
            Finance: {userById(store, form.assigneeId)?.name ?? "Belum di-assign"}
          </span>
          {submitted ? (
            <span className="text-muted-foreground text-xs">
              Submit {formatDate(form.submittedAt)}
            </span>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={isBast ? "Nomor BAST" : "Nomor invoice"}>
            <Input value={number} disabled={!editable} onChange={(event) => setNumber(event.target.value)} />
          </Field>
          <Field label="Tanggal">
            <Input type="date" value={date} disabled={!editable} onChange={(event) => setDate(event.target.value)} />
          </Field>
          {!isBast ? (
            <>
              <Field label="Nominal">
                <Input
                  type="number"
                  value={amount}
                  disabled={!editable}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setAmount(next);
                    setTaxAmount(Math.round(next * (taxPercent / 100)));
                  }}
                />
              </Field>
              <Field label="PPN (%)">
                <Input
                  type="number"
                  value={taxPercent}
                  disabled={!editable}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setTaxPercent(next);
                    setTaxAmount(Math.round(amount * (next / 100)));
                  }}
                />
              </Field>
              <Field label="Nominal PPN">
                <Input type="number" value={taxAmount} disabled={!editable} onChange={(event) => setTaxAmount(Number(event.target.value))} />
              </Field>
              <Field label="Total">
                <div className="flex h-9 items-center rounded-lg border bg-muted/30 px-2.5 text-sm">
                  <Money value={amount + taxAmount} />
                </div>
              </Field>
            </>
          ) : null}
          <Field label="Link dokumen" className="sm:col-span-2">
            <Input value={documentUrl} disabled={!editable} onChange={(event) => setDocumentUrl(event.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Catatan" className="sm:col-span-2">
            <Textarea value={notes} disabled={!editable} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </Field>
        </div>

        {editable ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2">
            <Button variant="outline" size="sm" onClick={isBast ? downloadBastTemplate : downloadInvoiceTemplate}>
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
                  try {
                    if (isBast) {
                      const data = await parseBastFile(file, project.code);
                      setNumber(data.number);
                      setDate(data.date);
                      setNotes(data.notes);
                      setDocumentUrl(data.documentUrl);
                    } else {
                      const data = await parseInvoiceFile(file, project.code);
                      setNumber(data.number);
                      setDate(data.date);
                      setAmount(data.amount);
                      setTaxPercent(data.taxPercent);
                      setTaxAmount(data.taxAmount);
                      setNotes(data.notes);
                      setDocumentUrl(data.documentUrl);
                    }
                    toast.success("Excel berhasil dibaca. Periksa lalu submit.");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Import gagal.");
                  }
                }}
              />
            </label>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          {editable ? (
            <>
              <Button variant="outline" onClick={() => save(false)}>
                Simpan draft
              </Button>
              <Button onClick={() => save(true)}>
                <Send className="size-3.5" /> Submit
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
