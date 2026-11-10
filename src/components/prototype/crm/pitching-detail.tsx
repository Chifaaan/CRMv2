"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ClipboardList, FileText, Link2, PenLine, Target } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canAssignProspekWork,
  canDecidePitching,
  canEditPitchingContract,
  canEditPitchingRab,
  canEditQuotation,
  canViewProspek,
  prospekById,
  prospekPitchingById,
  userById,
} from "@/lib/prototype/domain";
import { EmptyState, SectionCard } from "../ui";
import {
  ContractPanel,
  DecisionPanel,
  FormPanel,
  HistoryPanel,
  QuotationPanel,
  RabPanel,
} from "./prospek-detail";

const SECTIONS = [
  { key: "rab", label: "RAB", icon: FileText },
  { key: "quotation", label: "Quotation", icon: Link2 },
  { key: "form", label: "Form Pitching", icon: ClipboardList },
  { key: "contract", label: "Kontrak", icon: PenLine },
  { key: "finishing", label: "Finishing", icon: Target },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

function PitchingStatusBadge({ status }: { status: string }) {
  const tone =
    status === "won"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : status === "lost"
        ? "bg-rose-100 text-rose-700 ring-rose-200"
        : "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${tone}`}>
      {status === "won" ? "Menang" : status === "lost" ? "Kalah" : "Draft"}
    </span>
  );
}

export function CrmPitchingDetail({
  prospekId,
  pitchingId,
}: {
  prospekId: string;
  pitchingId: string;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const prospek = prospekById(store, prospekId);
  const pitching = prospekPitchingById(store, pitchingId);
  const [section, setSection] = useState<SectionKey>("rab");

  if (
    !prospek ||
    !pitching ||
    pitching.prospekId !== prospek.id ||
    !currentUser ||
    !canViewProspek(store, currentUser, prospek)
  ) {
    return (
      <EmptyState
        icon={Target}
        title="Pitching tidak ditemukan"
        description="Pitching tidak tersedia atau Anda tidak memiliki akses."
        action={
          <Link
            href="/crm/prospek"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            Kembali ke Prospek
          </Link>
        }
      />
    );
  }

  const locked =
    pitching.status === "lost" ||
    Boolean(pitching.projectId) ||
    prospek.status !== "active";
  const rabEditable = canEditPitchingRab(store, currentUser, pitching) && !locked;
  const quotationEditable = canEditQuotation(store, currentUser, pitching) && !locked;
  const canReview = canDecidePitching(currentUser, prospek) && !locked;
  const contractEditable = canEditPitchingContract(store, currentUser, pitching);
  const canAssign = canAssignProspekWork(currentUser, prospek);
  const template = store.templates.find((item) => item.id === pitching.templateId);

  return (
    <div className="space-y-4">
      <Link
        href={`/crm/prospek/${prospek.id}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="size-3.5" /> Kembali ke Prospek
      </Link>

      <div className="rounded-xl border bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PitchingStatusBadge status={pitching.status} />
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold">
                {template?.name ?? pitching.templateId} v{pitching.templateVersion}
              </span>
            </div>
            <h1 className="mt-2 truncate text-xl font-semibold">{pitching.title}</h1>
            <p className="mt-1 text-xs text-white/70">
              {prospek.client} · {pitching.description || "Tanpa deskripsi"}
            </p>
          </div>
          {pitching.projectId ? (
            <Link
              href={`/crm/projects/${pitching.projectId}`}
              className="rounded-md bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white ring-1 ring-white/25"
            >
              Buka anak proyek →
            </Link>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
        {SECTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSection(item.key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              section === item.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="size-3.5" /> {item.label}
          </button>
        ))}
      </div>

      {section === "rab" ? (
        <RabPanel pitching={pitching} editable={rabEditable} />
      ) : null}
      {section === "quotation" ? (
        <QuotationPanel
          pitching={pitching}
          editable={quotationEditable}
          canReview={canReview}
        />
      ) : null}
      {section === "form" ? <FormPanel pitching={pitching} locked={locked} /> : null}
      {section === "contract" ? (
        <ContractPanel
          pitching={pitching}
          editable={contractEditable}
          canAssign={canAssign}
        />
      ) : null}
      {section === "finishing" ? (
        <div className="space-y-3">
          <DecisionPanel prospek={prospek} pitching={pitching} locked={locked} />
          <HistoryPanel prospekId={prospek.id} pitchingId={pitching.id} />
          {pitching.status === "lost" ? (
            <SectionCard title="Arsip" description="Pitching kalah tersimpan sebagai dokumentasi.">
              <p className="text-muted-foreground text-xs">
                Alasan kalah: {pitching.lostReason}
              </p>
            </SectionCard>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
