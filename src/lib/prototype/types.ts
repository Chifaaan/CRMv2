export type Role = "admin" | "manager" | "pm" | "finance" | "assignee";

export type Priority = "low" | "medium" | "high" | "critical";

export type ProjectStatus = "active" | "completed" | "cancelled";

export type Phase = "prospek" | "planning" | "running" | "finance";

export type StageKind = "form" | "finance_form" | "gate" | "simpro";

export type GateKind = "go_no_go" | "client_approval";

export type Lifecycle = "active" | "won" | "lost" | "cancelled" | "done";

export type StepKey =
  | "pitching"
  | "survey"
  | "rab"
  | "running"
  | "bast"
  | "invoice";

export type FormStepKey =
  | "survey"
  | "rab"
  | "bast"
  | "invoice"
  | "payment";

export type FormFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "checklist"
  | "file";

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
};

export type FormDefaultFieldConfig = {
  enabled: boolean;
  required: boolean;
};

export type FormTemplate = {
  title: string;
  defaultFields: {
    executionDate: FormDefaultFieldConfig;
    location: FormDefaultFieldConfig;
    notes: FormDefaultFieldConfig;
    photos: FormDefaultFieldConfig;
  };
  fields: FormField[];
};

export type FormEntryStatus =
  | "unassigned"
  | "assigned"
  | "draft"
  | "submitted"
  | "approved"
  | "need_revision"
  | "cancelled";

export type FormEntryValue = string | number | string[];

export type FormEntryPayload = {
  executionDate?: string;
  location?: string;
  notes?: string;
  photos?: SurveyPhoto[];
  values: Record<string, FormEntryValue>;
  files?: Record<string, SurveyPhoto>;
};

export type FormEntryVersion = {
  id: string;
  entryId: string;
  versionNumber: number;
  status: FormEntryStatus;
  payload: FormEntryPayload;
  createdAt: string;
  createdById: string;
};

export type FormEntryScope = "project" | "prospek";

export type FormEntry = {
  id: string;
  scope?: FormEntryScope;
  projectId?: string;
  prospekId?: string;
  pitchingId?: string;
  stepKey: string;
  templateStageId?: string;
  title: string;
  assigneeId?: string;
  dueDate?: string;
  status: FormEntryStatus;
  payload: FormEntryPayload;
  versions: FormEntryVersion[];
  submittedAt?: string;
  reviewedAt?: string;
  reviewedById?: string;
  reviewComment?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
  updatedById?: string;
};

export type StepStatus = "pending" | "active" | "completed" | "skipped";

export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "awaiting_approval"
  | "need_revision"
  | "completed";

export type PitchingStatus = "draft" | "won" | "lost";

export type FormStatus =
  | "unassigned"
  | "assigned"
  | "draft"
  | "submitted"
  | "approved"
  | "need_revision";

export type GroupStatus = "active" | "completed" | "cancelled";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  color: string;
};

export type ProjectCreationMode = "template" | "manual" | "legacy";

export type ProspekProjectSnapshot = {
  picId?: string;
  client: string;
  periodStart: string;
  periodEnd: string;
  pagu: number;
};

export type Project = {
  id: string;
  code: string;
  name: string;
  client: string;
  description: string;
  priority: Priority;
  status: ProjectStatus;
  startDate: string;
  targetEndDate: string;
  actualEndDate?: string;
  coverColor: string;
  createdById: string;
  managerId?: string;
  groupId?: string;
  creationMode?: ProjectCreationMode;
  startedAt?: string;
  initialPhase?: "planning" | "running";
  phaseCompletedAt?: Partial<Record<"planning" | "running" | "finance", string>>;
  startPromptDismissedAt?: string;
  prospekSnapshot?: ProspekProjectSnapshot;
  prospekId?: string;
  pitchingId?: string;
  inheritedRab?: PitchingRabSnapshot;
  inheritedQuotation?: PitchingQuotationSnapshot;
  prospekContract?: PitchingContract;
  cancelReason?: string;
  createdAt: string;
  templateId?: string;
  templateVersion?: number;
  lifecycle?: Lifecycle;
  lostReason?: string;
  structureLocked?: boolean;
  rabBaselineLockedAt?: string;
};

export type TemplateTask = {
  id: string;
  name: string;
  role?: string;
  required: boolean;
  deliverable?: string;
};

export type StageTask = TemplateTask & {
  done: boolean;
};

export type GateDecision = {
  decision: "approved" | "rejected";
  reason?: string;
  actorId: string;
  decidedAt: string;
};

export type TemplateStage = {
  id: string;
  name: string;
  description?: string;
  phase: Phase;
  order: number;
  kind: StageKind;
  required: boolean;
  costBeforeCommitment?: boolean;
  weight: number;
  parallelGroup?: string;
  financeKind?: FormStepKey;
  gateKind?: GateKind;
  legacyKey?: StepKey;
  formTemplate?: FormTemplate;
  tasks: TemplateTask[];
};

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  projectType: string;
  version: number;
  legacy?: boolean;
  status: "active" | "archived";
  stages: TemplateStage[];
  changelog: { version: number; note: string; createdAt: string }[];
  createdById: string;
  createdAt: string;
};

export type ProjectStep = {
  id: string;
  projectId: string;
  /** Legacy StepKey for the Umum template, stage id for other templates. */
  key: string;
  name: string;
  description?: string;
  phase: Phase;
  order: number;
  status: StepStatus;
  kind: StageKind;
  required: boolean;
  weight: number;
  parallelGroup?: string;
  financeKind?: FormStepKey;
  gateKind?: GateKind;
  costBeforeCommitment?: boolean;
  legacyKey?: StepKey;
  formTemplate?: FormTemplate;
  tasks: StageTask[];
  managerPicId?: string;
  gateDecision?: GateDecision;
  noWorkConfirmedAt?: string;
  noWorkConfirmedById?: string;
  startedAt?: string;
  completedAt?: string;
};

export type Pitching = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: PitchingStatus;
  createdById: string;
  createdAt: string;
  decidedAt?: string;
};

export type PitchingRole = {
  id: string;
  pitchingId: string;
  label: string;
  requestedUserId?: string;
  taskId?: string;
};

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type TaskComment = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type Attachment = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  storageKey?: string;
};

export type Task = {
  id: string;
  code: string;
  projectId: string;
  stepKey: string;
  stageId?: string;
  pitchingId?: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  requestedAssigneeId?: string;
  assigneeId?: string;
  reporterId: string;
  dueDate?: string;
  workUrl?: string;
  createdAt: string;
  archivedAt?: string;
  archiveReason?: string;
  checklist: ChecklistItem[];
  comments: TaskComment[];
  attachments: Attachment[];
};

export type SurveyPayload = {
  surveyDate: string;
  location: string;
  pic: string;
  findings: string;
  notes: string;
};

export type RabItem = {
  id: string;
  description: string;
  category?: string;
  qty: number;
  unit: string;
  unitPrice: number;
};

export type RabPayload = {
  items: RabItem[];
  notes: string;
};

export type BastPayload = {
  number: string;
  date: string;
  picId: string;
  notes: string;
  documentUrl: string;
};

export type InvoicePayload = {
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  taxPercent: number;
  taxAmount: number;
  notes: string;
  documentUrl: string;
};

export type PaymentStatus = "unpaid" | "partial" | "paid";

export type PaymentPayload = {
  invoiceId?: string;
  paymentDate: string;
  amount: number;
  method: string;
  proofFileName?: string;
  proofStorageKey?: string;
  proofMimeType?: string;
  proofSize?: number;
  status: PaymentStatus;
  notes: string;
};

export type FormPayload =
  | SurveyPayload
  | RabPayload
  | BastPayload
  | InvoicePayload
  | PaymentPayload;

export type SurveyPhoto = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  storageKey?: string;
};

export type FormVersion = {
  id: string;
  formId: string;
  versionNumber: number;
  status: FormStatus;
  payload: FormPayload;
  photos?: SurveyPhoto[];
  createdAt: string;
  createdById: string;
  source: "migration" | "submission";
};

export type StepForm = {
  id: string;
  projectId: string;
  stepKey: FormStepKey;
  type: FormStepKey;
  status: FormStatus;
  assigneeId?: string;
  payload: FormPayload;
  photos?: SurveyPhoto[];
  versions?: FormVersion[];
  submittedAt?: string;
  reviewedAt?: string;
  reviewedById?: string;
  reviewComment?: string;
  reviewTarget?: string;
  updatedAt?: string;
  updatedById?: string;
  createdAt: string;
};

export type ProjectGroup = {
  id: string;
  name: string;
  description: string;
  status: GroupStatus;
  prospekId?: string;
  createdById: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  href: string;
  readAt?: string;
  createdAt: string;
};

export type ActivityLog = {
  id: string;
  projectId?: string;
  taskId?: string;
  actorId: string;
  action: string;
  message: string;
  createdAt: string;
};

export type ProjectEvent = {
  id: string;
  projectId: string;
  step: string | null;
  eventType: string;
  actorId: string;
  occurredAt: string;
  summary: string;
  metadata: Record<string, unknown>;
  groupId?: string;
};

export type ProspekStatus = "active" | "completed" | "cancelled";

export type Prospek = {
  id: string;
  code: string;
  name: string;
  description: string;
  picId?: string;
  client: string;
  periodStart: string;
  periodEnd: string;
  pagu: number;
  status: ProspekStatus;
  cancelReason?: string;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
};

export type ProspekPitchingStatus = "draft" | "won" | "lost";

export type ProspekPitching = {
  id: string;
  prospekId: string;
  title: string;
  description: string;
  templateId: string;
  templateVersion: number;
  status: ProspekPitchingStatus;
  createdById: string;
  createdAt: string;
  decidedAt?: string;
  decidedById?: string;
  lostReason?: string;
  statusBeforeLoss?: "draft" | "won";
  lostAt?: string;
  lostById?: string;
  lossUndoneAt?: string;
  contract?: PitchingContract;
  contractAssigneeId?: string;
  contractDueDate?: string;
  contractStatus?: "unassigned" | "assigned" | "draft" | "submitted";
  projectId?: string;
  convertedAt?: string;
};

export type PitchingRabItemKind = "manpower" | "cost";

export type PitchingRabItem = RabItem & {
  kind: PitchingRabItemKind;
};

export type PitchingRabStatus = "unassigned" | "assigned" | "draft" | "submitted";

export type PitchingRabVersion = {
  id: string;
  rabId: string;
  versionNumber: number;
  status: PitchingRabStatus;
  items: PitchingRabItem[];
  notes: string;
  createdAt: string;
  createdById: string;
};

export type PitchingRabSnapshot = {
  items: PitchingRabItem[];
  notes: string;
  submittedAt?: string;
  submittedById?: string;
};

export type PitchingRab = {
  id: string;
  pitchingId: string;
  items: PitchingRabItem[];
  notes: string;
  status: PitchingRabStatus;
  assigneeId?: string;
  dueDate?: string;
  submittedAt?: string;
  submittedById?: string;
  versions: PitchingRabVersion[];
  updatedAt?: string;
  updatedById?: string;
};

export type PitchingQuotationMode = "link" | "pdf";

export type PitchingQuotationStatus =
  | "unassigned"
  | "assigned"
  | "draft"
  | "submitted"
  | "approved"
  | "need_revision";

export type PitchingQuotationVersion = {
  id: string;
  quotationId: string;
  versionNumber: number;
  status: PitchingQuotationStatus;
  mode: PitchingQuotationMode;
  url?: string;
  attachment?: Attachment;
  amount?: number;
  createdAt: string;
  createdById: string;
};

export type PitchingQuotationSnapshot = {
  mode: PitchingQuotationMode;
  url?: string;
  attachment?: Attachment;
  amount?: number;
  approvedAt?: string;
  approvedById?: string;
};

export type PitchingQuotation = {
  id: string;
  pitchingId: string;
  mode: PitchingQuotationMode;
  url?: string;
  attachment?: Attachment;
  amount?: number;
  assigneeId?: string;
  dueDate?: string;
  status: PitchingQuotationStatus;
  submittedAt?: string;
  submittedById?: string;
  approvedAt?: string;
  approvedById?: string;
  reviewComment?: string;
  versions: PitchingQuotationVersion[];
  updatedAt?: string;
  updatedById?: string;
};

export type Termine = {
  id: string;
  label: string;
  amount: number;
  dueDate: string;
  note?: string;
};

export type PitchingContract = {
  number: string;
  date: string;
  value: number;
  attachment?: Attachment;
  termine: Termine[];
  savedAt?: string;
  savedById?: string;
};

export type ProspekEvent = {
  id: string;
  prospekId: string;
  pitchingId?: string;
  eventType: string;
  actorId: string;
  occurredAt: string;
  summary: string;
  metadata: Record<string, unknown>;
};

export type AppState = {
  seedVersion: number;
  currentUserId: string;
  users: User[];
  projects: Project[];
  steps: ProjectStep[];
  templates: ProjectTemplate[];
  pitchings: Pitching[];
  pitchingRoles: PitchingRole[];
  tasks: Task[];
  forms: StepForm[];
  formEntries: FormEntry[];
  groups: ProjectGroup[];
  prospeks: Prospek[];
  prospekPitchings: ProspekPitching[];
  pitchingRabs: PitchingRab[];
  pitchingQuotations: PitchingQuotation[];
  prospekEvents: ProspekEvent[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  projectEvents: ProjectEvent[];
};

export type GateRequirement = {
  label: string;
  met: boolean;
};

export type GateResult = {
  ready: boolean;
  requirements: GateRequirement[];
};

export type WorkloadRow = {
  user: User;
  activeCount: number;
  activeFormCount: number;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  projectNames: string[];
  overdueCount: number;
};

export const STEP_META: {
  key: StepKey;
  label: string;
  phase: Phase;
  order: number;
  weight: number;
}[] = [
  { key: "pitching", label: "Pitching", phase: "prospek", order: 1, weight: 1 },
  { key: "survey", label: "Survey", phase: "prospek", order: 2, weight: 1 },
  { key: "rab", label: "RAB", phase: "prospek", order: 3, weight: 1 },
  { key: "running", label: "Running", phase: "running", order: 4, weight: 1 },
  { key: "bast", label: "BAST", phase: "finance", order: 5, weight: 0.5 },
  { key: "invoice", label: "Invoice", phase: "finance", order: 6, weight: 0.5 },
];

export const PHASE_ORDER: Phase[] = [
  "prospek",
  "planning",
  "running",
  "finance",
];

export const NEW_PROJECT_PHASES: Phase[] = ["planning", "running", "finance"];

export const STAGE_KIND_LABEL: Record<StageKind, string> = {
  form: "Form",
  finance_form: "Form keuangan",
  gate: "Gerbang",
  simpro: "SIMPRO",
};

export const FORM_STEP_KEYS: FormStepKey[] = [
  "survey",
  "rab",
  "bast",
  "invoice",
  "payment",
];

export const FORM_ENTRY_STATUS_LABEL: Record<FormEntryStatus, string> = {
  unassigned: "Belum ditugaskan",
  assigned: "Ditugaskan",
  draft: "Draft",
  submitted: "Submitted",
  approved: "Disetujui",
  need_revision: "Perlu revisi",
  cancelled: "Dibatalkan",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Belum dibayar",
  partial: "Sebagian",
  paid: "Lunas",
};

export const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "awaiting_approval",
  "need_revision",
  "completed",
];

export const ACTIVE_TASK_STATUSES: TaskStatus[] = [
  "todo",
  "in_progress",
  "awaiting_approval",
  "need_revision",
];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  awaiting_approval: "Awaiting Approval",
  need_revision: "Need Revision",
  completed: "Completed",
};

export const TASK_STATUS_ORDER: Record<TaskStatus, number> = {
  backlog: 1,
  todo: 2,
  in_progress: 3,
  awaiting_approval: 4,
  need_revision: 5,
  completed: 6,
};

export const PHASE_LABEL: Record<Phase, string> = {
  prospek: "Prospek",
  planning: "Planning",
  running: "Running",
  finance: "Finance",
};

export const PHASE_HINT: Record<Phase, string> = {
  prospek: "Belum ada komitmen kontrak: brief sampai persetujuan klien.",
  planning: "Komitmen mulai berjalan: booking vendor/venue, PO, briefing.",
  running: "Eksekusi pekerjaan dan produksi.",
  finance: "BAST, invoice, pembayaran, dan penutupan proyek.",
};

export const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  active: "Aktif",
  won: "Menang",
  lost: "Kalah",
  cancelled: "Batal",
  done: "Selesai",
};

export const GATE_KIND_LABEL: Record<GateKind, string> = {
  go_no_go: "Go/No-Go",
  client_approval: "Persetujuan klien (menang)",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  pm: "PM",
  finance: "Finance",
  assignee: "Assignee",
};

export const FORM_STATUS_LABEL: Record<FormStatus, string> = {
  unassigned: "Belum di-assign",
  assigned: "Assigned",
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  need_revision: "Need Revision",
};
