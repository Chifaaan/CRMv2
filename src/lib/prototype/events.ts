import { canViewProject, userById } from "./domain";
import type {
  ActivityLog,
  AppState,
  ProjectEvent,
  User,
} from "./types";

export type ProjectEventInput = Omit<ProjectEvent, "id" | "occurredAt"> & {
  occurredAt?: string;
};

function eventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `evt-${crypto.randomUUID()}`;
  }
  return `evt-${Math.random().toString(36).slice(2, 12)}`;
}

export function createProjectEvent(input: ProjectEventInput): ProjectEvent {
  return {
    ...input,
    id: eventId(),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
}

/**
 * Append one audit event. Used by store mutations so the event is written in
 * the same state update as the domain change.
 */
export function recordProjectEvent(
  events: ProjectEvent[],
  input: ProjectEventInput,
): ProjectEvent[] {
  return [...events, createProjectEvent(input)];
}

function stepFromMessage(message: string): string | null {
  const text = message.toLowerCase();
  if (text.includes("bast")) return "bast";
  if (text.includes("invoice")) return "invoice";
  if (text.includes("rab")) return "rab";
  if (text.includes("survey")) return "survey";
  if (text.includes("pitching")) return "pitching";
  if (text.includes("running")) return "running";
  const match = text.match(/step\s+([a-z]+)\s+selesai/);
  if (match) {
    const key = match[1];
    if (
      key === "pitching" ||
      key === "survey" ||
      key === "rab" ||
      key === "running" ||
      key === "bast" ||
      key === "invoice"
    ) {
      return key;
    }
  }
  return null;
}

function stepForActivity(state: AppState, log: ActivityLog): string | null {
  if (log.taskId) {
    const task = state.tasks.find((item) => item.id === log.taskId);
    if (task) return task.stepKey;
  }
  return stepFromMessage(log.message);
}

function eventTypeForActivity(
  log: ActivityLog,
  step: string | null,
): string {
  const action = log.action;
  if (action === "step_completed") return "project.step_changed";
  if (action === "project_created") return "project.created";
  if (action === "project_updated") return "project.updated";
  if (action === "project_cancelled") return "project.cancelled";
  if (action === "project_completed") return "project.completed";
  if (action === "pitching_created") return "pitching.created";
  if (action === "pitching_won") return "pitching.won";
  if (action === "pitching_lost") return "pitching.lost";
  if (action === "pitching_decided") return "pitching.decided";
  if (action === "task_created") return "task.created";
  if (action === "task_assigned") return "task.assigned";
  if (action === "task_status") return "task.status_changed";
  if (action === "task_deleted") return "task.deleted";
  if (action === "task_commented") return "task.commented";
  if (action.startsWith("form_")) {
    const kind = step ?? "project";
    const suffix = action.replace("form_", "");
    return `${kind}.${suffix}`;
  }
  return "project.activity";
}

function mapActivityLog(state: AppState, log: ActivityLog): ProjectEvent | null {
  if (!log.projectId) return null;
  const step = stepForActivity(state, log);
  return {
    id: `backfill-${log.id}`,
    projectId: log.projectId,
    step,
    eventType: eventTypeForActivity(log, step),
    actorId: log.actorId,
    occurredAt: log.createdAt,
    summary: log.message,
    metadata: {
      backfilledFrom: log.id,
      originalAction: log.action,
      ...(step ? { step } : {}),
    },
  };
}

/**
 * Import legacy activity logs and add one synthetic event for projects that
 * have no history at all. Deterministic IDs make this safe to run repeatedly.
 */
export function backfillProjectEvents(state: AppState): ProjectEvent[] {
  const existing = state.projectEvents ?? [];
  const ids = new Set(existing.map((event) => event.id));
  const events = [...existing];

  for (const log of state.activityLogs) {
    const mapped = mapActivityLog(state, log);
    if (mapped && !ids.has(mapped.id)) {
      ids.add(mapped.id);
      events.push(mapped);
    }
  }

  for (const project of state.projects) {
    const hasEvent = events.some((event) => event.projectId === project.id);
    const syntheticId = `backfill-project-${project.id}`;
    if (!hasEvent && !ids.has(syntheticId)) {
      ids.add(syntheticId);
      events.push({
        id: syntheticId,
        projectId: project.id,
        step: null,
        eventType: "project.backfill",
        actorId: project.createdById,
        occurredAt: project.createdAt,
        summary:
          "Riwayat sebelum audit trail diaktifkan. Data sebelum tanggal ini mungkin tidak lengkap.",
        metadata: {
          status: project.status,
          code: project.code,
        },
      });
    }
  }

  return events.sort((a, b) => {
    const byTime = a.occurredAt.localeCompare(b.occurredAt);
    return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
  });
}

/**
 * Prototype server-side masking hook. All roles that can view a CRM project
 * may see RAB/finance values per the permission matrix, so authorized viewers
 * receive the full event. Assignee access is denied by readProjectEvents.
 */
export function maskProjectEventForViewer(
  event: ProjectEvent,
  viewer: User,
): ProjectEvent {
  if (viewer.role === "assignee") {
    return { ...event, metadata: {} };
  }
  return event;
}

export type ReadProjectEventsInput = {
  projectId: string;
  viewerId: string;
  step?: string | null;
  includeProjectLevel?: boolean;
  cursor?: string;
  limit?: number;
};

export type ReadProjectEventsResult = {
  events: ProjectEvent[];
  nextCursor: string | null;
  total: number;
};

/**
 * Endpoint-like read: permission check, step filter, descending time order,
 * cursor pagination, and viewer masking.
 */
export function readProjectEvents(
  state: AppState,
  input: ReadProjectEventsInput,
): ReadProjectEventsResult {
  const viewer = userById(state, input.viewerId);
  const project = state.projects.find((item) => item.id === input.projectId);
  if (!viewer || !project || !canViewProject(state, viewer, project)) {
    return { events: [], nextCursor: null, total: 0 };
  }

  let events = state.projectEvents
    .filter((event) => event.projectId === input.projectId)
    .sort((a, b) => {
      const byTime = b.occurredAt.localeCompare(a.occurredAt);
      return byTime !== 0 ? byTime : b.id.localeCompare(a.id);
    });

  if (input.step === null) {
    events = events.filter((event) => event.step === null);
  } else if (input.step) {
    events = events.filter(
      (event) =>
        event.step === input.step ||
        (input.includeProjectLevel === true && event.step === null),
    );
  }

  const limit = Math.min(100, Math.max(1, input.limit ?? 20));
  const cursorIndex = input.cursor
    ? events.findIndex((event) => event.id === input.cursor)
    : -1;
  const start = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const page = events.slice(start, start + limit);
  const masked = page.map((event) =>
    maskProjectEventForViewer(event, viewer),
  );
  const nextCursor =
    start + limit < events.length
      ? masked[masked.length - 1]?.id ?? null
      : null;

  return { events: masked, nextCursor, total: events.length };
}
