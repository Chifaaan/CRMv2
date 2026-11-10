import type {
  FormField,
  FormTemplate,
  ProjectTemplate,
  StageTask,
  TemplateStage,
  TemplateTask,
} from "./types";

export const UMUM_TEMPLATE_ID = "tpl-umum";
export const KOL_TEMPLATE_ID = "tpl-kol";
export const EVENT_TEMPLATE_ID = "tpl-event";
export const UMUM_EXECUTION_TEMPLATE_ID = "tpl-umum-eksekusi";
export const KOL_EXECUTION_TEMPLATE_ID = "tpl-kol-eksekusi";
export const EVENT_EXECUTION_TEMPLATE_ID = "tpl-event-eksekusi";

function task(
  id: string,
  name: string,
  role: string,
  deliverable?: string,
): TemplateTask {
  return { id, name, role, required: true, deliverable };
}

function defaultFormTemplate(
  title: string,
  checklist: string[] = [],
): FormTemplate {
  const fields: FormField[] = [];
  if (checklist.length > 0) {
    fields.push({
      id: `field-checklist-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: "Daftar centang",
      type: "checklist",
      required: true,
      options: checklist,
    });
  }
  return {
    title,
    defaultFields: {
      executionDate: { enabled: true, required: true },
      location: { enabled: true, required: true },
      notes: { enabled: true, required: false },
      photos: { enabled: true, required: false },
    },
    fields,
  };
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

function formStage(
  id: string,
  name: string,
  phase: TemplateStage["phase"],
  extra: Partial<TemplateStage> = {},
  checklist: string[] = [],
): TemplateStage {
  return stage(id, name, phase, "form", {
    formTemplate: defaultFormTemplate(name, checklist),
    ...extra,
  });
}

function simproStage(
  id: string,
  name: string,
  phase: TemplateStage["phase"],
  extra: Partial<TemplateStage> = {},
): TemplateStage {
  return stage(id, name, phase, "simpro", extra);
}

/**
 * Template Umum keeps the legacy six steps. Weights and the parallel finance
 * group reproduce the old journey formula exactly (4 full steps + 0.5/0.5).
 */
function umumStages(): TemplateStage[] {
  return [
    simproStage("tpl-umum-pitching", "Pitching", "prospek", {
      legacyKey: "pitching",
    }),
    stage("tpl-umum-survey", "Survey", "prospek", "form", {
      legacyKey: "survey",
    }),
    stage("tpl-umum-rab", "RAB", "prospek", "finance_form", {
      legacyKey: "rab",
      financeKind: "rab",
    }),
    simproStage("tpl-umum-running", "Running", "running", {
      legacyKey: "running",
    }),
    stage("tpl-umum-bast", "BAST", "finance", "finance_form", {
      legacyKey: "bast",
      financeKind: "bast",
      weight: 0.5,
      parallelGroup: "finance",
    }),
    stage("tpl-umum-invoice", "Invoice", "finance", "finance_form", {
      legacyKey: "invoice",
      financeKind: "invoice",
      weight: 0.5,
      parallelGroup: "finance",
    }),
  ];
}

function kolStages(): TemplateStage[] {
  return [
    formStage(
      "tpl-kol-brief",
      "Brief Received",
      "prospek",
      { description: "Terima brief dan tujuan kampanye dari klien." },
      ["Catat brief dan KPI"],
    ),
    formStage(
      "tpl-kol-listing",
      "KOL Listing",
      "prospek",
      {},
      ["Susun daftar KOL kandidat"],
    ),
    formStage(
      "tpl-kol-rate",
      "Rate Inquiry",
      "prospek",
      { description: "RAB draf dibentuk di tahap ini." },
      ["Minta rate card KOL"],
    ),
    stage("tpl-kol-approval", "KOL Approval", "prospek", "gate", {
      gateKind: "client_approval",
      description: "Persetujuan klien atas KOL dan penawaran.",
    }),
    simproStage("tpl-kol-briefing", "KOL Briefing", "planning", {
      tasks: [task("kol-t4", "Briefing KOL terpilih", "PM", "Materi briefing")],
    }),
    simproStage("tpl-kol-storyline", "Storyline Review", "planning", {
      tasks: [task("kol-t5", "Review storyline konten", "PM", "Storyline disetujui")],
    }),
    simproStage("tpl-kol-posting", "Content Posting", "running", {
      tasks: [task("kol-t6", "Publikasi konten KOL", "Assignee", "Link posting")],
    }),
    simproStage("tpl-kol-insight", "Insight Collection", "running", {
      tasks: [task("kol-t7", "Kumpulkan insight dan metrik", "Assignee", "Rekap insight")],
    }),
    formStage(
      "tpl-kol-report",
      "Final Report",
      "finance",
      {},
      ["Susun laporan akhir"],
    ),
    stage("tpl-kol-bast", "BAST", "finance", "finance_form", {
      financeKind: "bast",
      weight: 0.5,
      parallelGroup: "finance",
    }),
    stage("tpl-kol-invoice", "Invoice", "finance", "finance_form", {
      financeKind: "invoice",
      weight: 0.5,
      parallelGroup: "finance",
    }),
    stage("tpl-kol-payment", "Pembayaran", "finance", "finance_form", {
      financeKind: "payment",
      description: "Pembayaran invoice dan bukti transfer.",
    }),
  ];
}

function eventStages(): TemplateStage[] {
  return [
    formStage(
      "tpl-event-brief",
      "Brief Received",
      "prospek",
      {},
      ["Catat brief dan tujuan event"],
    ),
    formStage(
      "tpl-event-strategy",
      "Create Strategy & Concept",
      "prospek",
      {},
      ["Susun konsep acara"],
    ),
    simproStage("tpl-event-kv", "Create KV & Key Visual Assets", "prospek", {
      costBeforeCommitment: true,
      description: "Produksi aset sebelum komitmen kontrak.",
      tasks: [task("evt-t3", "Produksi key visual", "Assignee", "Aset KV")],
    }),
    formStage(
      "tpl-event-vendor",
      "Contact Vendor",
      "prospek",
      {},
      ["Hubungi vendor kandidat"],
    ),
    formStage(
      "tpl-event-survey",
      "Site Survey",
      "prospek",
      {},
      ["Survei lokasi acara"],
    ),
    stage("tpl-event-budget", "Budget & Quotation Review", "prospek", "finance_form", {
      financeKind: "rab",
    }),
    formStage(
      "tpl-event-selection",
      "Vendor Selection",
      "prospek",
      {},
      ["Pilih vendor dan venue"],
    ),
    stage("tpl-event-approval", "Client Approval", "prospek", "gate", {
      gateKind: "client_approval",
      description: "Persetujuan klien atas anggaran dan vendor.",
    }),
    simproStage("tpl-event-confirm", "Confirm Vendor & Venue", "planning", {
      tasks: [task("evt-t8", "Konfirmasi booking vendor dan venue", "PM", "PO booking")],
    }),
    simproStage("tpl-event-production", "Production Preparation", "planning", {
      tasks: [task("evt-t9", "Siapkan produksi acara", "Assignee", "Checklist produksi")],
    }),
    simproStage("tpl-event-setup", "Event Setup", "planning", {
      tasks: [task("evt-t10", "Lakukan setup lokasi", "Assignee", "Foto setup")],
    }),
    simproStage("tpl-event-execution", "Event Execution", "running", {
      tasks: [task("evt-t11", "Jalankan acara", "PM", "Laporan harian")],
    }),
    formStage(
      "tpl-event-documentation",
      "Documentation",
      "running",
      {},
      ["Dokumentasikan acara"],
    ),
    formStage(
      "tpl-event-report",
      "Post-Event Report",
      "finance",
      {},
      ["Susun laporan pasca-acara"],
    ),
    stage("tpl-event-bast", "BAST", "finance", "finance_form", {
      financeKind: "bast",
      weight: 0.5,
      parallelGroup: "finance",
    }),
    stage("tpl-event-invoice", "Invoice", "finance", "finance_form", {
      financeKind: "invoice",
      weight: 0.5,
      parallelGroup: "finance",
    }),
    stage("tpl-event-payment", "Pembayaran", "finance", "finance_form", {
      financeKind: "payment",
      description: "Pembayaran invoice dan bukti transfer.",
    }),
  ];
}

function withOrder(stages: TemplateStage[]): TemplateStage[] {
  return stages.map((item, index) => ({ ...item, order: index + 1 }));
}

function executionStages(
  prefix: string,
  planningName: string,
  runningName: string,
): TemplateStage[] {
  return withOrder([
    simproStage(`${prefix}-planning`, planningName, "planning", {
      tasks: [task(`${prefix}-t1`, planningName, "Manager", "Rencana kerja")],
    }),
    simproStage(`${prefix}-running`, runningName, "running", {
      tasks: [task(`${prefix}-t2`, runningName, "Assignee", "Hasil pekerjaan")],
    }),
    stage(`${prefix}-bast`, "BAST", "finance", "finance_form", {
      financeKind: "bast",
      weight: 0.5,
      parallelGroup: "finance",
    }),
    stage(`${prefix}-invoice`, "Invoice", "finance", "finance_form", {
      financeKind: "invoice",
      weight: 0.5,
      parallelGroup: "finance",
    }),
    stage(`${prefix}-payment`, "Pembayaran", "finance", "finance_form", {
      financeKind: "payment",
    }),
  ]);
}

export function isNewProjectTemplate(template: ProjectTemplate): boolean {
  const phases = new Set<string>(template.stages.map((stage) => stage.phase));
  if (phases.has("prospek")) return false;
  if (!["planning", "running", "finance"].every((phase) => phases.has(phase))) {
    return false;
  }
  const planning = template.stages.filter((stage) => stage.phase === "planning");
  const running = template.stages.filter((stage) => stage.phase === "running");
  const finance = template.stages.filter((stage) => stage.phase === "finance");
  if (planning.length === 0 || running.length === 0 || finance.length === 0) {
    return false;
  }
  if (![...planning, ...running].every((stage) => stage.kind === "simpro")) {
    return false;
  }
  return finance.every(
    (stage) =>
      stage.kind === "finance_form" &&
      ["bast", "invoice", "payment"].includes(stage.financeKind ?? ""),
  );
}

export function newProjectTemplates(
  templates: ProjectTemplate[],
): ProjectTemplate[] {
  return templates.filter(
    (template) => template.status === "active" && isNewProjectTemplate(template),
  );
}

export function createSeedTemplates(): ProjectTemplate[] {
  const createdAt = new Date("2026-11-01T09:00:00.000Z").toISOString();
  return [
    {
      id: UMUM_TEMPLATE_ID,
      name: "Umum",
      description: "Enam step lama: Pitching, Survey, RAB, Running, BAST, Invoice.",
      projectType: "Umum",
      version: 2,
      legacy: true,
      status: "active",
      stages: withOrder(umumStages()),
      changelog: [
        { version: 1, note: "Template legacy dari enam step lama.", createdAt },
        {
          version: 2,
          note: "Checklist menjadi Form; Survey dibungkus sebagai Form legacy.",
          createdAt,
        },
      ],
      createdById: "u-admin",
      createdAt,
    },
    {
      id: KOL_TEMPLATE_ID,
      name: "KOL Campaign",
      description: "Tahap KOL dengan Form, SIMPRO, gerbang menang, dan form keuangan.",
      projectType: "KOL Campaign",
      version: 2,
      status: "active",
      stages: withOrder(kolStages()),
      changelog: [
        { version: 1, note: "Template awal KOL Campaign.", createdAt },
        {
          version: 2,
          note: "Checklist dipecah menjadi Form dan SIMPRO.",
          createdAt,
        },
      ],
      createdById: "u-admin",
      createdAt,
    },
    {
      id: EVENT_TEMPLATE_ID,
      name: "Event Program",
      description: "Tahap event dengan Form, SIMPRO, gerbang menang, dan form keuangan.",
      projectType: "Event Program",
      version: 2,
      status: "active",
      stages: withOrder(eventStages()),
      changelog: [
        { version: 1, note: "Template awal Event Program.", createdAt },
        {
          version: 2,
          note: "Checklist dipecah menjadi Form dan SIMPRO.",
          createdAt,
        },
      ],
      createdById: "u-admin",
      createdAt,
    },
    {
      id: UMUM_EXECUTION_TEMPLATE_ID,
      name: "Umum Eksekusi",
      description: "Tiga fase: Planning, Running, dan Finance.",
      projectType: "Umum Eksekusi",
      version: 1,
      status: "active",
      stages: executionStages(
        "tpl-umum-eksekusi",
        "Project Kickoff",
        "Project Execution",
      ),
      changelog: [
        { version: 1, note: "Template eksekusi pasca-Prospek.", createdAt },
      ],
      createdById: "u-admin",
      createdAt,
    },
    {
      id: KOL_EXECUTION_TEMPLATE_ID,
      name: "KOL Eksekusi",
      description: "Eksekusi KOL pasca-Prospek: Planning, Running, Finance.",
      projectType: "KOL Eksekusi",
      version: 1,
      status: "active",
      stages: executionStages(
        "tpl-kol-eksekusi",
        "KOL Briefing",
        "Content Posting",
      ),
      changelog: [
        { version: 1, note: "Template eksekusi KOL pasca-Prospek.", createdAt },
      ],
      createdById: "u-admin",
      createdAt,
    },
    {
      id: EVENT_EXECUTION_TEMPLATE_ID,
      name: "Event Eksekusi",
      description: "Eksekusi event pasca-Prospek: Planning, Running, Finance.",
      projectType: "Event Eksekusi",
      version: 1,
      status: "active",
      stages: executionStages(
        "tpl-event-eksekusi",
        "Confirm Vendor",
        "Event Execution",
      ),
      changelog: [
        { version: 1, note: "Template eksekusi event pasca-Prospek.", createdAt },
      ],
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
