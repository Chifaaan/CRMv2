import type { ProspekEvent } from "./types";

export type ProspekEventInput = {
  prospekId: string;
  pitchingId?: string;
  eventType: string;
  actorId: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

function eventId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `pevt-${random}`;
}

export function recordProspekEvent(
  events: ProspekEvent[],
  input: ProspekEventInput,
): ProspekEvent[] {
  return [
    ...events,
    {
      id: eventId(),
      prospekId: input.prospekId,
      pitchingId: input.pitchingId,
      eventType: input.eventType,
      actorId: input.actorId,
      occurredAt: new Date().toISOString(),
      summary: input.summary,
      metadata: input.metadata ?? {},
    },
  ];
}

export function prospekEventPage(
  events: ProspekEvent[],
  prospekId: string,
  page = 0,
  pageSize = 10,
): {
  items: ProspekEvent[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
} {
  const all = events
    .filter((event) => event.prospekId === prospekId)
    .sort((a, b) => {
      const byTime = b.occurredAt.localeCompare(a.occurredAt);
      return byTime !== 0 ? byTime : b.id.localeCompare(a.id);
    });
  const safeSize = Math.max(1, pageSize);
  const safePage = Math.max(0, page);
  const start = safePage * safeSize;
  return {
    items: all.slice(start, start + safeSize),
    total: all.length,
    page: safePage,
    pageSize: safeSize,
    hasMore: start + safeSize < all.length,
  };
}
