import type { ProjectTemplate, StageTask, TemplateStage, TemplateTask } from "./types";

export const UMUM_TEMPLATE_ID = "tpl-umum";
export const KOL_TEMPLATE_ID = "tpl-kol";
export const EVENT_TEMPLATE_ID = "tpl-event";

function task(
  id: string,
  name: string,
  role: string,
  deliverable?: string,
): TemplateTask {
  return { id, name, role, required: true, deliverable };
}

function stage(
  id: string,
  name: string,
  phase: TemplateStage["phase"],
  kind: TemplateStage["kind"],
  extra: Partial<TemplateStage> = {},
): TemplateStage {
  return {
    id,
    name,
    phase,
    order: 0,
    kind,
    required: true,
    weight: 1,
    tasks: [],
    ...extra,
  };
}

/**
 * Template Umum keeps the legacy six steps. Weights and the parallel finance
 * group reproduce the old journey formula exactly (4 full steps + 0.5/0.5).
 */
function umumStages(): TemplateStage[] {
  return [
    stage("tpl-umum-pitching", "Pitching", "prospek", "checklist", {
      legacyKey: "pitching",
    }),
    stage("tpl-umum-survey", "Survey", "prospek", "finance_form", {
      legacyKey: "survey",
      financeKind: "survey",
    }),
    stage("tpl-umum-rab", "RAB", "prospek", "finance_form", {
      legacyKey: "rab",
      financeKind: "rab",
    }),
    stage("tpl-umum-running", "Running", "running", "checklist", {
      legacyKey: "running",
    }),
    stage("tpl-umum-bast", "BAST", "closing", "finance_form", {
      legacyKey: "bast",
      financeKind: "bast",
      weight: 0.5,
      parallelGroup: "finance",
    }),
    stage("tpl-umum-invoice", "Invoice", "closing", "finance_form", {
      legacyKey: "invoice",
      financeKind: "invoice",
      weight: 0.5,
      parallelGroup: "finance",
    }),
  ];
}

function kolStages(): TemplateStage[] {
  return [
    stage("tpl-kol-brief", "Brief Received", "prospek", "checklist", {
      description: "Terima brief dan tujuan kampanye dari klien.",
      tasks: [task("kol-t1", "Catat brief dan KPI", "PM", "Brief dokumen")],
    }),
    stage("tpl-kol-listing", "KOL Listing", "prospek", "checklist", {
      tasks: [task("kol-t2", "Susun daftar KOL kandidat", "Assignee", "Sheet listing KOL")],
    }),
    stage("tpl-kol-rate", "Rate Inquiry", "prospek", "checklist", {
      description: "RAB draf dibentuk di tahap ini.",
      tasks: [task("kol-t3", "Minta rate card KOL", "Assignee", "Rate card")],
    }),
    stage("tpl-kol-approval", "KOL Approval", "prospek", "gate", {
      gateKind: "client_approval",
      description: "Persetujuan klien atas KOL dan penawaran.",
    }),
    stage("tpl-kol-briefing", "KOL Briefing", "planning", "checklist", {
      tasks: [task("kol-t4", "Briefing KOL terpilih", "PM", "Materi briefing")],
    }),
    stage("tpl-kol-storyline", "Storyline Review", "planning", "checklist", {
      tasks: [task("kol-t5", "Review storyline konten", "PM", "Storyline disetujui")],
    }),
    stage("tpl-kol-posting", "Content Posting", "running", "checklist", {
      tasks: [task("kol-t6", "Publikasi konten KOL", "Assignee", "Link posting")],
    }),
    stage("tpl-kol-insight", "Insight Collection", "running", "checklist", {
      tasks: [task("kol-t7", "Kumpulkan insight dan metrik", "Assignee", "Rekap insight")],
    }),
    stage("tpl-kol-report", "Final Report", "closing", "checklist", {
      tasks: [task("kol-t8", "Susun laporan akhir", "PM", "Final report")],
    }),
    stage("tpl-kol-bast", "BAST", "closing", "finance_form", {
      financeKind: "bast",
      weight: 0.5,
      parallelGroup: "finance",
    }),
    stage("tpl-kol-invoice", "Invoice", "closing", "finance_form", {
      financeKind: "invoice",
      weight: 0.5,
      parallelGroup: "finance",
    }),
    stage("tpl-kol-payment", "Pembayaran", "closing", "checklist", {
      tasks: [task("kol-t9", "Pantau pembayaran invoice", "Finance", "Bukti pembayaran")],
    }),
    stage("tpl-kol-evaluation", "Evaluasi", "closing", "checklist", {
      required: false,
      tasks: [task("kol-t10", "Evaluasi hasil kampanye", "PM", "Catatan evaluasi")],
    }),
  ];
}

function eventStages(): TemplateStage[] {
  return [
    stage("tpl-event-brief", "Brief Received", "prospek", "checklist", {
      tasks: [task("evt-t1", "Catat brief dan tujuan event", "PM", "Brief dokumen")],
    }),
    stage("tpl-event-strategy", "Create Strategy & Concept", "prospek", "checklist", {
      tasks: [task("evt-t2", "Susun konsep acara", "PM", "Deck konsep")],
    }),
    stage("tpl-event-kv", "Create KV & Key Visual Assets", "prospek", "checklist", {
      costBeforeCommitment: true,
      description: "Produksi aset sebelum komitmen kontrak.",
      tasks: [task("evt-t3", "Produksi key visual", "Assignee", "Aset KV")],
    }),
    stage("tpl-event-vendor", "Contact Vendor", "prospek", "checklist", {
      tasks: [task("evt-t4", "Hubungi vendor kandidat", "Assignee", "Daftar vendor")],
    }),
    stage("tpl-event-survey", "Site Survey", "prospek", "checklist", {
      tasks: [task("evt-t5", "Survei lokasi acara", "Assignee", "Laporan survei")],
    }),
    stage("tpl-event-budget", "Budget & Quotation Review", "prospek", "finance_form", {
      financeKind: "rab",
      tasks: [task("evt-t6", "Susun RAB dan quotation", "Finance", "RAB")],
    }),
    stage("tpl-event-selection", "Vendor Selection", "prospek", "checklist", {
      tasks: [task("evt-t7", "Pilih vendor dan venue", "PM", "Keputusan vendor")],
    }),
    stage("tpl-event-approval", "Client Approval", "prospek", "gate", {
      gateKind: "client_approval",
      description: "Persetujuan klien atas anggaran dan vendor.",
    }),
    stage("tpl-event-confirm", "Confirm Vendor & Venue", "planning", "checklist", {
      tasks: [task("evt-t8", "Konfirmasi booking vendor dan venue", "PM", "PO booking")],
    }),
    stage("tpl-event-production", "Production Preparation", "planning", "checklist", {
      tasks: [task("evt-t9", "Siapkan produksi acara", "Assignee", "Checklist produksi")],
    }),
    stage("tpl-event-setup", "Event Setup", "planning", "checklist", {
      tasks: [task("evt-t10", "Lakukan setup lokasi", "Assignee", "Foto setup")],
    }),
    stage("tpl-event-execution", "Event Execution", "running", "checklist", {
      tasks: [task("evt-t11", "Jalankan acara", "PM", "Laporan harian")],
    }),
    stage("tpl-event-documentation", "Documentation", "running", "checklist", {
      tasks: [task("evt-t12", "Dokumentasikan acara", "Assignee", "Foto dan video")],
    }),
    stage("tpl-event-report", "Post-Event Report", "closing", "checklist", {
      tasks: [task("evt-t13", "Susun laporan pasca-acara", "PM", "Post-event report")],
    }),
    stage("tpl-event-bast", "BAST", "closing", "finance_form", {
      financeKind: "bast",
      weight: 0.5,
      parallelGroup: "finance",
    }),
    stage("tpl-event-invoice", "Invoice", "closing", "finance_form", {
      financeKind: "invoice",
      weight: 0.5,
      parallelGroup: "finance",
    }),
    stage("tpl-event-payment", "Pembayaran", "closing", "checklist", {
      tasks: [task("evt-t14", "Pantau pembayaran invoice", "Finance", "Bukti pembayaran")],
    }),
    stage("tpl-event-evaluation", "Evaluasi", "closing", "checklist", {
      required: false,
      tasks: [task("evt-t15", "Evaluasi hasil acara", "PM", "Catatan evaluasi")],
    }),
  ];
}

function withOrder(stages: TemplateStage[]): TemplateStage[] {
  return stages.map((item, index) => ({ ...item, order: index + 1 }));
}

export function createSeedTemplates(): ProjectTemplate[] {
  const createdAt = new Date("2026-11-01T09:00:00.000Z").toISOString();
  return [
    {
      id: UMUM_TEMPLATE_ID,
      name: "Umum",
      description: "Enam step lama: Pitching, Survey, RAB, Running, BAST, Invoice.",
      projectType: "Umum",
      version: 1,
      legacy: true,
      status: "active",
      stages: withOrder(umumStages()),
      changelog: [{ version: 1, note: "Template legacy dari enam step lama.", createdAt }],
      createdById: "u-admin",
      createdAt,
    },
    {
      id: KOL_TEMPLATE_ID,
      name: "KOL Campaign",
      description: "Sembilan tahap kampanye KOL plus BAST, invoice, pembayaran, evaluasi.",
      projectType: "KOL Campaign",
      version: 1,
      status: "active",
      stages: withOrder(kolStages()),
      changelog: [{ version: 1, note: "Template awal KOL Campaign.", createdAt }],
      createdById: "u-admin",
      createdAt,
    },
    {
      id: EVENT_TEMPLATE_ID,
      name: "Event Program",
      description: "Empat belas tahap program event plus BAST, invoice, pembayaran, evaluasi.",
      projectType: "Event Program",
      version: 1,
      status: "active",
      stages: withOrder(eventStages()),
      changelog: [{ version: 1, note: "Template awal Event Program.", createdAt }],
      createdById: "u-admin",
      createdAt,
    },
  ];
}

export function templateById(
  templates: ProjectTemplate[],
  id?: string,
): ProjectTemplate | undefined {
  return templates.find((template) => template.id === id);
}

export function stageTasksForProject(tasks: TemplateTask[]): StageTask[] {
  return tasks.map((item) => ({ ...item, done: false }));
}
