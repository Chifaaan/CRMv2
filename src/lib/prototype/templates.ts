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

export function formTemplateForTitle(title: string): FormTemplate {
  return defaultFormTemplate(title);
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

function defaultClosingStages(): TemplateStage[] {
  return [
    stage("sys-closing-bast", "BAST", "closing", "finance_form", {
      financeKind: "bast",
      weight: 0.5,
      parallelGroup: "finance",
    }),
    stage("sys-closing-invoice", "Invoice", "closing", "finance_form", {
      financeKind: "invoice",
      weight: 0.5,
      parallelGroup: "finance",
    }),
    stage("sys-closing-payment", "Pembayaran", "closing", "finance_form", {
      financeKind: "payment",
    }),
  ];
}

function closingFinanceKind(stage: TemplateStage) {
  if (stage.financeKind) return stage.financeKind;
  if (stage.legacyKey === "bast" || stage.legacyKey === "invoice") {
    return stage.legacyKey;
  }
  return undefined;
}

/**
 * Closing is rule-driven: a template may add its own Closing stages, but the
 * system always guarantees exactly one BAST and one Invoice. Projects without
 * a template fall back to BAST, Invoice, and Pembayaran defaults.
 */
export function closingStagesFor(template?: ProjectTemplate): TemplateStage[] {
  const templateStages =
    template?.stages.filter((stage) => stage.phase === "closing") ?? [];
  const source =
    templateStages.length > 0
      ? templateStages.map((stage) => {
          const financeKind = closingFinanceKind(stage);
          return {
            ...stage,
            ...(financeKind ? { financeKind } : {}),
            tasks: stage.tasks.map((task) => ({ ...task })),
          };
        })
      : defaultClosingStages();

  let seenBast = false;
  let seenInvoice = false;
  const stages = source.filter((stage) => {
    if (stage.financeKind === "bast") {
      if (seenBast) return false;
      seenBast = true;
    }
    if (stage.financeKind === "invoice") {
      if (seenInvoice) return false;
      seenInvoice = true;
    }
    return true;
  });

  if (!seenBast) {
    stages.push(
      stage("sys-closing-bast", "BAST", "closing", "finance_form", {
        financeKind: "bast",
        weight: 0.5,
        parallelGroup: "finance",
      }),
    );
  }
  if (!seenInvoice) {
    stages.push(
      stage("sys-closing-invoice", "Invoice", "closing", "finance_form", {
        financeKind: "invoice",
        weight: 0.5,
        parallelGroup: "finance",
      }),
    );
  }

  return stages.map((stage, index) => ({
    ...stage,
    phase: "closing",
    order: index + 1,
    ...(stage.financeKind === "bast" || stage.financeKind === "invoice"
      ? { weight: 0.5, parallelGroup: "finance" }
      : {}),
  }));
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
      {
        entryTypes: [
          {
            id: "kol_listing",
            label: "KOL Listing",
            defaultRole: "media",
            kind: "form",
          },
        ],
      },
      ["Susun daftar KOL kandidat"],
    ),
    formStage(
      "tpl-kol-rate",
      "Rate Inquiry",
      "prospek",
      {
        description: "RAB draf dibentuk di tahap ini.",
        entryTypes: [
          {
            id: "kol_rate",
            label: "Rate Inquiry",
            defaultRole: "media",
            kind: "rab",
          },
        ],
      },
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
      "closing",
      {},
      ["Susun laporan akhir"],
    ),
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
    stage("tpl-kol-payment", "Pembayaran", "closing", "finance_form", {
      financeKind: "payment",
      description: "Pembayaran invoice dan bukti transfer.",
    }),
  ];
}

function eventStages(): TemplateStage[] {
  const briefEntries = [
    {
      id: "strategy_concept",
      label: "Create Strategy & Concept",
      defaultRole: "pm" as const,
      kind: "form" as const,
    },
    {
      id: "kv_assets",
      label: "Create KV & Key Visual Assets",
      defaultRole: "media" as const,
      kind: "form" as const,
    },
    {
      id: "vendor_contact",
      label: "Contact Vendor",
      defaultRole: "media" as const,
      kind: "form" as const,
    },
    {
      id: "site_survey",
      label: "Site Survey",
      defaultRole: "media" as const,
      kind: "form" as const,
    },
    {
      id: "budget_quotation",
      label: "Budget & Quotation Review",
      defaultRole: "finance" as const,
      kind: "rab" as const,
    },
    {
      id: "vendor_selection",
      label: "Vendor Selection",
      defaultRole: "media" as const,
      kind: "form" as const,
    },
  ];
  return [
    formStage(
      "tpl-event-brief",
      "Brief Received",
      "prospek",
      {
        description:
          "Brief klien dan seluruh pekerjaan persiapan: strategi, KV, vendor, survei, anggaran, dan pemilihan vendor.",
        entryTypes: briefEntries,
      },
      ["Catat brief dan tujuan event"],
    ),
    stage("tpl-event-approval", "Client Approval", "prospek", "gate", {
      gateKind: "client_approval",
      description: "Persetujuan klien atas anggaran dan vendor.",
    }),
    simproStage("tpl-event-confirm", "Confirm Vendor & Venue", "planning", {
      tasks: [
        task("evt-t8", "Konfirmasi booking vendor dan venue", "Media", "PO booking"),
      ],
    }),
    simproStage("tpl-event-production", "Production Preparation", "planning", {
      tasks: [task("evt-t9", "Siapkan produksi acara", "Media", "Checklist produksi")],
    }),
    simproStage("tpl-event-setup", "Event Setup", "planning", {
      tasks: [task("evt-t10", "Lakukan setup lokasi", "Media", "Foto setup")],
    }),
    simproStage("tpl-event-execution", "Event Execution", "running", {
      tasks: [task("evt-t11", "Jalankan acara", "Media", "Laporan harian")],
    }),
    formStage(
      "tpl-event-documentation",
      "Documentation",
      "running",
      {
        entryTypes: [
          {
            id: "documentation",
            label: "Dokumentasi acara",
            defaultRole: "media",
            kind: "form",
          },
        ],
      },
      ["Dokumentasikan acara"],
    ),
    formStage(
      "tpl-event-report",
      "Post-Event Report",
      "closing",
      {},
      ["Susun laporan pasca-acara"],
    ),
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
    stage("tpl-event-payment", "Pembayaran", "closing", "finance_form", {
      financeKind: "payment",
      description: "Pembayaran invoice dan bukti transfer.",
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
      version: 3,
      status: "active",
      stages: withOrder(kolStages()),
      changelog: [
        { version: 1, note: "Template awal KOL Campaign.", createdAt },
        {
          version: 2,
          note: "Checklist dipecah menjadi Form dan SIMPRO.",
          createdAt,
        },
        {
          version: 3,
          note: "Listing dan Rate Inquiry punya entri default Media.",
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
      version: 3,
      status: "active",
      stages: withOrder(eventStages()),
      changelog: [
        { version: 1, note: "Template awal Event Program.", createdAt },
        {
          version: 2,
          note: "Checklist dipecah menjadi Form dan SIMPRO.",
          createdAt,
        },
        {
          version: 3,
          note: "Strategi sampai pemilihan vendor menjadi entri Brief Received; Media ditambahkan.",
          createdAt,
        },
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
