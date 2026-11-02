export type BudgetItemRow = {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
};

export type BudgetAttachmentRow = {
  url: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

export type BudgetTransactionRow = {
  id: string;
  title: string;
  type: string;
  category: string;
  totalAmount: unknown;
  transactionDate: string;
  requesterId: string;
  budgetId: string | null;
  notes: string | null;
  status: string;
  rejectionNote: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: { id: string; name: string; email?: string };
  budget?: { id: string; name: string; period?: string | null } | null;
  items?: BudgetItemRow[];
  attachments?: BudgetAttachmentRow[];
  approvalLogs?: BudgetApprovalLogRow[];
  canApprove?: boolean;
  _count?: { items: number };
};

export type BudgetAllocationRow = {
  id: string;
  name: string;
  period: string | null;
  year: number | null;
  quarter: number | null;
  month: number | null;
  description: string | null;
  currentAmount: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string } | null;
  allocated: number;
  usedExpense: number;
  usedIncome: number;
  remaining: number;
  absorptionPct: number;
  _count?: { transactions: number; logs: number };
};

export type BudgetAllocationLogRow = {
  id: string;
  budgetId: string;
  type: string;
  amount: unknown;
  balanceBefore: unknown;
  balanceAfter: unknown;
  description: string;
  createdAt: string;
  actor: { id: string; name: string; email?: string };
};

export type BudgetApprovalLogRow = {
  id: string;
  decision: string;
  note: string | null;
  createdAt: string;
  approver: { id: string; name: string; email?: string };
};

export type BudgetApproverRow = {
  id: string;
  userId: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  createdBy?: { id: string; name: string } | null;
};

export type BudgetDashboardData = {
  summary: {
    totalAllocated: number;
    totalExpense: number;
    totalIncome: number;
    remaining: number;
    absorptionPct: number;
    pendingApprovalCount: number;
  };
  allocationBreakdown: {
    id: string;
    name: string;
    period: string | null;
    description: string | null;
    allocated: number;
    usedExpense: number;
    usedIncome: number;
    remaining: number;
    absorptionPct: number;
  }[];
  allocationUsage: {
    name: string;
    allocated: number;
    used: number;
    remaining: number;
  }[];
  monthlyTrend: { month: string; income: number; expense: number }[];
  categoryDistribution: { category: string; amount: number }[];
  recentTransactions: BudgetTransactionRow[];
  topExpenses: {
    id: string;
    title: string;
    amount: number;
    category: string;
    transactionDate: string;
  }[];
  topRequesters: {
    requesterId: string;
    name: string;
    total: number;
    count: number;
  }[];
};

export type BudgetMeMeta = {
  isAdmin: boolean;
  isApprover: boolean;
  canAccessBudget: boolean;
  canAccessDashboard: boolean;
  canAccessAllocations: boolean;
  canExport: boolean;
  canApprove: boolean;
  showRequesterColumn: boolean;
};
