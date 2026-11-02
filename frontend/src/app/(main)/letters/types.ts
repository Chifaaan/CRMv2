export type LetterUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  position: string | null;
  department: string | null;
};

export type LetterCapabilities = {
  canEdit: boolean;
  canDelete: boolean;
  canFinalize: boolean;
  canResubmit: boolean;
  canDecide: boolean;
  canDuplicate: boolean;
};

export type LetterApprovalStep = {
  id: string;
  order: number;
  status: string;
  decidedAt: string | null;
  userId: string;
  user: LetterUser;
};

export type LetterApprovalAction = {
  id: string;
  cycle: number;
  decision: string;
  note: string | null;
  createdAt: string;
  actor: LetterUser;
  step: { id: string; order: number };
};

export type LetterActivity = {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  metadata: unknown;
  createdAt: string;
};

export type LetterAttachment = {
  id: string;
  url: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  uploadedBy: LetterUser;
};

export type LetterDetail = {
  id: string;
  number: string;
  sequence: number;
  unit: string;
  category: string;
  categoryCode: string;
  letterType: string;
  security: string;
  letterDate: string;
  requesterId: string;
  requesterName: string;
  requesterRole: string | null;
  subject: string;
  internalNote: string | null;
  recipientMode: "internal" | "external";
  recipient: string;
  location: string | null;
  cc: string | null;
  body: string;
  status: string;
  createdById: string;
  currentApprovalOrder: number | null;
  revisionRequestedByOrder: number | null;
  submissionCycle: number;
  finalizedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requester: LetterUser;
  createdBy: LetterUser;
  approvals: LetterApprovalStep[];
  actions: LetterApprovalAction[];
  attachments: LetterAttachment[];
  activities: LetterActivity[];
  capabilities: LetterCapabilities;
};

export type LetterRow = {
  id: string;
  number: string;
  letterDate: string;
  subject: string;
  unit: string;
  category: string;
  letterType: string;
  security: string;
  requesterName: string;
  recipient: string;
  status: string;
  createdById: string;
  currentApprovalOrder: number | null;
  createdAt: string;
  capabilities: {
    canEdit: boolean;
    canDelete: boolean;
  };
};

export type LetterList = {
  items: LetterRow[];
  meta: {
    total: number;
    page: number;
    limits: number;
    pages: number;
  };
};

export type LetterSummary = {
  total: number;
  draft: number;
  waiting: number;
  monthly: number;
};

export type LetterMeta = {
  units: string[];
  users: LetterUser[];
};

export type LetterMutationInput = {
  number?: string;
  unit: string;
  category: string;
  letterType: string;
  security: string;
  letterDate: string;
  requesterId: string;
  subject: string;
  internalNote?: string;
  recipientMode: "internal" | "external";
  recipient: string;
  location?: string;
  cc?: string;
  body: string;
  approvalUserIds: string[];
};

export type LetterSearchParams = {
  page?: string;
  limits?: string;
  q?: string;
  unit?: string;
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};
