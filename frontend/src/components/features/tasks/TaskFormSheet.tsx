"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTaskPickerInfinite, type TaskPickRow } from "@/lib/hooks/use-task-picker-infinite";
import { TaskPickerInfiniteList } from "@/components/features/tasks/TaskPickerInfiniteList";
import { format } from "date-fns";
import {
  ChevronDownIcon,
  X,
  Paperclip,
  HelpCircle,
  Trash2,
  Plus,
  Link2,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import { uploadFile } from "@/lib/upload";
import {
  defaultLinkAttachmentLabel,
  normalizeAttachmentUrl,
} from "@/lib/attachment-url";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  FormDraftKeys,
  clearFormDraft,
  loadFormDraftEnvelope,
} from "@/lib/form-draft-storage";
import { useDebouncedFormDraftSave } from "@/lib/hooks/use-debounced-form-draft-save";
import { TASK_TYPE_OPTIONS } from "@/lib/task-types";
import { isAdminOrPmRole } from "@/lib/role-constants";

const TASK_FORM_STATUS_ITEMS = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "on_check", label: "On Check" },
  { value: "need_revision", label: "Need Revision" },
  { value: "ready_to_deploy", label: "Ready To Deploy" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-zinc-100 text-zinc-600",
  todo: "bg-blue-50 text-blue-700",
  in_progress: "bg-indigo-50 text-indigo-700",
  awaiting_approval: "bg-purple-50 text-purple-700",
  on_check: "bg-cyan-50 text-cyan-700",
  need_revision: "bg-orange-50 text-orange-700",
  ready_to_deploy: "bg-indigo-50 text-indigo-700",
  completed: "bg-emerald-50 text-emerald-700",
  on_hold: "bg-yellow-50 text-yellow-700",
  cancelled: "bg-red-50 text-red-700",
};

const TASK_FORM_PRIORITY_ITEMS = [
  { value: "low", label: "Low", color: "text-blue-600" },
  { value: "medium", label: "Medium", color: "text-yellow-600" },
  { value: "high", label: "High", color: "text-orange-600" },
  { value: "critical", label: "Critical", color: "text-red-600" },
];

const TASK_FORM_TYPE_ITEMS = TASK_TYPE_OPTIONS;

const schema = z.object({
  title: z.string().min(1, "Judul wajib"),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  sprintId: z.string().optional(),
  tagsInput: z.string().optional(),
  parentTaskId: z.string().optional(),
  pmReporterId: z.string().optional(),
  clientUserId: z.string().optional(),
});

type Values = z.infer<typeof schema>;

type ProjectMember = {
  projectRole: string;
  user: { id: string; name: string; image: string | null; role: string };
};

type AssigneeOptionUser = {
  id: string;
  name: string;
  image: string | null;
  role: string;
};

/** Peran di proyek (Prisma ProjectRole: PM, CLIENT, DEVELOPER, VIEWER). */
function memberProjectRoleIs(
  m: { projectRole: string },
  expected: "PM" | "CLIENT",
) {
  return (m.projectRole ?? "").toUpperCase() === expected;
}

/** PM reporter: jangan tampilkan akun workspace admin meskipun projectRole-nya PM. */
function isWorkspaceAdminRole(role: string | undefined) {
  return (role ?? "").toLowerCase() === "admin";
}

function normalizeAssigneeUsers(raw: unknown): AssigneeOptionUser[] {
  if (!Array.isArray(raw)) return [];
  const out: AssigneeOptionUser[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (o.id == null || o.name == null) continue;
    out.push({
      id: String(o.id),
      name: String(o.name),
      image: (o.image as string | null) ?? null,
      role: String(o.role ?? ""),
    });
  }
  return out;
}

type SprintRow = { id: string; name: string };
type StoredAttachment = { id: string; url: string; name: string };

function dateInput(v: string | Date | null | undefined) {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  try { return format(d, "yyyy-MM-dd"); } catch { return ""; }
}

type TaskDetail = {
  id: string;
  shareToken?: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  startDate: string | null;
  dueDate: string | null;
  sprintId: string | null;
  parentTaskId: string | null;
  parentTask?: {
    id: string;
    title: string;
    taskNumber: number;
    project?: { code: string };
  } | null;
  pmReporterId: string | null;
  clientUserId: string | null;
  pmReporter?: { id: string; name: string } | null;
  clientUser?: { id: string; name: string } | null;
  assignees: { user: { id: string; name: string; image?: string | null } }[];
  tags: string[];
  project?: { code: string };
  dependsOn: { dependsOn: { id: string; title: string; status?: string } }[];
  references?: {
    reference: { id: string; title: string; taskNumber: number; project?: { code: string } };
  }[];
  attachments?: StoredAttachment[];
};

export type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  mode: "create" | "edit";
  taskId?: string;
  defaultValues?: Partial<Values>;
  /** Pre-fill referensi task saat mode create (mis. follow-up dari task completed). */
  initialReferenceTaskIds?: string[];
  onSuccess?: () => void;
};


function FieldTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => { e.preventDefault(); setShow((s) => !s); }}
        className="ml-0.5 text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        <HelpCircle className="size-3.5" />
      </button>
      {show && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 w-56 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[11px] leading-relaxed text-zinc-600 shadow-lg">
          {text}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-zinc-200" />
        </span>
      )}
    </span>
  );
}

export function TaskFormSheet({
  open,
  onOpenChange,
  projectId,
  mode,
  taskId,
  defaultValues,
  initialReferenceTaskIds,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const workspaceRole =
    ((session?.user as { role?: string } | undefined)?.role ?? "").toLowerCase();
  const canDeleteTask =
    mode === "edit" && !!taskId && (isAdminOrPmRole(workspaceRole));

  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [depIds, setDepIds] = useState<string[]>([]);
  const [depOpen, setDepOpen] = useState(false);
  const [depSearch, setDepSearch] = useState("");
  const [refIds, setRefIds] = useState<string[]>([]);
  const [refOpen, setRefOpen] = useState(false);
  const [refSearch, setRefSearch] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [storedAttachments, setStoredAttachments] = useState<StoredAttachment[]>([]);
  const [pendingLinks, setPendingLinks] = useState<{ url: string; name: string }[]>(
    [],
  );
  const [linkUrlDraft, setLinkUrlDraft] = useState("");
  const [linkNameDraft, setLinkNameDraft] = useState("");
  const [editingAttachmentId, setEditingAttachmentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false);
  const submitLockRef = useRef(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "", description: "", status: "backlog", priority: "medium",
      type: "task", startDate: "", dueDate: "", sprintId: "",
      tagsInput: "", parentTaskId: "", pmReporterId: "", clientUserId: "",
    },
  });

  const formReady = open && Boolean(projectId);

  /** Semua anggota proyek + projectRole (sumber PM / Client reporter). */
  const membersQ = useQuery({
    queryKey: ["project", projectId, "members", "task-form"],
    queryFn: async () => {
      const res = await api.get<ProjectMember[]>(
        `/api/projects/${projectId}/members`,
      );
      return res.data;
    },
    enabled: formReady,
  });

  const assigneeOptionsQ = useQuery({
    queryKey: ["task-form-assignees", projectId],
    queryFn: async () => {
      const res = await api.get<unknown>(
        `/api/projects/${encodeURIComponent(projectId)}/assignees`,
      );
      return normalizeAssigneeUsers(res.data);
    },
    enabled: formReady && !sessionPending,
  });

  const sprintsQ = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: async () => {
      const res = await api.get<SprintRow[]>(`/api/sprints?projectId=${projectId}`);
      return Array.isArray(res.data) ? res.data : (res.data as { data?: SprintRow[] }).data ?? [];
    },
    enabled: formReady,
  });

  const depPickQ = useTaskPickerInfinite({
    projectId,
    search: depSearch,
    enabled: formReady && depOpen,
  });

  const refPickQ = useTaskPickerInfinite({
    projectId,
    search: refSearch,
    enabled: formReady && refOpen,
  });

  const { data: taskDetail, isFetching: taskLoading } = useQuery({
    queryKey: ["task", taskId, "form"],
    queryFn: async () => {
      const res = await api.get<TaskDetail>(`/api/tasks/${taskId}`);
      return res.data;
    },
    enabled: open && mode === "edit" && Boolean(taskId),
  });

  const members = membersQ.data ?? [];
  /** PM reporter: anggota dengan peran PM pada proyek ini (bukan akun admin workspace). */
  const pmMembers = members.filter(
    (m) =>
      memberProjectRoleIs(m, "PM") && !isWorkspaceAdminRole(m.user.role),
  );
  /** Client reporter: anggota dengan peran CLIENT pada proyek ini */
  const clientMembers = members.filter((m) => memberProjectRoleIs(m, "CLIENT"));
  const allAssigneeUsers = useMemo(
    () => assigneeOptionsQ.data ?? [],
    [assigneeOptionsQ.data],
  );

  const assigneeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of allAssigneeUsers) {
      map.set(u.id, u.name);
    }
    if (mode === "edit" && taskDetail?.assignees?.length) {
      for (const a of taskDetail.assignees) {
        const id = a.user.id;
        if (!map.has(id)) {
          map.set(id, a.user.name ?? id);
        }
      }
    }
    return map;
  }, [allAssigneeUsers, mode, taskDetail?.assignees]);

  const sprints = useMemo(() => sprintsQ.data ?? [], [sprintsQ.data]);

  /** Termasuk dependensi terpilih yang belum termuat di halaman berikutnya. */
  const tasksForDepsPicker = useMemo(() => {
    const rows = (depPickQ.data?.pages.flatMap((p) => p.data) ?? []).filter(
      (t) => t.id !== taskId,
    );
    const seen = new Set(rows.map((r) => r.id));
    for (const depTaskId of depIds) {
      if (seen.has(depTaskId)) continue;
      seen.add(depTaskId);
      const fromDetail = taskDetail?.dependsOn?.find(
        (d) => d.dependsOn.id === depTaskId,
      );
      rows.push({
        id: depTaskId,
        title: fromDetail?.dependsOn.title ?? "Task dependensi",
        taskNumber: 0,
        project: taskDetail?.project,
      });
    }
    return rows;
  }, [depPickQ.data, depIds, taskId, taskDetail?.dependsOn, taskDetail?.project]);

  const tasksForRefsPicker = useMemo(() => {
    const rows = (refPickQ.data?.pages.flatMap((p) => p.data) ?? []).filter(
      (t) => t.id !== taskId,
    );
    const seen = new Set(rows.map((r) => r.id));
    for (const refTaskId of refIds) {
      if (seen.has(refTaskId)) continue;
      seen.add(refTaskId);
      const fromDetail = taskDetail?.references?.find(
        (r) => r.reference.id === refTaskId,
      );
      rows.push({
        id: refTaskId,
        title: fromDetail?.reference.title ?? "Task referensi",
        taskNumber: fromDetail?.reference.taskNumber ?? 0,
        project: fromDetail?.reference.project ?? taskDetail?.project,
      });
    }
    return rows;
  }, [refPickQ.data, refIds, taskId, taskDetail?.references, taskDetail?.project]);

  function getTaskLabel(t: TaskPickRow) {
    if (t.taskNumber && t.project?.code)
      return `${t.project.code}-${String(t.taskNumber).padStart(4, "0")} — ${t.title}`;
    return t.title;
  }

  const filteredAssigneeUsers = useMemo(() => {
    const q = assigneeSearch.toLowerCase();
    if (!q) return allAssigneeUsers;
    return allAssigneeUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.role ?? "").toLowerCase().includes(q),
    );
  }, [allAssigneeUsers, assigneeSearch]);

  /** Base UI Select membutuhkan `items` agar nilai (UUID) terpetakan ke label dan tidak error. */
  const pmReporterSelectItems = useMemo(() => {
    const none = { value: "__none__", label: "— Tidak ada —" };
    const fromMembers = pmMembers.map((m) => ({
      value: m.user.id,
      label: m.user.name,
    }));
    if (
      mode === "edit" &&
      taskDetail?.pmReporterId &&
      !fromMembers.some((x) => x.value === taskDetail.pmReporterId) &&
      taskDetail.pmReporter
    ) {
      return [
        none,
        {
          value: taskDetail.pmReporterId,
          label: `${taskDetail.pmReporter.name} (di luar daftar PM)`,
        },
        ...fromMembers,
      ];
    }
    return [none, ...fromMembers];
  }, [pmMembers, mode, taskDetail?.pmReporterId, taskDetail?.pmReporter]);

  const clientReporterSelectItems = useMemo(() => {
    const none = { value: "__none__", label: "— Tidak ada —" };
    const fromMembers = clientMembers.map((m) => ({
      value: m.user.id,
      label: m.user.name,
    }));
    if (
      mode === "edit" &&
      taskDetail?.clientUserId &&
      !fromMembers.some((x) => x.value === taskDetail.clientUserId) &&
      taskDetail.clientUser
    ) {
      return [
        none,
        {
          value: taskDetail.clientUserId,
          label: `${taskDetail.clientUser.name} (di luar daftar client)`,
        },
        ...fromMembers,
      ];
    }
    return [none, ...fromMembers];
  }, [clientMembers, mode, taskDetail?.clientUserId, taskDetail?.clientUser]);

  const sprintSelectFormItems = useMemo(
    () => [
      { value: "__none__", label: "— Tidak ada —" },
      ...sprints.map((s) => ({ value: s.id, label: s.name })),
    ],
    [sprints],
  );

  const taskDraftKey =
    open && projectId
      ? mode === "create"
        ? FormDraftKeys.taskCreate(projectId)
        : taskId
          ? FormDraftKeys.taskEdit(taskId)
          : null
      : null;

  const wf = form.watch();

  const applyEmptyCreateFromDefaults = useCallback(() => {
    setAssigneeIds([]);
    setDepIds([]);
    setRefIds([]);
    setPendingFiles([]);
    setStoredAttachments([]);
    setPendingLinks([]);
    setLinkUrlDraft("");
    setLinkNameDraft("");
    setEditingAttachmentId(null);
    form.reset({
      title: "",
      description: "",
      status: "backlog",
      priority: "medium",
      type: "task",
      startDate: "",
      dueDate: "",
      sprintId: "",
      tagsInput: "",
      parentTaskId: "",
      pmReporterId: "",
      clientUserId: "",
      ...defaultValues,
    });
  }, [defaultValues, form]);

  useEffect(() => {
    if (!open || mode !== "create" || !projectId) return;
    const raw = taskDraftKey
      ? loadFormDraftEnvelope(taskDraftKey)?.payload
      : null;
    if (raw && typeof raw === "object") {
      const p = raw as {
        values?: Partial<Values>;
        extras?: {
          assigneeIds?: string[];
          depIds?: string[];
          refIds?: string[];
          pendingLinks?: { url: string; name: string }[];
        };
      };
      setPendingFiles([]);
      setPendingLinks(
        Array.isArray(p.extras?.pendingLinks) ? p.extras!.pendingLinks! : [],
      );
      setLinkUrlDraft("");
      setLinkNameDraft("");
      if (p.values && typeof p.values === "object") {
        form.reset({
          title: "",
          description: "",
          status: "backlog",
          priority: "medium",
          type: "task",
          startDate: "",
          dueDate: "",
          sprintId: "",
          tagsInput: "",
          parentTaskId: "",
          pmReporterId: "",
          clientUserId: "",
          ...defaultValues,
          ...p.values,
        });
      } else applyEmptyCreateFromDefaults();
      setAssigneeIds(Array.isArray(p.extras?.assigneeIds) ? p.extras!.assigneeIds! : []);
      setDepIds(Array.isArray(p.extras?.depIds) ? p.extras!.depIds! : []);
      setRefIds(Array.isArray(p.extras?.refIds) ? p.extras!.refIds! : []);
      return;
    }
    applyEmptyCreateFromDefaults();
    if (initialReferenceTaskIds?.length) {
      setRefIds([...new Set(initialReferenceTaskIds)]);
    }
  }, [open, mode, projectId, applyEmptyCreateFromDefaults, defaultValues, form, taskDraftKey, initialReferenceTaskIds]);

  useEffect(() => {
    if (!open || mode !== "edit" || !taskDetail || !taskId) return;
    setPendingFiles([]);
    setStoredAttachments(taskDetail.attachments ?? []);
    setEditingAttachmentId(null);
    const editKey = FormDraftKeys.taskEdit(taskId);
    const raw = loadFormDraftEnvelope(editKey)?.payload;
    if (raw && typeof raw === "object") {
      const p = raw as {
        values?: Partial<Values>;
        extras?: {
          assigneeIds?: string[];
          depIds?: string[];
          refIds?: string[];
          pendingLinks?: { url: string; name: string }[];
        };
      };
      if (p.values && typeof p.values === "object") {
        form.reset({
          title: taskDetail.title,
          description: taskDetail.description ?? "",
          status: taskDetail.status,
          priority: taskDetail.priority,
          type: taskDetail.type ?? "task",
          startDate: dateInput(taskDetail.startDate),
          dueDate: dateInput(taskDetail.dueDate),
          sprintId: taskDetail.sprintId ?? "",
          tagsInput: (taskDetail.tags ?? []).join(", "),
          parentTaskId: taskDetail.parentTaskId ?? "",
          pmReporterId: taskDetail.pmReporterId ?? "",
          clientUserId: taskDetail.clientUserId ?? "",
          ...p.values,
        });
        setAssigneeIds(
          Array.isArray(p.extras?.assigneeIds)
            ? p.extras!.assigneeIds!
            : taskDetail.assignees.map((a) => a.user.id),
        );
        setDepIds(
          Array.isArray(p.extras?.depIds)
            ? p.extras!.depIds!
            : taskDetail.dependsOn.map((d) => d.dependsOn.id),
        );
        setRefIds(
          Array.isArray(p.extras?.refIds)
            ? p.extras!.refIds!
            : (taskDetail.references ?? []).map((r) => r.reference.id),
        );
        setPendingLinks(
          Array.isArray(p.extras?.pendingLinks) ? p.extras!.pendingLinks! : [],
        );
        setLinkUrlDraft("");
        setLinkNameDraft("");
        return;
      }
    }
    setPendingLinks([]);
    setLinkUrlDraft("");
    setLinkNameDraft("");
    setAssigneeIds(taskDetail.assignees.map((a) => a.user.id));
    setDepIds(taskDetail.dependsOn.map((d) => d.dependsOn.id));
    setRefIds((taskDetail.references ?? []).map((r) => r.reference.id));
    form.reset({
      title: taskDetail.title,
      description: taskDetail.description ?? "",
      status: taskDetail.status,
      priority: taskDetail.priority,
      type: taskDetail.type ?? "task",
      startDate: dateInput(taskDetail.startDate),
      dueDate: dateInput(taskDetail.dueDate),
      sprintId: taskDetail.sprintId ?? "",
      tagsInput: (taskDetail.tags ?? []).join(", "),
      parentTaskId: taskDetail.parentTaskId ?? "",
      pmReporterId: taskDetail.pmReporterId ?? "",
      clientUserId: taskDetail.clientUserId ?? "",
    });
  }, [open, mode, taskDetail, form, taskId]);

  useDebouncedFormDraftSave(
    Boolean(open && taskDraftKey),
    taskDraftKey,
    () => {
      const values = form.getValues();
      const hasContent =
        !!(values.title ?? "").trim() ||
        !!(values.description ?? "").trim() ||
        !!(values.tagsInput ?? "").trim() ||
        assigneeIds.length > 0 ||
        depIds.length > 0 ||
        refIds.length > 0 ||
        !!(values.sprintId ?? "").trim() ||
        !!(values.pmReporterId ?? "").trim() ||
        !!(values.clientUserId ?? "").trim() ||
        !!(values.startDate ?? "").trim() ||
        !!(values.dueDate ?? "").trim() ||
        pendingFiles.length > 0 ||
        pendingLinks.length > 0;
      if (!hasContent) return undefined;
      return {
        values: form.getValues(),
        extras: { assigneeIds, depIds, refIds, pendingLinks },
      };
    },
    [wf, assigneeIds, depIds, refIds, pendingFiles, pendingLinks],
  );

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function toggleDep(id: string) {
    setDepIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function toggleRef(id: string) {
    setRefIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function saveLinkDraft() {
    const normalized = normalizeAttachmentUrl(linkUrlDraft);
    if (!normalized) {
      toast.error("URL tidak valid");
      return;
    }
    const name = linkNameDraft.trim() || defaultLinkAttachmentLabel(normalized);
    if (editingAttachmentId) {
      setStoredAttachments((prev) =>
        prev.map((row) =>
          row.id === editingAttachmentId ? { ...row, url: normalized, name } : row,
        ),
      );
      setEditingAttachmentId(null);
    } else {
      setPendingLinks((prev) => [...prev, { url: normalized, name }]);
    }
    setLinkUrlDraft("");
    setLinkNameDraft("");
  }

  const assigneeTriggerLabel = useMemo(() => {
    if (!assigneeIds.length) return "Pilih assignee…";
    const names = assigneeIds
      .map((id) => assigneeNameById.get(id))
      .filter(Boolean) as string[];
    return names.length <= 2 ? names.join(", ") : `${assigneeIds.length} dipilih`;
  }, [assigneeIds, assigneeNameById]);

  const depTriggerLabel = useMemo(() => depIds.length ? `${depIds.length} task dipilih` : "Pilih dependensi…", [depIds]);

  const refTriggerLabel = useMemo(
    () => (refIds.length ? `${refIds.length} task dipilih` : "Pilih referensi task…"),
    [refIds],
  );
  const storedLinks = storedAttachments.filter(
    (attachment) => !attachment.url.startsWith("/uploads/"),
  );
  const storedFiles = storedAttachments.filter((attachment) =>
    attachment.url.startsWith("/uploads/"),
  );

  async function onSubmit(values: Values) {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setBusy(true);
    let savedTaskId: string | undefined;
    try {
      const attachmentUpdates = storedAttachments.map((attachment) => {
        const url = normalizeAttachmentUrl(attachment.url);
        const name = attachment.name.trim();
        if (!url) throw new Error("invalid_attachment_url");
        if (!name) throw new Error("invalid_attachment_name");
        return { ...attachment, url, name };
      });
      const tags = (values.tagsInput ?? "").split(",").map((t) => t.trim()).filter(Boolean);
      const payload: Record<string, unknown> = {
        projectId, title: values.title,
        description: values.description || undefined,
        status: values.status || "backlog", priority: values.priority || "medium",
        type: values.type || "task",
        startDate: values.startDate || undefined, dueDate: values.dueDate || undefined,
        sprintId: values.sprintId || undefined,
        pmReporterId: values.pmReporterId || undefined, clientUserId: values.clientUserId || undefined,
        assigneeIds: assigneeIds.length ? assigneeIds : undefined,
        tags: tags.length ? tags : undefined,
        dependsOnIds: depIds.length ? depIds : undefined,
        referenceIds: refIds.length ? refIds : undefined,
      };

      if (mode === "create") {
        const res = await api.post<{ id: string }>("/api/tasks", payload);
        savedTaskId = res.data.id;
        toast.success("Tugas berhasil dibuat");
      } else if (taskId) {
        const { projectId, ...patch } = payload;
        void projectId;
        await api.patch(`/api/tasks/${taskId}`, {
          ...patch,
          // Always send assigneeIds (including []) so clearing all assignees is persisted.
          assigneeIds,
          dependsOnIds: depIds,
          referenceIds: refIds,
        });
        savedTaskId = taskId;
        toast.success("Tugas berhasil diperbarui");
      }

      if (pendingFiles.length > 0 && savedTaskId) {
        for (const file of pendingFiles) {
          try {
            const { url, name } = await uploadFile(file, "tasks");
            await api.post(`/api/tasks/${savedTaskId}/attachments`, { url, name });
          } catch { toast.warning(`Gagal unggah "${file.name}"`); }
        }
      }
      if (pendingLinks.length > 0 && savedTaskId) {
        for (const row of pendingLinks) {
          try {
            await api.post(`/api/tasks/${savedTaskId}/attachments`, {
              url: row.url,
              name: row.name,
            });
          } catch {
            toast.warning(`Gagal menambah tautan "${row.name}"`);
          }
        }
      }
      if (mode === "edit" && savedTaskId) {
        const originalAttachments = taskDetail?.attachments ?? [];
        const keptIds = new Set(attachmentUpdates.map((a) => a.id));
        for (const attachment of attachmentUpdates) {
          const original = originalAttachments.find((a) => a.id === attachment.id);
          if (
            original &&
            (attachment.url !== original.url || attachment.name !== original.name)
          ) {
            await api.patch(
              `/api/tasks/${savedTaskId}/attachments/${attachment.id}`,
              { url: attachment.url, name: attachment.name },
            );
          }
        }
        for (const attachment of originalAttachments) {
          if (!keptIds.has(attachment.id)) {
            await api.delete(
              `/api/tasks/${savedTaskId}/attachments/${attachment.id}`,
            );
          }
        }
      }

      void qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      if (savedTaskId) {
        const taskKeys = new Set(
          [
            savedTaskId,
            taskId,
            mode === "edit" ? taskDetail?.id : null,
            mode === "edit" ? taskDetail?.shareToken : null,
          ]
            .map((x) => (typeof x === "string" ? x.trim() : ""))
            .filter(Boolean),
        );
        for (const k of taskKeys) {
          void qc.invalidateQueries({ queryKey: ["task", k] });
          void qc.invalidateQueries({ queryKey: ["task", k, "form"] });
          void qc.invalidateQueries({ queryKey: ["task", k, "comments"] });
        }
      }
      if (mode === "create" && projectId) {
        clearFormDraft(FormDraftKeys.taskCreate(projectId));
      } else if (taskId) {
        clearFormDraft(FormDraftKeys.taskEdit(taskId));
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "invalid_attachment_url") {
        toast.error("URL lampiran tidak valid");
        return;
      }
      if (err instanceof Error && err.message === "invalid_attachment_name") {
        toast.error("Nama lampiran tidak boleh kosong");
        return;
      }
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Gagal menyimpan tugas";
      toast.error(msg);
    } finally {
      submitLockRef.current = false;
      setBusy(false);
    }
  }

  const deleteTaskM = useMutation({
    mutationFn: async () => {
      if (!taskId) throw new Error("no task");
      await api.delete(`/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      setDeleteTaskOpen(false);
      void qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      void qc.invalidateQueries({ queryKey: ["task", taskId ?? ""] });
      if (taskId) clearFormDraft(FormDraftKeys.taskEdit(taskId));
      toast.success("Tugas dihapus");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Gagal menghapus tugas";
      toast.error(msg);
    },
  });

  const isEditLoading = mode === "edit" && !!taskId && taskLoading && !taskDetail;
  const currentStatus = form.watch("status") || "backlog";

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[92vh] sm:max-h-[92vh] sm:max-w-4xl sm:rounded-xl" showCloseButton={false}>

        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-zinc-100 px-4 py-4 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-zinc-900">
                {mode === "create" ? "Buat Tugas Baru" : "Edit Tugas"}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-zinc-500">
                {mode === "create" ? "Lengkapi semua informasi tugas di bawah ini" : "Perbarui informasi tugas"}
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_COLORS[currentStatus] ?? "bg-zinc-100 text-zinc-600")}>
                {TASK_FORM_STATUS_ITEMS.find((s) => s.value === currentStatus)?.label ?? currentStatus}
              </span>
              <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
                <X className="size-4" />
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Body — single column scrollable */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <form id="task-form" onSubmit={form.handleSubmit(onSubmit)}>
            {isEditLoading && (
              <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 text-sm text-zinc-500 sm:px-7">
                <div className="size-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                Memuat data tugas…
              </div>
            )}

            <div className="space-y-5 px-4 py-6 sm:px-7">

              {/* Judul Tugas */}
              <div className="space-y-1.5">
                <Label htmlFor="tf-title" className="text-sm font-medium text-zinc-700">
                  Judul Tugas <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tf-title"
                  placeholder="Nama tugas yang jelas dan deskriptif…"
                  className="h-10 text-sm"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
                )}
              </div>

              {/* Status | Prioritas | Tipe */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-500">Status</Label>
                  <Select
                    value={form.watch("status") || "backlog"}
                    onValueChange={(v) => form.setValue("status", v ?? "backlog")}
                    items={TASK_FORM_STATUS_ITEMS}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_FORM_STATUS_ITEMS.map((it) => (
                        <SelectItem key={it.value} value={it.value}>
                          <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", STATUS_COLORS[it.value])}>{it.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-500">Prioritas</Label>
                  <Select
                    value={form.watch("priority") || "medium"}
                    onValueChange={(v) => form.setValue("priority", v ?? "medium")}
                    items={TASK_FORM_PRIORITY_ITEMS}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_FORM_PRIORITY_ITEMS.map((it) => (
                        <SelectItem key={it.value} value={it.value}>
                          <span className={cn("font-medium", it.color)}>{it.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-500">Tipe</Label>
                  <Select
                    value={form.watch("type") || "task"}
                    onValueChange={(v) => form.setValue("type", v ?? "task")}
                    items={TASK_FORM_TYPE_ITEMS}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_FORM_TYPE_ITEMS.map((it) => (
                        <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Deskripsi */}
              <div className="space-y-1.5">
                <Label htmlFor="tf-desc" className="text-sm font-medium text-zinc-700">Deskripsi</Label>
                <Textarea
                  id="tf-desc"
                  rows={4}
                  placeholder="Jelaskan detail tugas, scope pekerjaan, atau konteks yang diperlukan…"
                  className="resize-none text-sm"
                  {...form.register("description")}
                />
              </div>

              {/* Tim */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Tim</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-zinc-500">PM Reporter</Label>
                    <Select
                      value={form.watch("pmReporterId") || "__none__"}
                      onValueChange={(v) => form.setValue("pmReporterId", v === "__none__" ? "" : (v ?? ""))}
                      items={pmReporterSelectItems}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Pilih PM…" />
                      </SelectTrigger>
                      <SelectContent>
                        {pmReporterSelectItems.map((it) => (
                          <SelectItem key={it.value} value={it.value}>
                            {it.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {pmMembers.length === 0 ? (
                      <p className="text-[11px] text-zinc-400">
                        Belum ada anggota dengan peran PM di proyek ini
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-zinc-500">Client Reporter</Label>
                    <Select
                      value={form.watch("clientUserId") || "__none__"}
                      onValueChange={(v) => form.setValue("clientUserId", v === "__none__" ? "" : (v ?? ""))}
                      items={clientReporterSelectItems}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Pilih client…" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientReporterSelectItems.map((it) => (
                          <SelectItem key={it.value} value={it.value}>
                            {it.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {clientMembers.length === 0 ? (
                      <p className="text-[11px] text-zinc-400">
                        Belum ada anggota dengan peran Client di proyek ini
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-zinc-500">Assignees</Label>
                    <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                      <PopoverTrigger
                        type="button"
                        render={<Button type="button" variant="outline" className="h-9 w-full justify-between font-normal text-sm" />}
                      >
                        <span className="truncate text-left text-zinc-600">{assigneeTriggerLabel}</span>
                        <ChevronDownIcon className="ml-2 size-3.5 shrink-0 text-zinc-400" />
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-2" align="start">
                        <Input
                          placeholder="Cari nama atau role…"
                          value={assigneeSearch}
                          onChange={(e) => setAssigneeSearch(e.target.value)}
                          className="mb-2 h-8 text-xs"
                        />
                        <div className="max-h-44 overflow-y-auto">
                          {assigneeOptionsQ.isPending ? (
                            <p className="py-3 text-center text-xs text-zinc-400">Memuat…</p>
                          ) : assigneeOptionsQ.isError ? (
                            <p className="py-3 text-center text-xs text-red-600">
                              Gagal memuat daftar user
                            </p>
                          ) : filteredAssigneeUsers.length === 0 ? (
                            <p className="py-3 text-center text-xs text-zinc-400">
                              {allAssigneeUsers.length === 0
                                ? "Belum ada anggota proyek"
                                : "Tidak ada yang cocok"}
                            </p>
                          ) : (
                            filteredAssigneeUsers.map((u) => (
                              <label
                                key={u.id}
                                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-zinc-50"
                              >
                                <Checkbox
                                  checked={assigneeIds.includes(u.id)}
                                  onCheckedChange={() => toggleAssignee(u.id)}
                                  className="size-3.5"
                                />
                                <span className="min-w-0 flex-1 truncate text-sm">{u.name}</span>
                                <span className="shrink-0 text-[10px] uppercase text-zinc-400">
                                  {u.role}
                                </span>
                              </label>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {assigneeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {assigneeIds.map((id) => {
                      const label =
                        assigneeNameById.get(id) ??
                        (id.length > 10 ? `${id.slice(0, 8)}…` : id);
                      return (
                        <Badge key={id} variant="secondary" className="gap-1 text-xs">
                          {label}
                          <button type="button" onClick={() => toggleAssignee(id)} className="opacity-50 hover:opacity-100"><X className="size-3" /></button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Jadwal */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Jadwal</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-zinc-500">Tanggal Mulai</Label>
                    <Input type="date" className="h-9 text-sm" {...form.register("startDate")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-zinc-500">Jatuh Tempo</Label>
                    <Input type="date" className="h-9 text-sm" {...form.register("dueDate")} />
                  </div>
                </div>
              </div>

              {/* Organisasi */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Organisasi</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-zinc-500">Sprint</Label>
                    <Select
                      value={form.watch("sprintId") || "__none__"}
                      onValueChange={(v) => form.setValue("sprintId", v === "__none__" ? "" : (v ?? ""))}
                      items={sprintSelectFormItems}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="— Tidak ada —" />
                      </SelectTrigger>
                      <SelectContent>
                        {sprintSelectFormItems.map((it) => (
                          <SelectItem key={it.value} value={it.value}>
                            {it.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {sprints.length === 0 ? (
                      <p className="text-[11px] text-zinc-400">Belum ada sprint</p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-zinc-500">Tags</Label>
                    <Input placeholder="feature, urgent, api…" className="h-9 text-sm" {...form.register("tagsInput")} />
                    <p className="text-[11px] text-zinc-400">Pisahkan dengan koma</p>
                  </div>
                </div>
              </div>

              {/* Relasi Task */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Relasi Task</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs font-medium text-zinc-500">Referensi task</Label>
                      <FieldTooltip text="Task lain sebagai acuan informatif (mis. desain, requirement). Tidak memblokir progres." />
                    </div>
                    <Popover open={refOpen} onOpenChange={setRefOpen}>
                      <PopoverTrigger
                        type="button"
                        render={<Button type="button" variant="outline" className="h-9 w-full justify-between font-normal text-sm" />}
                      >
                        <span className="truncate text-left text-zinc-600">{refTriggerLabel}</span>
                        <ChevronDownIcon className="ml-2 size-3.5 shrink-0 text-zinc-400" />
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-2" align="start">
                        <Input
                          placeholder="Cari task…"
                          value={refSearch}
                          onChange={(e) => setRefSearch(e.target.value)}
                          className="mb-2 h-8 text-xs"
                        />
                        <TaskPickerInfiniteList
                          query={refPickQ}
                          tasks={tasksForRefsPicker}
                          getLabel={getTaskLabel}
                          isSelected={(id) => refIds.includes(id)}
                          onToggle={toggleRef}
                        />
                      </PopoverContent>
                    </Popover>
                    {refIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {refIds.map((id) => {
                          const row = tasksForRefsPicker.find((x) => x.id === id);
                          const label = row ? getTaskLabel(row) : id;
                          return (
                            <Badge key={id} variant="outline" className="max-w-[200px] gap-1 truncate text-xs text-sky-800">
                              <span className="truncate">{label}</span>
                              <button type="button" onClick={() => toggleRef(id)} className="shrink-0 opacity-50 hover:opacity-100"><X className="size-3" /></button>
                            </Badge>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs font-medium text-zinc-500">Dependensi task</Label>
                      <FieldTooltip text="Task yang HARUS selesai sebelum task ini bisa maju ke In Progress. Memblokir progres secara otomatis." />
                    </div>
                    <Popover open={depOpen} onOpenChange={setDepOpen}>
                      <PopoverTrigger
                        type="button"
                        render={<Button type="button" variant="outline" className="h-9 w-full justify-between font-normal text-sm" />}
                      >
                        <span className="truncate text-left text-zinc-600">{depTriggerLabel}</span>
                        <ChevronDownIcon className="ml-2 size-3.5 shrink-0 text-zinc-400" />
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-2" align="start">
                        <Input placeholder="Cari task…" value={depSearch} onChange={(e) => setDepSearch(e.target.value)} className="mb-2 h-8 text-xs" />
                        <TaskPickerInfiniteList
                          query={depPickQ}
                          tasks={tasksForDepsPicker}
                          getLabel={getTaskLabel}
                          isSelected={(id) => depIds.includes(id)}
                          onToggle={toggleDep}
                        />
                      </PopoverContent>
                    </Popover>
                    {depIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {depIds.map((id) => {
                          const t = tasksForDepsPicker.find((x) => x.id === id);
                          const label = t ? getTaskLabel(t) : id;
                          return (
                            <Badge key={id} variant="outline" className="max-w-[200px] gap-1 truncate text-xs text-amber-700">
                              <span className="truncate">{label}</span>
                              <button type="button" onClick={() => toggleDep(id)} className="shrink-0 opacity-50 hover:opacity-100"><X className="size-3" /></button>
                            </Badge>
                          );
                        })}
                        <p className="w-full text-[11px] text-amber-600/80">⚠ Memblokir progres jika dependensi belum selesai</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Lampiran */}
              <div className="space-y-2 pb-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Lampiran</p>
                  {(storedAttachments.length > 0 || pendingFiles.length > 0 || pendingLinks.length > 0) && (
                    <span className="text-xs text-zinc-400">
                      {storedAttachments.length + pendingFiles.length + pendingLinks.length} lampiran
                    </span>
                  )}
                </div>
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-zinc-500">
                    <Link2 className="size-3.5 shrink-0" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide">Tautan</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <Input
                      placeholder="https:// atau domain…"
                      className="h-9 font-mono text-xs"
                      value={linkUrlDraft}
                      onChange={(e) => setLinkUrlDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && linkUrlDraft.trim()) {
                          e.preventDefault();
                          saveLinkDraft();
                        }
                      }}
                    />
                    <Input
                      placeholder="Label (opsional)"
                      className="h-9 text-sm"
                      value={linkNameDraft}
                      onChange={(e) => setLinkNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && linkUrlDraft.trim()) {
                          e.preventDefault();
                          saveLinkDraft();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0"
                      disabled={!linkUrlDraft.trim()}
                      onClick={saveLinkDraft}
                    >
                      <Plus className="mr-1 size-3.5" />
                      {editingAttachmentId ? "Simpan" : "Tambah"}
                    </Button>
                  </div>
                  {(storedLinks.length > 0 || pendingLinks.length > 0) && (
                    <ul className="mt-3 space-y-1.5">
                      {storedLinks.map((row) => (
                        <li
                          key={row.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-zinc-100 bg-white px-2.5 py-1.5"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <Link2 className="size-3 shrink-0 text-zinc-400" />
                            <span className="truncate text-sm text-zinc-800">{row.name}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAttachmentId(row.id);
                                setLinkUrlDraft(row.url);
                                setLinkNameDraft(row.name);
                              }}
                              className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStoredAttachments((prev) =>
                                  prev.filter((attachment) => attachment.id !== row.id),
                                );
                                if (editingAttachmentId === row.id) {
                                  setEditingAttachmentId(null);
                                  setLinkUrlDraft("");
                                  setLinkNameDraft("");
                                }
                              }}
                              className="rounded p-0.5 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                              aria-label="Hapus tautan dari daftar"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                      {pendingLinks.map((row, i) => (
                        <li
                          key={`${row.url}-${i}`}
                          className="flex items-center justify-between gap-2 rounded-md border border-zinc-100 bg-white px-2.5 py-1.5"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <Link2 className="size-3 shrink-0 text-zinc-400" />
                            <span className="truncate text-sm text-zinc-800">{row.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingLinks((prev) => prev.filter((_, j) => j !== i))
                            }
                            className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                            aria-label="Hapus tautan dari daftar"
                          >
                            <X className="size-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <FileDropZone
                  busy={false}
                  onFiles={(files) => setPendingFiles((prev) => [...prev, ...files])}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  label="Klik atau seret file ke sini"
                  hint="Gambar, PDF, dokumen, arsip — maks 10 MB per file"
                />
                {(storedFiles.length > 0 || pendingFiles.length > 0) && (
                  <div className="space-y-1">
                    {storedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Paperclip className="size-3 shrink-0 text-zinc-400" />
                          <span className="truncate text-sm text-zinc-700">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setStoredAttachments((prev) =>
                              prev.filter((attachment) => attachment.id !== file.id),
                            )
                          }
                          className="ml-2 shrink-0 rounded p-0.5 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                          aria-label={`Hapus lampiran ${file.name}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Paperclip className="size-3 shrink-0 text-zinc-400" />
                          <span className="truncate text-sm text-zinc-700">{f.name}</span>
                          <span className="shrink-0 text-[11px] text-zinc-400">{(f.size / 1024).toFixed(0)} KB</span>
                        </div>
                        <button type="button" onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))} className="ml-2 shrink-0 rounded p-0.5 text-zinc-400 hover:bg-red-50 hover:text-red-500">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </form>
        </div>

        {/* Footer — reset DialogFooter -mx/-mb so buttons are not flush with dialog edge */}
        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 rounded-none border-t border-zinc-100 bg-zinc-50/60 px-4 py-4 pb-5 sm:flex-row sm:justify-between sm:rounded-b-xl sm:px-7">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex justify-center sm:justify-start">
              {canDeleteTask ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:border-red-200 hover:bg-red-50"
                  disabled={busy || isEditLoading}
                  onClick={() => setDeleteTaskOpen(true)}
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  Hapus tugas
                </Button>
              ) : (
                <span />
              )}
            </div>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" form="task-form" size="sm" disabled={busy || isEditLoading} className="min-w-[120px]">
              {busy ? (
                <span className="flex items-center gap-1.5">
                  <span className="size-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Menyimpan…
                </span>
              ) : mode === "create" ? "Buat Tugas" : "Simpan Perubahan"}
            </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={deleteTaskOpen} onOpenChange={setDeleteTaskOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus tugas?</AlertDialogTitle>
          <AlertDialogDescription>
            Tugas akan disembunyikan dari papan dan backlog (soft delete). Nomor tugas tampilan akan diurutkan ulang. Tercatat di audit trail.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-600/90"
            disabled={deleteTaskM.isPending || !taskId}
            onClick={() => deleteTaskM.mutate()}
          >
            {deleteTaskM.isPending ? "Menghapus…" : "Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
