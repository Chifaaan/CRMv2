"use client";

import { useEffect } from "react";
import { saveFormDraftEnvelope } from "@/lib/form-draft-storage";

/** Menulis snapshot draf formulir ke localStorage (debounced) selama overlay terbuka. */
export function useDebouncedFormDraftSave(
  open: boolean,
  draftKey: string | null | undefined,
  buildPayload: () => unknown,
  deps: readonly unknown[],
  debounceMs = 420,
): void {
  useEffect(() => {
    if (!open || !draftKey) return;
    const tid = window.setTimeout(() => {
      try {
        const data = buildPayload();
        if (data === undefined) return;
        saveFormDraftEnvelope(draftKey, data);
      } catch {
        /* noop */
      }
    }, debounceMs);
    return () => window.clearTimeout(tid);
  }, [open, draftKey, debounceMs, ...(deps ?? [])]);
}
