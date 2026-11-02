/** Versi struktur penyimpanan; naikkan jika format payload tidak kompatibel. */
export const FORM_DRAFT_VERSION = 1 as const;

export type FormDraftEnvelope = {
  v: typeof FORM_DRAFT_VERSION;
  payload: unknown;
};

const STORAGE_PREFIX = "trackly:fdr:v1:";

/** Kunci penyimpanan; segmen bersih dari `:` dalam id (uuid aman). */
export function formDraftFullKey(...segments: string[]): string {
  const safe = segments.map((s) =>
    String(s).replace(/:/g, "_").replace(/\s+/g, "_"),
  );
  return `${STORAGE_PREFIX}${safe.join(":")}`;
}

/** Kunci pendek per entitas untuk konsistensi di seluruh app. */
export const FormDraftKeys = {
  taskCreate: (projectId: string) =>
    formDraftFullKey("task", "create", projectId),
  taskEdit: (taskId: string) => formDraftFullKey("task", "edit", taskId),

  projectCreate: () => formDraftFullKey("project", "create"),
  projectEdit: (projectId: string) =>
    formDraftFullKey("project", "edit", projectId),

  meetingCreate: () => formDraftFullKey("meeting", "create"),
  meetingEdit: (meetingId: string) =>
    formDraftFullKey("meeting", "edit", meetingId),

  clientCreate: () => formDraftFullKey("client", "create"),
  clientEdit: (clientId: string) =>
    formDraftFullKey("client", "edit", clientId),

  memberCreate: () => formDraftFullKey("member", "create"),
  memberEdit: (userId: string) => formDraftFullKey("member", "edit", userId),

  ticketCreate: (projectId: string) =>
    formDraftFullKey("ticket", "create", projectId),
  ticketEdit: (ticketId: string) =>
    formDraftFullKey("ticket", "edit", ticketId),

  assetCreate: () => formDraftFullKey("asset", "create"),
  assetEdit: (assetId: string) => formDraftFullKey("asset", "edit", assetId),

  sprintCreate: (projectId: string) =>
    formDraftFullKey("sprint", "create", projectId),
} as const;

export function loadFormDraftEnvelope(
  fullKey: string,
): FormDraftEnvelope | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(fullKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FormDraftEnvelope;
    if (
      !parsed ||
      parsed.v !== FORM_DRAFT_VERSION ||
      !("payload" in parsed)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveFormDraftEnvelope(
  fullKey: string,
  payload: unknown,
): void {
  if (typeof window === "undefined") return;
  try {
    const env: FormDraftEnvelope = {
      v: FORM_DRAFT_VERSION,
      payload,
    };
    window.localStorage.setItem(fullKey, JSON.stringify(env));
  } catch {
    /* quota / private mode — abaikan */
  }
}

export function clearFormDraft(fullKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(fullKey);
  } catch {
    /* noop */
  }
}
