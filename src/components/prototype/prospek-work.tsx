"use client";

import Link from "next/link";
import { ArrowLeft, ClipboardList, FileText, Link2, PenLine } from "lucide-react";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canEditPitchingContract,
  canEditPitchingRab,
  canEditQuotation,
  canManageProspek,
  canViewProspek,
  formatDate,
  prospekById,
  prospekPitchingById,
  prospekWorkItemsForUser,
  userById,
} from "@/lib/prototype/domain";
import { FormEntryPage } from "@/components/prototype/simpro/form-entry-page";
import { EmptyState, SectionCard } from "@/components/prototype/ui";
import {
  ContractPanel,
  QuotationPanel,
  RabPanel,
} from "@/components/prototype/crm/prospek-detail";

const SECTIONS = [
  { key: "rab", label: "RAB", icon: FileText },
  { key: "quotation", label: "Quotation", icon: Link2 },
  { key: "form", label: "Form Pitching", icon: ClipboardList },
  { key: "contract", label: "Kontrak", icon: PenLine },
] as const;

type WorkSection = (typeof SECTIONS)[number]["key"];

function isWorkSection(value?: string): value is WorkSection {
  return SECTIONS.some((section) => section.key === value);
}

export function ProspekWorkPage({
  pitchingId,
  section,
  entryId,
}: {
  pitchingId: string;
  section?: string;
  entryId?: string;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const pitching = prospekPitchingById(store, pitchingId);
  const prospek = prospekById(store, pitching?.prospekId);
  const assigned = currentUser
    ? prospekWorkItemsForUser(store, currentUser.id).filter(
        (item) => item.pitchingId === pitchingId,
      )
    : [];
  const canManage = Boolean(
    currentUser && prospek && canManageProspek(currentUser, prospek),
  );
  const canOpen = Boolean(
    currentUser &&
      prospek &&
      pitching &&
      (canManage || canViewProspek(store, currentUser, prospek) || assigned.length > 0),
  );

  if (!currentUser || !pitching || !prospek || !canOpen) {
    return (
      <EmptyState
        icon={FileText}
        title="Pekerjaan tidak ditemukan"
        description="Pekerjaan ini tidak di-assign kepada Anda atau sudah selesai."
        action={
          <Link href="/my-tasks" className="text-primary text-xs font-medium hover:underline">
            Kembali ke My Tasks
          </Link>
        }
      />
    );
  }

  if (section === "form" && entryId) {
    return (
      <FormEntryPage
        entryId={entryId}
        hideProspekContext
        onBack={() => {
          window.location.href = `/work/prospek/${pitchingId}/form`;
        }}
      />
    );
  }

  const activeSection: WorkSection = isWorkSection(section)
    ? section
    : assigned[0]?.kind === "form"
      ? "form"
      : assigned[0]?.kind === "quotation"
        ? "quotation"
        : assigned[0]?.kind === "contract"
          ? "contract"
          : "rab";
  const locked =
    pitching.status === "lost" ||
    Boolean(pitching.projectId) ||
    prospek.status !== "active";
  const forms = store.formEntries.filter(
    (entry) =>
      entry.pitchingId === pitching.id &&
      (canManage || entry.assigneeId === currentUser.id),
  );

  return (
    <div className="space-y-4">
      <Link
        href="/my-tasks"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="size-3.5" /> Kembali ke My Tasks
      </Link>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          Pekerjaan Prospek
        </p>
        <h1 className="mt-1 text-xl font-semibold">{pitching.title}</h1>
        <p className="text-muted-foreground mt-1 text-xs">
          {prospek.client} · {pitching.status === "lost" ? "Diarsipkan" : "Aktif"}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
        {SECTIONS.filter(
          (item) => canManage || assigned.some((work) => work.kind === item.key),
        ).map((item) => (
          <Link
            key={item.key}
            href={`/work/prospek/${pitching.id}/${item.key}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
              activeSection === item.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <item.icon className="size-3.5" /> {item.label}
          </Link>
        ))}
      </div>

      {activeSection === "rab" ? (
        <RabPanel
          pitching={pitching}
          editable={canEditPitchingRab(store, currentUser, pitching) && !locked}
        />
      ) : null}
      {activeSection === "quotation" ? (
        <QuotationPanel
          pitching={pitching}
          editable={canEditQuotation(store, currentUser, pitching) && !locked}
          canReview={false}
        />
      ) : null}
      {activeSection === "contract" ? (
        <ContractPanel
          pitching={pitching}
          editable={canEditPitchingContract(store, currentUser, pitching)}
        />
      ) : null}
      {activeSection === "form" ? (
        <SectionCard title="Form Pitching" description="Form yang di-assign kepada Anda.">
          {forms.length === 0 ? (
            <p className="text-muted-foreground text-xs">Belum ada Form yang di-assign.</p>
          ) : (
            <div className="space-y-2">
              {forms.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/work/prospek/${pitching.id}/form?entry=${entry.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 text-xs hover:bg-muted/40"
                >
                  <span className="font-medium">{entry.title}</span>
                  <span className="text-muted-foreground text-[10px]">
                    {entry.status} · {formatDate(entry.dueDate)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      ) : null}
    </div>
  );
}
