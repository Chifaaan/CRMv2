export const ADMIN_ROLES = ["admin", "administrator"] as const;

export const RAP_BLOCKED_ROLES = ["viewer", "client"] as const;

export const PM_ROLES = [
  "pm",
  "spv",
  "arsitek",
  "drafter",
  "estimator",
  "mandor",
] as const;

export const APP_ROLES = [
  "admin",
  "pm",
  "spv",
  "arsitek",
  "drafter",
  "estimator",
  "mandor",
  "developer",
  "viewer",
  "client",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "pm", label: "Project Manager" },
  { value: "spv", label: "SPV" },
  { value: "arsitek", label: "Arsitek" },
  { value: "drafter", label: "Drafter" },
  { value: "estimator", label: "Estimator" },
  { value: "mandor", label: "Mandor" },
  { value: "developer", label: "Developer" },
  { value: "viewer", label: "Viewer" },
  { value: "client", label: "Client" },
];

export const normalizeRole = (role: string | undefined | null) =>
  String(role ?? "")
    .trim()
    .toLowerCase();

export const isAdminRole = (role: string | undefined | null) =>
  (ADMIN_ROLES as readonly string[]).includes(normalizeRole(role));

export const isPmRole = (role: string | undefined | null) =>
  (PM_ROLES as readonly string[]).includes(normalizeRole(role));

export const canViewRap = (role: string | undefined | null) =>
  !(RAP_BLOCKED_ROLES as readonly string[]).includes(normalizeRole(role));

export const isAdminOrPmRole = (role: string | undefined | null) =>
  isAdminRole(role) || isPmRole(role);

export const roleLabel = (role: string) =>
  ROLE_OPTIONS.find((option) => option.value === normalizeRole(role))?.label ??
  role;
