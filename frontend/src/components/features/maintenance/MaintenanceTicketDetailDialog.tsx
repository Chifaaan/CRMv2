"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  CircleDot,
  Download,
  FileText,
  PauseCircle,
  Pencil,
  Save,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { toDownloadUrl } from "@/lib/attachment-url";
import { useSession } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MNT_PRIORITY_LABELS,
  MNT_SEVERITY_LABELS,
  MNT_TYPE_LABELS,
  STATUS_PIPELINE,
  formatDateID,
  mntStatusLabel,
} from "./maintenance-constants";
import { isAdminOrPmRole } from "@/lib/role-constants";

type ActivityLogRow = { id: string; text: string; at: string };

type TicketDetail = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string | null;
  type: string;
  severity: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  assignedDate: string | null;
  reportedDate: string | null;
  resolvedDate: string | null;
  createdAt: string;
  updatedAt: string;
  reportedBy: string | null;
  orderedBy: string | null;
  picClient: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  costEstimate: unknown;
  notes: string | null;
  resolutionNotes: string | null;
  picDevs: { user: { id: string; name: string; image: string | null } }[];
  attachments: {
    id: string;
    url: string;
    name: string;
    mimeType: string | null;
    size: number | null;
  }[];
  activityLogs?: ActivityLogRow[];
};

type Member = { user: { id: string; name: string; role: string } };

type Props = {
  projectId: string;
  ticketId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  onEdit: (id: string) => void;
  onUpdated: () => void;
};

function formatBytes(n: number | null | undefined) {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function priorityBadgeClass(p: string) {
  switch (p) {
    case "critical":
      return "mnt-card-badge--priority-critical border border-red-200 bg-red-50 text-red-700";
    case "high":
      return "mnt-card-badge--priority-high border border-amber-200 bg-amber-50 text-amber-800";
    case "medium":
      return "mnt-card-badge--priority-medium border border-blue-200 bg-blue-50 text-blue-800";
    default:
      return "mnt-card-badge--priority-low border border-slate-200 bg-slate-100 text-slate-600";
  }
}

function severityPill(sev: string | null) {
  if (!sev) return null;
  const major = sev === "major";
  return (
    <span
      className={cn(
        "inline-block rounded-md px-2 py-0.5 text-xs font-semibold",
        major
          ? "border border-amber-200 bg-amber-50 text-amber-800"
          : "border border-slate-200 bg-slate-100 text-slate-600",
      )}
    >
      {MNT_SEVERITY_LABELS[sev] ?? sev}
    </span>
  );
}

export function MaintenanceTicketDetailDialog({
  projectId,
  ticketId,
  open,
  onOpenChange,
  members,
  onEdit,
  onUpdated,
}: Props) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const role =
    (session?.user as { role?: string; id?: string } | undefined)?.role ?? "";
  const userId =
    (session?.user as { id?: string } | undefined)?.id ?? undefined;

  const [resolutionDraft, setResolutionDraft] = useState("");

  const detailQ = useQuery({
    queryKey: ["maintenance", ticketId],
    queryFn: async () => {
      const res = await api.get<TicketDetail>(`/api/maintenance/${ticketId}`);
      return res.data;
    },
    enabled: open && Boolean(ticketId),
  });

  const t = detailQ.data;

  useEffect(() => {
    queueMicrotask(() => {
      if (t?.resolutionNotes != null) setResolutionDraft(t.resolutionNotes);
      else setResolutionDraft("");
    });
  }, [t?.id, t?.resolutionNotes]);

  const canEdit = useMemo(() => {
    if (!t || !userId) return false;
    if (isAdminOrPmRole(role)) return true;
    if (role === "developer") {
      return t.picDevs.some((p) => p.user.id === userId);
    }
    return false;
  }, [t, userId, role]);

  const orderedByName = useMemo(() => {
    if (!t?.orderedBy) return "—";
    const m = members.find((x) => x.user.id === t.orderedBy);
    return m?.user.name ?? t.orderedBy;
  }, [t, members]);

  const picClientName = useMemo(() => {
    if (!t?.picClient) return "—";
    const m = members.find((x) => x.user.id === t.picClient);
    return m?.user.name ?? t.picClient;
  }, [t, members]);

  const patchM = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      if (!ticketId) return;
      await api.patch(`/api/maintenance/${ticketId}`, body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["maintenance", ticketId] });
      void qc.invalidateQueries({ queryKey: ["maintenance", projectId] });
      onUpdated();
      toast.success("Ticket updated");
    },
    onError: () => toast.error("Update failed"),
  });

  const inPipeline = t ? STATUS_PIPELINE.includes(t.status as never) : false;
  const curIdx = t
    ? STATUS_PIPELINE.indexOf(t.status as (typeof STATUS_PIPELINE)[number])
    : -1;

  const nextStatus =
    canEdit && inPipeline && curIdx >= 0 && curIdx < STATUS_PIPELINE.length - 1
      ? STATUS_PIPELINE[curIdx + 1]
      : null;

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[min(92vh,880px)] sm:w-[calc(100%-2rem)] sm:max-w-5xl sm:rounded-xl"
      >
        {detailQ.isLoading || !t ? (
          <div className="p-6 text-sm text-zinc-500">Loading…</div>
        ) : (
          <>
            <DialogHeader className="shrink-0 border-b border-zinc-100 px-4 py-4 sm:px-6">
              <DialogTitle className="pr-8 text-left text-base leading-snug">
                {t.title}
              </DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <div className="mb-4 flex flex-col gap-2 border-b border-zinc-100/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <span className="font-mono text-xs text-zinc-500">
                  {t.ticketNumber}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {MNT_TYPE_LABELS[t.type] ?? t.type}
                  </Badge>
                  {severityPill(t.severity)}
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                      priorityBadgeClass(t.priority),
                    )}
                  >
                    {MNT_PRIORITY_LABELS[t.priority] ?? t.priority}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {mntStatusLabel(t.status)}
                  </Badge>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-x-1 gap-y-2 overflow-x-auto pb-1">
                {STATUS_PIPELINE.map((s, idx) => {
                  const active = inPipeline && idx === curIdx;
                  const done = inPipeline && idx < curIdx;
                  return (
                    <div key={s} className="flex items-center">
                      <div
                        className={cn(
                          "flex items-center gap-1.5 whitespace-nowrap text-xs",
                          done && "text-emerald-600",
                          active && "font-semibold text-blue-700",
                          !done && !active && "text-zinc-400",
                        )}
                      >
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            done && "bg-emerald-500",
                            active && "scale-125 bg-blue-600",
                            !done && !active && "bg-zinc-300",
                          )}
                        />
                        {mntStatusLabel(s)}
                      </div>
                      {idx < STATUS_PIPELINE.length - 1 ? (
                        <div
                          className="mx-1.5 hidden h-px w-4 shrink-0 bg-zinc-200 sm:block sm:w-6"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {canEdit && (nextStatus || !["canceled", "on_hold"].includes(t.status)) ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {nextStatus ? (
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1 bg-emerald-600 hover:bg-emerald-600/90"
                      disabled={patchM.isPending}
                      onClick={() =>
                        patchM.mutate({ status: nextStatus })
                      }
                    >
                      <ArrowRight className="size-3.5" />
                      Mark as {mntStatusLabel(nextStatus)}
                    </Button>
                  ) : null}
                  {!["canceled", "on_hold"].includes(t.status) ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={patchM.isPending}
                        onClick={() => patchM.mutate({ status: "on_hold" })}
                      >
                        <PauseCircle className="size-3.5" />
                        On Hold
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1 text-red-600 hover:text-red-700"
                        disabled={patchM.isPending}
                        onClick={() => patchM.mutate({ status: "canceled" })}
                      >
                        <XCircle className="size-3.5" />
                        Cancel
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                <div className="space-y-5">
                  {t.description ? (
                    <section>
                      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Description
                      </h4>
                      <p className="whitespace-pre-wrap text-sm text-zinc-800">
                        {t.description}
                      </p>
                    </section>
                  ) : null}
                  {t.resolutionNotes ? (
                    <section>
                      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Resolution notes
                      </h4>
                      <div className="whitespace-pre-wrap rounded-md border border-emerald-100 bg-emerald-50/50 p-3 text-sm text-zinc-800">
                        {t.resolutionNotes}
                      </div>
                    </section>
                  ) : null}
                  {t.notes ? (
                    <section>
                      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Internal notes
                      </h4>
                      <p className="whitespace-pre-wrap text-sm text-zinc-600">
                        {t.notes}
                      </p>
                    </section>
                  ) : null}

                  {t.attachments.length > 0 ? (
                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Attachments ({t.attachments.length})
                      </h4>
                      <ul className="space-y-2">
                        {t.attachments.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50/80 px-3 py-2"
                          >
                            <FileText className="size-4 shrink-0 text-blue-600" />
                            <div className="min-w-0 flex-1">
                              <a
                                href={toDownloadUrl(a.url)}
                                target="_blank"
                                rel="noreferrer"
                                {...(a.url.startsWith("/uploads/") ? { download: a.name } : {})}
                                className="block truncate text-sm font-medium text-blue-600 hover:underline"
                              >
                                {a.name}
                              </a>
                              <span className="text-[11px] text-zinc-500">
                                {formatBytes(a.size)}
                              </span>
                            </div>
                            <Download className="size-3.5 shrink-0 text-zinc-400" />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {canEdit ? (
                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Update resolution notes
                      </h4>
                      <Textarea
                        rows={3}
                        placeholder="Describe what was done to resolve this ticket…"
                        value={resolutionDraft}
                        onChange={(e) => setResolutionDraft(e.target.value)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="mt-2 gap-1"
                        disabled={patchM.isPending}
                        onClick={() =>
                          patchM.mutate({
                            resolutionNotes: resolutionDraft.trim() || null,
                          })
                        }
                      >
                        <Save className="size-3.5" />
                        Save notes
                      </Button>
                    </section>
                  ) : null}

                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Activity log
                    </h4>
                    <div className="space-y-2">
                      {(t.activityLogs ?? []).length === 0 ? (
                        <p className="text-sm text-zinc-500">No activity yet.</p>
                      ) : (
                        (t.activityLogs ?? []).map((a) => (
                          <div key={a.id} className="flex gap-2 text-sm">
                            <CircleDot className="mt-0.5 size-3.5 shrink-0 text-zinc-400" />
                            <div>
                              <span>{a.text}</span>
                              <span className="text-xs text-zinc-500">
                                {" "}
                                ·{" "}
                                {formatDistanceToNow(new Date(a.at), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>

                <aside className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-4 text-sm">
                  <Meta label="Reported by" value={t.reportedBy ?? "—"} />
                  <Meta
                    label="Reported date"
                    value={formatDateID(t.reportedDate)}
                  />
                  <Meta
                    label="Assigned date"
                    value={formatDateID(t.assignedDate)}
                  />
                  <Meta
                    label="Due date"
                    value={
                      t.dueDate ? (
                        <strong className="text-red-600">
                          {formatDateID(t.dueDate)}
                        </strong>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Meta label="Ordered by (PM/Admin)" value={orderedByName} />
                  <div>
                    <p className="text-xs font-medium text-zinc-500">PIC dev</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {t.picDevs.length === 0 ? (
                        <span className="text-zinc-500">—</span>
                      ) : (
                        t.picDevs.map((p) => (
                          <span
                            key={p.user.id}
                            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs"
                          >
                            {p.user.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <Meta label="PIC client" value={picClientName} />
                  <Meta
                    label="Est. hours"
                    value={
                      t.estimatedHours != null ? `${t.estimatedHours}h` : "—"
                    }
                  />
                  <Meta
                    label="Actual hours"
                    value={t.actualHours != null ? `${t.actualHours}h` : "—"}
                  />
                  {t.costEstimate != null && String(t.costEstimate) !== "" ? (
                    <Meta
                      label="Cost estimate"
                      value={`Rp ${Number(t.costEstimate).toLocaleString("id-ID")}`}
                    />
                  ) : null}
                  <Meta
                    label="Resolved date"
                    value={formatDateID(t.resolvedDate)}
                  />
                  <Meta
                    label="Created"
                    value={formatDistanceToNow(new Date(t.createdAt), {
                      addSuffix: true,
                    })}
                  />
                  <Meta
                    label="Updated"
                    value={formatDistanceToNow(new Date(t.updatedAt), {
                      addSuffix: true,
                    })}
                  />
                </aside>
              </div>
            </div>

            <DialogFooter className="-mx-0 -mb-0 shrink-0 rounded-none border-t border-zinc-100 bg-transparent px-4 py-3 sm:px-6">
              {canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(t.id);
                  }}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              ) : null}
              <Button type="button" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <div className="mt-0.5 text-zinc-800">{value}</div>
    </div>
  );
}
