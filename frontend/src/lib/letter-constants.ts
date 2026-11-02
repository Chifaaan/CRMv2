export const LETTER_CATEGORY_OPTIONS = [
  { value: "internal", label: "Internal (INT)" },
  { value: "external", label: "Eksternal (EXT)" },
  { value: "confidential", label: "Confidential (CONF)" },
] as const;

export const LETTER_TYPE_OPTIONS = [
  { value: "contract", label: "Kontrak" },
  { value: "decision", label: "Surat Keputusan" },
] as const;

export const LETTER_SECURITY_OPTIONS = [
  { value: "normal", label: "Biasa" },
  { value: "secret", label: "Rahasia" },
  { value: "top_secret", label: "Sangat Rahasia" },
] as const;

export const LETTER_STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Menunggu Approval" },
  { value: "revision_requested", label: "Perlu Revisi" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

export const LETTER_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  LETTER_STATUS_OPTIONS.map((option) => [option.value, option.label]),
);

export const LETTER_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  LETTER_CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
);

export const LETTER_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  LETTER_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

export const LETTER_SECURITY_LABELS: Record<string, string> = Object.fromEntries(
  LETTER_SECURITY_OPTIONS.map((option) => [option.value, option.label]),
);
