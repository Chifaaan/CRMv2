import { redirect } from "next/navigation";
import { isAdminOrPmRole } from "@/lib/role-constants";

/** Clients, assets, settings — admin & PM. */
export function assertManagementRouteAccess(role: string | undefined) {
  if (!isAdminOrPmRole(role)) {
    redirect("/dashboard");
  }
}

export function canAccessManagementFeatures(role: string) {
  return isAdminOrPmRole(role);
}

/** Anggota tim (halaman /members) — hanya admin. */
export function assertGlobalMembersPageAccess(role: string | undefined) {
  if (role !== "admin") {
    redirect("/dashboard");
  }
}
