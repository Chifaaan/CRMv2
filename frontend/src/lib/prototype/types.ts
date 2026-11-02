export type Role = "admin" | "manager" | "pm" | "finance" | "assignee";

export type Priority = "low" | "medium" | "high" | "critical";

export type ProjectStatus = "active" | "completed" | "cancelled";

export type Phase = "planning" | "running" | "finance";

export type StepKey =
  | "pitching"
  | "survey"
  | "rab"
  | "running"
  | "bast"
  | "invoice";

export type FormStepKey = "survey" | "rab" | "bast" | "invoice";

export type StepStatus = "pending" | "active" | "completed";

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
  groupId?: string;
  cancelReason?: string;
  createdAt: string;
};

export type ProjectStep = {
  id: string;
  projectId: string;
  key: StepKey;
  phase: Phase;
  order: number;
  status: StepStatus;
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
  stepKey: StepKey;
  pitchingId?: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  requestedAssigneeId?: string;
  assigneeId?: string;
  reporterId: string;
  dueDate?: string;
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
  notes: string;
  documentUrl: string;
};

export type InvoicePayload = {
  number: string;
  date: string;
  amount: number;
  taxPercent: number;
  taxAmount: number;
  notes: string;
  documentUrl: string;
};

export type FormPayload =
  | SurveyPayload
  | RabPayload
  | BastPayload
  | InvoicePayload;

export type SurveyPhoto = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  storageKey?: string;
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
  submittedAt?: string;
  reviewedAt?: string;
  reviewedById?: string;
  reviewComment?: string;
  createdAt: string;
};

export type ProjectGroup = {
  id: string;
  name: string;
  description: string;
  status: GroupStatus;
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

export type AppState = {
  seedVersion: number;
  currentUserId: string;
  users: User[];
  projects: Project[];
  steps: ProjectStep[];
  pitchings: Pitching[];
  pitchingRoles: PitchingRole[];
  tasks: Task[];
  forms: StepForm[];
  groups: ProjectGroup[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
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
  { key: "pitching", label: "Pitching", phase: "planning", order: 1, weight: 1 },
  { key: "survey", label: "Survey", phase: "planning", order: 2, weight: 1 },
  { key: "rab", label: "RAB", phase: "planning", order: 3, weight: 1 },
  { key: "running", label: "Running", phase: "running", order: 4, weight: 1 },
  { key: "bast", label: "BAST", phase: "finance", order: 5, weight: 0.5 },
  { key: "invoice", label: "Invoice", phase: "finance", order: 6, weight: 0.5 },
];

export const FORM_STEP_KEYS: FormStepKey[] = [
  "survey",
  "rab",
  "bast",
  "invoice",
];

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
  planning: "Planning",
  running: "Running",
  finance: "Finance",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin Utama",
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
