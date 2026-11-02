"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Building2,
  Calendar,
  Clock,
  Info,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import {
  isMeetingsAdminRole,
  MEETING_STATUS_OPTIONS,
  MEETING_TYPE_OPTIONS,
  normalizeMeetingTypeForForm,
} from "@/lib/meetings-constants";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  FormDraftKeys,
  clearFormDraft,
  loadFormDraftEnvelope,
} from "@/lib/form-draft-storage";
import { useDebouncedFormDraftSave } from "@/lib/hooks/use-debounced-form-draft-save";
import { PM_ROLES, isPmRole } from "@/lib/role-constants";

type ProjectOption = { id: string; name: string; code: string };

type UserRow = {
  id: string;
  name: string;
  role: string;
  status: string;
};

type ClientOption = {
  id: string;
  companyName: string;
};

type MemberRow = { user: { id: string; name: string; role: string } };

type MeetingDetailForForm = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  status: string;
  clientId: string | null;
  projects: { project: { id: string; name: string } }[];
  attendees: { user: { id: string; name: string } }[];
  createdBy: { id: string; name: string };
  agendaItems: { id: string; text: string; order: number }[];
};

function toYmd(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function ymdFromIso(v: string) {
  try {
    return format(new Date(v), "yyyy-MM-dd");
  } catch {
    return toYmd(new Date());
  }
}

let newAgendaKey = 0;
function nextAgendaKey() {
  newAgendaKey += 1;
  return `new:${newAgendaKey}`;
}

const MEETING_TYPE_SELECT_ITEMS = MEETING_TYPE_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
}));
const MEETING_STATUS_SELECT_ITEMS = MEETING_STATUS_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
}));

const INTERNAL_ROLES = ["admin", ...PM_ROLES, "view", "viewer"];

function internalMembersFromRows(rows: MemberRow[]) {
  const map = new Map<string, { id: string; name: string; role: string }>();
  for (const row of rows) {
    if (INTERNAL_ROLES.includes(row.user.role)) {
      map.set(row.user.id, {
        id: row.user.id,
        name: row.user.name,
        role: row.user.role,
      });
    }
  }
  return [...map.values()];
}

function allMembersFromRows(rows: MemberRow[]) {
  const map = new Map<string, { id: string; name: string; role: string }>();
  for (const row of rows) {
    map.set(row.user.id, {
      id: row.user.id,
      name: row.user.name,
      role: row.user.role,
    });
  }
  return [...map.values()];
}

function membersFromQueries(
  queries: { data?: MemberRow[] | undefined }[],
  includeAllRoles: boolean,
) {
  const rows: MemberRow[] = [];
  for (const q of queries) {
    if (q.data?.length) rows.push(...q.data);
  }
  return includeAllRoles
    ? allMembersFromRows(rows)
    : internalMembersFromRows(rows);
}

function ChecklistBox({
  label,
  headerRight,
  children,
  className,
}: {
  label: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {headerRight}
      </div>
      <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5">
        {children}
      </div>
    </div>
  );
}

export function MeetingFormDialog({
  open,
  onOpenChange,
  mode,
  meetingId,
  defaultDateYmd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  meetingId?: string;
  defaultDateYmd?: string;
}) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const sessionUserId =
    (session?.user as { id?: string } | undefined)?.id ?? "";
  const isAdmin = isMeetingsAdminRole(role);
  const isInternalUser = INTERNAL_ROLES.includes(role);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("internal");
  const [status, setStatus] = useState("scheduled");
  const [date, setDate] = useState(toYmd(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedClientUserIds, setSelectedClientUserIds] = useState<
    Set<string>
  >(new Set());
  const [agendaRows, setAgendaRows] = useState<{ id: string; text: string }[]>(
    [],
  );
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState("");
  const initialAgendaServerIds = useRef<Set<string>>(new Set());

  const isClientMeeting = type === "client_meeting";

  const detailQ = useQuery({
    queryKey: ["meeting", meetingId, "form"],
    queryFn: async () => {
      const res = await api.get<MeetingDetailForForm>(
        `/api/meetings/${meetingId}`,
      );
      return res.data;
    },
    enabled: open && mode === "edit" && !!meetingId,
  });

  useEffect(() => {
    if (!open) {
      setAttendeeSearchQuery("");
      return;
    }
    if (mode === "create") {
      const env = loadFormDraftEnvelope(FormDraftKeys.meetingCreate())?.payload;
      if (env && typeof env === "object") {
        const raw = env as {
          title?: string;
          description?: string;
          type?: string;
          status?: string;
          date?: string;
          startTime?: string;
          endTime?: string;
          location?: string;
          clientId?: string;
          selectedProjectIds?: string[];
          selectedAttendeeIds?: string[];
          selectedClientUserIds?: string[];
          agendaRows?: { id: string; text: string }[];
        };
        setTitle(raw.title ?? "");
        setDescription(raw.description ?? "");
        setType(raw.type ?? "internal");
        setStatus(raw.status ?? "scheduled");
        setDate(raw.date ?? defaultDateYmd ?? toYmd(new Date()));
        setStartTime(raw.startTime ?? "09:00");
        setEndTime(raw.endTime ?? "10:00");
        setLocation(raw.location ?? "");
        setClientId(raw.clientId ?? "");
        setSelectedProjectIds(new Set(raw.selectedProjectIds ?? []));
        setSelectedAttendeeIds(new Set(raw.selectedAttendeeIds ?? []));
        setSelectedClientUserIds(new Set(raw.selectedClientUserIds ?? []));
        setAgendaRows(
          Array.isArray(raw.agendaRows) && raw.agendaRows.length
            ? raw.agendaRows
            : [],
        );
        initialAgendaServerIds.current = new Set();
        return;
      }
      setTitle("");
      setDescription("");
      setType("internal");
      setStatus("scheduled");
      setDate(defaultDateYmd ?? toYmd(new Date()));
      setStartTime("09:00");
      setEndTime("10:00");
      setLocation("");
      setClientId("");
      setSelectedProjectIds(new Set());
      setSelectedAttendeeIds(new Set());
      setSelectedClientUserIds(new Set());
      setAgendaRows([]);
      initialAgendaServerIds.current = new Set();
      return;
    }
    const m = detailQ.data;
    if (!m || !meetingId) return;

    const applyMeetingDetailSeed = (meeting: MeetingDetailForForm) => {
      setTitle(meeting.title);
      setDescription(meeting.description ?? "");
      setType(normalizeMeetingTypeForForm(meeting.type));
      setStatus(
        meeting.status === "completed"
          ? "done"
          : meeting.status === "canceled"
            ? "cancelled"
            : meeting.status,
      );
      setDate(ymdFromIso(meeting.date));
      setStartTime(meeting.startTime);
      setEndTime(meeting.endTime);
      setLocation(meeting.location ?? "");
      setClientId(meeting.clientId ?? "");
      setSelectedProjectIds(new Set(meeting.projects.map((p) => p.project.id)));
      setSelectedAttendeeIds(
        new Set(
          meeting.attendees
            .map((a) => a.user.id)
            .filter((uid) => uid !== meeting.createdBy.id),
        ),
      );
      setSelectedClientUserIds(new Set());
      const sorted = [...meeting.agendaItems].sort(
        (a, b) => a.order - b.order || a.id.localeCompare(b.id),
      );
      const rows = sorted.map((i) => ({ id: i.id, text: i.text }));
      setAgendaRows(rows);
      initialAgendaServerIds.current = new Set(sorted.map((i) => i.id));
    };

    const env = loadFormDraftEnvelope(
      FormDraftKeys.meetingEdit(meetingId),
    )?.payload;
    if (env && typeof env === "object") {
      const raw = env as {
        title?: string;
        description?: string;
        type?: string;
        status?: string;
        date?: string;
        startTime?: string;
        endTime?: string;
        location?: string;
        clientId?: string;
        selectedProjectIds?: string[];
        selectedAttendeeIds?: string[];
        selectedClientUserIds?: string[];
        agendaRows?: { id: string; text: string }[];
        initialAgendaServerIdsList?: string[];
      };
      const sortedServer = [...m.agendaItems].sort(
        (a, b) => a.order - b.order || a.id.localeCompare(b.id),
      );
      const fallbackRows = sortedServer.map((i) => ({ id: i.id, text: i.text }));

      setTitle(raw.title ?? m.title);
      setDescription(raw.description ?? m.description ?? "");
      setType(raw.type ?? normalizeMeetingTypeForForm(m.type));
      setStatus(
        raw.status ??
          (m.status === "completed"
            ? "done"
            : m.status === "canceled"
              ? "cancelled"
              : m.status),
      );
      setDate(raw.date ?? ymdFromIso(m.date));
      setStartTime(raw.startTime ?? m.startTime);
      setEndTime(raw.endTime ?? m.endTime);
      setLocation(raw.location ?? m.location ?? "");
      setClientId(raw.clientId ?? m.clientId ?? "");
      setSelectedProjectIds(
        new Set(
          raw.selectedProjectIds ??
            m.projects.map((p) => p.project.id),
        ),
      );
      setSelectedAttendeeIds(
        new Set(
          raw.selectedAttendeeIds ??
            m.attendees
              .map((a) => a.user.id)
              .filter((uid) => uid !== m.createdBy.id),
        ),
      );
      setSelectedClientUserIds(
        new Set(raw.selectedClientUserIds ?? []),
      );
      setAgendaRows(
        raw.agendaRows?.length ? raw.agendaRows : fallbackRows,
      );
      initialAgendaServerIds.current = new Set(
        raw.initialAgendaServerIdsList?.length
          ? raw.initialAgendaServerIdsList
          : sortedServer.map((i) => i.id),
      );
      return;
    }
    applyMeetingDetailSeed(m);
  }, [open, mode, defaultDateYmd, detailQ.data, meetingId]);

  const meetingDraftKey =
    open && mode === "create"
      ? FormDraftKeys.meetingCreate()
      : open && mode === "edit" && meetingId
        ? FormDraftKeys.meetingEdit(meetingId)
        : null;

  const meetingDraftBump = `${title}|${description}|${type}|${status}|${date}|${startTime}|${endTime}|${location}|${clientId}|${[...selectedProjectIds].sort().join(",")}|${[...selectedAttendeeIds].sort().join(",")}|${[...selectedClientUserIds].sort().join(",")}|${JSON.stringify(agendaRows)}`;

  useDebouncedFormDraftSave(
    Boolean(meetingDraftKey),
    meetingDraftKey,
    () => {
      const hasContent =
        title.trim().length > 0 ||
        description.trim().length > 0 ||
        location.trim().length > 0 ||
        selectedProjectIds.size > 0 ||
        selectedAttendeeIds.size > 0 ||
        selectedClientUserIds.size > 0 ||
        agendaRows.some((r) => r.text.trim());
      if (!hasContent) return undefined;
      return {
        title,
        description,
        type,
        status,
        date,
        startTime,
        endTime,
        location,
        clientId,
        selectedProjectIds: [...selectedProjectIds],
        selectedAttendeeIds: [...selectedAttendeeIds],
        selectedClientUserIds: [...selectedClientUserIds],
        agendaRows,
        initialAgendaServerIdsList:
          mode === "edit" ? [...initialAgendaServerIds.current] : undefined,
      };
    },
    [meetingDraftBump, mode],
  );

  const projectsQ = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get<ProjectOption[]>("/api/projects");
      return res.data;
    },
    enabled: open,
  });

  const clientsQ = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await api.get<ClientOption[]>("/api/clients");
      return res.data;
    },
    enabled: open && isClientMeeting,
  });

  const usersQ = useQuery({
    queryKey: ["users", "all"],
    queryFn: async () => {
      const res = await api.get<UserRow[]>("/api/users");
      return res.data;
    },
    enabled: open && isInternalUser && selectedProjectIds.size === 0,
  });

  const clientUsersQ = useQuery({
    queryKey: ["client-portal-users", clientId],
    queryFn: async () => {
      const res = await api.get<UserRow[]>(
        `/api/clients/${clientId}/portal-users`,
      );
      return res.data;
    },
    enabled: open && isClientMeeting && !!clientId && (isAdmin || isPmRole(role)),
  });

  const memberQueries = useQueries({
    queries: [...selectedProjectIds].map((pid) => ({
      queryKey: ["project-members", pid],
      queryFn: async () => {
        const res = await api.get<MemberRow[]>(`/api/projects/${pid}/members`);
        return res.data;
      },
      enabled: open && selectedProjectIds.size > 0,
    })),
  });

  const allProjectMemberQueries = useQueries({
    queries: (projectsQ.data ?? []).map((p) => ({
      queryKey: ["project-members", p.id, "meeting-all"],
      queryFn: async () => {
        const res = await api.get<MemberRow[]>(`/api/projects/${p.id}/members`);
        return res.data;
      },
      enabled: open && selectedProjectIds.size === 0 && !isInternalUser,
    })),
  });

  const meetingCreatorId =
    mode === "edit" ? (detailQ.data?.createdBy.id ?? "") : sessionUserId;

  const internalAttendeeOptions = useMemo(() => {
    let options: { id: string; name: string; role: string }[];
    const noLinkedProject = selectedProjectIds.size === 0;

    if (!noLinkedProject) {
      options = membersFromQueries(memberQueries, false);
    } else if (isInternalUser && usersQ.data) {
      options = usersQ.data.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
      }));
    } else {
      options = membersFromQueries(allProjectMemberQueries, true);
    }

    if (meetingCreatorId) {
      options = options.filter((u) => u.id !== meetingCreatorId);
    }

    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [
    allProjectMemberQueries,
    isInternalUser,
    meetingCreatorId,
    memberQueries,
    selectedProjectIds.size,
    usersQ.data,
  ]);

  const attendeesLoading =
    selectedProjectIds.size > 0
      ? memberQueries.some((q) => q.isLoading)
      : isInternalUser
        ? usersQ.isLoading
        : allProjectMemberQueries.some((q) => q.isLoading);

  const deferredAttendeeSearch = useDeferredValue(
    attendeeSearchQuery.trim().toLowerCase(),
  );

  const filteredInternalAttendeeOptions = useMemo(() => {
    if (!deferredAttendeeSearch) return internalAttendeeOptions;
    return internalAttendeeOptions.filter((u) =>
      u.name.toLowerCase().includes(deferredAttendeeSearch),
    );
  }, [deferredAttendeeSearch, internalAttendeeOptions]);

  const clientUserOptions = useMemo(() => {
    return (clientUsersQ.data ?? [])
      .map((u) => ({ id: u.id, name: u.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clientUsersQ.data]);

  const saveCreate = useMutation({
    mutationFn: async () => {
      const inviteeIds = new Set([
        ...selectedAttendeeIds,
        ...selectedClientUserIds,
      ]);
      if (sessionUserId) inviteeIds.delete(sessionUserId);
      const res = await api.post<{ id: string }>("/api/meetings", {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        status,
        date,
        startTime,
        endTime,
        location: location.trim() || undefined,
        clientId: isClientMeeting && clientId ? clientId : null,
        projectIds:
          selectedProjectIds.size > 0 ? [...selectedProjectIds] : undefined,
        attendeeIds:
          inviteeIds.size > 0 ? [...inviteeIds] : undefined,
      });
      const id = res.data.id;
      for (const row of agendaRows) {
        const t = row.text.trim();
        if (!t) continue;
        await api.post(`/api/meetings/${id}/agenda`, { text: t });
      }
    },
    onSuccess: async () => {
      toast.success("Meeting dibuat");
      await qc.invalidateQueries({ queryKey: ["meetings"] });
      clearFormDraft(FormDraftKeys.meetingCreate());
      onOpenChange(false);
    },
    onError: () => toast.error("Gagal membuat meeting"),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!meetingId) return;
      const creatorId = detailQ.data?.createdBy.id;
      const inviteeIds = new Set([
        ...selectedAttendeeIds,
        ...selectedClientUserIds,
      ]);
      if (creatorId) inviteeIds.delete(creatorId);
      await api.patch(`/api/meetings/${meetingId}`, {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        status,
        date,
        startTime,
        endTime,
        location: location.trim() || null,
        clientId: isClientMeeting && clientId ? clientId : null,
        projectIds: [...selectedProjectIds],
        attendeeIds: [...inviteeIds],
      });
      for (const sid of initialAgendaServerIds.current) {
        if (!agendaRows.some((r) => r.id === sid)) {
          await api.delete(`/api/meetings/${meetingId}/agenda/${sid}`);
        }
      }
      for (const row of agendaRows) {
        const t = row.text.trim();
        if (row.id.startsWith("new:")) {
          if (t) await api.post(`/api/meetings/${meetingId}/agenda`, { text: t });
          continue;
        }
        if (!t) {
          await api.delete(`/api/meetings/${meetingId}/agenda/${row.id}`);
          continue;
        }
        await api.patch(`/api/meetings/${meetingId}/agenda/${row.id}`, {
          text: t,
        });
      }
    },
    onSuccess: async () => {
      toast.success("Meeting diperbarui");
      await qc.invalidateQueries({ queryKey: ["meetings"] });
      await qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
      if (meetingId) clearFormDraft(FormDraftKeys.meetingEdit(meetingId));
      onOpenChange(false);
    },
    onError: () => toast.error("Gagal menyimpan meeting"),
  });

  const busy =
    saveCreate.isPending ||
    saveEdit.isPending ||
    (mode === "edit" && detailQ.isFetching && !detailQ.data);

  function addAgendaRow() {
    setAgendaRows((prev) => [...prev, { id: nextAgendaKey(), text: "" }]);
  }

  function removeAgendaRow(id: string) {
    setAgendaRows((prev) => prev.filter((r) => r.id !== id));
  }

  function setAgendaText(id: string, text: string) {
    setAgendaRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, text } : r)),
    );
  }

  function toggleProject(id: string) {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAttendee(id: string) {
    setSelectedAttendeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleClientUser(id: string) {
    setSelectedClientUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllAttendees() {
    const visibleIds = filteredInternalAttendeeOptions.map((u) => u.id);
    if (visibleIds.length === 0) return;
    const allSelected = visibleIds.every((id) => selectedAttendeeIds.has(id));
    setSelectedAttendeeIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAllClientUsers() {
    const visibleIds = clientUserOptions.map((u) => u.id);
    if (visibleIds.length === 0) return;
    const allSelected = visibleIds.every((id) =>
      selectedClientUserIds.has(id),
    );
    setSelectedClientUserIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  function submit() {
    if (mode === "create") saveCreate.mutate();
    else saveEdit.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[min(90vh,740px)] sm:max-h-[90vh] sm:max-w-2xl sm:rounded-xl">
        <DialogHeader className="shrink-0 border-b border-zinc-100 px-4 py-5 text-left sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {mode === "create" ? "Meeting baru" : "Edit meeting"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {mode === "create"
                  ? "Isi detail, agenda, lalu hubungkan proyek dan peserta."
                  : "Perbarui informasi rapat, agenda, peserta, dan proyek."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 overflow-x-auto border-b border-zinc-100 px-4 pt-2 sm:px-6">
            <TabsList variant="line" className="w-full justify-start gap-4">
              <TabsTrigger value="details">
                <Info className="mr-1.5 h-3.5 w-3.5" />
                Detail
              </TabsTrigger>
              <TabsTrigger value="agenda">
                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                Agenda
              </TabsTrigger>
              <TabsTrigger value="people">
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Peserta & proyek
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-4 py-5 sm:px-6">
              <TabsContent value="details" className="mt-0 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mf-title" className="text-sm font-medium">
                    Judul <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="mf-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Judul rapat"
                    className="focus-visible:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mf-desc" className="text-sm font-medium">
                    Deskripsi
                  </Label>
                  <Textarea
                    id="mf-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Ringkasan atau konteks rapat…"
                    className="resize-none focus-visible:ring-blue-500"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Tipe</Label>
                    <Select
                      value={type}
                      onValueChange={(v) => {
                        setType(v ?? "internal");
                        if (v !== "client_meeting") {
                          setClientId("");
                          setSelectedClientUserIds(new Set());
                        }
                      }}
                      items={MEETING_TYPE_SELECT_ITEMS}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEETING_TYPE_SELECT_ITEMS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Status</Label>
                    <Select
                      value={status}
                      onValueChange={(v) => setStatus(v ?? "scheduled")}
                      items={MEETING_STATUS_SELECT_ITEMS}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEETING_STATUS_SELECT_ITEMS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isClientMeeting && (
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      <Building2 className="h-3.5 w-3.5 text-violet-600" />
                      Client
                    </Label>
                    {(() => {
                      const clientItems = [
                        { value: "__none__", label: "— Tidak ada —" },
                        ...(clientsQ.data ?? []).map((c) => ({
                          value: c.id,
                          label: c.companyName,
                        })),
                      ];
                      return (
                        <Select
                          value={clientId || "__none__"}
                          onValueChange={(v) =>
                            setClientId(v === "__none__" ? "" : (v ?? ""))
                          }
                          items={clientItems}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih perusahaan client…" />
                          </SelectTrigger>
                          <SelectContent>
                            {clientItems.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="mf-date"
                      className="flex items-center gap-1.5 text-sm font-medium"
                    >
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                      Tanggal
                    </Label>
                    <Input
                      id="mf-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                      Lokasi
                    </Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Opsional"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="mf-start"
                      className="flex items-center gap-1.5 text-sm font-medium"
                    >
                      <Clock className="h-3.5 w-3.5 text-zinc-500" />
                      Mulai
                    </Label>
                    <Input
                      id="mf-start"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="mf-end"
                      className="flex items-center gap-1.5 text-sm font-medium"
                    >
                      <Clock className="h-3.5 w-3.5 text-zinc-500" />
                      Selesai
                    </Label>
                    <Input
                      id="mf-end"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="agenda" className="mt-0 space-y-3">
                <p className="text-xs text-zinc-500">
                  Tambahkan poin agenda. Baris kosong diabaikan saat menyimpan.
                </p>
                <ul className="space-y-2">
                  {agendaRows.map((row) => (
                    <li key={row.id} className="flex gap-2">
                      <Input
                        value={row.text}
                        onChange={(e) =>
                          setAgendaText(row.id, e.target.value)
                        }
                        placeholder="Poin agenda"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-zinc-400 hover:text-red-600"
                        onClick={() => removeAgendaRow(row.id)}
                        aria-label="Hapus baris"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={addAgendaRow}
                >
                  <Plus className="h-4 w-4" />
                  Tambah poin
                </Button>
              </TabsContent>

              <TabsContent value="people" className="mt-0 space-y-4">
                <p className="rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 text-xs text-sky-900">
                  <span className="font-medium">Pembuat rapat</span> otomatis
                  tercatat dari akun Anda dan{" "}
                  <span className="font-medium">
                    tidak dicantumkan sebagai peserta undangan
                  </span>
                  .
                </p>
                <ChecklistBox label="Proyek terhubung">
                  {(projectsQ.data ?? []).length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      Tidak ada proyek.
                    </p>
                  ) : (
                    (projectsQ.data ?? []).map((p) => (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-white"
                      >
                        <Checkbox
                          checked={selectedProjectIds.has(p.id)}
                          onCheckedChange={() => toggleProject(p.id)}
                        />
                        <span>
                          {p.name}{" "}
                          <span className="text-zinc-400">({p.code})</span>
                        </span>
                      </label>
                    ))
                  )}
                </ChecklistBox>

                {isInternalUser && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Peserta undangan (internal)
                      </Label>
                      {filteredInternalAttendeeOptions.length > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                          onClick={toggleSelectAllAttendees}
                        >
                          Pilih semua
                        </Button>
                      ) : null}
                    </div>
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                        aria-hidden
                      />
                      <Input
                        aria-label="Cari peserta undangan"
                        placeholder="Cari nama peserta…"
                        value={attendeeSearchQuery}
                        onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                        autoComplete="off"
                        className="h-9 pl-9 text-sm"
                      />
                    </div>
                    <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5">
                      {attendeesLoading ? (
                        <p className="flex items-center gap-2 text-xs text-zinc-500">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Memuat peserta…
                        </p>
                      ) : internalAttendeeOptions.length === 0 ? (
                        <p className="text-xs text-zinc-500">
                          Tidak ada pengguna.
                        </p>
                      ) : filteredInternalAttendeeOptions.length === 0 ? (
                        <p className="text-xs text-zinc-500">
                          Tidak ada peserta yang cocok dengan pencarian.
                        </p>
                      ) : (
                        filteredInternalAttendeeOptions.map((u) => (
                          <label
                            key={u.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-white"
                          >
                            <Checkbox
                              checked={selectedAttendeeIds.has(u.id)}
                              onCheckedChange={() => toggleAttendee(u.id)}
                            />
                            <span>{u.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {isClientMeeting && clientId && (
                  <ChecklistBox
                    label={
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-violet-600" />
                        Peserta undangan (client)
                      </span>
                    }
                    headerRight={
                      clientUserOptions.length > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-violet-600 hover:text-violet-700"
                          onClick={toggleSelectAllClientUsers}
                        >
                          Pilih semua
                        </Button>
                      ) : undefined
                    }
                  >
                    {clientUsersQ.isLoading ? (
                      <p className="flex items-center gap-2 text-xs text-zinc-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Memuat…
                      </p>
                    ) : clientUserOptions.length === 0 ? (
                      <p className="text-xs text-zinc-500">
                        Tidak ada user dari client ini.
                      </p>
                    ) : (
                      clientUserOptions.map((u) => (
                        <label
                          key={u.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-white"
                        >
                          <Checkbox
                            checked={selectedClientUserIds.has(u.id)}
                            onCheckedChange={() => toggleClientUser(u.id)}
                          />
                          <span>{u.name}</span>
                        </label>
                      ))
                    )}
                  </ChecklistBox>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="shrink-0 gap-2 border-t border-zinc-100 bg-zinc-50/50 px-4 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            type="button"
            disabled={!title.trim() || busy}
            onClick={() => submit()}
            className="min-w-[110px]"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan…
              </>
            ) : mode === "create" ? (
              "Buat meeting"
            ) : (
              "Simpan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
