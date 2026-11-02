import { PM_ROLES } from "@/lib/role-constants";
/** Labels & styling aligned with Trackly reference (`_reference/js/modules/meetings.js`). */


export const MEETING_TYPE_LABELS: Record<string, string> = {
  internal: "Internal",
  client_meeting: "Client Meeting",
  sprint_review: "Sprint Review",
  retrospective: "Retrospective",
  other: "Lainnya",
  client: "Client Meeting",
  review: "Sprint Review",
};

export const MEETING_TYPE_OPTIONS = [
  { value: "internal", label: "Internal" },
  { value: "client_meeting", label: "Client Meeting" },
  { value: "sprint_review", label: "Sprint Review" },
  { value: "retrospective", label: "Retrospective" },
  { value: "other", label: "Lainnya" },
] as const;

export const MEETING_TYPE_BAR_CLASS: Record<string, string> = {
  internal: "bg-blue-600",
  client_meeting: "bg-violet-600",
  client: "bg-violet-600",
  sprint_review: "bg-green-600",
  review: "bg-green-600",
  retrospective: "bg-amber-600",
  other: "bg-slate-500",
};

export const MEETING_STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "ongoing", label: "Ongoing" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
] as const;

/** Max meeting cards per page (aktif & riwayat). */
export const MEETINGS_LIST_PAGE_SIZE = 5;

/** Status untuk tab/kalender aktif. */
export const ACTIVE_MEETING_STATUS_CSV = "scheduled,ongoing";

/** Status untuk tab riwayat (termasuk alias legacy di DB). */
export const HISTORY_MEETING_STATUS_CSV = "done,cancelled,completed,canceled";

export const HISTORY_MEETING_STATUS_FILTER_OPTIONS = [
  { value: "__all", label: "Semua" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
] as const;

/** CSV status untuk API riwayat sesuai filter UI. */
export function historyMeetingStatusCsv(filter: string) {
  if (filter === "__all") return HISTORY_MEETING_STATUS_CSV;
  if (filter === "done") return "done,completed";
  if (filter === "cancelled") return "cancelled,canceled";
  return filter;
}

export const MEETING_STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Scheduled",
    className: "border-sky-200 bg-sky-50 text-sky-800",
  },
  ongoing: {
    label: "Ongoing",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  done: {
    label: "Done",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  completed: {
    label: "Done",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-rose-200 bg-rose-50 text-rose-800",
  },
  canceled: {
    label: "Cancelled",
    className: "border-rose-200 bg-rose-50 text-rose-800",
  },
};

export function meetingTypeLabel(type: string) {
  return MEETING_TYPE_LABELS[type] ?? type;
}

export function meetingTypeBarClass(type: string) {
  return MEETING_TYPE_BAR_CLASS[type] ?? "bg-slate-400";
}

export function normalizeMeetingTypeForForm(type: string) {
  const map: Record<string, string> = {
    client: "client_meeting",
    review: "sprint_review",
  };
  return map[type] ?? type;
}

/** Map stored status to Trackly-style canonical status for UI / PATCH. */
export function canonicalMeetingStatus(status: string) {
  if (status === "completed") return "done";
  if (status === "canceled") return "cancelled";
  return status;
}

export function meetingStatusBadge(status: string) {
  const key = canonicalMeetingStatus(status);
  return (
    MEETING_STATUS_BADGE[key] ?? {
      label: status,
      className: "border-zinc-200 bg-zinc-50 text-zinc-700",
    }
  );
}

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function normalizeMeetingRole(role: string | undefined | null) {
  return String(role ?? "").trim().toLowerCase();
}

/** Admin / administrator melihat semua meeting; selaras dengan `meetingAccessWhere` di backend. */
export function isMeetingsAdminRole(role: string | undefined | null) {
  const n = normalizeMeetingRole(role);
  return n === "admin" || n === "administrator";
}

/** PM — boleh mengubah konten meeting selesai (agenda, notulensi). */
export function isMeetingsPmRole(role: string | undefined | null) {
  return (PM_ROLES as readonly string[]).includes(normalizeMeetingRole(role));
}

export function isMeetingCreator(
  meeting: { createdBy: { id: string } },
  userId: string,
) {
  return !!userId && meeting.createdBy.id === userId;
}

/** Edit & hapus card meeting aktif: pembuat rapat atau admin/administrator. */
export function canEditDeleteActiveMeeting(
  meeting: { createdBy: { id: string } },
  userId: string,
  role: string | undefined | null,
) {
  return isMeetingsAdminRole(role) || isMeetingCreator(meeting, userId);
}

/** Edit & hapus card riwayat meeting: admin/administrator saja. */
export function canEditDeleteHistoryMeeting(role: string | undefined | null) {
  return isMeetingsAdminRole(role);
}

/** Hapus peserta dari modal: pembuat rapat atau admin/administrator. */
export function canRemoveMeetingParticipants(
  meeting: { createdBy: { id: string } },
  userId: string,
  role: string | undefined | null,
) {
  return isMeetingsAdminRole(role) || isMeetingCreator(meeting, userId);
}

/** Ubah konten meeting (agenda, notulensi): admin/administrator/pm; meeting selesai hanya admin/pm. */
export function canEditMeetingContent(
  role: string | undefined | null,
  status: string,
) {
  const isDone = canonicalMeetingStatus(status) === "done";
  if (isDone) {
    return isMeetingsAdminRole(role) || isMeetingsPmRole(role);
  }
  return isMeetingsAdminRole(role) || isMeetingsPmRole(role);
}

/** Pembuat atau peserta undangan (bukan admin global). */
export function isUserInvolvedInMeeting(
  meeting: {
    createdBy: { id: string };
    attendees: { user: { id: string } }[];
  },
  userId: string,
) {
  if (!userId) return false;
  if (meeting.createdBy.id === userId) return true;
  return meeting.attendees.some((a) => a.user.id === userId);
}
