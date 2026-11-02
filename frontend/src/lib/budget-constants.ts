export const BUDGET_TRANSACTION_TYPES = [
  { value: "income", label: "Pemasukan" },
  { value: "expense", label: "Pengeluaran" },
] as const;

export const BUDGET_CATEGORIES = [
  { value: "operational", label: "Operasional" },
  { value: "assets", label: "Aset & Inventaris" },
  { value: "sdm", label: "SDM" },
  { value: "travel", label: "Perjalanan Dinas" },
  { value: "other", label: "Lain-lain" },
] as const;

export const BUDGET_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Awaiting Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

export const BUDGET_STATUS_FILTER_ITEMS = [
  { value: "__all__", label: "Semua" },
  ...BUDGET_STATUSES.map((s) => ({ value: s.value, label: s.label })),
];

export const BUDGET_CATEGORY_FILTER_ITEMS = [
  { value: "__all__", label: "Semua" },
  ...BUDGET_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
];

export const BUDGET_TYPE_FILTER_ITEMS = [
  { value: "__all__", label: "Semua" },
  ...BUDGET_TRANSACTION_TYPES.map((t) => ({ value: t.value, label: t.label })),
];

export const BUDGET_DASHBOARD_CATEGORY_FILTER_ITEMS = [
  { value: "__all__", label: "Semua kategori" },
  ...BUDGET_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
];

export function budgetCategoryLabel(value: string) {
  return BUDGET_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function budgetStatusLabel(value: string) {
  return BUDGET_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function budgetTypeLabel(value: string) {
  return BUDGET_TRANSACTION_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function budgetAllocationLabel(
  budget?: { name: string; period?: string | null } | null,
) {
  if (!budget?.name) return "—";
  return budget.period ? `${budget.name} (${budget.period})` : budget.name;
}

export function budgetStatusClass(status: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    case "pending_approval":
      return "bg-amber-100 text-amber-800 ring-amber-200";
    case "rejected":
      return "bg-red-100 text-red-800 ring-red-200";
    default:
      return "bg-zinc-100 text-zinc-600 ring-zinc-200";
  }
}

export const BUDGET_ALLOCATION_LOG_TYPES = [
  { value: "increase", label: "Tambah alokasi" },
  { value: "decrease", label: "Kurangi alokasi" },
  { value: "adjustment", label: "Koreksi saldo" },
] as const;

export const BUDGET_ALLOCATION_ADJUST_ITEMS = BUDGET_ALLOCATION_LOG_TYPES.map(
  (t) => ({ value: t.value, label: t.label }),
);

export function budgetAllocationLogTypeLabel(value: string) {
  return (
    BUDGET_ALLOCATION_LOG_TYPES.find((t) => t.value === value)?.label ?? value
  );
}

export const BUDGET_CATEGORY_COLORS: Record<string, string> = {
  operational: "#0284c7",
  assets: "#8b5cf6",
  sdm: "#10b981",
  travel: "#f59e0b",
  other: "#64748b",
};
