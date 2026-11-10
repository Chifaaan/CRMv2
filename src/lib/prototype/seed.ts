import { backfillProjectEvents } from "./events";
import { migrateFormVersions } from "./form-versions";
import {
  createSeedTemplates,
  stageTasksForProject,
  UMUM_TEMPLATE_ID,
} from "./templates";
import {
  STEP_META,
  type AppState,
  type FormStepKey,
  type StepForm,
  type StepKey,
} from "./types";

function iso(date: string): string {
  return new Date(`${date}T09:00:00.000Z`).toISOString();
}

function formId(projectId: string, key: FormStepKey): string {
  return `form-${projectId}-${key}`;
}

function defaultPayload(key: FormStepKey) {
  if (key === "survey") {
    return {
      surveyDate: "",
      location: "",
      pic: "",
      findings: "",
      notes: "",
    };
  }
  if (key === "rab") {
    return { items: [], notes: "" };
  }
  if (key === "bast") {
    return {
      number: "",
      date: "",
      picId: "",
      notes: "",
      documentUrl: "",
    };
  }
  if (key === "payment") {
    return {
      invoiceId: "",
      paymentDate: "",
      amount: 0,
      method: "",
      proofFileName: "",
      proofStorageKey: "",
      proofMimeType: "",
      proofSize: 0,
      status: "unpaid" as const,
      notes: "",
    };
  }
  return {
    number: "",
    date: "",
    dueDate: "",
    amount: 0,
    taxPercent: 11,
    taxAmount: 0,
    notes: "",
    documentUrl: "",
  };
}

function makeForms(
  projectId: string,
  overrides: Partial<Record<FormStepKey, Partial<StepForm>>> = {},
): StepForm[] {
  const keys: FormStepKey[] = ["survey", "rab", "bast", "invoice", "payment"];
  return keys.map((key) => ({
    id: formId(projectId, key),
    projectId,
    stepKey: key,
    type: key,
    status: "unassigned",
    assigneeId: undefined,
    payload: defaultPayload(key),
    photos: key === "survey" ? [] : undefined,
    createdAt: iso("2026-10-01"),
    ...overrides[key],
  }));
}

const SEED_TEMPLATES = createSeedTemplates();
const UMUM_STAGES =
  SEED_TEMPLATES.find((template) => template.id === UMUM_TEMPLATE_ID)?.stages ?? [];

function makeSteps(
  projectId: string,
  activeKeys: StepKey[],
  completedKeys: StepKey[] = [],
) {
  return UMUM_STAGES.map((meta) => {
    const legacyKey = meta.legacyKey as StepKey;
    return {
      id: `step-${projectId}-${meta.id}`,
      projectId,
      key: legacyKey,
      name: meta.name,
      description: meta.description,
      phase: meta.phase,
      order: meta.order,
      status: completedKeys.includes(legacyKey)
        ? ("completed" as const)
        : activeKeys.includes(legacyKey)
          ? ("active" as const)
          : ("pending" as const),
      kind: meta.kind,
      required: meta.required,
      weight: meta.weight,
      parallelGroup: meta.parallelGroup,
      financeKind: meta.financeKind,
      gateKind: meta.gateKind,
      costBeforeCommitment: meta.costBeforeCommitment,
      legacyKey,
      formTemplate: meta.formTemplate,
      tasks: stageTasksForProject(meta.tasks),
      startedAt:
        completedKeys.includes(legacyKey) || activeKeys.includes(legacyKey)
          ? iso("2026-10-01")
          : undefined,
      completedAt: completedKeys.includes(legacyKey)
        ? iso("2026-10-20")
        : undefined,
    };
  });
}

export function createSeedState(): AppState {
  const users = [
    {
      id: "u-admin",
      name: "Admin Demo",
      email: "admin.demo@example.com",
      role: "admin" as const,
      color: "bg-violet-500",
    },
    {
      id: "u-manager",
      name: "Manager Demo",
      email: "manager.demo@example.com",
      role: "manager" as const,
      color: "bg-sky-500",
    },
    {
      id: "u-pm1",
      name: "PM Demo 1",
      email: "pm1.demo@example.com",
      role: "pm" as const,
      color: "bg-indigo-500",
    },
    {
      id: "u-pm2",
      name: "PM Demo 2",
      email: "pm2.demo@example.com",
      role: "pm" as const,
      color: "bg-emerald-500",
    },
    {
      id: "u-assignee1",
      name: "Assignee Demo 1",
      email: "assignee1.demo@example.com",
      role: "assignee" as const,
      color: "bg-rose-500",
    },
    {
      id: "u-assignee2",
      name: "Assignee Demo 2",
      email: "assignee2.demo@example.com",
      role: "assignee" as const,
      color: "bg-amber-500",
    },
    {
      id: "u-assignee3",
      name: "Assignee Demo 3",
      email: "assignee3.demo@example.com",
      role: "assignee" as const,
      color: "bg-teal-500",
    },
    {
      id: "u-media",
      name: "Media Demo",
      email: "media.demo@example.com",
      role: "media" as const,
      color: "bg-sky-500",
    },
    {
      id: "u-bod",
      name: "BOD Demo",
      email: "bod.demo@example.com",
      role: "bod" as const,
      color: "bg-slate-600",
    },
    {
      id: "u-finance",
      name: "Finance Demo",
      email: "finance.demo@example.com",
      role: "finance" as const,
      color: "bg-fuchsia-500",
    },
  ];

  const projects = [
    {
      id: "p-alpha",
      code: "PRJ-01",
      name: "Proyek Alpha",
      client: "Klien Alpha",
      description: "Portal member, loyalty, dan integrasi kanal digital.",
      priority: "high" as const,
      status: "active" as const,
      startDate: iso("2026-10-01"),
      targetEndDate: iso("2026-12-15"),
      coverColor: "#9f1239",
      createdById: "u-pm1",
      createdAt: iso("2026-10-01"),
    },
    {
      id: "p-beta",
      code: "PRJ-02",
      name: "Proyek Beta",
      client: "Klien Beta",
      description: "Riset pengalaman pengguna dan validasi lapangan.",
      priority: "medium" as const,
      status: "active" as const,
      startDate: iso("2026-10-05"),
      targetEndDate: iso("2026-11-30"),
      coverColor: "#1e40af",
      createdById: "u-pm1",
      createdAt: iso("2026-10-05"),
    },
    {
      id: "p-gamma",
      code: "PRJ-03",
      name: "Proyek Gamma",
      client: "Klien Beta",
      description: "Otomatisasi data ads, tracker, dan pelaporan kanal.",
      priority: "high" as const,
      status: "active" as const,
      startDate: iso("2026-10-02"),
      targetEndDate: iso("2026-12-05"),
      coverColor: "#7c3aed",
      createdById: "u-pm1",
      createdAt: iso("2026-10-02"),
    },
    {
      id: "p-delta",
      code: "PRJ-04",
      name: "Proyek Delta",
      client: "Internal",
      description: "Prototype alert engine dan notifikasi operasional.",
      priority: "critical" as const,
      status: "active" as const,
      startDate: iso("2026-10-10"),
      targetEndDate: iso("2026-11-20"),
      coverColor: "#0f766e",
      createdById: "u-pm2",
      createdAt: iso("2026-10-10"),
    },
    {
      id: "p-epsilon",
      code: "PRJ-05",
      name: "Proyek Epsilon",
      client: "Klien Gamma",
      description: "Revamp point of sale dan integrasi pembayaran.",
      priority: "medium" as const,
      status: "active" as const,
      startDate: iso("2026-09-01"),
      targetEndDate: iso("2026-10-31"),
      coverColor: "#b45309",
      createdById: "u-pm2",
      createdAt: iso("2026-09-01"),
    },
    {
      id: "p-zeta",
      code: "PRJ-06",
      name: "Proyek Zeta",
      client: "Internal",
      description: "Aplikasi mobile ringkas untuk monitoring proyek.",
      priority: "low" as const,
      status: "completed" as const,
      startDate: iso("2026-07-01"),
      targetEndDate: iso("2026-09-30"),
      actualEndDate: iso("2026-09-28"),
      coverColor: "#0369a1",
      createdById: "u-pm2",
      createdAt: iso("2026-07-01"),
    },
    {
      id: "p-legacy",
      code: "PRJ-07",
      name: "Proyek Lama",
      client: "Klien Lama",
      description: "Proyek lama yang dihentikan.",
      priority: "low" as const,
      status: "cancelled" as const,
      startDate: iso("2026-06-01"),
      targetEndDate: iso("2026-08-31"),
      coverColor: "#52525b",
      createdById: "u-pm1",
      cancelReason: "Klien menunda program.",
      createdAt: iso("2026-06-01"),
    },
  ];

  const steps = [
    ...makeSteps("p-alpha", ["pitching"]),
    ...makeSteps("p-beta", ["survey"], ["pitching"]),
    ...makeSteps("p-gamma", ["rab"], ["pitching", "survey"]),
    ...makeSteps("p-delta", ["running"], ["pitching", "survey", "rab"]),
    ...makeSteps("p-epsilon", ["bast", "invoice"], [
      "pitching",
      "survey",
      "rab",
      "running",
    ]),
    ...makeSteps("p-zeta", [], STEP_META.map((step) => step.key)),
    ...makeSteps("p-legacy", ["pitching"]),
  ];

  const forms = [
    ...makeForms("p-alpha"),
    ...makeForms("p-beta", {
      survey: {
        status: "submitted",
        assigneeId: "u-assignee1",
        submittedAt: iso("2026-10-29"),
        payload: {
          surveyDate: "2026-10-28",
          location: "Jakarta Selatan",
          pic: "Assignee Demo 1",
          findings:
            "Pengguna membutuhkan alur member yang lebih singkat dan status poin yang jelas.",
          notes: "Lanjut ke penyusunan RAB.",
        },
        photos: [
          {
            id: "photo-resear-1",
            fileName: "survey-lokasi.jpg",
            mimeType: "image/jpeg",
            size: 182000,
          },
          {
            id: "photo-resear-2",
            fileName: "survey-flow.jpg",
            mimeType: "image/jpeg",
            size: 164000,
          },
        ],
      },
    }),
    ...makeForms("p-gamma", {
      survey: {
        status: "approved",
        assigneeId: "u-assignee2",
        submittedAt: iso("2026-10-18"),
        reviewedAt: iso("2026-10-19"),
        reviewedById: "u-pm1",
        reviewComment: "Data survey lengkap.",
        payload: {
          surveyDate: "2026-10-17",
          location: "Bandung",
          pic: "Assignee Demo 2",
          findings: "Kebutuhan tracker dan ads sudah terpetakan.",
          notes: "Disetujui untuk RAB.",
        },
        photos: [],
      },
      rab: {
        status: "submitted",
        assigneeId: "u-finance",
        submittedAt: iso("2026-10-29"),
        payload: {
          notes: "RAB awal untuk otomatisasi kanal.",
          items: [
            {
              id: "rab-gamma-1",
              description: "Automation workflow",
              qty: 1,
              unit: "paket",
              unitPrice: 75000000,
              businessUnitId: "spektrum" as const,
            },
            {
              id: "rab-gamma-2",
              description: "Integrasi tracker & ads",
              qty: 1,
              unit: "paket",
              unitPrice: 50000000,
              businessUnitId: "makerspace-video" as const,
            },
          ],
        },
      },
    }),
    ...makeForms("p-delta", {
      survey: {
        status: "approved",
        assigneeId: "u-assignee3",
        submittedAt: iso("2026-10-15"),
        reviewedAt: iso("2026-10-16"),
        reviewedById: "u-pm2",
        payload: {
          surveyDate: "2026-10-14",
          location: "Surabaya",
          pic: "Assignee Demo 3",
          findings: "Alert manual masih dominan.",
          notes: "Setuju lanjut.",
        },
      },
      rab: {
        status: "approved",
        assigneeId: "u-finance",
        submittedAt: iso("2026-10-20"),
        reviewedAt: iso("2026-10-21"),
        reviewedById: "u-pm2",
        payload: {
          notes: "RAB disetujui.",
          items: [
            {
              id: "rab-delta-1",
              description: "Alert engine",
              qty: 1,
              unit: "paket",
              unitPrice: 42000000,
              businessUnitId: "makerspace" as const,
            },
          ],
        },
      },
    }),
    ...makeForms("p-epsilon", {
      survey: {
        status: "approved",
        assigneeId: "u-assignee1",
        submittedAt: iso("2026-09-10"),
        reviewedAt: iso("2026-09-11"),
        reviewedById: "u-pm2",
        payload: {
          surveyDate: "2026-09-09",
          location: "Jakarta",
          pic: "Assignee Demo 1",
          findings: "POS lama perlu penyederhanaan.",
          notes: "Lanjut.",
        },
      },
      rab: {
        status: "approved",
        assigneeId: "u-finance",
        submittedAt: iso("2026-09-15"),
        reviewedAt: iso("2026-09-16"),
        reviewedById: "u-pm2",
        payload: {
          notes: "RAB final.",
          items: [
            {
              id: "rab-epsilon-1",
              description: "Revamp POS",
              qty: 1,
              unit: "paket",
              unitPrice: 88000000,
              businessUnitId: "spektrum" as const,
            },
          ],
        },
      },
      bast: {
        status: "submitted",
        assigneeId: "u-finance",
        submittedAt: iso("2026-10-30"),
        payload: {
          number: "BAST/POS/2026/014",
          date: "2026-10-30",
          picId: "u-assignee1",
          notes: "BAST sudah ditandatangani klien.",
          documentUrl: "https://example.com/bast-pos.pdf",
        },
      },
      invoice: {
        status: "draft",
        assigneeId: "u-finance",
        payload: {
          number: "INV/POS/2026/014",
          date: "2026-10-31",
          dueDate: "2026-11-30",
          amount: 88000000,
          taxPercent: 11,
          taxAmount: 9680000,
          notes: "Invoice menunggu finalisasi.",
          documentUrl: "https://example.com/invoice-pos.pdf",
        },
      },
    }),
    ...makeForms("p-zeta", {
      survey: {
        status: "approved",
        assigneeId: "u-assignee2",
        submittedAt: iso("2026-07-15"),
        reviewedAt: iso("2026-07-16"),
        reviewedById: "u-pm2",
        payload: {
          surveyDate: "2026-07-14",
          location: "Jakarta",
          pic: "Assignee Demo 2",
          findings: "Kebutuhan mobile sederhana.",
          notes: "OK.",
        },
      },
      rab: {
        status: "approved",
        assigneeId: "u-finance",
        submittedAt: iso("2026-07-20"),
        reviewedAt: iso("2026-07-21"),
        reviewedById: "u-pm2",
        payload: {
          notes: "RAB mobile.",
          items: [
            {
              id: "rab-simple-1",
              description: "Mobile app",
              qty: 1,
              unit: "paket",
              unitPrice: 55000000,
              businessUnitId: "makerspace" as const,
            },
          ],
        },
      },
      bast: {
        status: "submitted",
        assigneeId: "u-finance",
        submittedAt: iso("2026-09-28"),
        payload: {
          number: "BAST/MOB/2026/009",
          date: "2026-09-28",
          picId: "u-assignee2",
          notes: "BAST selesai.",
          documentUrl: "https://example.com/bast-mobile.pdf",
        },
      },
      invoice: {
        status: "submitted",
        assigneeId: "u-finance",
        submittedAt: iso("2026-09-29"),
        payload: {
          number: "INV/MOB/2026/009",
          date: "2026-09-29",
          dueDate: "2026-10-29",
          amount: 55000000,
          taxPercent: 11,
          taxAmount: 6050000,
          notes: "Invoice terkirim.",
          documentUrl: "https://example.com/invoice-mobile.pdf",
        },
      },
    }),
    ...makeForms("p-legacy"),
  ];

  const baseTask = {
    description: "",
    priority: "medium" as const,
    reporterId: "u-pm1",
    createdAt: iso("2026-10-09"),
    checklist: [],
    comments: [],
    attachments: [],
  };

  const tasks = [
    {
      ...baseTask,
      id: "task-alpha-001",
      code: "PRJ1-001",
      projectId: "p-alpha",
      stepKey: "pitching" as const,
      title: "[Konsep Alpha] Pembuat PPT",
      description: "Susun deck presentasi konsep Alpha.",
      priority: "high" as const,
      status: "in_progress" as const,
      requestedAssigneeId: "u-assignee1",
      assigneeId: "u-assignee1",
      dueDate: iso("2026-11-03"),
    },
    {
      ...baseTask,
      id: "task-alpha-002",
      code: "PRJ1-002",
      projectId: "p-alpha",
      stepKey: "pitching" as const,
      title: "[Konsep Alpha] Presenter",
      description: "Latihan presentasi dan storyline.",
      priority: "medium" as const,
      status: "awaiting_approval" as const,
      requestedAssigneeId: "u-assignee2",
      assigneeId: "u-assignee2",
      dueDate: iso("2026-11-04"),
    },
    {
      ...baseTask,
      id: "task-alpha-003",
      code: "PRJ1-003",
      projectId: "p-alpha",
      stepKey: "pitching" as const,
      title: "[Konsep Alpha] Riset Kompetitor",
      description: "Riset kompetitor dan benchmark.",
      priority: "low" as const,
      status: "completed" as const,
      requestedAssigneeId: "u-assignee3",
      assigneeId: "u-assignee3",
    },
    {
      ...baseTask,
      id: "task-alpha-004",
      code: "PRJ1-004",
      projectId: "p-alpha",
      stepKey: "pitching" as const,
      title: "[Dashboard Alpha] Pembuat PPT",
      description: "Deck dashboard Alpha.",
      priority: "medium" as const,
      status: "completed" as const,
      requestedAssigneeId: "u-assignee1",
      assigneeId: "u-assignee1",
    },
    {
      ...baseTask,
      id: "task-alpha-005",
      code: "PRJ1-005",
      projectId: "p-alpha",
      stepKey: "pitching" as const,
      title: "[Dashboard Alpha] Presenter",
      description: "Siapkan materi presentasi.",
      priority: "medium" as const,
      status: "todo" as const,
      requestedAssigneeId: "u-assignee3",
      assigneeId: "u-assignee3",
      dueDate: iso("2026-11-06"),
    },
    {
      ...baseTask,
      id: "task-alpha-006",
      code: "PRJ1-006",
      projectId: "p-alpha",
      stepKey: "pitching" as const,
      title: "[Mobile Alpha] Pembuat PPT",
      description: "Task pitching kalah.",
      status: "completed" as const,
      archivedAt: iso("2026-10-08"),
      archiveReason: "Pitching kalah",
      requestedAssigneeId: "u-assignee2",
      assigneeId: "u-assignee2",
    },
    {
      ...baseTask,
      id: "task-alpha-007",
      code: "PRJ1-007",
      projectId: "p-alpha",
      stepKey: "pitching" as const,
      title: "[Mobile Alpha] Presenter",
      description: "Task pitching kalah.",
      status: "completed" as const,
      archivedAt: iso("2026-10-08"),
      archiveReason: "Pitching kalah",
      requestedAssigneeId: "u-assignee1",
      assigneeId: "u-assignee1",
    },
    {
      ...baseTask,
      id: "task-alpha-008",
      code: "PRJ1-008",
      projectId: "p-alpha",
      stepKey: "pitching" as const,
      title: "[Gamifikasi Alpha] Presenter",
      description: "Task pitching kalah.",
      status: "completed" as const,
      archivedAt: iso("2026-10-08"),
      archiveReason: "Pitching kalah",
      requestedAssigneeId: "u-assignee3",
      assigneeId: "u-assignee3",
    },
    {
      ...baseTask,
      id: "task-alpha-009",
      code: "PRJ1-009",
      projectId: "p-alpha",
      stepKey: "pitching" as const,
      title: "[Integrasi Kanal] Pembuat PPT",
      description: "Task pitching kalah.",
      status: "completed" as const,
      archivedAt: iso("2026-10-08"),
      archiveReason: "Pitching kalah",
      requestedAssigneeId: "u-assignee1",
      assigneeId: "u-assignee1",
    },
    {
      ...baseTask,
      id: "task-alpha-010",
      code: "PRJ1-010",
      projectId: "p-alpha",
      stepKey: "pitching" as const,
      title: "Finalisasi Deck Presentasi",
      description: "Task manual untuk melengkapi deck pitching.",
      priority: "high" as const,
      status: "backlog" as const,
      dueDate: iso("2026-11-07"),
    },
    {
      ...baseTask,
      id: "task-delta-001",
      code: "PRJ4-001",
      projectId: "p-delta",
      stepKey: "running" as const,
      title: "Implementasi Alert Engine",
      description: "Bangun rule engine dan evaluasi event.",
      reporterId: "u-pm2",
      priority: "high" as const,
      status: "in_progress" as const,
      assigneeId: "u-assignee1",
      dueDate: iso("2026-11-03"),
      checklist: [
        { id: "check-alert-1", text: "Rule evaluator", done: true },
        { id: "check-alert-2", text: "Unit test", done: false },
      ],
      comments: [
        {
          id: "comment-alert-1",
          authorId: "u-pm2",
          body: "Prioritaskan rule evaluator dulu.",
          createdAt: iso("2026-10-30"),
        },
      ],
    },
    {
      ...baseTask,
      id: "task-delta-002",
      code: "PRJ4-002",
      projectId: "p-delta",
      stepKey: "running" as const,
      title: "Desain Halaman Notifikasi",
      description: "Desain daftar dan detail notifikasi.",
      reporterId: "u-pm2",
      priority: "medium" as const,
      status: "awaiting_approval" as const,
      assigneeId: "u-assignee2",
      dueDate: iso("2026-11-05"),
    },
    {
      ...baseTask,
      id: "task-delta-003",
      code: "PRJ4-003",
      projectId: "p-delta",
      stepKey: "running" as const,
      title: "Integrasi Email",
      description: "Kirim digest email harian.",
      reporterId: "u-pm2",
      priority: "high" as const,
      status: "todo" as const,
      assigneeId: "u-assignee3",
      dueDate: iso("2026-11-08"),
    },
    {
      ...baseTask,
      id: "task-delta-004",
      code: "PRJ4-004",
      projectId: "p-delta",
      stepKey: "running" as const,
      title: "QA Regression",
      description: "Regression test alur alert.",
      reporterId: "u-pm2",
      priority: "critical" as const,
      status: "need_revision" as const,
      assigneeId: "u-assignee1",
      dueDate: iso("2026-10-30"),
      comments: [
        {
          id: "comment-alert-2",
          authorId: "u-pm2",
          body: "Tambahkan skenario timeout dan retry.",
          createdAt: iso("2026-10-31"),
        },
      ],
    },
    {
      ...baseTask,
      id: "task-delta-005",
      code: "PRJ4-005",
      projectId: "p-delta",
      stepKey: "running" as const,
      title: "Setup Monitoring",
      description: "Siapkan dashboard monitoring alert.",
      reporterId: "u-pm2",
      priority: "medium" as const,
      status: "backlog" as const,
      dueDate: iso("2026-11-12"),
    },
    {
      ...baseTask,
      id: "task-delta-006",
      code: "PRJ4-006",
      projectId: "p-delta",
      stepKey: "running" as const,
      title: "Dokumentasi API",
      description: "Dokumentasi endpoint alert.",
      reporterId: "u-pm2",
      priority: "low" as const,
      status: "completed" as const,
      assigneeId: "u-assignee2",
    },
    {
      ...baseTask,
      id: "task-delta-007",
      code: "PRJ4-007",
      projectId: "p-delta",
      stepKey: "running" as const,
      title: "Perbaikan Filter",
      description: "Perbaiki filter notifikasi.",
      reporterId: "u-pm2",
      priority: "medium" as const,
      status: "in_progress" as const,
      assigneeId: "u-assignee3",
      dueDate: iso("2026-11-06"),
    },
    {
      ...baseTask,
      id: "task-delta-008",
      code: "PRJ4-008",
      projectId: "p-delta",
      stepKey: "running" as const,
      title: "Export CSV",
      description: "Export daftar alert.",
      reporterId: "u-pm2",
      priority: "low" as const,
      status: "completed" as const,
      assigneeId: "u-assignee1",
    },
  ];

  const group = {
    id: "group-q4",
    name: "Grup Demo Q4",
    description: "Program enterprise kuartal keempat.",
    status: "active" as const,
    createdById: "u-manager",
    createdAt: iso("2026-10-15"),
  };

  const mediaOrders = [
    {
      id: "mo-alpha-1",
      projectId: "p-alpha",
      number: "MO-PRJ-01-1",
      title: "Media Order Alpha",
      status: "final" as const,
      items: [
        {
          id: "mo-alpha-item-1",
          description: "KOL Instagram",
          qty: 1,
          unit: "paket",
          clientUnitPrice: 25000000,
          vendorUnitCost: 18000000,
          businessUnitId: "makerspace" as const,
        },
        {
          id: "mo-alpha-item-2",
          description: "Video reels",
          qty: 2,
          unit: "video",
          clientUnitPrice: 12000000,
          vendorUnitCost: 9000000,
          businessUnitId: "makerspace-video" as const,
        },
      ],
      notes: "Media Order demo.",
      createdById: "u-pm1",
      createdAt: iso("2026-10-10"),
    },
    {
      id: "mo-gamma-1",
      projectId: "p-gamma",
      number: "MO-PRJ-03-1",
      title: "Media Order Gamma",
      status: "final" as const,
      items: [
        {
          id: "mo-gamma-item-1",
          description: "Paket display",
          qty: 1,
          unit: "paket",
          clientUnitPrice: 40000000,
          vendorUnitCost: 30000000,
          businessUnitId: "spektrum" as const,
        },
      ],
      notes: "Media Order demo.",
      createdById: "u-pm1",
      createdAt: iso("2026-10-12"),
    },
  ];

  const notifications = [
    {
      id: "ntf-1",
      userId: "u-pm1",
      type: "form_submitted",
      title: "Survey menunggu review",
      body: "Survey Proyek Beta sudah disubmit oleh Assignee Demo 1.",
      href: "/crm/projects/p-beta",
      createdAt: iso("2026-10-29"),
    },
    {
      id: "ntf-2",
      userId: "u-manager",
      type: "task_unassigned",
      title: "Task backlog perlu di-assign",
      body: "PRJ1-010 belum punya assignee.",
      href: "/projects/p-alpha/backlog",
      createdAt: iso("2026-10-30"),
    },
    {
      id: "ntf-3",
      userId: "u-finance",
      type: "form_assigned",
      title: "RAB menunggu diisi",
      body: "RAB Proyek Gamma sudah di-assign ke Anda.",
      href: "/crm/projects/p-gamma",
      createdAt: iso("2026-10-29"),
    },
    {
      id: "ntf-4",
      userId: "u-assignee1",
      type: "task_assigned",
      title: "Task baru di-assign",
      body: "PRJ4-001 Implementasi Mesin Notifikasi.",
      href: "/my-tasks",
      createdAt: iso("2026-10-30"),
    },
    {
      id: "ntf-5",
      userId: "u-assignee1",
      type: "form_assigned",
      title: "Survey di-assign",
      body: "Survey Proyek Beta menunggu diisi.",
      href: "/forms",
      createdAt: iso("2026-10-28"),
    },
    {
      id: "ntf-6",
      userId: "u-pm2",
      type: "form_submitted",
      title: "Invoice Proyek Epsilon masih draft",
      body: "Finance Demo sudah submit BAST, invoice belum.",
      href: "/crm/projects/p-epsilon",
      createdAt: iso("2026-10-30"),
    },
  ];

  const activityLogs = [
    {
      id: "act-1",
      projectId: "p-alpha",
      actorId: "u-pm1",
      action: "pitching_decided",
      message: "2 pitching menang, 3 pitching kalah.",
      createdAt: iso("2026-10-08"),
    },
    {
      id: "act-2",
      projectId: "p-delta",
      taskId: "task-delta-001",
      actorId: "u-assignee1",
      action: "task_status",
      message: "Task dipindahkan ke In Progress.",
      createdAt: iso("2026-10-30"),
    },
    {
      id: "act-3",
      projectId: "p-epsilon",
      actorId: "u-finance",
      action: "form_submitted",
      message: "BAST Proyek Epsilon disubmit.",
      createdAt: iso("2026-10-30"),
    },
  ];

  const tasksWithStages = tasks.map((task) => ({
    ...task,
    stageId: steps.find(
      (step) => step.projectId === task.projectId && step.key === task.stepKey,
    )?.id,
  }));

  const baseState: AppState = {
    seedVersion: 3,    currentUserId: "u-pm1",
    users,
    projects: projects.map((project) => ({
      ...project,
      templateId: UMUM_TEMPLATE_ID,
      templateVersion: 2,
      managerId: ["p-alpha", "p-gamma"].includes(project.id)
        ? "u-manager"
        : undefined,
      structureLocked: true,
      lifecycle:
        project.status === "completed"
          ? ("done" as const)
          : project.status === "cancelled"
            ? ("cancelled" as const)
            : ("active" as const),
      ...(["p-beta", "p-gamma", "p-delta"].includes(project.id)
        ? { groupId: group.id }
        : {}),
    })),
    steps,
    templates: SEED_TEMPLATES,
    tasks: tasksWithStages,
    forms,
    formEntries: [],
    groups: [group],
    mediaOrders,
    notifications,
    activityLogs,
    projectEvents: [],
  };

  const formsWithVersions = migrateFormVersions(baseState);

  return {
    ...baseState,
    forms: formsWithVersions,
    projectEvents: backfillProjectEvents({
      ...baseState,
      forms: formsWithVersions,
    }),
  };
}
