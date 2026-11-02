import { isAdminOrPmRole } from "@/lib/role-constants";
/**
 * Keizinan di konteks /projects/[id] (bukan peran ProjectMember di DB, melainkan user.role / sesi app).
 * Admin & PM: perencanaan penuh (proyek, tugas, sprint, gantt edit).
 * Developer: board proyek sama seperti My tasks — boleh geser status task yang di-assign (PATCH status); sprint planning & gantt tetap read-only UI; diskusi partisipatif.
 */

/** Viewer / client: board & perencanaan read-only; komentar pada kartu task (modal detail) diizinkan untuk tulisan sendiri. Diskusi proyek (tab Discussion) tetap sesuai `canParticipateInDiscussion`. */
export function isReadOnlyProjectRole(role: string): boolean {
  return role === "viewer" || role === "client";
}

/**
 * Sprint board tab & Gantt per proyek: developer + viewer + client — UI tidak menggeser kartu / mengubah jadwal perencanaan.
 * Tab Board (`/projects/.../board`) memakai `isMyTasksBoardReadOnlyRole` supaya developer bisa drag status task yang di-assign (sesuai backend PATCH).
 */
export function isTaskAndPlanningReadOnlyRole(role: string): boolean {
  return role === "developer" || isReadOnlyProjectRole(role);
}

/** Halaman My tasks: viewer/client saja yang tidak boleh geser kartu; developer boleh pada tugasnya sendiri. */
export function isMyTasksBoardReadOnlyRole(role: string): boolean {
  return isReadOnlyProjectRole(role);
}

/** Tombol/aksi yang membuat entitas baru: task, sprint, thread discussion, … */
export function canCreateInProjectContext(role: string): boolean {
  return isAdminOrPmRole(role);
}

/** Bulk backlog, export CSV, ops tugas penuh seperti definisi lama (hanya admin/PM). */
export function canRunFullTaskListOpsInProject(role: string): boolean {
  return isAdminOrPmRole(role);
}

export function canOpenTaskFormEditor(role: string): boolean {
  return isAdminOrPmRole(role);
}

/** Manajemen anggota global (halaman /members) — hanya admin. */
export function canAccessGlobalMembersAdmin(role: string): boolean {
  return role === "admin";
}

/** Pilih anggota tim + portal client di form buat/edit proyek (bukan halaman /members global). */
export function canPickProjectMembersInProjectForm(role: string): boolean {
  return isAdminOrPmRole(role);
}

export function canStartDiscussionThread(role: string): boolean {
  return canCreateInProjectContext(role);
}

export function canParticipateInDiscussion(role: string): boolean {
  return isAdminOrPmRole(role) || role === "developer";
}

export function canCreateSprintInProject(role: string): boolean {
  return canCreateInProjectContext(role);
}
