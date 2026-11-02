/** Browser draft keys for offline / server-down resilience (not a security boundary). */
export const LOCAL_DRAFT_VERSION = "v1";

export function meetingNotulensiDraftKey(meetingId: string) {
  return `trackly:draft:${LOCAL_DRAFT_VERSION}:meeting-notulensi:${meetingId}`;
}

export function personalNoteDraftKey(noteId: string) {
  return `trackly:draft:${LOCAL_DRAFT_VERSION}:note:${noteId}`;
}

export function safeReadDraftJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function safeWriteDraft(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / private mode
  }
}

export function safeClearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
