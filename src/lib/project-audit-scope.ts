/**
 * Lingkup audit trail di dalam project: dipetakan dari pathname ke jenis entri ActivityLog.
 * Halaman Log (`/log`) dan rute tak dikenal memakai `log` / `all` agar filter jenis entitas tetap tersedia (atau tanpa batas).
 */
export type ProjectAuditFeatureScope =
  | "overview"
  | "board"
  | "backlog"
  | "sprint"
  | "gantt"
  | "discussion"
  | "reports"
  | "maintenance"
  | "log"
  | "all";

/** `null` = jangan batasi entityType (semua jenis untuk project ini). */
const SCOPE_ENTITY_TYPES: Record<
  ProjectAuditFeatureScope,
  readonly string[] | null
> = {
  overview: ["project"],
  board: ["task"],
  backlog: ["task"],
  sprint: ["sprint", "task"],
  gantt: ["task"],
  /** Belum ada log aktivitas discussion di API; tetap hanya entri bertipe ini bila nanti ditambahkan. */
  discussion: ["discussion"],
  reports: ["project", "task", "sprint"],
  maintenance: ["maintenance"],
  log: null,
  all: null,
};

export const AUDIT_SCOPE_LABEL: Record<ProjectAuditFeatureScope, string> = {
  overview: "Overview — hanya perubahan data proyek",
  board: "Board — hanya task",
  backlog: "Backlog — hanya task",
  sprint: "Sprint — sprint & task",
  gantt: "Gantt — hanya task",
  discussion: "Discussion — aktivitas diskusi (jika tercatat)",
  reports: "Reports — proyek, task & sprint",
  maintenance: "Maintenance — tiket maintenance",
  log: "Log — semua jenis aktivitas",
  all: "Semua jenis aktivitas",
};

/** Query param `entityTypes` (comma-separated) untuk GET /api/activity-log; `null` jika tanpa filter jenis. */
export function entityTypesQueryForScope(
  scope: ProjectAuditFeatureScope,
): string | null {
  const types = SCOPE_ENTITY_TYPES[scope];
  if (types == null || types.length === 0) return null;
  return types.join(",");
}

export function isAuditScopeNarrow(
  scope: ProjectAuditFeatureScope,
): boolean {
  const types = SCOPE_ENTITY_TYPES[scope];
  return types != null && types.length > 0;
}

export function projectPathToAuditScope(
  pathname: string,
  projectId: string,
): ProjectAuditFeatureScope {
  const base = `/projects/${projectId}`;
  if (pathname === base || pathname === `${base}/`) return "overview";
  if (pathname.startsWith(`${base}/board`)) return "board";
  if (pathname.startsWith(`${base}/backlog`)) return "backlog";
  if (pathname.startsWith(`${base}/sprint`)) return "sprint";
  if (pathname.startsWith(`${base}/gantt`)) return "gantt";
  if (pathname.startsWith(`${base}/discussion`)) return "discussion";
  if (pathname.startsWith(`${base}/reports`)) return "reports";
  if (pathname.startsWith(`${base}/maintenance`)) return "maintenance";
  if (pathname.startsWith(`${base}/log`)) return "log";
  return "all";
}
