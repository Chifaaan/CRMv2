import { cn } from "@/lib/utils";
import {
  isAdminRole,
  isPmRole,
  normalizeRole,
  roleLabel,
} from "@/lib/role-constants";

/** Member / portal user lifecycle — labels match Members page. */
export function userStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "invited":
      return "Invited";
    case "inactive":
      return "Inactive";
    default:
      return status;
  }
}

export type UserStatusBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

/** Maps to Badge `variant` — same rules as Members. */
export function userStatusBadgeVariant(
  status: string,
): UserStatusBadgeVariant {
  switch (status) {
    case "active":
      return "secondary";
    case "invited":
      return "secondary";
    case "inactive":
      return "outline";
    default:
      return "outline";
  }
}

/**
 * Active on `secondary` avoids theme `primary` that can read as plain white (e.g. dark theme).
 * Invited stays default `secondary` styling.
 */
export function userStatusBadgeClassName(status: string): string | undefined {
  if (status !== "active") return undefined;
  return cn(
    "border-emerald-600/25 bg-emerald-600/14 text-emerald-950",
    "dark:border-emerald-400/35 dark:bg-emerald-500/20 dark:text-emerald-50",
  );
}

export type MemberRoleBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

/** Role label + Badge variant — same as Members list. */
export function memberRoleLabel(role: string): string {
  return roleLabel(role);
}

export function memberRoleBadgeVariant(
  role: string,
): MemberRoleBadgeVariant {
  if (isAdminRole(role)) return "destructive";
  if (isPmRole(role)) return "default";
  switch (normalizeRole(role)) {
    case "developer":
      return "secondary";
    case "viewer":
      return "outline";
    case "client":
      return "secondary";
    default:
      return "outline";
  }
}
