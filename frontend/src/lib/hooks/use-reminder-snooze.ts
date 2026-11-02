"use client";

import { useCallback } from "react";

export const REMINDER_SNOOZE_KEY = "reminder_snoozed_until";

export function useReminderSnooze() {
  const isSnoozed = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    const raw = localStorage.getItem(REMINDER_SNOOZE_KEY);
    if (!raw) return false;
    const until = new Date(raw);
    if (Number.isNaN(until.getTime())) {
      localStorage.removeItem(REMINDER_SNOOZE_KEY);
      return false;
    }
    return until.getTime() > Date.now();
  }, []);

  const snooze = useCallback((durationHours: number) => {
    const until = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    localStorage.setItem(REMINDER_SNOOZE_KEY, until.toISOString());
  }, []);

  const clearSnooze = useCallback(() => {
    localStorage.removeItem(REMINDER_SNOOZE_KEY);
  }, []);

  return { isSnoozed, snooze, clearSnooze };
}
