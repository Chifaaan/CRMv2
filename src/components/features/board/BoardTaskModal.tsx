"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDownIcon, Link2, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import {
  defaultLinkAttachmentLabel,
  normalizeAttachmentUrl,
} from "@/lib/attachment-url";
import {
  Dialog,
  DialogContent,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { TASK_TYPE_OPTIONS, taskTypeLabel } from "@/lib/task-types";
import {
  FormDraftKeys,
  clearFormDraft,
  loadFormDraftEnvelope,
} from "@/lib/form-draft-storage";
import { useDebouncedFormDraftSave } from "@/lib/hooks/use-debounced-form-draft-save";
import { isAdminOrPmRole } from "@/lib/role-constants";

export const TASK_STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "on_check", label: "On Check" },
  { value: "need_revision", label: "Need Revision" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  type: z.string().min(1, "Tipe wajib dipilih"),
  status: z.string(),
  priority: z.string(),
  sprintId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  tagsInput: z.string().optional(),
  parentTaskId: z.string().optional(),
  pmReporterId: z.string().optional(),
  clientUserId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export type BoardTaskMember = {
  projectRole?: string;
  user: { id: string; name: string; role?: string };
};
export type BoardTaskSprint = { id: string; name: string };

type TaskPickRow = { id: string; title: string; taskNumber: number; project?: { code: string } };

type TaskEditPayload = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  sprintId: string | null;
  startDate: string | null;
  dueDate: string | null;
  tags: string[];
  parentTaskId: string | null;
  pmReporterId: string | null;
  clientUserId: string | null;
  pmReporter?: { id: string; name: string } | null;
  clientUser?: { id: string; name: string } | null;
  assignees: { user: { id: string; name: string; image?: string | null } }[];
  dependsOn: { dependsOn: { id: string } }[];
  references?: { reference: { id: string; title: string; taskNumber: number; project?: { code: string } } }[];
};

type BaseProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  members: BoardTaskMember[];
  sprints: BoardTaskSprint[];
  onSuccess?: () => void;
};

export type BoardTaskModalProps = BaseProps &
  (
    | { mode?: "create"; defaultStatus?: string; taskId?: never }
    | { mode: "edit"; taskId: string; defaultStatus?: never }
  );

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function dateInput(v: string | null | undefined) {
  if (!v) return "";
  try {
    return format(new Date(v), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

type AssigneeOptionUser = {
  id: string;
  name: string;
  image: string | null;
  role: string;
};

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

export function BoardTaskModal({
  open,
  onOpenChange,
  projectId,
  members,
  sprints,
  onSuccess,
  ...rest
}: BoardTaskModalProps) {
  void members;
  const mode = rest.mode ?? "create";
  const taskId = mode === "edit" ? rest.taskId : undefined;
  const defaultStatus =
    mode === "create" ? (rest.defaultStatus ?? "backlog") : "todo";

  const { data: session, isPending: sessionPending } = useSession();
  const workspaceRole =
    ((session?.user as { role?: string } | undefined)?.role ?? "").toLowerCase();
  const canDeleteBoardTask =
    mode === "edit" &&
    !!taskId &&
    (isAdminOrPmRole(workspaceRole));
  const qc = useQueryClient();

  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const [depIds, setDepIds] = useState<string[]>([]);
  const [depOpen, setDepOpen] = useState(false);
  const [refIds, setRefIds] = useState<string[]>([]);
  const [refOpen, setRefOpen] = useState(false);
  const [refSearch, setRefSearch] = useState("");
  const [depSearch, setDepSearch] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingLinks, setPendingLinks] = useState<{ url: string; name: string }[]>(
    [],
  );
  const [linkUrlDraft, setLinkUrlDraft] = useState("");
  const [linkNameDraft, setLinkNameDraft] = useState("");
  const [deleteBoardTaskOpen, setDeleteBoardTaskOpen] = useState(false);
  const submitLockRef = useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      type: "task",
      status: defaultStatus,
      priority: "medium",
      sprintId: "",
      startDate: "",
      dueDate: "",
      tagsInput: "",
      parentTaskId: "",
      pmReporterId: "",
      clientUserId: "",
    },
  });

  const projectMembersQ = useQuery({
    queryKey: ["project-members-detail", projectId],
    queryFn: async () => {
      const res = await api.get<
        Array<{
          projectRole: string;
          user: { id: string; name: string; image: string | null; role: string };
        }>
      >(`/api/projects/${projectId}/members`);
      return res.data;
    },
    enabled: open && Boolean(projectId),
  });

  const assigneeOptionsQ = useQuery({
    queryKey: ["board-modal-assignees", projectId],
    queryFn: async () => {
      const res = await api.get<unknown>(
        `/api/projects/${encodeURIComponent(projectId)}/assignees`,
      );
      return normalizeAssigneeUsers(res.data);
    },
    enabled: open && Boolean(projectId) && !sessionPending,
  });

  const tasksPickQ = useQuery({
    queryKey: ["tasks", projectId, "pick-board"],
    queryFn: async () => {
      const res = await api.get<{ data: TaskPickRow[] }>("/api/tasks", {
        params: { projectId, page: "1", take: "2000", kanban: "1" },
      });
      return res.data.data;
    },
    enabled: open && Boolean(projectId),
  });

  const pmMembers = (projectMembersQ.data ?? []).filter(
    (m) =>
      (m.projectRole ?? "").toUpperCase() === "PM" &&
      !isWorkspaceAdminRole(m.user.role),
  );
  const clientMembers = (projectMembersQ.data ?? []).filter(
    (m) => (m.projectRole ?? "").toUpperCase() === "CLIENT",
  );

  const taskQ = useQuery({
    queryKey: ["task", taskId, "board-modal"],
    queryFn: async () => {
      const res = await api.get<TaskEditPayload>(`/api/tasks/${taskId}`);
      return res.data;
    },
    enabled: open && mode === "edit" && Boolean(taskId),
  });

  /** Base UI Select membutuhkan `items` agar nilai UUID terpetakan ke label dan tidak error. */
  const pmReporterSelectItems = useMemo(() => {
    const none = { value: "__none__", label: "— None —" };
    const fromMembers = pmMembers.map((m) => ({
      value: m.user.id,
      label: m.user.name,
    }));
    if (
      mode === "edit" &&
      taskQ.data?.pmReporterId &&
      !fromMembers.some((x) => x.value === taskQ.data.pmReporterId) &&
      taskQ.data.pmReporter
    ) {
      return [
        none,
        {
          value: taskQ.data.pmReporterId,
          label: `${taskQ.data.pmReporter.name} (not in list)`,
        },
        ...fromMembers,
      ];
    }
    return [none, ...fromMembers];
  }, [pmMembers, mode, taskQ.data?.pmReporterId, taskQ.data?.pmReporter]);

  const clientReporterSelectItems = useMemo(() => {
    const none = { value: "__none__", label: "— None —" };
    const fromMembers = clientMembers.map((m) => ({
      value: m.user.id,
      label: m.user.name,
    }));
    if (
      mode === "edit" &&
      taskQ.data?.clientUserId &&
      !fromMembers.some((x) => x.value === taskQ.data.clientUserId) &&
      taskQ.data.clientUser
    ) {
      return [
        none,
        {
          value: taskQ.data.clientUserId,
          label: `${taskQ.data.clientUser.name} (not in list)`,
        },
        ...fromMembers,
      ];
    }
    return [none, ...fromMembers];
  }, [clientMembers, mode, taskQ.data?.clientUserId, taskQ.data?.clientUser]);

  const allAssigneeUsers = useMemo(
    () => assigneeOptionsQ.data ?? [],
    [assigneeOptionsQ.data],
  );

  const assigneeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of allAssigneeUsers) {
      map.set(u.id, u.name);
    }
    if (mode === "edit" && taskQ.data?.assignees?.length) {
      for (const a of taskQ.data.assignees) {
        const id = a.user.id;
        if (!map.has(id)) {
          map.set(id, a.user.name ?? id);
        }
      }
    }
    return map;
  }, [allAssigneeUsers, mode, taskQ.data?.assignees]);
  const allTasks = useMemo(
    () => (tasksPickQ.data ?? []).filter((t) => t.id !== taskId),
    [tasksPickQ.data, taskId],
  );

  function getTaskLabel(t: TaskPickRow) {
    if (t.taskNumber && t.project?.code) {
      return `${t.project.code}-${String(t.taskNumber).padStart(4, "0")} ${t.title}`;
    }
    return t.title;
  }

  const filteredTasks = useMemo(() => {
    const q = depSearch.toLowerCase();
    if (!q) return allTasks;
    return allTasks.filter((t) => getTaskLabel(t).toLowerCase().includes(q));
  }, [allTasks, depSearch]);

  const filteredRefTasks = useMemo(() => {
    const q = refSearch.toLowerCase();
    if (!q) return allTasks;
    return allTasks.filter((t) => getTaskLabel(t).toLowerCase().includes(q));
  }, [allTasks, refSearch]);

  const depTriggerLabel = useMemo(() => {
    if (depIds.length === 0) return "Pilih task dependensi…";
    return `${depIds.length} task dipilih`;
  }, [depIds]);

  const refTriggerLabel = useMemo(() => {
    if (refIds.length === 0) return "Pilih referensi task…";
    return `${refIds.length} task dipilih`;
  }, [refIds]);

  function toggleDep(id: string) {
    setDepIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleRef(id: string) {
    setRefIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const boardTaskDraftKey =
    open && projectId
      ? mode === "create"
        ? FormDraftKeys.taskCreate(projectId)
        : taskId
          ? FormDraftKeys.taskEdit(taskId)
          : null
      : null;

  const wf = form.watch();

  useEffect(() => {
    if (!open) return;
    if (mode !== "create") return;
    const raw = boardTaskDraftKey
      ? loadFormDraftEnvelope(boardTaskDraftKey)?.payload
      : null;
    if (raw && typeof raw === "object") {
      const p = raw as {
        values?: Partial<FormValues>;
        extras?: {
          assigneeIds?: string[];
          depIds?: string[];
          refIds?: string[];
          pendingLinks?: { url: string; name: string }[];
        };
      };
      setAssigneeSearch("");
      setAssigneeOpen(false);
      setDepSearch("");
      setDepOpen(false);
      setRefSearch("");
      setRefOpen(false);
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
          type: "task",
          status: defaultStatus,
          priority: "medium",
          sprintId: "",
          startDate: "",
          dueDate: "",
          tagsInput: "",
          parentTaskId: "",
          pmReporterId: "",
          clientUserId: "",
          ...p.values,
        });
      } else {
        setAssigneeIds([]);
        setDepIds([]);
        setRefIds([]);
        form.reset({
          title: "",
          description: "",
          type: "task",
          status: defaultStatus,
          priority: "medium",
          sprintId: "",
          startDate: "",
          dueDate: "",
          tagsInput: "",
          parentTaskId: "",
          pmReporterId: "",
          clientUserId: "",
        });
      }
      setAssigneeIds(Array.isArray(p.extras?.assigneeIds) ? p.extras!.assigneeIds! : []);
      setDepIds(Array.isArray(p.extras?.depIds) ? p.extras!.depIds! : []);
      setRefIds(Array.isArray(p.extras?.refIds) ? p.extras!.refIds! : []);
      return;
    }
    setAssigneeIds([]);
    setAssigneeSearch("");
    setAssigneeOpen(false);
    setDepIds([]);
    setRefIds([]);
    setDepSearch("");
    setDepOpen(false);
    setRefSearch("");
    setRefOpen(false);
    setPendingFiles([]);
    setPendingLinks([]);
    setLinkUrlDraft("");
    setLinkNameDraft("");
    form.reset({
      title: "",
      description: "",
      type: "task",
      status: defaultStatus,
      priority: "medium",
      sprintId: "",
      startDate: "",
      dueDate: "",
      tagsInput: "",
      parentTaskId: "",
      pmReporterId: "",
      clientUserId: "",
    });
  }, [open, mode, defaultStatus, form, boardTaskDraftKey]);

  useEffect(() => {
    if (!open || mode !== "edit" || !taskQ.data || !taskId) return;
    const raw = loadFormDraftEnvelope(FormDraftKeys.taskEdit(taskId))?.payload;
    if (raw && typeof raw === "object") {
      const p = raw as {
        values?: Partial<FormValues>;
        extras?: {
          assigneeIds?: string[];
          depIds?: string[];
          refIds?: string[];
          pendingLinks?: { url: string; name: string }[];
        };
      };
      const t = taskQ.data;
      if (p.values && typeof p.values === "object") {
        form.reset({
          title: t.title,
          description: t.description ?? "",
          type: t.type || "task",
          status: t.status,
          priority: t.priority,
          sprintId: t.sprintId ?? "",
          startDate: dateInput(t.startDate),
          dueDate: dateInput(t.dueDate),
          tagsInput: (t.tags ?? []).join(", "),
          parentTaskId: t.parentTaskId ?? "",
          pmReporterId: t.pmReporterId ?? "",
          clientUserId: t.clientUserId ?? "",
          ...p.values,
        });
        setAssigneeIds(
          Array.isArray(p.extras?.assigneeIds)
            ? p.extras!.assigneeIds!
            : t.assignees.map((a) => a.user.id),
        );
        setDepIds(
          Array.isArray(p.extras?.depIds)
            ? p.extras!.depIds!
            : t.dependsOn.map((d) => d.dependsOn.id),
        );
        setRefIds(
          Array.isArray(p.extras?.refIds)
            ? p.extras!.refIds!
            : (t.references ?? []).map((r) => r.reference.id),
        );
        setPendingLinks(
          Array.isArray(p.extras?.pendingLinks) ? p.extras!.pendingLinks! : [],
        );
        setLinkUrlDraft("");
        setLinkNameDraft("");
        return;
      }
    }
    const t = taskQ.data;
    setPendingLinks([]);
    setLinkUrlDraft("");
    setLinkNameDraft("");
    setAssigneeIds(t.assignees.map((a) => a.user.id));
    setDepIds(t.dependsOn.map((d) => d.dependsOn.id));
    setRefIds((t.references ?? []).map((r) => r.reference.id));
    form.reset({
      title: t.title,
      description: t.description ?? "",
      type: t.type || "task",
      status: t.status,
      priority: t.priority,
      sprintId: t.sprintId ?? "",
      startDate: dateInput(t.startDate),
      dueDate: dateInput(t.dueDate),
      tagsInput: (t.tags ?? []).join(", "),
      parentTaskId: t.parentTaskId ?? "",
      pmReporterId: t.pmReporterId ?? "",
      clientUserId: t.clientUserId ?? "",
    });
  }, [open, mode, taskQ.data, form, taskId]);

  useDebouncedFormDraftSave(
    Boolean(open && boardTaskDraftKey),
    boardTaskDraftKey,
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

  useEffect(() => {
    if (!assigneeOpen) setAssigneeSearch("");
  }, [assigneeOpen]);

  useEffect(() => {
    if (!open) setDeleteBoardTaskOpen(false);
  }, [open]);

  const filteredAssigneeUsers = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return allAssigneeUsers;
    return allAssigneeUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.role ?? "").toLowerCase().includes(q),
    );
  }, [allAssigneeUsers, assigneeSearch]);

  const taskTypeSelectItems = useMemo(() => {
    const base = TASK_TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label }));
    const ty = taskQ.data?.type;
    if (
      mode === "edit" &&
      ty &&
      !TASK_TYPE_OPTIONS.some((o) => o.value === ty)
    ) {
      return [...base, { value: ty, label: taskTypeLabel(ty) }];
    }
    return base;
  }, [mode, taskQ.data?.type]);
  const taskStatusSelectItems = useMemo(
    () => TASK_STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
    [],
  );
  const taskPrioritySelectItems = useMemo(
    () => PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label })),
    [],
  );
  const sprintSelectItems = useMemo(
    () => [
      { value: "__none__", label: "None" },
      ...sprints.map((s) => ({ value: s.id, label: s.name })),
    ],
    [sprints],
  );

  const assigneeTriggerLabel = useMemo(() => {
    if (assigneeIds.length === 0) {
      return "Select assignees…";
    }
    const names = assigneeIds
      .map((id) => assigneeNameById.get(id))
      .filter(Boolean) as string[];
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]}, ${names[1]}`;
    return `${assigneeIds.length} people selected`;
  }, [assigneeIds, assigneeNameById]);

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSubmit(values: FormValues) {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    const tags = parseTags(values.tagsInput ?? "");

    try {
      let savedTaskId: string | undefined;
      if (mode === "create") {
        const res = await api.post<{ id: string }>("/api/tasks", {
          projectId,
          title: values.title.trim(),
          description: values.description?.trim() || undefined,
          type: values.type || "task",
          status: values.status || "backlog",
          priority: values.priority || "medium",
          sprintId: values.sprintId?.trim() || undefined,
          startDate: values.startDate?.trim() || undefined,
          dueDate: values.dueDate?.trim() || undefined,
          assigneeIds: assigneeIds.length ? assigneeIds : undefined,
          tags: tags.length ? tags : undefined,
          dependsOnIds: depIds.length ? depIds : undefined,
          referenceIds: refIds.length ? refIds : undefined,
          pmReporterId: values.pmReporterId?.trim() || undefined,
          clientUserId: values.clientUserId?.trim() || undefined,
        });
        savedTaskId = res.data.id;
        toast.success(`Task "${values.title.trim()}" created`);
      } else if (taskId) {
        await api.patch(`/api/tasks/${taskId}`, {
          title: values.title.trim(),
          description: values.description?.trim() || undefined,
          type: values.type || "task",
          status: values.status || "todo",
          priority: values.priority || "medium",
          sprintId: values.sprintId?.trim() ? values.sprintId.trim() : null,
          startDate: values.startDate?.trim() || undefined,
          dueDate: values.dueDate?.trim() || undefined,
          assigneeIds,
          tags,
          dependsOnIds: depIds,
          referenceIds: refIds,
          pmReporterId: values.pmReporterId?.trim() || undefined,
          clientUserId: values.clientUserId?.trim() || undefined,
        });
        savedTaskId = taskId;
        toast.success(`Task "${values.title.trim()}" updated`);
      }
      if (pendingFiles.length > 0 && savedTaskId) {
        for (const file of pendingFiles) {
          try {
            const { uploadFile } = await import("@/lib/upload");
            const { url, name } = await uploadFile(file, "tasks");
            await api.post(`/api/tasks/${savedTaskId}/attachments`, { url, name });
          } catch {
            toast.warning(`Gagal unggah "${file.name}"`);
          }
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
      void qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      if (savedTaskId) {
        void qc.invalidateQueries({ queryKey: ["task", savedTaskId] });
      }
      if (mode === "create" && projectId) {
        clearFormDraft(FormDraftKeys.taskCreate(projectId));
      } else if (taskId) {
        clearFormDraft(FormDraftKeys.taskEdit(taskId));
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        (mode === "create" ? "Failed to create task" : "Failed to update task");
      toast.error(msg);
    } finally {
      submitLockRef.current = false;
    }
  }

  const deleteBoardTaskM = useMutation({
    mutationFn: async () => {
      if (!taskId) throw new Error("no task");
      await api.delete(`/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      setDeleteBoardTaskOpen(false);
      void qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      void qc.invalidateQueries({ queryKey: ["task", taskId ?? "", "board-modal"] });
      void qc.invalidateQueries({ queryKey: ["task", taskId ?? ""] });
      if (taskId) clearFormDraft(FormDraftKeys.taskEdit(taskId));
      toast.success("Task deleted");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to delete task";
      toast.error(msg);
    },
  });

  const editLoading = mode === "edit" && open && taskQ.isPending && !taskQ.data;
  const shortId =
    mode === "edit" && taskId
      ? taskId.length > 12
        ? `${taskId.slice(0, 8)}…`
        : taskId
      : "";

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[min(90vh,calc(100%-2rem))] sm:max-w-2xl sm:rounded-xl"
      >
        <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6">
          <DialogTitle>
            {mode === "create" ? "New task" : `Edit task — ${shortId}`}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          {editLoading ? (
            <div className="space-y-3 px-6 py-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
                <div className="space-y-2">
                  <Label htmlFor="board-task-title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="board-task-title"
                    maxLength={200}
                    placeholder="Task title…"
                    {...form.register("title")}
                  />
                  {form.formState.errors.title ? (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.title.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={form.watch("type") || "task"}
                      onValueChange={(v) => form.setValue("type", v ?? "task")}
                      items={taskTypeSelectItems}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {taskTypeSelectItems.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.watch("status") || "backlog"}
                      onValueChange={(v) =>
                        form.setValue("status", v ?? "backlog")
                      }
                      items={taskStatusSelectItems}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {taskStatusSelectItems.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={form.watch("priority") || "medium"}
                      onValueChange={(v) =>
                        form.setValue("priority", v ?? "medium")
                      }
                      items={taskPrioritySelectItems}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {taskPrioritySelectItems.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="board-task-desc">Description</Label>
                  <Textarea
                    id="board-task-desc"
                    rows={3}
                    placeholder="Task description…"
                    {...form.register("description")}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Assignees</Label>
                    <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                      <PopoverTrigger
                        type="button"
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 w-full min-w-0 justify-between gap-2 font-normal"
                            disabled={
                              assigneeOptionsQ.isPending || sessionPending
                            }
                          />
                        }
                      >
                        <span className="truncate text-left">
                          {assigneeOptionsQ.isPending || sessionPending
                            ? "Loading…"
                            : assigneeOptionsQ.isError
                              ? "Failed to load users"
                              : allAssigneeUsers.length === 0
                                ? "No project members"
                                : assigneeTriggerLabel}
                        </span>
                        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-[min(100vw-2rem,20rem)] p-0"
                      >
                        <div className="border-b p-2">
                          <Input
                            type="search"
                            value={assigneeSearch}
                            onChange={(e) => setAssigneeSearch(e.target.value)}
                            placeholder="Search name or role…"
                            className="h-8"
                            autoComplete="off"
                          />
                        </div>
                        <div
                          className="max-h-56 overflow-y-auto p-1"
                          role="listbox"
                          aria-label="Assignees"
                        >
                          {assigneeOptionsQ.isError ? (
                            <p className="px-2 py-3 text-center text-xs text-destructive">
                              Failed to load user list.
                            </p>
                          ) : filteredAssigneeUsers.length === 0 ? (
                            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                              {allAssigneeUsers.length === 0
                                ? "No project members."
                                : "No matches."}
                            </p>
                          ) : (
                            <ul className="space-y-0.5">
                              {filteredAssigneeUsers.map((u) => (
                                <li key={u.id}>
                                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/80">
                                    <Checkbox
                                      checked={assigneeIds.includes(u.id)}
                                      onCheckedChange={() =>
                                        toggleAssignee(u.id)
                                      }
                                      className="size-[15px]"
                                    />
                                    <span className="min-w-0 flex-1 truncate">
                                      {u.name}
                                    </span>
                                    <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                                      {u.role}
                                    </span>
                                  </label>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Sprint</Label>
                    <Select
                      value={form.watch("sprintId") || "__none__"}
                      onValueChange={(v) =>
                        form.setValue(
                          "sprintId",
                          v === "__none__" ? "" : (v ?? ""),
                        )
                      }
                      items={sprintSelectItems}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {sprintSelectItems.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="board-task-start">Start date</Label>
                    <Input
                      id="board-task-start"
                      type="date"
                      {...form.register("startDate")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="board-task-due">Due date</Label>
                    <Input
                      id="board-task-due"
                      type="date"
                      {...form.register("dueDate")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="board-task-tags">
                    Tags{" "}
                    <span className="font-normal text-muted-foreground">
                      (comma-separated)
                    </span>
                  </Label>
                  <Input
                    id="board-task-tags"
                    placeholder="e.g. api, auth, frontend"
                    {...form.register("tagsInput")}
                  />
                </div>

                {/* PM Reporter — user dengan role pm yang anggota proyek */}
                <div className="space-y-2">
                  <Label>PM Reporter</Label>
                  <Select
                    value={form.watch("pmReporterId") || "__none__"}
                    onValueChange={(v) => form.setValue("pmReporterId", v === "__none__" ? "" : (v ?? ""))}
                    items={pmReporterSelectItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="— None —" />
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
                    <p className="text-xs text-muted-foreground">
                      No member with PM project role
                    </p>
                  ) : null}
                </div>

                {/* Client Reporter — user dengan role client yang anggota proyek */}
                <div className="space-y-2">
                  <Label>Client Reporter</Label>
                  <Select
                    value={form.watch("clientUserId") || "__none__"}
                    onValueChange={(v) => form.setValue("clientUserId", v === "__none__" ? "" : (v ?? ""))}
                    items={clientReporterSelectItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="— None —" />
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
                    <p className="text-xs text-muted-foreground">
                      No member with Client project role
                    </p>
                  ) : null}
                </div>

                {/* Referensi task */}
                <div className="space-y-2">
                  <Label>Referensi task</Label>
                  <Popover open={refOpen} onOpenChange={setRefOpen}>
                    <PopoverTrigger
                      type="button"
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full min-w-0 justify-between gap-2 font-normal"
                        />
                      }
                    >
                      <span className="truncate text-left">{refTriggerLabel}</span>
                      <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80 p-2">
                      <Input
                        placeholder="Cari task…"
                        value={refSearch}
                        onChange={(e) => setRefSearch(e.target.value)}
                        className="mb-2 h-8"
                      />
                      <div className="max-h-52 overflow-y-auto">
                        {filteredRefTasks.length === 0 ? (
                          <p className="py-2 text-center text-xs text-zinc-500">Tidak ada task</p>
                        ) : (
                          filteredRefTasks.map((t) => (
                            <label
                              key={t.id}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-zinc-50"
                            >
                              <Checkbox
                                checked={refIds.includes(t.id)}
                                onCheckedChange={() => toggleRef(t.id)}
                              />
                              <span className="text-sm">{getTaskLabel(t)}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-zinc-500">
                    Acuan informatif; tidak memblokir progres
                  </p>
                </div>

                {/* Dependensi task */}
                <div className="space-y-2">
                  <Label>Dependensi task</Label>
                  <Popover open={depOpen} onOpenChange={setDepOpen}>
                    <PopoverTrigger
                      type="button"
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full min-w-0 justify-between gap-2 font-normal"
                        />
                      }
                    >
                      <span className="truncate text-left">{depTriggerLabel}</span>
                      <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80 p-2">
                      <Input
                        placeholder="Cari task…"
                        value={depSearch}
                        onChange={(e) => setDepSearch(e.target.value)}
                        className="mb-2 h-8"
                      />
                      <div className="max-h-52 overflow-y-auto">
                        {filteredTasks.length === 0 ? (
                          <p className="py-2 text-center text-xs text-zinc-500">Tidak ada task</p>
                        ) : (
                          filteredTasks.map((t) => (
                            <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-zinc-50">
                              <Checkbox
                                checked={depIds.includes(t.id)}
                                onCheckedChange={() => toggleDep(t.id)}
                              />
                              <span className="text-sm">{getTaskLabel(t)}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-zinc-500">Task ini tidak bisa maju ke In Progress jika task di atas belum selesai</p>
                </div>

                {/* Lampiran: tautan + file */}
                <div className="space-y-2">
                  <Label>Lampiran</Label>
                  <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-zinc-500">
                      <Link2 className="size-3.5 shrink-0" />
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        Tautan
                      </span>
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
                            const normalized = normalizeAttachmentUrl(linkUrlDraft);
                            if (!normalized) {
                              toast.error("URL tidak valid");
                              return;
                            }
                            const name =
                              linkNameDraft.trim() ||
                              defaultLinkAttachmentLabel(normalized);
                            setPendingLinks((prev) => [...prev, { url: normalized, name }]);
                            setLinkUrlDraft("");
                            setLinkNameDraft("");
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
                            const normalized = normalizeAttachmentUrl(linkUrlDraft);
                            if (!normalized) {
                              toast.error("URL tidak valid");
                              return;
                            }
                            const name =
                              linkNameDraft.trim() ||
                              defaultLinkAttachmentLabel(normalized);
                            setPendingLinks((prev) => [...prev, { url: normalized, name }]);
                            setLinkUrlDraft("");
                            setLinkNameDraft("");
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 shrink-0"
                        disabled={!linkUrlDraft.trim()}
                        onClick={() => {
                          const normalized = normalizeAttachmentUrl(linkUrlDraft);
                          if (!normalized) {
                            toast.error("URL tidak valid");
                            return;
                          }
                          const name =
                            linkNameDraft.trim() ||
                            defaultLinkAttachmentLabel(normalized);
                          setPendingLinks((prev) => [...prev, { url: normalized, name }]);
                          setLinkUrlDraft("");
                          setLinkNameDraft("");
                        }}
                      >
                        <Plus className="mr-1 size-3.5" />
                        Tambah
                      </Button>
                    </div>
                    {pendingLinks.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {pendingLinks.map((row, i) => (
                          <li
                            key={`${row.url}-${i}`}
                            className="flex items-center justify-between gap-2 rounded-md border border-zinc-100 bg-white px-2.5 py-1.5 text-sm"
                          >
                            <span className="min-w-0 truncate">{row.name}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingLinks((prev) => prev.filter((_, j) => j !== i))
                              }
                              className="shrink-0 text-zinc-400 hover:text-red-500"
                              aria-label="Remove link"
                            >
                              <X className="size-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-zinc-200 p-4 text-center">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      id="board-task-files"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        setPendingFiles((prev) => [...prev, ...files]);
                        e.target.value = "";
                      }}
                    />
                    <label htmlFor="board-task-files" className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700">
                      Klik untuk pilih file atau drag & drop
                    </label>
                  </div>
                  {pendingFiles.length > 0 && (
                    <div className="space-y-1">
                      {pendingFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between rounded border border-zinc-200 px-3 py-1.5 text-sm">
                          <span className="truncate">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                            className="ml-2 text-zinc-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div
                className={
                  "flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/40 px-4 py-4 sm:flex-row sm:items-center sm:px-6 " +
                  (canDeleteBoardTask ? "sm:justify-between" : "sm:justify-end")
                }
              >
                {canDeleteBoardTask ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="order-last sm:order-none"
                    onClick={() => setDeleteBoardTaskOpen(true)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete task
                  </Button>
                ) : null}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting || editLoading}
                  >
                    {form.formState.isSubmitting
                      ? mode === "create"
                        ? "Creating…"
                        : "Saving…"
                      : mode === "create"
                        ? "Create task"
                        : "Save changes"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={deleteBoardTaskOpen} onOpenChange={setDeleteBoardTaskOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this task?</AlertDialogTitle>
          <AlertDialogDescription>
            The task will be removed from the board and backlog. Remaining task
            numbers in this project will be renumbered. This action is recorded in
            the audit trail.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteBoardTaskM.isPending || !taskId}
            onClick={() => deleteBoardTaskM.mutate()}
          >
            {deleteBoardTaskM.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

/** @deprecated Use BoardTaskModal with mode="create" */
export function BoardTaskCreateModal(
  props: Omit<BoardTaskModalProps, "mode" | "taskId"> & {
    defaultStatus?: string;
  },
) {
  return <BoardTaskModal mode="create" {...props} />;
}
