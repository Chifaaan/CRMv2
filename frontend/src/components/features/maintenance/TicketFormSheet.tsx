"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api/client";
import { toDownloadUrl } from "@/lib/attachment-url";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FormDraftKeys,
  clearFormDraft,
  loadFormDraftEnvelope,
} from "@/lib/form-draft-storage";
import { useDebouncedFormDraftSave } from "@/lib/hooks/use-debounced-form-draft-save";
import {
  MNT_TYPE_OPTIONS,
  MNT_PRIORITY_OPTIONS,
  MNT_SEVERITY_OPTIONS,
  MAIN_PIPELINE_STATUSES,
  PARKING_LOT_STATUSES,
} from "./maintenance-constants";
import { isAdminOrPmRole } from "@/lib/role-constants";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.string().min(1),
  severity: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  dueDate: z.string().optional(),
  assignedDate: z.string().optional(),
  assignedTo: z.string().optional(),
  reportedBy: z.string().optional(),
  reportedDate: z.string().optional(),
  orderedBy: z.string().optional(),
  picClient: z.string().optional(),
  estimatedHours: z.string().optional(),
  actualHours: z.string().optional(),
  costEstimate: z.string().optional(),
  notes: z.string().optional(),
  resolutionNotes: z.string().optional(),
});

type Values = z.infer<typeof schema>;

type Member = { user: { id: string; name: string; role: string } };

type TicketDetail = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  severity: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  assignedDate: string | null;
  assignedTo: string | null;
  reportedBy: string | null;
  reportedDate: string | null;
  orderedBy: string | null;
  picClient: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  costEstimate: unknown;
  notes: string | null;
  resolutionNotes: string | null;
  picDevs: { user: { id: string; name: string } }[];
  attachments: { id: string; url: string; name: string }[];
};

type Props = {
  projectId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  ticketId?: string;
  members: Member[];
  canFinancial: boolean;
  canDelete?: boolean;
  showActivityLog?: boolean;
  onSuccess?: () => void;
};

function dateInput(v: string | Date | null | undefined) {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  try {
    return format(d, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

function todayInput() {
  return format(new Date(), "yyyy-MM-dd");
}

/** Trackly-style maintenance create/edit in a centered modal (not a side drawer). */
export function TicketFormSheet({
  projectId,
  open,
  onOpenChange,
  mode,
  ticketId,
  members,
  canFinancial,
  canDelete = false,
  showActivityLog = false,
  onSuccess,
}: Props) {
  const [picIds, setPicIds] = useState<Set<string>>(new Set());
  const [picDevQuery, setPicDevQuery] = useState("");
  const [attUrl, setAttUrl] = useState("");
  const [attName, setAttName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  const developers = useMemo(
    () => members.filter((m) => m.user.role === "developer"),
    [members],
  );
  const pmAdmins = useMemo(
    () => members.filter((m) => isAdminOrPmRole(m.user.role)),
    [members],
  );
  const clientSideUsers = useMemo(
    () => members.filter((m) => ["viewer", "client"].includes(m.user.role)),
    [members],
  );

  const mntTypeSelectItems = useMemo(
    () => MNT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );
  const mntSeveritySelectItems = useMemo(
    () => [
      { value: "__none__", label: "— None —" },
      ...MNT_SEVERITY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    ],
    [],
  );
  const mntPrioritySelectItems = useMemo(
    () => MNT_PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );
  const mntStatusSelectItems = useMemo(
    () =>
      [...MAIN_PIPELINE_STATUSES, ...PARKING_LOT_STATUSES].map((s) => ({
        value: s.value,
        label: s.label,
      })),
    [],
  );
  const orderedBySelectItems = useMemo(
    () => [
      { value: "__none__", label: "— None —" },
      ...pmAdmins.map((m) => ({ value: m.user.id, label: m.user.name })),
    ],
    [pmAdmins],
  );
  const picClientSelectItems = useMemo(
    () => [
      { value: "__none__", label: "— None —" },
      ...clientSideUsers.map((m) => ({
        value: m.user.id,
        label: m.user.name,
      })),
    ],
    [clientSideUsers],
  );
  const assignedToSelectItems = useMemo(
    () => [
      { value: "__none__", label: "— None —" },
      ...developers.map((m) => ({ value: m.user.id, label: m.user.name })),
    ],
    [developers],
  );

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      type: "bug",
      severity: "__none__",
      priority: "medium",
      status: "backlog",
      dueDate: "",
      assignedDate: "",
      assignedTo: "__none__",
      reportedBy: "",
      reportedDate: "",
      orderedBy: "__none__",
      picClient: "__none__",
      estimatedHours: "",
      actualHours: "",
      costEstimate: "",
      notes: "",
      resolutionNotes: "",
    },
  });

  const detailQ = useQuery({
    queryKey: ["maintenance", ticketId],
    queryFn: async () => {
      const res = await api.get<TicketDetail>(`/api/maintenance/${ticketId}`);
      return res.data;
    },
    enabled: open && mode === "edit" && Boolean(ticketId),
  });

  type ActivityRow = {
    id: string;
    action: string;
    actorName: string;
    createdAt: string;
    entityName: string | null;
  };

  const activityQ = useQuery({
    queryKey: ["activity-log", projectId, "maintenance", ticketId],
    queryFn: async () => {
      const res = await api.get<{ data: ActivityRow[] }>("/api/activity-log", {
        params: {
          projectId,
          entityType: "maintenance",
          entityId: ticketId,
          take: "30",
        },
      });
      return res.data.data;
    },
    enabled: open && mode === "edit" && Boolean(ticketId) && showActivityLog,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      const env = loadFormDraftEnvelope(
        FormDraftKeys.ticketCreate(projectId),
      )?.payload;
      const createDefaults = {
        title: "",
        description: "",
        type: "bug",
        severity: "__none__",
        priority: "medium",
        status: "backlog",
        dueDate: "",
        assignedDate: "",
        assignedTo: "__none__",
        reportedBy: "",
        reportedDate: todayInput(),
        orderedBy: "__none__",
        picClient: "__none__",
        estimatedHours: "",
        actualHours: "",
        costEstimate: "",
        notes: "",
        resolutionNotes: "",
      };
      if (env && typeof env === "object") {
        const raw = env as {
          values?: Partial<Values>;
          extras?: {
            picDevIds?: string[];
            picDevQuery?: string;
            attUrl?: string;
            attName?: string;
          };
        };
        form.reset({
          ...createDefaults,
          ...(raw.values ?? {}),
        });
        setPicIds(
          new Set(
            Array.isArray(raw.extras?.picDevIds) ? raw.extras!.picDevIds! : [],
          ),
        );
        setPicDevQuery(raw.extras?.picDevQuery ?? "");
        setAttUrl(raw.extras?.attUrl ?? "");
        setAttName(raw.extras?.attName ?? "");
        return;
      }
      form.reset(createDefaults);
      setPicIds(new Set());
      setPicDevQuery("");
      setAttUrl("");
      setAttName("");
      return;
    }
    const d = detailQ.data;
    if (!d || !ticketId) return;
    const env = loadFormDraftEnvelope(
      FormDraftKeys.ticketEdit(ticketId),
    )?.payload;
    if (env && typeof env === "object") {
      const raw = env as {
        values?: Partial<Values>;
        extras?: {
          picDevIds?: string[];
          picDevQuery?: string;
          attUrl?: string;
          attName?: string;
        };
      };
      form.reset({
        title: d.title,
        description: d.description ?? "",
        type: d.type,
        severity: d.severity ? d.severity : "__none__",
        priority: d.priority,
        status: d.status,
        dueDate: dateInput(d.dueDate),
        assignedDate: dateInput(d.assignedDate),
        assignedTo: d.assignedTo ?? "__none__",
        reportedBy: d.reportedBy ?? "",
        reportedDate: dateInput(d.reportedDate),
        orderedBy: d.orderedBy ?? "__none__",
        picClient: d.picClient ?? "__none__",
        estimatedHours:
          d.estimatedHours != null ? String(d.estimatedHours) : "",
        actualHours: d.actualHours != null ? String(d.actualHours) : "",
        costEstimate:
          d.costEstimate != null && d.costEstimate !== ""
            ? String(d.costEstimate)
            : "",
        notes: d.notes ?? "",
        resolutionNotes: d.resolutionNotes ?? "",
        ...(raw.values ?? {}),
      });
      setPicIds(
        new Set(
          Array.isArray(raw.extras?.picDevIds)
            ? raw.extras!.picDevIds!
            : d.picDevs.map((p) => p.user.id),
        ),
      );
      setPicDevQuery(raw.extras?.picDevQuery ?? "");
      setAttUrl(raw.extras?.attUrl ?? "");
      setAttName(raw.extras?.attName ?? "");
      return;
    }
    form.reset({
      title: d.title,
      description: d.description ?? "",
      type: d.type,
      severity: d.severity ? d.severity : "__none__",
      priority: d.priority,
      status: d.status,
      dueDate: dateInput(d.dueDate),
      assignedDate: dateInput(d.assignedDate),
      assignedTo: d.assignedTo ?? "__none__",
      reportedBy: d.reportedBy ?? "",
      reportedDate: dateInput(d.reportedDate),
      orderedBy: d.orderedBy ?? "__none__",
      picClient: d.picClient ?? "__none__",
      estimatedHours:
        d.estimatedHours != null ? String(d.estimatedHours) : "",
      actualHours: d.actualHours != null ? String(d.actualHours) : "",
      costEstimate:
        d.costEstimate != null && d.costEstimate !== ""
          ? String(d.costEstimate)
          : "",
      notes: d.notes ?? "",
      resolutionNotes: d.resolutionNotes ?? "",
    });
    setPicIds(new Set(d.picDevs.map((p) => p.user.id)));
  }, [detailQ.data, open, form, mode, projectId, ticketId]);

  const ticketDraftKey =
    open && mode === "create"
      ? FormDraftKeys.ticketCreate(projectId)
      : open && mode === "edit" && ticketId
        ? FormDraftKeys.ticketEdit(ticketId)
        : null;

  const wfTicket = form.watch();

  useDebouncedFormDraftSave(
    Boolean(ticketDraftKey),
    ticketDraftKey,
    () => {
      const v = form.getValues();
      const has =
        !!(v.title ?? "").trim() ||
        !!(v.description ?? "").trim() ||
        picIds.size > 0 ||
        !!(v.notes ?? "").trim() ||
        !!(v.resolutionNotes ?? "").trim();
      if (!has) return undefined;
      return {
        values: form.getValues(),
        extras: {
          picDevIds: [...picIds],
          picDevQuery,
          attUrl,
          attName,
        },
      };
    },
    [wfTicket, picIds, picDevQuery, attUrl, attName],
  );

  const filteredDevs = useMemo(() => {
    const q = picDevQuery.trim().toLowerCase();
    if (!q) return developers;
    return developers.filter((m) => m.user.name.toLowerCase().includes(q));
  }, [developers, picDevQuery]);

  async function onSubmit(values: Values) {
    try {
      const sev =
        values.severity && values.severity !== "__none__"
          ? values.severity
          : undefined;
      const payload: Record<string, unknown> = {
        title: values.title,
        description: values.description || undefined,
        type: values.type,
        priority: values.priority || "medium",
        status: mode === "create" ? "backlog" : values.status || "backlog",
        dueDate: values.dueDate || undefined,
        assignedDate: values.assignedDate || undefined,
        reportedBy: values.reportedBy || undefined,
        reportedDate: values.reportedDate || undefined,
        orderedBy:
          values.orderedBy && values.orderedBy !== "__none__"
            ? values.orderedBy
            : undefined,
        picClient:
          values.picClient && values.picClient !== "__none__"
            ? values.picClient
            : undefined,
        notes: values.notes || undefined,
        picDevIds: [...picIds],
      };
      if (sev) payload.severity = sev;
      else if (mode === "create") payload.severity = "medium";

      payload.resolutionNotes = values.resolutionNotes || undefined;
      if (values.actualHours)
        payload.actualHours = parseFloat(values.actualHours);
      if (canFinancial) {
        if (values.estimatedHours)
          payload.estimatedHours = parseFloat(values.estimatedHours);
        if (values.costEstimate)
          payload.costEstimate = parseFloat(values.costEstimate);
      }

      if (values.assignedTo && values.assignedTo !== "__none__") {
        payload.assignedTo = values.assignedTo;
      } else if (mode === "edit") {
        payload.assignedTo = null;
      }

      if (mode === "create") {
        await api.post("/api/maintenance", { ...payload, projectId });
        toast.success("Ticket created");
        clearFormDraft(FormDraftKeys.ticketCreate(projectId));
      } else if (ticketId) {
        await api.patch(`/api/maintenance/${ticketId}`, payload);
        toast.success("Ticket updated");
        clearFormDraft(FormDraftKeys.ticketEdit(ticketId));
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Could not save ticket");
    }
  }

  async function uploadFilesAndAttach(files: File[]) {
    if (!ticketId) return;
    const MAX = 5 * 1024 * 1024;
    setUploadBusy(true);
    try {
      for (const file of files) {
        if (file.size > MAX) {
          toast.warning(`"${file.name}" terlalu besar (maks 5 MB). Dilewati.`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload?category=maintenance", {
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
        await api.post(`/api/maintenance/${ticketId}/attachments`, {
          url: meta.url,
          name: meta.name || file.name,
          mimeType: meta.mimeType,
          size: meta.size,
        });
      }
      void detailQ.refetch();
      onSuccess?.();
      toast.success("File dilampirkan");
    } catch {
      toast.error("Gagal mengunggah file");
    } finally {
      setUploadBusy(false);
    }
  }

  async function removeAttachment(attachmentId: string) {
    if (!ticketId) return;
    try {
      await api.delete(
        `/api/maintenance/${ticketId}/attachments/${attachmentId}`,
      );
      void detailQ.refetch();
      onSuccess?.();
      toast.success("Attachment removed");
    } catch {
      toast.error("Could not remove attachment");
    }
  }

  async function addAttachment() {
    if (!ticketId || !attUrl.trim()) return;
    try {
      await api.post(`/api/maintenance/${ticketId}/attachments`, {
        url: attUrl.trim(),
        name: attName.trim() || "attachment",
      });
      setAttUrl("");
      setAttName("");
      void detailQ.refetch();
      onSuccess?.();
      toast.success("Attachment added");
    } catch {
      toast.error("Could not add attachment");
    }
  }

  function toggleAllPicDevs() {
    const all = new Set(developers.map((d) => d.user.id));
    const every = developers.every((d) => picIds.has(d.user.id));
    setPicIds(every ? new Set() : all);
  }

  const attachments = detailQ.data?.attachments ?? [];
  const loadingEdit = mode === "edit" && detailQ.isFetching;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[min(92vh,880px)] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:rounded-xl"
      >
        <DialogHeader className="shrink-0 border-b border-zinc-100 px-4 py-4 sm:px-6">
          <DialogTitle>
            {mode === "create"
              ? "New Maintenance Ticket"
              : `Edit Ticket${ticketId ? ` — ${ticketId}` : ""}`}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Required fields are marked with *. PIC dev visibility follows
            checkboxes; cost and hours (where shown) are PM/Admin only.
          </DialogDescription>
        </DialogHeader>

        {loadingEdit ? (
          <div className="px-6 py-8 text-sm text-zinc-500">Loading…</div>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
              <div className="space-y-1.5">
                <Label htmlFor="mnt-form-title">
                  Title <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="mnt-form-title"
                  placeholder="Brief description of the issue"
                  {...form.register("title")}
                />
              </div>

              <div
                className={cnGridRow(mode === "edit")}
              >
                <div className="space-y-1.5">
                  <Label>
                    Type <span className="text-red-600">*</span>
                  </Label>
                  <Select
                    value={form.watch("type")}
                    onValueChange={(v) => form.setValue("type", v ?? "bug")}
                    items={mntTypeSelectItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mntTypeSelectItems.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Severity</Label>
                  <Select
                    value={form.watch("severity") || "__none__"}
                    onValueChange={(v) =>
                      form.setValue("severity", v ?? "__none__")
                    }
                    items={mntSeveritySelectItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {mntSeveritySelectItems.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Priority <span className="text-red-600">*</span>
                  </Label>
                  <Select
                    value={form.watch("priority") || "medium"}
                    onValueChange={(v) =>
                      form.setValue("priority", v ?? "medium")
                    }
                    items={mntPrioritySelectItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mntPrioritySelectItems.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {mode === "edit" ? (
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select
                      value={form.watch("status") || "backlog"}
                      onValueChange={(v) =>
                        form.setValue("status", v ?? "backlog")
                      }
                      items={mntStatusSelectItems}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {mntStatusSelectItems.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mnt-form-desc">Description</Label>
                <Textarea
                  id="mnt-form-desc"
                  rows={3}
                  placeholder="Detailed description of the issue…"
                  className="resize-y"
                  {...form.register("description")}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mnt-reported-by">Reported by</Label>
                  <Input
                    id="mnt-reported-by"
                    placeholder="Reporter name"
                    {...form.register("reportedBy")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mnt-reported-date">Reported date</Label>
                  <Input
                    id="mnt-reported-date"
                    type="date"
                    {...form.register("reportedDate")}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mnt-assigned-date">Assigned date</Label>
                  <Input
                    id="mnt-assigned-date"
                    type="date"
                    {...form.register("assignedDate")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mnt-due">Due date</Label>
                  <Input id="mnt-due" type="date" {...form.register("dueDate")} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Ordered by (PM/Admin)</Label>
                  <Select
                    value={form.watch("orderedBy") || "__none__"}
                    onValueChange={(v) =>
                      form.setValue("orderedBy", v ?? "__none__")
                    }
                    items={orderedBySelectItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {orderedBySelectItems.map((it) => (
                        <SelectItem key={it.value} value={it.value}>
                          {it.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>PIC client</Label>
                  <Select
                    value={form.watch("picClient") || "__none__"}
                    onValueChange={(v) =>
                      form.setValue("picClient", v ?? "__none__")
                    }
                    items={picClientSelectItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {picClientSelectItems.map((it) => (
                        <SelectItem key={it.value} value={it.value}>
                          {it.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  PIC developer
                  <span className="ml-1 font-normal text-zinc-500">
                    — leave empty so all developers can see the ticket
                  </span>
                </Label>
                {developers.length > 3 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      className="max-w-xs flex-1"
                      placeholder="Search developer…"
                      value={picDevQuery}
                      onChange={(e) => setPicDevQuery(e.target.value)}
                      autoComplete="off"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={toggleAllPicDevs}
                    >
                      {developers.every((d) => picIds.has(d.user.id))
                        ? "Deselect all"
                        : "Select all"}
                    </Button>
                  </div>
                ) : null}
                <div className="max-h-[140px] space-y-0 overflow-y-auto rounded-md border border-zinc-200 p-1">
                  {developers.length === 0 ? (
                    <p className="px-2 py-2 text-sm text-zinc-500">
                      No developers in this project
                    </p>
                  ) : (
                    filteredDevs.map((m) => (
                      <label
                        key={m.user.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-50"
                      >
                        <Checkbox
                          checked={picIds.has(m.user.id)}
                          onCheckedChange={(on) => {
                            setPicIds((prev) => {
                              const n = new Set(prev);
                              if (on) n.add(m.user.id);
                              else n.delete(m.user.id);
                              return n;
                            });
                          }}
                        />
                        {m.user.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Primary assignee</Label>
                <Select
                  value={form.watch("assignedTo") || "__none__"}
                  onValueChange={(v) =>
                    form.setValue("assignedTo", v ?? "__none__")
                  }
                  items={assignedToSelectItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedToSelectItems.map((it) => (
                      <SelectItem key={it.value} value={it.value}>
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div
                className={cn(
                  "grid gap-3",
                  canFinancial ? "sm:grid-cols-3" : "sm:grid-cols-2",
                )}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="mnt-est">Est. hours</Label>
                  <Input
                    id="mnt-est"
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder="0"
                    disabled={!canFinancial}
                    title={
                      !canFinancial
                        ? "Only PM/Admin can update estimated hours"
                        : undefined
                    }
                    {...form.register("estimatedHours")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mnt-actual">Actual hours</Label>
                  <Input
                    id="mnt-actual"
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder="0"
                    {...form.register("actualHours")}
                  />
                </div>
                {canFinancial ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="mnt-cost">Cost estimate (IDR)</Label>
                    <Input
                      id="mnt-cost"
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="0"
                      {...form.register("costEstimate")}
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mnt-resolution">Resolution notes</Label>
                <Textarea
                  id="mnt-resolution"
                  rows={2}
                  className="resize-y"
                  placeholder="What was done to fix or resolve this issue…"
                  {...form.register("resolutionNotes")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mnt-notes">Internal notes</Label>
                <Textarea
                  id="mnt-notes"
                  rows={2}
                  className="resize-y"
                  placeholder="Private notes for the team only…"
                  {...form.register("notes")}
                />
              </div>

              {mode === "edit" && ticketId && showActivityLog ? (
                <div className="space-y-2 border-t border-zinc-200 pt-3">
                  <Label>Activity (project log)</Label>
                  <ul className="max-h-40 space-y-2 overflow-y-auto text-xs text-zinc-600">
                    {(activityQ.data ?? []).length === 0 ? (
                      <li className="text-zinc-400">No entries yet.</li>
                    ) : (
                      (activityQ.data ?? []).map((row) => (
                        <li
                          key={row.id}
                          className="rounded border border-zinc-100 bg-zinc-50/80 px-2 py-1.5"
                        >
                          <span className="font-medium text-zinc-800">
                            {row.action}
                          </span>{" "}
                          · {row.actorName}
                          <br />
                          <span className="text-zinc-400">
                            {format(
                              new Date(row.createdAt),
                              "d MMM yyyy HH:mm",
                            )}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ) : null}

              {mode === "edit" && ticketId ? (
                <div className="space-y-2 border-t border-zinc-200 pt-3">
                  <Label>
                    Attachments{" "}
                    <span className="font-normal text-zinc-500">
                      (max 5MB per file)
                    </span>
                  </Label>
                  <ul className="space-y-1 text-sm">
                    {attachments.map((a) => (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <a
                          href={toDownloadUrl(a.url)}
                          target="_blank"
                          rel="noreferrer"
                          {...(a.url.startsWith("/uploads/") ? { download: a.name } : {})}
                          className="text-primary underline"
                        >
                          {a.name}
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-600"
                          onClick={() => void removeAttachment(a.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <FileDropZone
                    busy={uploadBusy}
                    onFiles={(files) => void uploadFilesAndAttach(files)}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                    hint="Maks 5 MB per file — bisa pilih beberapa sekaligus"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Input
                      className="min-w-[120px] flex-1"
                      placeholder="URL"
                      value={attUrl}
                      onChange={(e) => setAttUrl(e.target.value)}
                    />
                    <Input
                      className="min-w-[100px] flex-1"
                      placeholder="Name"
                      value={attName}
                      onChange={(e) => setAttName(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void addAttachment()}
                  >
                    Add attachment from URL
                  </Button>
                </div>
              ) : null}
            </div>

            <DialogFooter className="-mx-0 -mb-0 shrink-0 gap-2 rounded-none border-t border-zinc-100 bg-transparent px-4 py-3 sm:flex-row sm:justify-between sm:px-6">
              {mode === "edit" && ticketId && canDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="sm:mr-auto"
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete ticket
                </Button>
              ) : (
                <span />
              )}
              <div className="flex w-full justify-end gap-2 sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {mode === "create" ? "Create ticket" : "Save changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete maintenance ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!ticketId) return;
                try {
                  await api.delete(`/api/maintenance/${ticketId}`);
                  toast.success("Ticket deleted");
                  setDeleteOpen(false);
                  onOpenChange(false);
                  onSuccess?.();
                } catch {
                  toast.error("Could not delete ticket");
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function cnGridRow(edit: boolean) {
  return edit
    ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    : "grid gap-3 sm:grid-cols-3";
}
