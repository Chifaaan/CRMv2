/** Mirrors `_reference/js/modules/projects.js` options */

export const PROJECT_STATUS_OPTIONS = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "maintenance", label: "Maintenance" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const PROJECT_PHASE_OPTIONS = [
  { value: "development", label: "Development" },
  { value: "uat", label: "UAT" },
  { value: "deployment", label: "Deployment" },
  { value: "running", label: "Running" },
  { value: "maintenance", label: "Maintenance" },
] as const;

export const PROJECT_PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

/** Unique hex values only (case-insensitive), order preserved. */
const COVER_COLOR_SOURCE = [
  "#2563EB",
  "#7C3AED",
  "#0891B2",
  "#16A34A",
  "#D97706",
  "#DC2626",
  "#DB2777",
  "#9333EA",
  "#059669",
  "#B45309",
  "#0369A1",
  "#6D28D9",
  "#065F46",
  "#92400E",
  "#1D4ED8",
] as const;

export const COVER_COLORS: readonly string[] = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of COVER_COLOR_SOURCE) {
    const k = c.trim().toUpperCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
})();

export const PROJECT_MEMBER_ROLE_OPTIONS = [
  { value: "PM", label: "PM" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "VIEWER", label: "Viewer" },
  { value: "CLIENT", label: "Client" },
] as const;

export type ProjectMemberRoleValue =
  (typeof PROJECT_MEMBER_ROLE_OPTIONS)[number]["value"];
