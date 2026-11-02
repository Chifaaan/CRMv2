"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addMonths,
  addWeeks,
  format,
  isSameDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  History,
  ListFilter,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MeetingFormDialog } from "@/components/features/meetings/MeetingFormDialog";
import { MeetingParticipantsDialog } from "@/components/features/meetings/MeetingParticipantsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserProfileTrigger } from "@/components/features/users/UserProfileTrigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import {
  ACTIVE_MEETING_STATUS_CSV,
  canEditDeleteActiveMeeting,
  canEditDeleteHistoryMeeting,
  canRemoveMeetingParticipants,
  HISTORY_MEETING_STATUS_FILTER_OPTIONS,
  historyMeetingStatusCsv,
  initialsFromName,
  isMeetingsAdminRole,
  isUserInvolvedInMeeting,
  MEETINGS_LIST_PAGE_SIZE,
  MEETING_TYPE_OPTIONS,
  meetingStatusBadge,
  meetingTypeBarClass,
  meetingTypeLabel,
} from "@/lib/meetings-constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isAdminOrPmRole } from "@/lib/role-constants";

type MeetingListRow = {
  id: string;
  title: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  location: string | null;
  createdBy: {
    id: string;
    name: string;
    image: string | null;
    role: string;
    clientId: string | null;
  };
  projects: { project: { id: string; name: string } }[];
  attendees: {
    user: {
      id: string;
      name: string;
      image: string | null;
      role: string;
      clientId: string | null;
    };
  }[];
  agendaItems: { done: boolean }[];
};

function toYmd(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function agendaProgress(items: { done: boolean }[]) {
  const total = items.length;
  if (total === 0) return { done: 0, total: 0 };
  const done = items.filter((i) => i.done).length;
  return { done, total };
}

function MeetingsFixedPagination({
  total,
  page,
  onPageChange,
  disabled,
}: {
  total: number;
  page: number;
  onPageChange: (next: number) => void;
  disabled?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / MEETINGS_LIST_PAGE_SIZE) || 1);
  const safePage = Math.min(Math.max(1, page), pages);
  if (total <= MEETINGS_LIST_PAGE_SIZE) return null;

  const from = (safePage - 1) * MEETINGS_LIST_PAGE_SIZE + 1;
  const to = Math.min(safePage * MEETINGS_LIST_PAGE_SIZE, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-zinc-100 pt-4 sm:flex-row">
      <p className="text-sm text-zinc-500">
        Menampilkan{" "}
        <span className="font-medium tabular-nums text-zinc-800">
          {from}–{to}
        </span>{" "}
        dari{" "}
        <span className="font-medium tabular-nums text-zinc-800">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          aria-label="Halaman sebelumnya"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[7rem] px-2 text-center text-sm tabular-nums text-zinc-600">
          Halaman {safePage} / {pages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          aria-label="Halaman berikutnya"
          disabled={disabled || safePage >= pages}
          onClick={() => onPageChange(Math.min(pages, safePage + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function MeetingCardRow({
  m,
  canEditDelete,
  openEdit,
  openParticipants,
  setDeleteTarget,
  showDateLine,
}: {
  m: MeetingListRow;
  canEditDelete: boolean;
  openEdit: (id: string) => void;
  openParticipants: (row: MeetingListRow) => void;
  setDeleteTarget: (row: MeetingListRow | null) => void;
  showDateLine?: boolean;
}) {
  const st = meetingStatusBadge(m.status);
  const { done, total } = agendaProgress(m.agendaItems ?? []);
  const bar = meetingTypeBarClass(m.type);
  const inviteeFaces = (m.attendees ?? []).filter(
    (a) => a.user.id !== m.createdBy.id,
  );

  return (
    <li
      className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex gap-0">
        <div className={cn("w-1 shrink-0", bar)} aria-hidden />
        <div className="min-w-0 flex-1 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link
              href={`/meetings/${m.id}`}
              className="min-w-0 flex-1 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs font-medium",
                    st.className,
                  )}
                >
                  {st.label}
                </span>
                <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700">
                  {meetingTypeLabel(m.type)}
                </span>
              </div>
              <p className="font-semibold text-zinc-900 group-hover:text-blue-600">
                {m.title}
              </p>
              {showDateLine ? (
                <p className="text-xs font-medium text-zinc-500">
                  {format(new Date(m.date), "EEEE, d MMMM yyyy")}
                </p>
              ) : null}
              <p className="text-sm text-zinc-600">
                {m.startTime} – {m.endTime}
                {m.location ? ` · ${m.location}` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                <span className="shrink-0 font-medium text-zinc-500">
                  Pembuat
                </span>
                <UserProfileTrigger userId={m.createdBy.id}>
                  <Avatar className="size-6 border border-zinc-200">
                    <AvatarImage
                      src={m.createdBy.image ?? undefined}
                      alt=""
                    />
                    <AvatarFallback className="text-[9px]">
                      {initialsFromName(m.createdBy.name)}
                    </AvatarFallback>
                  </Avatar>
                </UserProfileTrigger>
                <UserProfileTrigger userId={m.createdBy.id} className="min-w-0 rounded-sm">
                  <span className="truncate font-medium text-zinc-800">
                    {m.createdBy.name}
                  </span>
                </UserProfileTrigger>
              </div>
              {inviteeFaces.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-zinc-500">
                  <span className="shrink-0 font-medium">Undangan</span>
                  <div className="flex -space-x-2">
                    {inviteeFaces.slice(0, 6).map((a) => (
                      <UserProfileTrigger key={a.user.id} userId={a.user.id}>
                        <Avatar className="size-6 border-2 border-white">
                          <AvatarImage src={a.user.image ?? undefined} alt="" />
                          <AvatarFallback className="text-[9px]">
                            {initialsFromName(a.user.name)}
                          </AvatarFallback>
                        </Avatar>
                      </UserProfileTrigger>
                    ))}
                  </div>
                </div>
              ) : null}
              {m.projects.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {m.projects.map((p) => (
                    <span
                      key={p.project.id}
                      className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-800"
                    >
                      {p.project.name}
                    </span>
                  ))}
                </div>
              ) : null}
              {total > 0 ? (
                <p className="text-xs text-zinc-500">
                  Agenda {done}/{total} selesai
                </p>
              ) : null}
            </Link>
            <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Aksi"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[11.5rem]">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      openParticipants(m);
                    }}
                  >
                    <Users className="mr-2 h-3.5 w-3.5" />
                    Peserta rapat
                  </DropdownMenuItem>
                  {canEditDelete ? (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(m.id);
                        }}
                      >
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(m);
                        }}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Hapus
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export function MeetingsPageClient() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const userId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const canManageMeetings = isAdminOrPmRole(role);
  const isMeetingsAdmin = isMeetingsAdminRole(role);

  const [calendarMode, setCalendarMode] = useState<"month" | "week">("month");
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editMeetingId, setEditMeetingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MeetingListRow | null>(
    null,
  );
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participantsMeeting, setParticipantsMeeting] =
    useState<MeetingListRow | null>(null);
  const [participantsSessionKey, setParticipantsSessionKey] = useState(0);

  const [mainTab, setMainTab] = useState<"calendar" | "history">("calendar");

  const [histSearch, setHistSearch] = useState("");
  const deferredHistSearch = useDeferredValue(histSearch.trim());
  const [histTimeScope, setHistTimeScope] = useState<
    "all" | "past" | "upcoming"
  >("all");
  const [histStatus, setHistStatus] = useState<string>("__all");
  const [histType, setHistType] = useState<string>("__all");
  const [histProjectId, setHistProjectId] = useState<string>("__all");
  const [histDayPage, setHistDayPage] = useState(1);
  const [activeDayPage, setActiveDayPage] = useState(1);
  const [histFilterOpen, setHistFilterOpen] = useState(false);

  useEffect(() => {
    setHistDayPage(1);
  }, [
    deferredHistSearch,
    histTimeScope,
    histStatus,
    histType,
    histProjectId,
    selectedDate,
  ]);

  useEffect(() => {
    setActiveDayPage(1);
  }, [selectedDate]);

  type ProjectOption = { id: string; name: string; code: string };

  const projectsHistQ = useQuery({
    queryKey: ["projects", "meetings-history-filter"],
    queryFn: async () => {
      const res = await api.get<ProjectOption[]>("/api/projects");
      return res.data;
    },
    enabled: mainTab === "history",
    staleTime: 60_000,
  });

  const historyStatusCsv = historyMeetingStatusCsv(histStatus);

  const range = useMemo(() => {
    if (calendarMode === "month") {
      const start = startOfMonth(monthCursor);
      const end = endOfMonth(monthCursor);
      return { from: toYmd(start), to: toYmd(end) };
    }
    const anchor = weekAnchor;
    const ws = startOfWeek(anchor, { weekStartsOn: 0 });
    const we = endOfWeek(anchor, { weekStartsOn: 0 });
    return { from: toYmd(ws), to: toYmd(we) };
  }, [calendarMode, monthCursor, weekAnchor]);

  const historyCalendarParams = useMemo(() => {
    const params: Record<string, string> = {
      from: range.from,
      to: range.to,
      order: "desc",
      status: historyStatusCsv,
    };
    if (deferredHistSearch) params.q = deferredHistSearch;
    if (histType !== "__all") params.type = histType;
    if (histProjectId !== "__all") params.projectId = histProjectId;
    if (histTimeScope === "past") params.past = "true";
    if (histTimeScope === "upcoming") params.upcoming = "true";
    return params;
  }, [
    deferredHistSearch,
    histProjectId,
    histTimeScope,
    histType,
    historyStatusCsv,
    range.from,
    range.to,
  ]);

  const meetingsHistCalendarQ = useQuery({
    queryKey: ["meetings", "history-calendar", historyCalendarParams],
    queryFn: async () => {
      const res = await api.get<MeetingListRow[]>("/api/meetings", {
        params: historyCalendarParams,
      });
      return res.data;
    },
    enabled: mainTab === "history",
    refetchInterval: 60_000,
  });

  const meetingHistTimeSelectItems = useMemo(
    () => [
      { value: "all", label: "Semua" },
      { value: "past", label: "Sudah lewat" },
      { value: "upcoming", label: "Mendatang" },
    ],
    [],
  );

  const meetingHistStatusSelectItems = useMemo(
    () =>
      HISTORY_MEETING_STATUS_FILTER_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
      })),
    [],
  );

  const meetingHistTypeSelectItems = useMemo(
    () => [
      { value: "__all", label: "Semua" },
      ...MEETING_TYPE_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
      })),
    ],
    [],
  );

  const meetingHistProjectSelectItems = useMemo(() => {
    const rows = [{ value: "__all", label: "Semua" }];
    for (const p of projectsHistQ.data ?? []) {
      rows.push({ value: p.id, label: p.name });
    }
    return rows;
  }, [projectsHistQ.data]);

  const histActiveFilterCount = useMemo(() => {
    let n = 0;
    if (histTimeScope !== "all") n += 1;
    if (histStatus !== "__all") n += 1;
    if (histType !== "__all") n += 1;
    if (histProjectId !== "__all") n += 1;
    return n;
  }, [histProjectId, histStatus, histTimeScope, histType]);

  function resetHistFilters() {
    setHistTimeScope("all");
    setHistStatus("__all");
    setHistType("__all");
    setHistProjectId("__all");
  }

  const meetingsQ = useQuery({
    queryKey: ["meetings", "active", range.from, range.to],
    queryFn: async () => {
      const res = await api.get<MeetingListRow[]>("/api/meetings", {
        params: {
          from: range.from,
          to: range.to,
          status: ACTIVE_MEETING_STATUS_CSV,
        },
      });
      return res.data;
    },
    enabled: mainTab === "calendar",
    refetchInterval: 60_000,
  });

  const visibleMeetings = useMemo(() => {
    const rows = meetingsQ.data ?? [];
    if (isMeetingsAdmin) return rows;
    return rows.filter((m) => isUserInvolvedInMeeting(m, userId));
  }, [isMeetingsAdmin, meetingsQ.data, userId]);

  const visibleHistCalendarMeetings = useMemo(() => {
    const rows = meetingsHistCalendarQ.data ?? [];
    if (isMeetingsAdmin) return rows;
    return rows.filter((m) => isUserInvolvedInMeeting(m, userId));
  }, [isMeetingsAdmin, meetingsHistCalendarQ.data, userId]);

  function groupMeetingsByDate(rows: MeetingListRow[]) {
    const map = new Map<string, MeetingListRow[]>();
    for (const m of rows) {
      const key = format(new Date(m.date), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    return map;
  }

  function sortDayMeetings(list: MeetingListRow[]) {
    return list.slice().sort((a, b) => {
      const ta = a.startTime.localeCompare(b.startTime);
      if (ta !== 0) return ta;
      return a.title.localeCompare(b.title);
    });
  }

  const byDate = useMemo(
    () => groupMeetingsByDate(visibleMeetings),
    [visibleMeetings],
  );

  const histByDate = useMemo(
    () => groupMeetingsByDate(visibleHistCalendarMeetings),
    [visibleHistCalendarMeetings],
  );

  const calendarByDate = mainTab === "calendar" ? byDate : histByDate;

  const dayMeetings = useMemo(() => {
    const key = toYmd(selectedDate);
    return sortDayMeetings(byDate.get(key) ?? []);
  }, [byDate, selectedDate]);

  const histDayMeetings = useMemo(() => {
    const key = toYmd(selectedDate);
    return sortDayMeetings(histByDate.get(key) ?? []);
  }, [histByDate, selectedDate]);

  const currentDayMeetings =
    mainTab === "calendar" ? dayMeetings : histDayMeetings;

  const currentDayPage = mainTab === "calendar" ? activeDayPage : histDayPage;
  const setCurrentDayPage =
    mainTab === "calendar" ? setActiveDayPage : setHistDayPage;

  const currentMeetingsQuery =
    mainTab === "calendar" ? meetingsQ : meetingsHistCalendarQ;

  const paginatedCurrentDayMeetings = useMemo(() => {
    const start = (currentDayPage - 1) * MEETINGS_LIST_PAGE_SIZE;
    return currentDayMeetings.slice(start, start + MEETINGS_LIST_PAGE_SIZE);
  }, [currentDayMeetings, currentDayPage]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/meetings/${id}`);
    },
    onSuccess: async () => {
      toast.success("Meeting dihapus");
      setDeleteTarget(null);
      await qc.invalidateQueries({ queryKey: ["meetings"] });
    },
    onError: () => toast.error("Gagal menghapus meeting"),
  });

  const monthLabel = format(monthCursor, "MMMM yyyy");
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekLabel = `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`;

  function openCreate() {
    setFormMode("create");
    setEditMeetingId(null);
    setFormOpen(true);
  }

  function openEdit(id: string) {
    setFormMode("edit");
    setEditMeetingId(id);
    setFormOpen(true);
  }

  function openParticipants(row: MeetingListRow) {
    setParticipantsMeeting(row);
    setParticipantsSessionKey((k) => k + 1);
    setParticipantsOpen(true);
  }

  const year = monthCursor.getFullYear();
  const monthIdx = monthCursor.getMonth();
  const firstDow = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const monthCells: (Date | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, monthIdx, i + 1)),
  ];

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const dowHeaders = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  return (
    <div className="meetings-page space-y-6">
      <MeetingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        meetingId={editMeetingId ?? undefined}
        defaultDateYmd={toYmd(selectedDate)}
      />

      {participantsMeeting ? (
        <MeetingParticipantsDialog
          key={participantsSessionKey}
          open={participantsOpen}
          onOpenChange={setParticipantsOpen}
          meeting={participantsMeeting}
          canRemoveParticipants={canRemoveMeetingParticipants(
            participantsMeeting,
            userId,
            role,
          )}
          onParticipantsUpdated={() => {
            void qc.invalidateQueries({ queryKey: ["meetings"] });
            void qc.invalidateQueries({ queryKey: ["meetings-hist"] });
            void qc.invalidateQueries({ queryKey: ["meetings-hist-count"] });
          }}
        />
      ) : null}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.title}” akan dihapus permanen beserta agenda dan notulensi.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteMut.mutate(deleteTarget.id);
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900">
            <CalendarIcon className="h-7 w-7 text-blue-600" aria-hidden />
            Meetings
          </h1>
          <p className="text-sm text-zinc-600">
            Jadwalkan, kelola, dan dokumentasikan rapat tim
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5"
            role="group"
            aria-label="Tampilan kalender"
          >
            <Button
              type="button"
              variant={calendarMode === "month" ? "default" : "ghost"}
              size="sm"
              className="h-8 rounded-md px-3 text-xs"
              onClick={() => setCalendarMode("month")}
            >
              Bulan
            </Button>
            <Button
              type="button"
              variant={calendarMode === "week" ? "default" : "ghost"}
              size="sm"
              className="h-8 rounded-md px-3 text-xs"
              onClick={() => {
                setCalendarMode("week");
                setWeekAnchor(selectedDate);
              }}
            >
              Minggu
            </Button>
          </div>
          {mainTab === "calendar" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setMainTab("history")}
            >
              <History className="h-4 w-4 shrink-0" aria-hidden />
              Riwayat
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setMainTab("calendar")}
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              Kalender
            </Button>
          )}
          {canManageMeetings ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              Meeting baru
            </Button>
          ) : null}
        </div>
      </header>

      {mainTab === "history" ? (
        <Dialog open={histFilterOpen} onOpenChange={setHistFilterOpen}>
          <DialogContent
            showCloseButton
            className="max-h-[85vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md"
          >
            <DialogHeader>
              <DialogTitle>Filter riwayat</DialogTitle>
              <DialogDescription>
                Sempitkan daftar menurut tanggal, status, jenis, atau proyek.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-1">
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Select
                  value={histTimeScope}
                  onValueChange={(v) => {
                    if (v === "all" || v === "past" || v === "upcoming") {
                      setHistTimeScope(v);
                    }
                  }}
                  items={meetingHistTimeSelectItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Rentang waktu" />
                  </SelectTrigger>
                  <SelectContent>
                    {meetingHistTimeSelectItems.map((it) => (
                      <SelectItem key={it.value} value={it.value}>
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={histStatus}
                  onValueChange={(v) => setHistStatus(v ?? "__all")}
                  items={meetingHistStatusSelectItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {meetingHistStatusSelectItems.map((it) => (
                      <SelectItem key={it.value} value={it.value}>
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select
                  value={histType}
                  onValueChange={(v) => setHistType(v ?? "__all")}
                  items={meetingHistTypeSelectItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    {meetingHistTypeSelectItems.map((it) => (
                      <SelectItem key={it.value} value={it.value}>
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Proyek</Label>
                <Select
                  value={histProjectId}
                  onValueChange={(v) => setHistProjectId(v ?? "__all")}
                  items={meetingHistProjectSelectItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Proyek" />
                  </SelectTrigger>
                  <SelectContent>
                    {meetingHistProjectSelectItems.map((it) => (
                      <SelectItem key={it.value} value={it.value}>
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="-mx-4 flex-row flex-wrap gap-2 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={histActiveFilterCount === 0}
                onClick={() => {
                  resetHistFilters();
                }}
              >
                Reset filter
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setHistFilterOpen(false)}
              >
                Selesai
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,280px)_1fr] lg:items-start">
        <aside className="lg:sticky lg:top-4">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 p-4">
              {calendarMode === "month" ? (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Bulan sebelumnya"
                      onClick={() => setMonthCursor((d) => subMonths(d, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold text-zinc-900">
                      {monthLabel}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Bulan berikutnya"
                      onClick={() => setMonthCursor((d) => addMonths(d, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                    {dowHeaders.map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {monthCells.map((cell, idx) => {
                      if (!cell) {
                        return (
                          <div
                            key={`e-${idx}`}
                            className="aspect-square rounded-lg"
                          />
                        );
                      }
                      const key = toYmd(cell);
                      const has = (calendarByDate.get(key)?.length ?? 0) > 0;
                      const sel = isSameDay(cell, selectedDate);
                      const today = isSameDay(cell, new Date());
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedDate(cell)}
                          className={cn(
                            "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-medium transition-colors",
                            sel
                              ? "bg-blue-600 text-white shadow-sm"
                              : "text-zinc-700 hover:bg-zinc-100",
                            today &&
                              !sel &&
                              "ring-1 ring-inset ring-blue-400/60",
                          )}
                        >
                          {format(cell, "d")}
                          {has ? (
                            <span
                              className={cn(
                                "mt-0.5 h-1 w-1 rounded-full",
                                sel ? "bg-white" : "bg-blue-500",
                              )}
                              aria-hidden
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => {
                      const t = new Date();
                      setMonthCursor(t);
                      setSelectedDate(t);
                      setWeekAnchor(t);
                    }}
                  >
                    Hari ini
                  </Button>
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Minggu sebelumnya"
                      onClick={() => {
                        setWeekAnchor((d) => subWeeks(d, 1));
                        setSelectedDate((d) => subWeeks(d, 1));
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-center text-xs font-semibold text-zinc-900">
                      {weekLabel}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Minggu berikutnya"
                      onClick={() => {
                        setWeekAnchor((d) => addWeeks(d, 1));
                        setSelectedDate((d) => addWeeks(d, 1));
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((d) => {
                      const key = toYmd(d);
                      const count = calendarByDate.get(key)?.length ?? 0;
                      const sel = isSameDay(d, selectedDate);
                      const today = isSameDay(d, new Date());
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSelectedDate(d);
                            setWeekAnchor(d);
                          }}
                          className={cn(
                            "flex flex-col items-center rounded-lg border px-1 py-2 text-center transition-colors",
                            sel
                              ? "border-blue-500 bg-blue-50"
                              : "border-zinc-100 hover:bg-zinc-50",
                            today && "ring-1 ring-blue-400/50",
                          )}
                        >
                          <span className="text-[10px] font-medium uppercase text-zinc-400">
                            {format(d, "EEE")}
                          </span>
                          <span className="text-lg font-semibold tabular-nums text-zinc-900">
                            {format(d, "d")}
                          </span>
                          {count > 0 ? (
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => {
                      const t = new Date();
                      setWeekAnchor(t);
                      setSelectedDate(t);
                      setMonthCursor(t);
                    }}
                  >
                    Minggu ini
                  </Button>
                </>
              )}
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          {mainTab === "history" ? (
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Label htmlFor="meet-hist-search" className="sr-only">
                    Cari riwayat meeting
                  </Label>
                  <Input
                    id="meet-hist-search"
                    placeholder="Cari judul atau deskripsi…"
                    value={histSearch}
                    onChange={(e) => setHistSearch(e.target.value)}
                    autoComplete="off"
                    className="h-10"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 gap-2 sm:h-10"
                  aria-expanded={histFilterOpen}
                  onClick={() => setHistFilterOpen(true)}
                >
                  <ListFilter
                    className="h-4 w-4 shrink-0 text-zinc-600"
                    aria-hidden
                  />
                  Filter
                  {histActiveFilterCount > 0 ? (
                    <span className="inline-flex min-w-[1.25rem] justify-center rounded-md bg-blue-600 px-1.5 text-[11px] font-semibold text-white tabular-nums">
                      {histActiveFilterCount}
                    </span>
                  ) : null}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1 border-b border-zinc-200 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                {format(selectedDate, "EEEE, d MMMM yyyy")}
              </h2>
              <p className="text-sm text-zinc-500">
                {currentDayMeetings.length} rapat pada tanggal ini
              </p>
            </div>
          </div>

          {currentMeetingsQuery.isLoading ? (
            <p className="text-sm text-zinc-500">Memuat…</p>
          ) : currentMeetingsQuery.isError ? (
            <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 px-6 py-10 text-center text-sm text-rose-900">
              Gagal memuat meeting. Periksa koneksi atau coba lagi.
            </div>
          ) : currentDayMeetings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-zinc-700">
                {mainTab === "calendar"
                  ? "Tidak ada meeting di hari ini"
                  : "Tidak ada riwayat meeting di tanggal ini"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {mainTab === "calendar"
                  ? "Pilih tanggal lain atau buat meeting baru."
                  : "Pilih tanggal lain di kalender atau ubah filter pencarian."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <ul className="space-y-3">
                {paginatedCurrentDayMeetings.map((m) => (
                  <MeetingCardRow
                    key={m.id}
                    m={m}
                    canEditDelete={
                      mainTab === "calendar"
                        ? canEditDeleteActiveMeeting(m, userId, role)
                        : canEditDeleteHistoryMeeting(role)
                    }
                    openEdit={openEdit}
                    openParticipants={openParticipants}
                    setDeleteTarget={setDeleteTarget}
                  />
                ))}
              </ul>
              <MeetingsFixedPagination
                total={currentDayMeetings.length}
                page={currentDayPage}
                onPageChange={setCurrentDayPage}
                disabled={currentMeetingsQuery.isFetching}
              />
            </div>
          )}
        </section>
      </div>

    </div>
  );
}
