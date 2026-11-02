import { PM_ROLES } from "@/lib/role-constants";

export const BUDGET_BLOCKED_ROLES = ["viewer", "client"] as const;

export const BUDGET_TRANSACTION_ROLES = [
  "admin",
  ...PM_ROLES,
  "developer",
] as const;

export function isBudgetBlockedRole(role: string | undefined | null) {
  if (!role) return true;
  return (BUDGET_BLOCKED_ROLES as readonly string[]).includes(role);
}

export function canAccessBudget(role: string | undefined | null) {
  return !isBudgetBlockedRole(role);
}

export function isBudgetAdmin(role: string | undefined | null) {
  return role === "admin";
}

export function canAccessBudgetDashboard(role: string | undefined | null) {
  return isBudgetAdmin(role);
}

export function canManageBudgetTransactions(role: string | undefined | null) {
  return canAccessBudget(role) && (BUDGET_TRANSACTION_ROLES as readonly string[]).includes(role ?? "");
}

export function canEditBudgetTransaction(
  status: string,
  opts: { isAdmin: boolean },
) {
  if (opts.isAdmin) return true;
  return status === "draft" || status === "rejected";
}

export function canSubmitBudgetTransaction(status: string) {
  return status === "draft" || status === "rejected";
}
