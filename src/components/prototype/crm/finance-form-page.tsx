"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canEditForm,
  canOpenFinanceForm,
  formatDate,
  formFor,
  userById,
} from "@/lib/prototype/domain";
import type { FormStepKey } from "@/lib/prototype/types";
import { EmptyState, FormStatusBadge, UserAvatar } from "../ui";
import { hasUnsavedFormChanges, StepFormPanel } from "./step-form-panel";

type FinanceFormKey = Extract<FormStepKey, "rab" | "bast" | "invoice" | "payment">;

const FINANCE_FORM_TYPES: Record<
  string,
  { key: FinanceFormKey; title: string; description: string }
> = {
  rab: {
    key: "rab",
    title: "Form RAB",
    description: "Daftar item, kuantitas, satuan, dan harga.",
  },
  bast: {
    key: "bast",
    title: "Form BAST",
    description: "PIC, tanggal, catatan, dan dokumen serah terima.",
  },
  invoice: {
    key: "invoice",
    title: "Form Invoice",
    description: "Nomor, tanggal, jatuh tempo, nilai, PPN, dan dokumen.",
  },
  payment: {
    key: "payment",
    title: "Form Pembayaran",
    description: "Tanggal bayar, nominal, metode, bukti, dan status.",
  },
};

export function FinanceFormPage({
  projectId,
  formType,
  origin = "crm",
}: {
  projectId: string;
  formType: string;
  origin?: "crm" | "simpro";
}) {
  const store = usePrototypeStore();
  const router = useRouter();
  const project = store.projects.find((item) => item.id === projectId);
  const currentUser = userById(store, store.currentUserId);
  const config = FINANCE_FORM_TYPES[formType];

  if (!project || !currentUser || !config) {
    return (
      <EmptyState
        icon={FileText}
        title="Form tidak ditemukan"
        description="Jenis form atau proyek tidak tersedia."
        action={
          <Link href="/crm/projects">
            <Button variant="outline" size="sm">
              Kembali ke projects
            </Button>
          </Link>
        }
      />
    );
  }

  const form = formFor(store, project.id, config.key);
  if (!form) {
    return (
      <EmptyState
        icon={FileText}
        title="Form belum dibuat"
        description="Form keuangan untuk proyek ini belum tersedia."
      />
    );
  }

  if (!canOpenFinanceForm(store, currentUser, form)) {
    return (
      <EmptyState
        icon={FileText}
        title="Akses ditolak"
        description="Form keuangan hanya dapat dibuka oleh Finance yang di-assign, Media untuk BAST, PM pemilik proyek, Manager, atau Admin."
      />
    );
  }

  const editable =
    canEditForm(store, currentUser, form) &&
    form.status !== "submitted" &&
    form.status !== "approved";
  const backHref =
    origin === "simpro"
      ? "/forms"
      : `/crm/projects/${project.id}?step=${config.key}`;
  const backLabel =
    origin === "simpro" ? "Kembali ke Forms" : "Kembali ke proyek";

  const goBack = () => {
    if (
      hasUnsavedFormChanges() &&
      !window.confirm(
        "Ada perubahan form yang belum tersimpan. Keluar dari halaman akan membuang perubahan tersebut. Lanjutkan?",
      )
    ) {
      return;
    }
    router.push(backHref);
  };

  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        onClick={(event) => {
          if (
            hasUnsavedFormChanges() &&
            !window.confirm(
              "Ada perubahan form yang belum tersimpan. Keluar dari halaman akan membuang perubahan tersebut. Lanjutkan?",
            )
          ) {
            event.preventDefault();
          }
        }}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="size-3.5" /> {backLabel}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <FormStatusBadge status={form.status} />
            <span className="text-muted-foreground text-[10px]">
              {project.code} · {config.title}
            </span>
          </div>
          <h1 className="mt-1 text-xl font-semibold">{config.title}</h1>
          <p className="text-muted-foreground text-xs">
            {project.name} · Assignee{" "}
            {userById(store, form.assigneeId)?.name ?? "Belum di-assign"}
            {form.updatedAt ? ` · Diubah ${formatDate(form.updatedAt)}` : ""}
          </p>
        </div>
        <UserAvatar user={userById(store, form.assigneeId)} size="sm" showName />
      </div>

      <div className="rounded-xl border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        {config.description}{" "}
        {editable
          ? "Anda dapat mengisi form ini."
          : "Mode baca-saja. Pengisian dilakukan oleh assignee yang ditugaskan atau Admin."}
      </div>

      <StepFormPanel
        project={project}
        formKey={config.key}
        readOnly={!editable}
        forceFillView
        hideModeTabs
        onSubmitted={() => router.push(backHref)}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="size-3.5" /> Kembali
        </Button>
      </div>
    </div>
  );
}
