"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, FileText, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canAssignFinanceForm,
  canEditForm,
  canManageProject,
  canReviewForm,
  canSubmitForm,
  canViewProject,
  financeAssigneeCandidates,
  formFor,
  formatDate,
  projectMediaOrders,
  reviewerCandidates,
  userById,
} from "@/lib/prototype/domain";
import type { Project } from "@/lib/prototype/types";
import {
  EmptyState,
  FormStatusBadge,
  NativeSelect,
  SectionCard,
  UserAvatar,
} from "../ui";
import { ProjectMediaOrders } from "./media-order";

function MediaOrderFormPanel({
  project,
  readOnly = false,
}: {
  project: Project;
  readOnly?: boolean;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const form = formFor(store, project.id, "mo");
  const [notes, setNotes] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewTarget, setReviewTarget] = useState("");

  useEffect(() => {
    setNotes((form?.payload as { notes?: string } | undefined)?.notes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id, form?.updatedAt]);

  useEffect(() => {
    if (!form) store.ensureMoForm(project.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id, project.id]);

  if (!form || !currentUser) {
    return (
      <EmptyState
        icon={FileText}
        title="Form Media Order belum tersedia"
        description="Muat ulang proyek untuk membuat form Media Order."
      />
    );
  }

  const editable =
    !readOnly &&
    canEditForm(store, currentUser, form) &&
    form.status !== "submitted" &&
    form.status !== "approved";
  const canManageDocuments = Boolean(
    !readOnly &&
      project.status === "active" &&
      project.lifecycle !== "lost" &&
      project.lifecycle !== "cancelled" &&
      (currentUser.role === "admin" ||
        currentUser.role === "manager" ||
        currentUser.role === "finance" ||
        canManageProject(currentUser, project)),
  );
  const reviewer = canReviewForm(store, currentUser, form);
  const canAssign =
    canAssignFinanceForm(currentUser) &&
    !form.assigneeId &&
    form.status !== "approved" &&
    financeAssigneeCandidates(store, form).length > 0;
  const candidates = financeAssigneeCandidates(store, form);
  const hasDocument = projectMediaOrders(store, project.id).length > 0;

  const saveNotes = () => {
    store.saveForm(
      form.id,
      { ...(form.payload as { notes?: string }), notes },
      { recordEvent: false },
    );
  };

  const submit = () => {
    if (!hasDocument) {
      toast.error("Tambahkan minimal satu Media Order sebelum submit.");
      return;
    }
    saveNotes();
    store.submitForm(form.id);
    toast.success("Media Order disubmit dan menunggu review PM.");
  };

  const decide = (decision: "approved" | "need_revision") => {
    if (decision === "need_revision" && !reviewComment.trim()) {
      toast.error("Komentar revisi wajib diisi.");
      return;
    }
    if (decision === "approved" && !hasDocument) {
      toast.error("Media Order belum memiliki dokumen.");
      return;
    }
    store.reviewForm(form.id, decision, reviewComment.trim(), reviewTarget.trim());
    setReviewComment("");
    setReviewTarget("");
    toast.success(
      decision === "approved" ? "Media Order disetujui." : "Media Order dikembalikan.",
    );
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Media Order"
        description="Kategori Form Keuangan untuk negosiasi media. Dokumen MO dapat berjumlah lebih dari satu."
      >
        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <FormStatusBadge status={form.status} />
            <span className="text-muted-foreground">
              Assignee {userById(store, form.assigneeId)?.name ?? "Belum di-assign"}
            </span>
            {form.submittedAt ? (
              <span className="text-muted-foreground">
                Submit {formatDate(form.submittedAt)}
              </span>
            ) : null}
            {form.reviewerId ? (
              <span className="text-muted-foreground">
                Reviewer {userById(store, form.reviewerId)?.name ?? "—"}
              </span>
            ) : null}
            <span className="bg-muted rounded px-1.5 py-0.5 text-[10px] font-semibold">
              {projectMediaOrders(store, project.id).length} dokumen MO
            </span>
          </div>

          {canAssign ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2">
              <span className="font-medium">Penugasan</span>
              <NativeSelect
                value={assignTo}
                onChange={setAssignTo}
                className="h-8 w-[200px] text-xs"
              >
                <option value="">Pilih Finance/Media</option>
                {candidates.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </NativeSelect>
              <Button
                size="sm"
                disabled={!assignTo}
                onClick={() => {
                  store.assignForm(form.id, assignTo);
                  setAssignTo("");
                  toast.success("Form Media Order di-assign.");
                }}
              >
                Assign
              </Button>
            </div>
          ) : null}

          {form.status !== "approved" &&
          (currentUser.role === "admin" ||
            currentUser.role === "manager" ||
            (currentUser.role === "pm" &&
              project.createdById === currentUser.id)) ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2">
              <span className="font-medium">Reviewer</span>
              <NativeSelect
                value={form.reviewerId ?? ""}
                onChange={(value) => {
                  store.setFormReviewer(form.id, value || undefined);
                  toast.success(
                    value ? "Reviewer ditetapkan." : "Reviewer dihapus.",
                  );
                }}
                className="h-8 w-[200px] text-xs"
              >
                <option value="">Belum ditentukan</option>
                {reviewerCandidates(store).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}

          <label className="block space-y-1">
            <span className="font-medium">Catatan negosiasi</span>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={() => {
                if (editable) saveNotes();
              }}
              readOnly={!editable}
              rows={2}
              placeholder="Ringkasan negosiasi, termin, atau catatan vendor."
            />
          </label>

          {editable && canSubmitForm(store, currentUser, form) ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={submit}>
                <Send className="size-3.5" /> Submit untuk review
              </Button>
            </div>
          ) : null}

          {reviewer && form.status === "submitted" ? (
            <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
              <p className="font-semibold">Review PM</p>
              <Textarea
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                rows={2}
                placeholder="Komentar review (wajib jika minta revisi)"
              />
              <Input
                value={reviewTarget}
                onChange={(event) => setReviewTarget(event.target.value)}
                placeholder="Tautkan ke dokumen/baris (opsional)"
                className="h-8 text-xs"
              />
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

          {form.reviewComment ? (
            <p className="text-muted-foreground rounded bg-muted/40 p-2 text-[11px]">
              Review terakhir: {form.reviewComment}
            </p>
          ) : null}
        </div>
      </SectionCard>

      <ProjectMediaOrders
        project={project}
        readOnly={!canManageDocuments}
        title="Dokumen Media Order"
        description="Setiap item dipetakan ke unit bisnis pemiliknya. Total dipakai untuk card proyek, umbrella, dan Business."
      />
    </div>
  );
}

export function MediaOrderFormPage({ projectId }: { projectId: string }) {
  const store = usePrototypeStore();
  const searchParams = useSearchParams();
  const fromBusiness = searchParams.get("from") === "business";
  const project = store.projects.find((item) => item.id === projectId);
  const currentUser = userById(store, store.currentUserId);

  useEffect(() => {
    if (!project || !currentUser) return;
    if (
      !store.forms.some(
        (form) => form.projectId === projectId && form.type === "mo",
      )
    ) {
      store.ensureMoForm(projectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (!project || !currentUser) {
    return (
      <EmptyState
        icon={FileText}
        title="Proyek tidak ditemukan"
        description="Proyek mungkin tidak ada atau bukan milik Anda."
      />
    );
  }
  if (
    currentUser.role === "assignee" ||
    currentUser.role === "media" ||
    currentUser.role === "bod" ||
    (!fromBusiness && !canViewProject(store, currentUser, project))
  ) {
    return (
      <EmptyState
        icon={FileText}
        title="Akses ditolak"
        description="Form Media Order hanya dapat dibuka oleh PM, Manager, Finance, atau Admin."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/crm/projects/${project.id}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="size-3.5" /> Kembali ke proyek
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-[10px]">
            {project.code} · Form Keuangan
          </p>
          <h1 className="mt-1 text-xl font-semibold">Form Media Order</h1>
          <p className="text-muted-foreground text-xs">
            {project.name} ·{" "}
            {userById(store, project.createdById)?.name ?? "PM tidak diketahui"}
          </p>
        </div>
        <UserAvatar
          user={userById(store, formFor(store, project.id, "mo")?.assigneeId)}
          size="sm"
          showName
        />
      </div>

      <MediaOrderFormPanel project={project} />

      <Button variant="outline" onClick={() => window.history.back()}>
        <ArrowLeft className="size-3.5" /> Kembali
      </Button>
    </div>
  );
}

export function MediaOrderStepPanel({
  project,
  readOnly,
}: {
  project: Project;
  readOnly: boolean;
}) {
  return <MediaOrderFormPanel project={project} readOnly={readOnly} />;
}
