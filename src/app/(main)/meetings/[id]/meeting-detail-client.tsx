"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  GripVertical,
  Info,
  ListChecks,
  MapPin,
  Pencil,
  UserRoundPen,
  Users,
  X,
} from "lucide-react";
import { MeetingFormDialog } from "@/components/features/meetings/MeetingFormDialog";
import { NotulensiEditor } from "@/components/features/meetings/NotulensiEditor";
import {
  meetingNotulensiDraftKey,
  safeClearDraft,
} from "@/lib/local-draft";
import { UserProfileTrigger } from "@/components/features/users/UserProfileTrigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/lib/api/client";
import { toDownloadUrl } from "@/lib/attachment-url";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { useSession } from "@/lib/auth-client";
import {
  canEditDeleteActiveMeeting,
  canEditDeleteHistoryMeeting,
  canEditMeetingContent,
  canonicalMeetingStatus,
  initialsFromName,
  meetingStatusBadge,
  meetingTypeBarClass,
  meetingTypeLabel,
} from "@/lib/meetings-constants";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isAdminOrPmRole } from "@/lib/role-constants";

type MeetingDetail = {
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
  notulensiContent: string | null;
  projects: { project: { id: string; name: string; code: string } }[];
  attendees: {
    user: {
      id: string;
      name: string;
      image: string | null;
      role?: string;
      clientId?: string | null;
    };
  }[];
  agendaItems: { id: string; text: string; done: boolean; order: number }[];
  actionItems: {
    id: string;
    title: string;
    assigneeId: string | null;
    dueDate: string | null;
    done: boolean;
    taskId: string | null;
  }[];
  createdBy: { id: string; name: string; image: string | null };
  notulensiAttachments: {
    id: string;
    url: string;
    name: string;
    mimeType: string | null;
    size: number | null;
  }[];
  client: {
    id: string;
    companyName: string;
    contactPerson: string | null;
    contactEmail: string | null;
    logo: string | null;
  } | null;
};

function ymdFromIso(v: string | null) {
  if (!v) return "";
  try {
    return format(new Date(v), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

// ─── Main Component ───────────────────────────────────────────────────────

export function MeetingDetailClient({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const userId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const canEdit = role !== "viewer" && role !== "client";
  const canManageMeetingStatus = isAdminOrPmRole(role);

  const [newAgenda, setNewAgenda] = useState("");

  const [meetingDeleteOpen, setMeetingDeleteOpen] = useState(false);
  const [notulensiUploadBusy, setNotulensiUploadBusy] = useState(false);
  const [notulensiTab, setNotulensiTab] = useState<"editor" | "file">("editor");

  const [editOpen, setEditOpen] = useState(false);

  const q = useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: async () => {
      const res = await api.get<MeetingDetail>(`/api/meetings/${meetingId}`);
      return res.data;
    },
    retry: (failureCount, error) => {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 404 || status === 403) return false;
      return failureCount < 2;
    },
  });

  useEffect(() => {
    if (!q.isError) return;
    const status = isAxiosError(q.error) ? q.error.response?.status : undefined;
    if (status === 404 || status === 403) {
      toast.error("Meeting tidak ditemukan atau Anda tidak memiliki akses");
      router.replace("/meetings");
    }
  }, [q.isError, q.error, router]);

  const attendeeUsers = useMemo(() => {
    if (!q.data) return [];
    const creatorId = q.data.createdBy.id;
    return q.data.attendees
      .map((a) => a.user)
      .filter((u) => u.id !== creatorId);
  }, [q.data]);

  // ─── Mutations ──────────────────────────────────────────────────────────

  const saveNotes = useMutation({
    mutationFn: async ({
      html,
      silent,
    }: {
      html: string;
      silent?: boolean;
    }) => {
      await api.patch(`/api/meetings/${meetingId}/notulensi`, {
        content: html,
      });
      return { html, silent: !!silent };
    },
    onSuccess: async ({ html, silent }) => {
      safeClearDraft(meetingNotulensiDraftKey(meetingId));
      if (silent) {
        qc.setQueryData(
          ["meeting", meetingId],
          (old: MeetingDetail | undefined) =>
            old ? { ...old, notulensiContent: html } : old,
        );
      } else {
        toast.success("Notulensi disimpan");
        await qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
      }
    },
    onError: (_err, variables) =>
      toast.error(
        variables?.silent
          ? "Autosave notulensi gagal — cadangan lokal di perangkat ini tetap tersimpan"
          : "Gagal menyimpan notulensi",
      ),
  });

  const patchMeetingStatus = useMutation({
    mutationFn: async (status: string) => {
      await api.patch(`/api/meetings/${meetingId}`, { status });
    },
    onSuccess: async () => {
      toast.success("Status diperbarui");
      await qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
      await qc.invalidateQueries({ queryKey: ["meetings"] });
    },
    onError: () => toast.error("Gagal memperbarui status"),
  });

  const deleteMeeting = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/meetings/${meetingId}`);
    },
    onSuccess: async () => {
      toast.success("Meeting dihapus");
      await qc.invalidateQueries({ queryKey: ["meetings"] });
      router.push("/meetings");
    },
    onError: () => toast.error("Gagal menghapus meeting"),
  });

  const addAgenda = useMutation({
    mutationFn: async (text: string) => {
      await api.post(`/api/meetings/${meetingId}/agenda`, { text });
    },
    onSuccess: async () => {
      toast.success("Agenda ditambah");
      setNewAgenda("");
      await qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
    },
    onError: () => toast.error("Gagal menambah agenda"),
  });

  const patchAgenda = useMutation({
    mutationFn: async (p: {
      itemId: string;
      body: { text?: string; done?: boolean; order?: number };
    }) => {
      await api.patch(
        `/api/meetings/${meetingId}/agenda/${p.itemId}`,
        p.body,
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
    },
    onError: () => toast.error("Gagal memperbarui agenda"),
  });

  const reorderAgenda = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, idx) =>
          api.patch(`/api/meetings/${meetingId}/agenda/${id}`, {
            order: idx + 1,
          }),
        ),
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
    },
    onError: () => toast.error("Gagal mengurutkan agenda"),
  });

  async function uploadFiles(files: File[]) {
    setNotulensiUploadBusy(true);
    let successCount = 0;
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload?category=meetings", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        if (!res.ok) throw new Error("upload");
        const meta = (await res.json()) as {
          url: string;
          name: string;
          size: number;
          mimeType: string;
        };
        await api.post(`/api/meetings/${meetingId}/notulensi/attachments`, {
          url: meta.url,
          name: meta.name || file.name,
          mimeType: meta.mimeType,
          size: meta.size,
        });
        successCount++;
      } catch {
        toast.error(`Gagal mengunggah: ${file.name}`);
      }
    }
    if (successCount > 0) {
      await qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
      toast.success(
        successCount === 1
          ? "Lampiran ditambahkan"
          : `${successCount} lampiran ditambahkan`,
      );
    }
    setNotulensiUploadBusy(false);
  }

  async function removeNotulensiAttachment(attId: string) {
    try {
      await api.delete(
        `/api/meetings/${meetingId}/notulensi/attachments/${attId}`,
      );
      await qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
      toast.success("Lampiran dihapus");
    } catch {
      toast.error("Gagal menghapus lampiran");
    }
  }

  if (q.isError) {
    const status = isAxiosError(q.error) ? q.error.response?.status : undefined;
    if (status === 404 || status === 403) {
      return <p className="text-sm text-zinc-500">Mengalihkan…</p>;
    }
    return (
      <p className="text-sm text-red-600">
        Gagal memuat meeting. Silakan coba lagi.
      </p>
    );
  }

  if (q.isLoading || !q.data) {
    return <p className="text-sm text-zinc-500">Memuat…</p>;
  }

  const m = q.data;
  const agendaSorted = [...m.agendaItems].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id),
  );

  const isInvitedGuest =
    !canManageMeetingStatus &&
    canEdit &&
    !!userId &&
    m.createdBy.id !== userId &&
    m.attendees.some((a) => a.user.id === userId);

  const effStatus = canonicalMeetingStatus(m.status);
  const isHistoryMeeting =
    effStatus === "done" || effStatus === "cancelled";
  const canEditMeetingHeader = isHistoryMeeting
    ? canEditDeleteHistoryMeeting(role)
    : canEditDeleteActiveMeeting(m, userId, role);
  const canEditContent = canEditMeetingContent(role, m.status);
  const nextStatusAdvance =
    effStatus === "scheduled"
      ? "ongoing"
      : effStatus === "ongoing"
        ? "done"
        : null;
  const nextStatusLabel =
    nextStatusAdvance === "ongoing"
      ? "Ongoing"
      : nextStatusAdvance === "done"
        ? "Done"
        : null;

  const statusBadge = meetingStatusBadge(m.status);
  const doneAgenda = agendaSorted.filter((a) => a.done).length;
  const totalAgenda = agendaSorted.length;
  const agendaProgressPct =
    totalAgenda > 0 ? Math.round((doneAgenda / totalAgenda) * 100) : 0;

  const isClientMeeting = m.type === "client_meeting" || m.type === "client";

  const internalInvitees = attendeeUsers.filter(
    (u) => !u.clientId && u.role !== "client",
  );
  const clientInvitees = attendeeUsers.filter(
    (u) => u.clientId || u.role === "client",
  );

  return (
    <div className="meeting-detail-page space-y-6">
      <MeetingFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        meetingId={meetingId}
      />

      <AlertDialog open={meetingDeleteOpen} onOpenChange={setMeetingDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua agenda, notulensi, dan action item ikut terhapus. Tindakan
              ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMeeting.mutate()}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <Link
            href="/meetings"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 inline-flex gap-1 text-zinc-600",
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold text-white",
                meetingTypeBarClass(m.type),
              )}
            >
              {meetingTypeLabel(m.type)}
            </span>
            {isInvitedGuest ? (
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                Tamu undangan
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {m.title}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0 text-zinc-400" />
              {format(new Date(m.date), "d MMM yyyy")} · {m.startTime}–
              {m.endTime}
            </span>
            {m.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-zinc-400" />
                {m.location}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageMeetingStatus && nextStatusAdvance && nextStatusLabel ? (
            <Button
              type="button"
              size="sm"
              disabled={patchMeetingStatus.isPending}
              onClick={() => patchMeetingStatus.mutate(nextStatusAdvance)}
            >
              Tandai {nextStatusLabel}
            </Button>
          ) : null}
          {canManageMeetingStatus && effStatus !== "cancelled" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50"
              disabled={patchMeetingStatus.isPending}
              onClick={() => patchMeetingStatus.mutate("cancelled")}
            >
              Batalkan
            </Button>
          ) : null}
          {canEditMeetingHeader ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          ) : null}
          {canEditMeetingHeader ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setMeetingDeleteOpen(true)}
            >
              Hapus
            </Button>
          ) : null}
        </div>
      </header>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "rounded-md border px-2.5 py-0.5 text-xs font-medium",
              statusBadge.className,
            )}
          >
            {statusBadge.label}
          </span>
          <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
            {meetingTypeLabel(m.type)}
          </span>
          {m.projects.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {m.projects.map((p) => (
                <Link
                  key={p.project.id}
                  href={`/projects/${p.project.id}`}
                  className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-900 hover:bg-sky-100"
                >
                  {p.project.name}
                </Link>
              ))}
            </div>
          ) : null}
          {totalAgenda > 0 ? (
            <div className="ml-auto flex min-w-[200px] flex-1 flex-col gap-1 sm:max-w-xs">
              <span className="text-right text-xs text-zinc-500">
                {doneAgenda}/{totalAgenda} agenda selesai
              </span>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${agendaProgressPct}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(260px,320px)] lg:items-start">
        <div className="min-w-0 space-y-6">
          {/* Agenda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ListChecks className="h-4 w-4 text-zinc-500" />
                Agenda
              </CardTitle>
              {canEditContent ? (
                <p className="text-xs text-zinc-500">
                  Seret ikon grip untuk mengubah urutan (Admin / PM).
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <SortableAgendaBlock
                items={agendaSorted}
                canEdit={canEditContent}
                onPatch={(itemId, body) =>
                  patchAgenda.mutate({ itemId, body })
                }
                onReorder={(orderedIds) => reorderAgenda.mutate(orderedIds)}
                reordering={reorderAgenda.isPending}
              />
              {canEditContent ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={newAgenda}
                    onChange={(e) => setNewAgenda(e.target.value)}
                    placeholder="Poin agenda baru"
                  />
                  <Button
                    type="button"
                    disabled={!newAgenda.trim() || addAgenda.isPending}
                    onClick={() => addAgenda.mutate(newAgenda.trim())}
                  >
                    Tambah
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Notulensi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-4 w-4 text-zinc-500" />
                Notulensi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canEditContent ? (
                <Tabs
                  value={notulensiTab}
                  onValueChange={(v) =>
                    setNotulensiTab(v as "editor" | "file")
                  }
                >
                  <TabsList variant="line" className="w-full justify-start gap-1">
                    <TabsTrigger value="editor">Editor</TabsTrigger>
                    <TabsTrigger value="file">
                      Lampiran
                      {(m.notulensiAttachments ?? []).length > 0 && (
                        <span className="ml-1.5 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700">
                          {m.notulensiAttachments.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <div className="relative mt-3 h-[320px] sm:h-[420px]">
                    <TabsContent
                      value="editor"
                      className="absolute inset-0"
                    >
                      <NotulensiEditor
                        meetingId={meetingId}
                        initialContent={m.notulensiContent ?? ""}
                        saving={saveNotes.isPending}
                        onSave={(html, opts) =>
                          saveNotes.mutate({ html, silent: opts?.silent })
                        }
                      />
                    </TabsContent>

                    <TabsContent
                      value="file"
                      className="absolute inset-0 flex flex-col gap-3 overflow-y-auto"
                    >
                      {(m.notulensiAttachments ?? []).length > 0 ? (
                        <ul className="space-y-2 text-sm">
                          {m.notulensiAttachments.map((a) => (
                            <li
                              key={a.id}
                              className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2"
                            >
                              <a
                                href={toDownloadUrl(a.url)}
                                target="_blank"
                                rel="noreferrer"
                                {...(a.url.startsWith("/uploads/") ? { download: a.name } : {})}
                                className="min-w-0 flex-1 truncate text-primary underline"
                              >
                                {a.name}
                              </a>
                              {a.size ? (
                                <span className="shrink-0 text-xs text-zinc-400">
                                  {(a.size / 1024).toFixed(0)} KB
                                </span>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 text-zinc-400 hover:text-red-600"
                                onClick={() =>
                                  void removeNotulensiAttachment(a.id)
                                }
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <FileDropZone
                        busy={notulensiUploadBusy}
                        onFiles={(files) => void uploadFiles(files)}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              ) : (
                /* Read-only view for viewer / client roles */
                <div className="h-[420px] overflow-y-auto">
                  {m.notulensiContent?.trim() ? (
                    <div
                      className="prose prose-sm max-w-none rounded-lg border border-zinc-100 bg-zinc-50/50 p-4 dark:prose-invert
                        [&_h1]:text-xl [&_h1]:font-bold
                        [&_h2]:text-lg [&_h2]:font-semibold
                        [&_h3]:text-base [&_h3]:font-semibold
                        [&_ul]:pl-5 [&_ul>li]:list-disc
                        [&_ol]:pl-5 [&_ol>li]:list-decimal
                        [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-3 [&_blockquote]:italic
                        [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs
                        [&_pre]:rounded-md [&_pre]:bg-zinc-900 [&_pre]:p-3 [&_pre>code]:bg-transparent [&_pre>code]:text-zinc-100
                        [&_a]:text-blue-600 [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: m.notulensiContent }}
                    />
                  ) : (
                    <p className="text-sm text-zinc-500">
                      Belum ada notulensi untuk rapat ini.
                    </p>
                  )}
                  {(m.notulensiAttachments ?? []).length > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium">Lampiran</Label>
                      <ul className="mt-2 space-y-1 text-sm">
                        {m.notulensiAttachments.map((a) => (
                          <li key={a.id}>
                            <a
                              href={toDownloadUrl(a.url)}
                              target="_blank"
                              rel="noreferrer"
                              {...(a.url.startsWith("/uploads/") ? { download: a.name } : {})}
                              className="text-primary underline"
                            >
                              {a.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-4">
          <Card className="border-blue-200 bg-blue-50/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <UserRoundPen className="h-4 w-4 text-blue-700" />
                Pembuat rapat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <UserProfileTrigger userId={m.createdBy.id} className="shrink-0">
                  <Avatar className="size-10 ring-2 ring-blue-200">
                    <AvatarImage
                      src={m.createdBy.image ?? undefined}
                      alt=""
                    />
                    <AvatarFallback className="bg-blue-100 text-[11px] font-medium text-blue-900">
                      {initialsFromName(m.createdBy.name)}
                    </AvatarFallback>
                  </Avatar>
                </UserProfileTrigger>
                <div className="min-w-0">
                  <UserProfileTrigger userId={m.createdBy.id} className="rounded-sm">
                    <p className="font-semibold text-zinc-900">
                      {m.createdBy.name}
                    </p>
                  </UserProfileTrigger>
                  <p className="text-xs text-zinc-600">
                    Mengatur rapat ini sebagai pembuat; terpisah dari peserta
                    yang diundang.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invitees — MeetingAttendee only (never the creator) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-4 w-4 text-zinc-500" />
                Peserta undangan
              </CardTitle>
              <p className="text-xs font-normal text-zinc-500">
                Hanya yang ditambahkan sebagai undangan. Pembuat tidak muncul di
                daftar ini.
              </p>
            </CardHeader>
            <CardContent>
              {internalInvitees.length === 0 && clientInvitees.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Belum ada peserta undangan.
                </p>
              ) : (
                <ul className="space-y-3">
                  {internalInvitees.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <UserProfileTrigger userId={u.id} className="shrink-0">
                        <Avatar className="size-8">
                          <AvatarImage
                            src={u.image ?? undefined}
                            alt=""
                          />
                          <AvatarFallback className="text-[10px]">
                            {initialsFromName(u.name)}
                          </AvatarFallback>
                        </Avatar>
                      </UserProfileTrigger>
                      <UserProfileTrigger userId={u.id} className="rounded-sm">
                        <span className="font-medium text-zinc-800">
                          {u.name}
                        </span>
                      </UserProfileTrigger>
                    </li>
                  ))}
                  {clientInvitees.length > 0 &&
                  internalInvitees.length > 0 ? (
                    <li className="border-t border-zinc-100 pt-2">
                      <p className="mb-2 text-xs font-medium text-zinc-500">
                        Dari client
                      </p>
                    </li>
                  ) : null}
                  {clientInvitees.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <UserProfileTrigger userId={u.id} className="shrink-0">
                        <Avatar className="size-8">
                          <AvatarImage
                            src={u.image ?? undefined}
                            alt=""
                          />
                          <AvatarFallback className="bg-violet-100 text-[10px] text-violet-700">
                            {initialsFromName(u.name)}
                          </AvatarFallback>
                        </Avatar>
                      </UserProfileTrigger>
                      <UserProfileTrigger userId={u.id} className="rounded-sm">
                        <span className="font-medium text-zinc-800">
                          {u.name}
                        </span>
                      </UserProfileTrigger>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Client card — only for client meeting */}
          {isClientMeeting && m.client ? (
            <Card className="border-violet-200 bg-violet-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Building2 className="h-4 w-4 text-violet-600" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-semibold text-zinc-900">
                  {m.client.companyName}
                </p>
                {m.client.contactPerson ? (
                  <p className="text-sm text-zinc-600">
                    {m.client.contactPerson}
                  </p>
                ) : null}
                {m.client.contactEmail ? (
                  <a
                    href={`mailto:${m.client.contactEmail}`}
                    className="block text-sm text-blue-600 hover:underline"
                  >
                    {m.client.contactEmail}
                  </a>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* Description */}
          {m.description ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Info className="h-4 w-4 text-zinc-500" />
                  Deskripsi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-zinc-700">
                  {m.description}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function SortableAgendaBlock({
  items,
  canEdit,
  onPatch,
  onReorder,
  reordering,
}: {
  items: { id: string; text: string; done: boolean; order: number }[];
  canEdit: boolean;
  onPatch: (
    itemId: string,
    body: { text?: string; done?: boolean },
  ) => void;
  onReorder: (orderedIds: string[]) => void;
  reordering: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    onReorder(next.map((i) => i.id));
  }

  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">Belum ada agenda.</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul
          className={cn(
            "space-y-2",
            reordering && "pointer-events-none opacity-60",
          )}
        >
          {items.map((item) => (
            <SortableAgendaRow
              key={item.id}
              item={item}
              canEdit={canEdit}
              onPatch={onPatch}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableAgendaRow({
  item,
  canEdit,
  onPatch,
}: {
  item: { id: string; text: string; done: boolean; order: number };
  canEdit: boolean;
  onPatch: (
    itemId: string,
    body: { text?: string; done?: boolean },
  ) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-2 rounded-md border border-zinc-100 p-2 sm:flex-row sm:items-center",
        isDragging && "z-10 border-blue-300 bg-white shadow-md",
      )}
    >
      <div className="flex flex-1 items-start gap-2">
        {canEdit ? (
          <button
            type="button"
            className="mt-1 cursor-grab touch-none text-zinc-400 active:cursor-grabbing"
            aria-label="Seret untuk mengurutkan"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        <Checkbox
          disabled={!canEdit}
          checked={item.done}
          onCheckedChange={(c) => onPatch(item.id, { done: c === true })}
        />
        <AgendaTextRow
          key={item.id}
          disabled={!canEdit}
          initialText={item.text}
          onSave={(text) => onPatch(item.id, { text })}
        />
      </div>
    </li>
  );
}

function AgendaTextRow({
  initialText,
  disabled,
  onSave,
}: {
  initialText: string;
  disabled: boolean;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(initialText);
  return (
    <Input
      disabled={disabled}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text.trim() !== initialText.trim()) onSave(text.trim());
      }}
      className="flex-1"
    />
  );
}
