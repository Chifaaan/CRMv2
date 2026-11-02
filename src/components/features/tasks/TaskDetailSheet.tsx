"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  defaultLinkAttachmentLabel,
  normalizeAttachmentUrl,
  toDownloadUrl,
} from "@/lib/attachment-url";
import { uploadFile } from "@/lib/upload";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { format } from "date-fns";
import {
  FolderKanban,
  BookOpen,
  Bug,
  CheckSquare,
  CheckCircle2,
  Circle,
  Layers,
  Pencil,
  X,
  Zap,
  AlertTriangle,
  PauseCircle,
  XCircle,
  ChevronRight,
  Activity,
  MessageSquare,
  Paperclip,
  Plus,
  CalendarDays,
  User2,
  RotateCcw,
  Trash2,
  Sparkles,
  SlidersHorizontal,
  LifeBuoy,
  Database,
  RefreshCw,
  Link2,
  CopyPlus,
  History,
  FileText,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { UserProfileTrigger } from "@/components/features/users/UserProfileTrigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { taskTypeLabel } from "@/lib/task-types";
import {
  canOpenTaskFormEditor,
  canParticipateInDiscussion,
  canRunFullTaskListOpsInProject,
} from "@/lib/project-detail-permissions";
import {
  canChangeTaskStatus,
  notifyTaskStatusChangeBlocked,
  isDeveloperRole,
  isDeveloperForbiddenTargetStatus,
  DEVELOPER_FORBIDDEN_STATUS_TOOLTIP,
  COMPLETED_STATUS_BANNER_MESSAGE,
  COMPLETED_STATUS_FINAL_TOOLTIP,
  isWorkspaceAdminRole,
  isTaskStatusLockedBySprint,
  sprintStatusLockMessage,
  notifySprintLockedStatusBlocked,
  CANCELLED_SPRINT_INFO_BADGE,
  SPRINT_COMPLETED_TASK_UNFINISHED_BADGE,
} from "@/lib/task-status-restrictions";
import { TaskTransferConfirmDialog } from "@/components/features/tasks/TaskTransferModals";
import {
  isParkingLotBoardStatus,
  ParkingLotReasonModal,
} from "@/components/features/tasks/ParkingLotReasonModal";
import type {
  TransferTargetProject,
  TransferTasksResponse,
} from "@/components/features/tasks/task-transfer-types";
import {
  BOARD_MAIN_PIPELINE,
  BOARD_PARKING_LOT,
  statusToBoardColumn,
  type BoardColumnStatus,
} from "@/components/features/board/board-constants";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatKanbanTaskPublicId } from "@/components/features/board/board-task-utils";
import { isAdminOrPmRole } from "@/lib/role-constants";

export type TaskDetailPayload = {
  id: string;
  /** Token unik untuk tautan berbagi; GET detail mengikat aturan akses ketat. */
  shareToken?: string | null;
  taskNumber: number;
  projectId: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  storyPoints: number | null;
  startDate: string | null;
  dueDate: string | null;
  timeLogged: number | null;
  createdAt: string;
  updatedAt?: string;
  reporterId: string;
  tags: string[];
  clientUserId: string | null;
  pmReporterId: string | null;
  pmReporter: { id: string; name: string; image: string | null } | null;
  clientUser: { id: string; name: string; image: string | null } | null;
  reporter: { id: string; name: string; image: string | null } | null;
  sprintId?: string | null;
  sprint?: {
    id: string;
    name: string;
    status?: string;
    completedNote?: string | null;
  } | null;
  epicId?: string | null;
  parentTaskId?: string | null;
  project: { id: string; code: string; name?: string };
  transferredAt?: string | null;
  transferredFromProject?: { id: string; name: string; code: string } | null;
  transferredBy?: { id: string; name: string; image: string | null } | null;
  assignees: { user: { id: string; name: string; image: string | null } }[];
  attachments: {
    id: string;
    url: string;
    name: string;
    mimeType: string | null;
    size: number | null;
  }[];
  checklistGroups: {
    id: string;
    title: string;
    order: number;
    items: { id: string; text: string; done: boolean; order: number }[];
  }[];
  dependsOn: {
    id: string;
    type: string;
    dependsOn: { id: string; title: string; status: string };
  }[];
  references?: {
    id: string;
    referenceId: string;
    createdById: string;
    createdAt: string;
    reference: {
      id: string;
      taskNumber: number;
      title: string;
      status: string;
      priority: string;
      project: { id: string; name: string; code: string };
    };
  }[];
  statusLogs?: {
    id: string;
    status: string;
    reason: string;
    createdAt: string;
    createdBy: { id: string; name: string; image: string | null };
  }[];
};

type CommentRow = {
  id: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  authorId: string;
  author: { id: string; name: string; image: string | null };
  attachments: {
    id: string;
    url: string;
    name: string;
    mimeType: string | null;
    size: number | null;
  }[];
};

type ActivityLogRow = {
  id: string;
  action: string;
  actorName: string;
  entityName: string | null;
  changes: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

type Props = {
  taskId: string | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
  presentation?: "default" | "trackly";
  onRequestEdit?: () => void;
  /** Buka form buat task baru dengan referensi ke task ini (follow-up dari task completed). */
  onRequestCreateFollowUp?: (referenceTaskId: string, sourceProjectId: string) => void;
  /** Jika true: task dimuat dari deep link board proyek lain → redirect ke board proyek tugas. */
  syncBoardDeepLink?: boolean;
  /** Setelah duplikasi (mis. pembaruan query `task` di URL board). */
  onDuplicated?: (newTaskId: string) => void;
};

const TASK_TYPE_ICONS: Record<string, typeof CheckSquare> = {
  story: BookOpen,
  bug: Bug,
  enhancement: Zap,
  epic: Layers,
  task: CheckSquare,
  new_feature: Sparkles,
  adjustment: SlidersHorizontal,
  troubleshooting: LifeBuoy,
  inject_data: Database,
  data_update: RefreshCw,
};

const PIPELINE_STATUSES = [
  { value: "backlog", label: "Backlog", short: "BL" },
  { value: "todo", label: "To Do", short: "TD" },
  { value: "in_progress", label: "In Progress", short: "IP" },
  { value: "awaiting_approval", label: "Awaiting", short: "AA" },
  { value: "on_check", label: "On Check", short: "OC" },
  { value: "need_revision", label: "Revision", short: "NR" },
  { value: "ready_to_deploy", label: "Ready To Deploy", short: "RTD" },
  { value: "completed", label: "Completed", short: "CP" },
];

const STATUS_LABEL_MAP: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  awaiting_approval: "Awaiting Approval",
  on_check: "On Check",
  need_revision: "Need Revision",
  ready_to_deploy: "Ready To Deploy",
  completed: "Completed",
  done: "Done",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

const STATUS_LOG_LABELS: Record<string, string> = {
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

const PRIORITY_LABEL_MAP: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

function isBeforeAfter(v: unknown): v is { before: unknown; after: unknown } {
  return v !== null && typeof v === "object" && "before" in v && "after" in v;
}

function formatActivityStatus(code: unknown): string {
  if (code == null || code === "") return "—";
  const s = String(code);
  return STATUS_LABEL_MAP[s] ?? s;
}

function formatActivityPriority(p: unknown): string {
  if (p == null || p === "") return "—";
  const s = String(p);
  return PRIORITY_LABEL_MAP[s] ?? s;
}

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-blue-50 text-blue-700 border-blue-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

/** Selaras dengan `progressStatuses` di backend `tasks.service.ts` — memicu cek dependensi. */
const STATUSES_REQUIRING_DEPS_CLEAR = new Set<string>([
  "in_progress",
  "awaiting_approval",
  "on_check",
  "need_revision",
  "ready_to_deploy",
  "completed",
]);

const TASK_BOARD_COLUMN_SELECT_ITEMS = [
  ...BOARD_MAIN_PIPELINE.map((x) => ({ value: x.value, label: x.label })),
  ...BOARD_PARKING_LOT.map((x) => ({ value: x.value, label: x.label })),
];

function taskFetchErrorMessage(err: unknown): string {
  const msg = (err as { response?: { data?: { message?: string } } })?.response
    ?.data?.message;
  if (typeof msg === "string" && msg.trim()) return msg.trim();
  return "Gagal memuat tugas.";
}

function formatTaskCode(project: { code: string } | undefined, taskNumber: number) {
  if (!project?.code || !taskNumber) return null;
  return `${project.code}-${String(taskNumber).padStart(4, "0")}`;
}

function typeLabel(type: string) {
  return taskTypeLabel(type);
}

const TASK_COMMENT_AUDIT_ACTIONS = new Set([
  "comment_created",
  "comment_updated",
  "comment_deleted",
]);

function describeTaskCommentAudit(log: ActivityLogRow): string {
  if (log.action === "comment_created") {
    const hint = log.entityName?.trim();
    if (hint && hint !== "(tanpa teks)") {
      return `Menambah komentar — ${hint} — oleh ${log.actorName}`;
    }
    return `Menambah komentar oleh ${log.actorName}`;
  }
  if (log.action === "comment_deleted") {
    const hint = log.entityName?.trim();
    if (hint && hint !== "(komentar)" && hint !== "(tanpa teks)") {
      return `Menghapus komentar — ${hint} — oleh ${log.actorName}`;
    }
    return `Menghapus komentar oleh ${log.actorName}`;
  }
  if (log.action === "comment_updated" && log.changes) {
    const ch = log.changes as Record<string, unknown>;
    const content = ch.content;
    if (isBeforeAfter(content)) {
      return `Mengedit komentar (${String(content.before)} → ${String(content.after)}) oleh ${log.actorName}`;
    }
  }
  if (log.action === "comment_updated") {
    return `Mengedit komentar oleh ${log.actorName}`;
  }
  return log.action;
}

function describeActivity(log: ActivityLogRow): string {
  if (log.action === "created") return `Dibuat oleh ${log.actorName}`;
  if (log.action === "deleted") return `Dihapus oleh ${log.actorName}`;
  if (log.action === "updated" && log.changes) {
    const ch = log.changes as Record<string, unknown>;
    if (ch.status) {
      const s = ch.status;
      if (isBeforeAfter(s)) {
        return `Status: ${formatActivityStatus(s.before)} → ${formatActivityStatus(s.after)} oleh ${log.actorName}`;
      }
      return `Status → "${formatActivityStatus(s)}" oleh ${log.actorName}`;
    }
    if (ch.priority) {
      const p = ch.priority;
      if (isBeforeAfter(p)) {
        return `Prioritas: ${formatActivityPriority(p.before)} → ${formatActivityPriority(p.after)} oleh ${log.actorName}`;
      }
      return `Prioritas → "${formatActivityPriority(p)}" oleh ${log.actorName}`;
    }
    if (ch.type) {
      const t = ch.type;
      if (isBeforeAfter(t)) {
        return `Tipe: ${typeLabel(String(t.before))} → ${typeLabel(String(t.after))} oleh ${log.actorName}`;
      }
    }
    if (ch.title && isBeforeAfter(ch.title)) {
      return `Judul diubah oleh ${log.actorName}`;
    }
    if (ch.assignees && isBeforeAfter(ch.assignees)) {
      return `Assignee diperbarui oleh ${log.actorName}`;
    }
    if (ch.assigneeIds && isBeforeAfter(ch.assigneeIds)) {
      return `Assignee diperbarui oleh ${log.actorName}`;
    }
  }
  if (
    log.action === "comment_created" ||
    log.action === "comment_updated" ||
    log.action === "comment_deleted"
  ) {
    return describeTaskCommentAudit(log);
  }
  if (log.action === "checklist_renamed") {
    const meta = log.metadata as
      | { oldName?: string; newName?: string }
      | undefined;
    const ch = log.changes as Record<string, unknown> | undefined;
    const titleChange = ch?.title;
    const oldName =
      meta?.oldName ??
      (isBeforeAfter(titleChange) ? String(titleChange.before) : null);
    const newName =
      meta?.newName ??
      (isBeforeAfter(titleChange) ? String(titleChange.after) : null);
    if (oldName && newName) {
      return `${log.actorName} mengubah nama checklist dari "${oldName}" menjadi "${newName}"`;
    }
    return `${log.actorName} mengubah nama checklist`;
  }
  return `Diperbarui oleh ${log.actorName}`;
}

export function TaskDetailSheet({
  taskId,
  projectId,
  open,
  onOpenChange,
  onUpdated,
  onRequestEdit,
  onRequestCreateFollowUp,
  syncBoardDeepLink = false,
  onDuplicated,
}: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string; id?: string } | undefined)?.role ?? "";
  const userId = session?.user?.id ?? "";
  const roleNorm = role.trim().toLowerCase();
  const canViewCommentAudit =
    roleNorm === "admin" || roleNorm === "administrator";
  const canViewTaskActivity = isAdminOrPmRole(role);
  const canDeleteTask = isAdminOrPmRole(role);
  const canTransferTask = canRunFullTaskListOpsInProject(roleNorm);
  const canDuplicateTask = canOpenTaskFormEditor(
    String(
      (session?.user as { role?: string } | undefined)?.role ?? "",
    )
      .trim()
      .toLowerCase(),
  );

  const [commentText, setCommentText] = useState("");
  const [commentPendingFiles, setCommentPendingFiles] = useState<File[]>([]);
  const [newItemByGroup, setNewItemByGroup] = useState<Record<string, string>>({});
  const [deleteChecklistGroupId, setDeleteChecklistGroupId] = useState<string | null>(null);
  const [editingChecklistGroupId, setEditingChecklistGroupId] = useState<string | null>(null);
  const [editingChecklistGroupTitle, setEditingChecklistGroupTitle] = useState("");
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState("");
  const [attBusy, setAttBusy] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkName, setNewLinkName] = useState("");
  const [editingAttachmentId, setEditingAttachmentId] = useState<string | null>(
    null,
  );
  const [editingAttachmentUrl, setEditingAttachmentUrl] = useState("");
  const [editingAttachmentName, setEditingAttachmentName] = useState("");
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false);
  const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [pendingParkingStatus, setPendingParkingStatus] = useState<
    "on_hold" | "cancelled" | null
  >(null);

  const MAX_COMMENT_FILE_BYTES = 10 * 1024 * 1024;

  const taskQ = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const res = await api.get<TaskDetailPayload>(`/api/tasks/${taskId}`);
      return res.data;
    },
    enabled: open && Boolean(taskId),
  });

  const rowId = taskQ.data?.id ?? null;
  const commentTaskKey = rowId ?? taskId;
  useEffect(() => {
    if (!syncBoardDeepLink || !open || !taskQ.isSuccess || !taskQ.data) return;
    const loaded = taskQ.data;
    if (loaded.projectId !== projectId) {
      toast.info("Membuka papan proyek untuk tugas ini…");
      const linkParam = loaded.shareToken ?? loaded.id;
      router.replace(`/projects/${loaded.projectId}/board?task=${linkParam}`);
    }
  }, [
    syncBoardDeepLink,
    open,
    taskQ.isSuccess,
    taskQ.data,
    projectId,
    router,
  ]);

  const commentsQ = useQuery({
    queryKey: ["task", commentTaskKey, "comments"],
    queryFn: async () => {
      const res = await api.get<CommentRow[]>(
        `/api/tasks/${commentTaskKey}/comments`,
      );
      return res.data;
    },
    enabled: open && Boolean(String(commentTaskKey ?? "").trim()),
  });

  const activityQ = useQuery({
    queryKey: ["task", rowId, "activity"],
    queryFn: async () => {
      const id = rowId;
      if (!id) return [];
      const res = await api.get<{ data: ActivityLogRow[] }>("/api/activity-log", {
        params: { entityType: "task", entityId: id, projectId, take: "50" },
      });
      return res.data.data;
    },
    enabled: open && Boolean(rowId) && canViewTaskActivity,
  });

  const commentAuditQ = useQuery({
    queryKey: ["task", commentTaskKey, "comment-audit"],
    queryFn: async () => {
      const id = (rowId ?? taskId)?.trim();
      if (!id) return [];
      const res = await api.get<ActivityLogRow[]>(`/api/tasks/${id}/comment-audit`);
      return res.data;
    },
    enabled:
      open &&
      canViewCommentAudit &&
      Boolean(String(commentTaskKey ?? "").trim()),
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      setCommentText("");
      setCommentPendingFiles([]);
      setNewItemByGroup({});
      setDeleteChecklistGroupId(null);
      setEditingChecklistGroupId(null);
      setEditingChecklistGroupTitle("");
      setEditingChecklistId(null);
      setEditingChecklistText("");
      setNewLinkUrl("");
      setNewLinkName("");
      setEditingAttachmentId(null);
      setEditingAttachmentUrl("");
      setEditingAttachmentName("");
      setEditingCommentId(null);
      setEditingCommentText("");
    }
    onOpenChange(next);
  }

  function invalidateTask() {
    void qc.invalidateQueries({ queryKey: ["task", taskId] });
    if (rowId && rowId !== taskId) {
      void qc.invalidateQueries({ queryKey: ["task", rowId] });
    }
    void qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    void qc.invalidateQueries({ queryKey: ["task", taskId, "activity"] });
    if (rowId && rowId !== taskId) {
      void qc.invalidateQueries({ queryKey: ["task", rowId, "activity"] });
    }
    void qc.invalidateQueries({ queryKey: ["task", taskId, "comment-audit"] });
    if (rowId && rowId !== taskId) {
      void qc.invalidateQueries({ queryKey: ["task", rowId, "comment-audit"] });
    }
    onUpdated?.();
  }

  const updateStatus = useMutation({
    mutationFn: async ({
      newStatus,
      reason,
    }: {
      newStatus: string;
      reason?: string;
    }) => {
      if (!rowId) return;
      await api.patch(`/api/tasks/${rowId}`, {
        status: newStatus,
        ...(reason ? { reason } : {}),
      });
    },
    onSuccess: () => {
      invalidateTask();
      toast.success("Posisi di papan diperbarui");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Gagal mengubah status";
      toast.error(msg);
    },
  });

  function requestStatusChange(newStatus: string) {
    if (t && isTaskStatusLockedBySprint(t.sprint?.status)) {
      notifySprintLockedStatusBlocked(t.sprint?.status);
      return;
    }
    if (
      t &&
      !canChangeTaskStatus(role, t.status, newStatus)
    ) {
      notifyTaskStatusChangeBlocked(role, t.status, newStatus);
      return;
    }
    if (isParkingLotBoardStatus(newStatus)) {
      setPendingParkingStatus(newStatus);
      return;
    }
    updateStatus.mutate({ newStatus });
  }

  function confirmParkingLotMove(reason: string) {
    if (!pendingParkingStatus) return;
    updateStatus.mutate(
      { newStatus: pendingParkingStatus, reason },
      { onSettled: () => setPendingParkingStatus(null) },
    );
  }

  const addComment = useMutation({
    mutationFn: async () => {
      const idKey = (rowId ?? taskId)?.trim();
      if (!idKey) {
        throw new Error("no_task");
      }
      const text = commentText.trim();
      const atts: { url: string; name: string; mimeType: string; size: number }[] = [];
      for (const file of commentPendingFiles) {
        if (file.size > MAX_COMMENT_FILE_BYTES) {
          toast.warning(`"${file.name}" terlalu besar (maks 10 MB)`);
          continue;
        }
        const r = await uploadFile(file, "task-comments");
        atts.push({ url: r.url, name: r.name, mimeType: r.mimeType, size: r.size });
      }
      if (!text && atts.length === 0) {
        const err = new Error("empty");
        throw err;
      }
      await api.post(`/api/tasks/${idKey}/comments`, {
        content: text,
        attachments: atts.length ? atts : undefined,
      });
    },
    onSuccess: () => {
      setCommentText("");
      setCommentPendingFiles([]);
      void qc.invalidateQueries({
        queryKey: ["task", commentTaskKey, "comments"],
      });
      void qc.invalidateQueries({ queryKey: ["task", taskId, "comments"] });
      if (rowId && rowId !== taskId) {
        void qc.invalidateQueries({ queryKey: ["task", rowId, "comments"] });
      }
      void qc.invalidateQueries({ queryKey: ["task", commentTaskKey, "comment-audit"] });
      toast.success("Komentar ditambahkan");
    },
    onError: (e: unknown) => {
      if (e instanceof Error && e.message === "empty") {
        toast.error("Tulis komentar atau lampirkan setidaknya satu file");
        return;
      }
      if (e instanceof Error && e.message === "no_task") {
        toast.error("Tunggu data tugas selesai dimuat, lalu coba lagi");
        return;
      }
      toast.error("Gagal menambah komentar");
    },
  });
  const toggleCheck = useMutation({
    mutationFn: async ({ checklistId, done }: { checklistId: string; done: boolean }) => {
      if (!rowId) return;
      await api.patch(`/api/tasks/${rowId}/checklists/${checklistId}`, { done });
    },
    onSuccess: () => invalidateTask(),
    onError: () => toast.error("Gagal update checklist"),
  });

  const createChecklistGroup = useMutation({
    mutationFn: async () => {
      if (!rowId) return;
      await api.post(`/api/tasks/${rowId}/checklist-groups`, {});
    },
    onSuccess: () => {
      invalidateTask();
      toast.success("Checklist baru dibuat");
    },
    onError: () => toast.error("Gagal membuat checklist"),
  });

  const removeChecklistGroup = useMutation({
    mutationFn: async (groupId: string) => {
      if (!rowId) return;
      await api.delete(`/api/tasks/${rowId}/checklist-groups/${groupId}`);
    },
    onSuccess: () => {
      setDeleteChecklistGroupId(null);
      setEditingChecklistGroupId(null);
      setEditingChecklistGroupTitle("");
      setEditingChecklistId(null);
      invalidateTask();
      toast.success("Checklist beserta isinya dihapus");
    },
    onError: () => toast.error("Gagal menghapus checklist"),
  });

  const updateChecklistGroupTitle = useMutation({
    mutationFn: async ({
      groupId,
      title,
    }: {
      groupId: string;
      title: string;
    }) => {
      if (!rowId) return;
      await api.patch(`/api/tasks/${rowId}/checklist-groups/${groupId}`, {
        title,
      });
    },
    onSuccess: () => {
      setEditingChecklistGroupId(null);
      setEditingChecklistGroupTitle("");
      invalidateTask();
    },
    onError: () => toast.error("Gagal mengubah nama checklist"),
  });

  const addCheck = useMutation({
    mutationFn: async ({ groupId, text }: { groupId: string; text: string }) => {
      if (!rowId) return;
      await api.post(`/api/tasks/${rowId}/checklists`, { groupId, text });
    },
    onSuccess: (_, vars) => {
      setNewItemByGroup((prev) => ({ ...prev, [vars.groupId]: "" }));
      invalidateTask();
      toast.success("Item checklist ditambahkan");
    },
    onError: () => toast.error("Gagal menambah item checklist"),
  });

  const updateCheckText = useMutation({
    mutationFn: async ({
      checklistId,
      text,
    }: {
      checklistId: string;
      text: string;
    }) => {
      if (!rowId) return;
      await api.patch(`/api/tasks/${rowId}/checklists/${checklistId}`, { text });
    },
    onSuccess: () => {
      setEditingChecklistId(null);
      setEditingChecklistText("");
      invalidateTask();
      toast.success("Item checklist diperbarui");
    },
    onError: () => toast.error("Gagal memperbarui checklist"),
  });

  const deleteCheck = useMutation({
    mutationFn: async (checklistId: string) => {
      if (!rowId) return;
      await api.delete(`/api/tasks/${rowId}/checklists/${checklistId}`);
    },
    onSuccess: (_, checklistId) => {
      setEditingChecklistId((id) => (id === checklistId ? null : id));
      invalidateTask();
      toast.success("Item dihapus");
    },
    onError: () => toast.error("Gagal menghapus checklist"),
  });

  useEffect(() => {
    if (!open) {
      setEditingChecklistId(null);
      setEditingChecklistText("");
    }
  }, [open]);

  function startEditChecklistGroup(group: { id: string; title: string }) {
    setEditingChecklistGroupId(group.id);
    setEditingChecklistGroupTitle(group.title);
  }

  function cancelEditChecklistGroup() {
    setEditingChecklistGroupId(null);
    setEditingChecklistGroupTitle("");
  }

  function commitEditChecklistGroup(originalTitle: string) {
    const trimmed = editingChecklistGroupTitle.trim();
    if (!trimmed) {
      cancelEditChecklistGroup();
      return;
    }
    if (!rowId || !editingChecklistGroupId) return;
    if (trimmed === originalTitle.trim()) {
      cancelEditChecklistGroup();
      return;
    }
    updateChecklistGroupTitle.mutate({
      groupId: editingChecklistGroupId,
      title: trimmed,
    });
  }

  function startEditChecklist(c: { id: string; text: string }) {
    setEditingChecklistId(c.id);
    setEditingChecklistText(c.text);
  }

  function cancelEditChecklist() {
    setEditingChecklistId(null);
    setEditingChecklistText("");
  }

  function commitEditChecklist(originalText: string) {
    const trimmed = editingChecklistText.trim();
    if (!trimmed) {
      toast.error("Teks checklist tidak boleh kosong");
      return;
    }
    if (!rowId || !editingChecklistId) return;
    if (trimmed === originalText) {
      cancelEditChecklist();
      return;
    }
    updateCheckText.mutate({ checklistId: editingChecklistId, text: trimmed });
  }

  async function uploadAndAttach(files: File[]) {
    if (!rowId || attBusy) return;
    setAttBusy(true);
    let completed = 0;
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { toast.warning(`"${file.name}" terlalu besar (maks 10 MB)`); continue; }
        const { url, name } = await uploadFile(file, "tasks");
        await api.post(`/api/tasks/${rowId}/attachments`, { url, name });
        completed++;
      }
      invalidateTask();
      toast.success("Lampiran ditambahkan");
    } catch {
      if (completed > 0) {
        invalidateTask();
        toast.error(
          "Unggahan terhenti di tengah. Lampiran yang sudah berhasil tersimpan; unggah ulang hanya file yang belum masuk bila perlu.",
        );
      } else {
        toast.error("Gagal mengunggah lampiran");
      }
    } finally { setAttBusy(false); }
  }

  const delAtt = useMutation({
    mutationFn: async (attachmentId: string) => {
      if (!rowId) return;
      await api.delete(`/api/tasks/${rowId}/attachments/${attachmentId}`);
    },
    onSuccess: () => { invalidateTask(); toast.success("Lampiran dihapus"); },
    onError: () => toast.error("Gagal menghapus lampiran"),
  });

  const addUrlAttachment = useMutation({
    mutationFn: async () => {
      if (!rowId) return;
      const normalized = normalizeAttachmentUrl(newLinkUrl);
      if (!normalized) throw new Error("bad_url");
      const label =
        newLinkName.trim() || defaultLinkAttachmentLabel(normalized);
      await api.post(`/api/tasks/${rowId}/attachments`, {
        url: normalized,
        name: label,
      });
    },
    onSuccess: () => {
      setNewLinkUrl("");
      setNewLinkName("");
      invalidateTask();
      toast.success("Tautan ditambahkan");
    },
    onError: (e: unknown) => {
      if (e instanceof Error && e.message === "bad_url") {
        toast.error("URL tidak valid");
        return;
      }
      toast.error("Gagal menambah tautan");
    },
  });

  const updateUrlAttachment = useMutation({
    mutationFn: async (p: {
      attachmentId: string;
      url: string;
      name: string;
    }) => {
      if (!rowId) return;
      const normalized = normalizeAttachmentUrl(p.url);
      if (!normalized) throw new Error("bad_url");
      const n = p.name.trim();
      if (!n) throw new Error("bad_name");
      await api.patch(`/api/tasks/${rowId}/attachments/${p.attachmentId}`, {
        url: normalized,
        name: n,
      });
    },
    onSuccess: () => {
      setEditingAttachmentId(null);
      setEditingAttachmentUrl("");
      setEditingAttachmentName("");
      invalidateTask();
      toast.success("Lampiran diperbarui");
    },
    onError: (e: unknown) => {
      if (e instanceof Error && e.message === "bad_url") {
        toast.error("URL tidak valid");
        return;
      }
      if (e instanceof Error && e.message === "bad_name") {
        toast.error("Label tidak boleh kosong");
        return;
      }
      toast.error("Gagal memperbarui lampiran");
    },
  });

  function startEditAttachment(a: { id: string; url: string; name: string }) {
    setEditingAttachmentId(a.id);
    setEditingAttachmentUrl(a.url);
    setEditingAttachmentName(a.name);
  }

  function cancelEditAttachment() {
    setEditingAttachmentId(null);
    setEditingAttachmentUrl("");
    setEditingAttachmentName("");
  }

  function commitEditAttachment(orig: { url: string; name: string }) {
    if (!rowId || !editingAttachmentId) return;
    const url = editingAttachmentUrl.trim();
    const name = editingAttachmentName.trim();
    if (!name) {
      toast.error("Label tidak boleh kosong");
      return;
    }
    const norm = normalizeAttachmentUrl(url);
    if (!norm) {
      toast.error("URL tidak valid");
      return;
    }
    if (norm === orig.url.trim() && name === orig.name.trim()) {
      cancelEditAttachment();
      return;
    }
    updateUrlAttachment.mutate({
      attachmentId: editingAttachmentId,
      url: url,
      name,
    });
  }

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const idKey = (rowId ?? taskId)?.trim();
      if (!idKey) throw new Error("no_task");
      await api.delete(`/api/tasks/${idKey}/comments/${commentId}`);
    },
    onSuccess: () => {
      setEditingCommentId(null);
      setEditingCommentText("");
      void qc.invalidateQueries({
        queryKey: ["task", commentTaskKey, "comments"],
      });
      void qc.invalidateQueries({ queryKey: ["task", taskId, "comments"] });
      if (rowId && rowId !== taskId) {
        void qc.invalidateQueries({ queryKey: ["task", rowId, "comments"] });
      }
      void qc.invalidateQueries({ queryKey: ["task", rowId, "activity"] });
      void qc.invalidateQueries({ queryKey: ["task", taskId, "activity"] });
      void qc.invalidateQueries({ queryKey: ["task", commentTaskKey, "comment-audit"] });
      toast.success("Komentar dihapus");
    },
    onError: () => toast.error("Gagal menghapus komentar"),
  });

  const updateCommentM = useMutation({
    mutationFn: async (p: { commentId: string; content: string }) => {
      const idKey = (rowId ?? taskId)?.trim();
      if (!idKey) throw new Error("no_task");
      await api.patch(`/api/tasks/${idKey}/comments/${p.commentId}`, {
        content: p.content,
      });
    },
    onSuccess: () => {
      setEditingCommentId(null);
      setEditingCommentText("");
      void qc.invalidateQueries({
        queryKey: ["task", commentTaskKey, "comments"],
      });
      void qc.invalidateQueries({ queryKey: ["task", taskId, "comments"] });
      if (rowId && rowId !== taskId) {
        void qc.invalidateQueries({ queryKey: ["task", rowId, "comments"] });
      }
      void qc.invalidateQueries({ queryKey: ["task", rowId, "activity"] });
      void qc.invalidateQueries({ queryKey: ["task", taskId, "activity"] });
      void qc.invalidateQueries({ queryKey: ["task", commentTaskKey, "comment-audit"] });
      toast.success("Komentar diperbarui");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal memperbarui komentar";
      toast.error(msg);
    },
  });

  const deleteTask = useMutation({
    mutationFn: async () => {
      if (!rowId) return;
      await api.delete(`/api/tasks/${rowId}`);
    },
    onSuccess: () => {
      setDeleteTaskOpen(false);
      toast.success("Tugas dihapus");
      handleOpenChange(false);
      invalidateTask();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Gagal menghapus tugas";
      toast.error(msg);
    },
  });

  const transferTargetsQ = useQuery({
    queryKey: ["tasks", "transfer-targets", projectId],
    queryFn: async () => {
      const { data } = await api.get<TransferTargetProject[]>(
        "/api/tasks/transfer-targets",
        { params: { excludeProjectId: projectId } },
      );
      return data;
    },
    enabled: open && canTransferTask,
  });

  const transferTargetLabel = useMemo(() => {
    const p = transferTargetsQ.data?.find((x) => x.id === transferTargetId);
    if (!p) return "";
    return p.name.trim() ? `${p.name.trim()} (${p.code})` : p.code;
  }, [transferTargetsQ.data, transferTargetId]);

  const transferTask = useMutation({
    mutationFn: async (targetProjectId: string) => {
      if (!rowId) throw new Error("Task tidak ditemukan");
      const { data } = await api.post<TransferTasksResponse>("/api/tasks/transfer", {
        taskIds: [rowId],
        targetProjectId,
      });
      return data;
    },
    onSuccess: (data) => {
      setTransferConfirmOpen(false);
      setTransferTargetId("");
      toast.success("Task berhasil dipindahkan");
      handleOpenChange(false);
      void qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      void qc.invalidateQueries({ queryKey: ["tasks", data.targetProjectId] });
      onUpdated?.();
      if (data.targetProjectId !== projectId) {
        router.push(`/projects/${data.targetProjectId}/board`);
      }
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal memindahkan task";
      toast.error(msg);
    },
  });

  const duplicateTask = useMutation({
    mutationFn: async (src: TaskDetailPayload) => {
      const assigneeIds = src.assignees?.map((a) => a.user.id) ?? [];
      const dependsOnIds = src.dependsOn?.map((d) => d.dependsOn.id) ?? [];
      const referenceIds = (src.references ?? []).map((r) => r.reference.id);

      const payload: Record<string, unknown> = {
        projectId: src.projectId,
        title: `${src.title.trimEnd()} (salinan)`,
        description: src.description?.trim() ? src.description : undefined,
        type: src.type,
        status: src.status,
        priority: src.priority,
        ...(src.storyPoints != null ? { storyPoints: src.storyPoints } : {}),
        ...(src.startDate ? { startDate: src.startDate } : {}),
        ...(src.dueDate ? { dueDate: src.dueDate } : {}),
        assigneeIds,
        tags: src.tags?.length ? [...src.tags] : undefined,
        ...(dependsOnIds.length ? { dependsOnIds } : {}),
        ...(referenceIds.length ? { referenceIds } : {}),
        ...(src.clientUserId?.trim() ? { clientUserId: src.clientUserId } : {}),
        ...(src.pmReporterId?.trim() ? { pmReporterId: src.pmReporterId } : {}),
        ...(src.sprintId?.trim() ? { sprintId: src.sprintId } : {}),
        ...(src.epicId?.trim() ? { epicId: src.epicId } : {}),
      };

      const res = await api.post<{ id: string }>("/api/tasks", payload);
      const newId = res.data.id;

      let checklistOrAttWarning = false;
      const groups = [...(src.checklistGroups ?? [])].sort(
        (a, b) => a.order - b.order,
      );
      for (const g of groups) {
        try {
          const gr = await api.post<{ id: string }>(
            `/api/tasks/${newId}/checklist-groups`,
            { title: g.title, order: g.order },
          );
          const gid = gr.data.id;
          const items = [...(g.items ?? [])].sort((a, b) => a.order - b.order);
          for (const it of items) {
            await api.post(`/api/tasks/${newId}/checklists`, {
              groupId: gid,
              text: it.text,
              order: it.order,
            });
          }
        } catch {
          checklistOrAttWarning = true;
          break;
        }
      }

      for (const att of src.attachments ?? []) {
        try {
          await api.post(`/api/tasks/${newId}/attachments`, {
            url: att.url,
            name: att.name,
            ...(att.mimeType ? { mimeType: att.mimeType } : {}),
            ...(att.size != null ? { size: att.size } : {}),
          });
        } catch {
          checklistOrAttWarning = true;
        }
      }

      if (checklistOrAttWarning) {
        toast.warning(
          "Tugas baru dibuat; beberapa checklist atau lampiran mungkin tidak tersalin sepenuhnya.",
        );
      }

      return { newId, hadPartialFailure: checklistOrAttWarning };
    },
    onSuccess: ({ newId, hadPartialFailure }) => {
      const row = taskQ.data;
      const pid = row?.projectId ?? projectId;
      if (!hadPartialFailure) toast.success("Tugas berhasil diduplikasi");
      void qc.invalidateQueries({ queryKey: ["tasks", pid] });
      void qc.invalidateQueries({ queryKey: ["task", taskId] });
      void qc.invalidateQueries({ queryKey: ["task", newId] });
      if (rowId && rowId !== taskId) {
        void qc.invalidateQueries({ queryKey: ["task", rowId] });
      }
      onUpdated?.();

      if (onDuplicated) {
        onDuplicated(newId);
      } else if (syncBoardDeepLink) {
        router.replace(`/projects/${pid}/board?task=${newId}`);
      }
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal menduplikasi tugas";
      toast.error(msg);
    },
  });

  const t = taskQ.data;
  const boardColumn: BoardColumnStatus | null = t
    ? statusToBoardColumn(t.status)
    : null;
  const TypeIcon = t ? (TASK_TYPE_ICONS[t.type] ?? CheckSquare) : CheckSquare;
  const taskCode = t ? formatTaskCode(t.project, t.taskNumber) : null;
  const isOverdue = Boolean(
    t?.dueDate &&
      new Date(t.dueDate) < new Date() &&
      boardColumn &&
      !["completed", "cancelled"].includes(boardColumn),
  );
  const checklistItemsFlat = t?.checklistGroups.flatMap((g) => g.items) ?? [];
  const checkDone = checklistItemsFlat.filter((c) => c.done).length;
  const checkTotal = checklistItemsFlat.length;
  const checkPct = checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0;
  const currentPipelineIdx = boardColumn
    ? PIPELINE_STATUSES.findIndex((s) => s.value === boardColumn)
    : -1;
  const nextStatus =
    currentPipelineIdx >= 0 && currentPipelineIdx < PIPELINE_STATUSES.length - 1
      ? PIPELINE_STATUSES[currentPipelineIdx + 1]
      : null;
  const isParked = boardColumn
    ? ["on_hold", "cancelled"].includes(boardColumn)
    : false;
  const blockedDeps = (t?.dependsOn ?? []).filter((d) => !["completed", "done"].includes(d.dependsOn.status));

  const isAssignee = Boolean(
    userId && t?.assignees?.some((a) => a.user.id === userId),
  );
  const baseParticipate = canParticipateInDiscussion(role);
  const canMutate =
    baseParticipate && (role !== "developer" || isAssignee);
  const canCommentOnTask =
    canMutate ||
    role === "viewer" ||
    role === "client";

  const isAdmin = isWorkspaceAdminRole(role);
  const isDeveloper = isDeveloperRole(role);
  const isCompletedStatusLocked =
    Boolean(boardColumn === "completed" && canMutate && !isAdmin);

  const sprintStatus = t?.sprint?.status;
  const isSprintStatusLocked = isTaskStatusLockedBySprint(sprintStatus);
  const isCancelledSprintTask =
    String(sprintStatus ?? "").toUpperCase() === "CANCELLED";
  const isSprintCompletedUnfinished =
    String(sprintStatus ?? "").toUpperCase() === "COMPLETED" &&
    boardColumn !== "completed";
  const sprintLockMessage = isSprintStatusLocked
    ? sprintStatusLockMessage(sprintStatus)
    : undefined;
  const statusControlsLocked = isCompletedStatusLocked || isSprintStatusLocked;

  async function copyBoardTaskLink() {
    const pid = t?.projectId ?? projectId;
    const linkKey = (t?.shareToken ?? t?.id) ?? rowId ?? taskId;
    if (!linkKey || typeof window === "undefined") return;
    const url = `${window.location.origin}/projects/${pid}/board?task=${linkKey}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link task disalin");
    } catch {
      toast.error("Gagal menyalin link");
    }
  }

  function startEditComment(c: CommentRow) {
    setEditingCommentId(c.id);
    setEditingCommentText(c.content ?? "");
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditingCommentText("");
  }

  function commitEditComment(c: CommentRow) {
    const raw = editingCommentText;
    const next = raw.trim();
    const hasAtt = (c.attachments ?? []).length > 0;
    if (!next && !hasAtt) {
      toast.error("Komentar harus berisi teks atau setidaknya satu lampiran");
      return;
    }
    if (next === (c.content ?? "").trim()) {
      cancelEditComment();
      return;
    }
    updateCommentM.mutate({ commentId: c.id, content: raw });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-y-auto rounded-none p-0 sm:h-[92vh] sm:max-h-[92vh] sm:max-w-6xl sm:overflow-hidden sm:rounded-xl" showCloseButton={false}>
        <DialogDescription className="sr-only">Detail tugas</DialogDescription>

        {/* ── HEADER ── */}
        {taskQ.isPending && !t ? (
          <div className="flex h-24 items-center justify-center">
            <p className="text-sm text-zinc-400">Memuat…</p>
          </div>
        ) : t ? (
          <div className="border-b border-zinc-100 bg-white px-4 py-4 sm:shrink-0 sm:px-7">
            {/* Top row: code + type + badges + close */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {/* Meta row */}
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  {taskCode && (
                    <span className="font-mono text-xs font-bold text-primary">{taskCode}</span>
                  )}
                  <span className="text-zinc-300">·</span>
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                    <TypeIcon className="size-3 shrink-0" />
                    {typeLabel(t.type)}
                  </span>
                  <span className={cn("rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize", PRIORITY_BADGE[t.priority])}>
                    {t.priority}
                  </span>
                  {(t.tags ?? []).slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] font-normal py-0">{tag}</Badge>
                  ))}
                  {(t.tags ?? []).length > 3 && (
                    <span className="text-[11px] text-zinc-400">+{t.tags.length - 3}</span>
                  )}
                </div>
                <h2 className="text-base font-semibold leading-snug text-zinc-900">{t.title}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <Link
                    href={`/projects/${t.projectId}`}
                    onClick={() => handleOpenChange(false)}
                    className="text-primary inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                  >
                    <FolderKanban className="size-3.5 shrink-0" aria-hidden />
                    Buka detail proyek
                    {t.project.name?.trim() ? (
                      <span className="text-zinc-600">
                        · {t.project.name.trim()}
                        {t.project.code ? (
                          <span className="text-zinc-400">
                            {" "}
                            ({t.project.code})
                          </span>
                        ) : null}
                      </span>
                    ) : t.project.code ? (
                      <span className="text-zinc-600"> · {t.project.code}</span>
                    ) : null}
                  </Link>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                {taskId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2.5 text-xs"
                    onClick={() => void copyBoardTaskLink()}
                    aria-label="Copy link task"
                  >
                    <Link2 className="size-3" />
                    Copy link task
                  </Button>
                ) : null}
                {canDuplicateTask && rowId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2.5 text-xs"
                    disabled={duplicateTask.isPending || !t}
                    onClick={() => {
                      if (!t) return;
                      duplicateTask.mutate(t);
                    }}
                    aria-label="Duplikat tugas"
                  >
                    <CopyPlus className="size-3" />
                    Duplikat
                  </Button>
                ) : null}
                {canDeleteTask && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2.5 text-xs text-red-600 hover:border-red-200 hover:bg-red-50"
                    onClick={() => setDeleteTaskOpen(true)}
                  >
                    <Trash2 className="size-3" />
                    Hapus
                  </Button>
                )}
                {canMutate && onRequestEdit && (
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs" onClick={onRequestEdit}>
                    <Pencil className="size-3" />
                    Edit
                  </Button>
                )}
                <Button type="button" variant="ghost" size="icon" className="size-7 text-zinc-400 hover:text-zinc-600" onClick={() => handleOpenChange(false)}>
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {taskQ.isError && (
          <div className="p-6 text-sm text-red-600">
            {taskFetchErrorMessage(taskQ.error)}
          </div>
        )}

        {/* ── BODY ── */}
        {t && (
          <div className="sm:min-h-0 sm:flex-1 sm:overflow-y-auto">
            <div className="grid min-h-full grid-cols-1 lg:grid-cols-[1fr_280px]">

              {/* LEFT: main content */}
              {/* min-w-0: cegah kolom grid 1fr melebar mengikuti konten tak-terpotong
                  (mis. URL lampiran panjang) — tanpa ini `truncate` di dalamnya tak berefek. */}
              <div className="flex min-w-0 flex-col gap-6 border-b border-zinc-100 px-4 py-6 sm:px-7 lg:border-b-0 lg:border-r">

                {/* Status & workflow controls (moved into scroll area) */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/40 px-4 py-4 sm:px-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Status &amp; Alur Kerja</p>
              <div className="flex items-center justify-start overflow-x-auto px-2 pb-1 pt-1 sm:justify-center">
                {PIPELINE_STATUSES.map((step, idx) => {
                  const isCurrent =
                    Boolean(boardColumn) && step.value === boardColumn && !isParked;
                  const isPast =
                    !isParked && currentPipelineIdx >= 0 && currentPipelineIdx > idx;
                  const isFuture =
                    isParked ||
                    currentPipelineIdx < 0 ||
                    currentPipelineIdx < idx;
                  return (
                    <div key={step.value} className="flex items-center">
                      <div className="flex min-w-0 flex-col items-center gap-1.5">
                        <div className={cn(
                          "flex size-10 items-center justify-center rounded-full border-[2.5px] text-[11px] font-bold transition-all",
                          isCurrent && "border-primary bg-primary text-white shadow-md shadow-primary/20",
                          isPast && "border-emerald-500 bg-emerald-500 text-white",
                          isFuture && !isCurrent && !isPast && "border-zinc-200 bg-zinc-50 text-zinc-400",
                        )}>
                          {isPast ? <CheckCircle2 className="size-4" /> : step.short}
                        </div>
                        <span className={cn(
                          "text-center text-[11px] leading-tight font-medium whitespace-nowrap",
                          isCurrent && !isParked && "text-primary",
                          isPast && "text-emerald-600",
                          isFuture && "text-zinc-400",
                        )}>
                          {step.label}
                        </span>
                      </div>
                      {idx < PIPELINE_STATUSES.length - 1 && (
                        <div className={cn("mx-1.5 h-1 w-9 flex-shrink-0 rounded-full sm:mx-2 sm:w-12", isPast ? "bg-emerald-400" : "bg-zinc-200")} />
                      )}
                    </div>
                  );
                })}
                {isParked && (
                  <div className="ml-3 flex items-center gap-1.5">
                    <ChevronRight className="size-4 text-zinc-300" />
                    <span className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      boardColumn === "on_hold" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                    )}>
                      {boardColumn === "on_hold" ? "On Hold" : "Cancelled"}
                    </span>
                  </div>
                )}
              </div>

              {/* Action row */}
              {canMutate && (
                <div className="mt-3 flex flex-col items-stretch gap-3">
                  {boardColumn ? (
                    <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:justify-center sm:gap-3">
                      <Label
                        htmlFor="task-detail-board-column"
                        className="text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500 sm:shrink-0 sm:pt-0.5 sm:text-left"
                      >
                        Kolom papan
                      </Label>
                      <Select
                        value={boardColumn}
                        onValueChange={(v) => {
                          if (v == null || v === boardColumn) return;
                          requestStatusChange(v);
                        }}
                        items={TASK_BOARD_COLUMN_SELECT_ITEMS}
                        disabled={statusControlsLocked}
                      >
                        <SelectTrigger
                          id="task-detail-board-column"
                          size="sm"
                          className="h-8 w-full max-w-xs border-zinc-200 bg-white"
                          disabled={updateStatus.isPending || statusControlsLocked}
                          title={
                            isSprintStatusLocked
                              ? sprintLockMessage
                              : isCompletedStatusLocked
                                ? COMPLETED_STATUS_FINAL_TOOLTIP
                                : undefined
                          }
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="center">
                          <SelectGroup>
                            <SelectLabel className="text-zinc-500">Alur kerja</SelectLabel>
                            {BOARD_MAIN_PIPELINE.map((col) => (
                              <SelectItem
                                key={col.value}
                                value={col.value}
                                disabled={
                                  col.value === boardColumn ||
                                  (blockedDeps.length > 0 &&
                                    STATUSES_REQUIRING_DEPS_CLEAR.has(col.value)) ||
                                  (isDeveloper &&
                                    isDeveloperForbiddenTargetStatus(col.value))
                                }
                                title={
                                  isDeveloper &&
                                  isDeveloperForbiddenTargetStatus(col.value)
                                    ? DEVELOPER_FORBIDDEN_STATUS_TOOLTIP
                                    : undefined
                                }
                              >
                                {col.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel className="text-zinc-500">Parking</SelectLabel>
                            {BOARD_PARKING_LOT.map((col) => (
                              <SelectItem
                                key={col.value}
                                value={col.value}
                                disabled={col.value === boardColumn}
                              >
                                {col.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                  {blockedDeps.length > 0 && nextStatus && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                      <AlertTriangle className="size-3 shrink-0" />
                      Diblokir: {blockedDeps.map((d) => d.dependsOn.title).join(", ")}
                    </div>
                  )}
                  {nextStatus &&
                    !isParked &&
                    boardColumn !== "completed" &&
                    !(isDeveloper && isDeveloperForbiddenTargetStatus(nextStatus.value)) && (
                    <Button
                      size="sm"
                      className="h-7 gap-1 px-3 text-xs"
                      disabled={updateStatus.isPending || blockedDeps.length > 0 || statusControlsLocked}
                      title={sprintLockMessage}
                      onClick={() => requestStatusChange(nextStatus.value)}
                    >
                      <CheckCircle2 className="size-3" />
                      Mark as {nextStatus.label}
                    </Button>
                  )}
                  {!["on_hold", "cancelled", "completed"].includes(boardColumn ?? "") && (
                    <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs text-orange-600 hover:border-orange-200 hover:bg-orange-50" disabled={updateStatus.isPending || statusControlsLocked} title={sprintLockMessage} onClick={() => requestStatusChange("on_hold")}>
                      <PauseCircle className="size-3" />
                      On Hold
                    </Button>
                  )}
                  {!["cancelled", "completed"].includes(boardColumn ?? "") && (
                    <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs text-red-600 hover:border-red-200 hover:bg-red-50" disabled={updateStatus.isPending || statusControlsLocked} title={sprintLockMessage} onClick={() => requestStatusChange("cancelled")}>
                      <XCircle className="size-3" />
                      Cancel
                    </Button>
                  )}
                  {isParked && (
                    <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs" disabled={updateStatus.isPending || statusControlsLocked} title={sprintLockMessage} onClick={() => requestStatusChange("backlog")}>
                      <RotateCcw className="size-3" />
                      Reopen
                    </Button>
                  )}
                  </div>
                </div>
              )}
              {canTransferTask && rowId ? (
                <div className="mt-3 flex flex-col items-stretch gap-3 border-t border-zinc-100 pt-3">
                  <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:justify-center sm:gap-3">
                    <Label
                      htmlFor="task-detail-transfer-project"
                      className="text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500 sm:shrink-0 sm:pt-0.5 sm:text-left"
                    >
                      Pindah ke Project
                    </Label>
                    <Select
                      onValueChange={(v) => {
                        const id = typeof v === "string" ? v : "";
                        if (!id) return;
                        setTransferTargetId(id);
                        setTransferConfirmOpen(true);
                      }}
                      items={(transferTargetsQ.data ?? []).map((p) => ({
                        value: p.id,
                        label: p.name.trim()
                          ? `${p.name.trim()} (${p.code})`
                          : p.code,
                      }))}
                      disabled={
                        transferTask.isPending ||
                        transferTargetsQ.isPending ||
                        (transferTargetsQ.data?.length ?? 0) === 0
                      }
                    >
                      <SelectTrigger
                        id="task-detail-transfer-project"
                        size="sm"
                        className="h-8 w-full max-w-xs border-zinc-200 bg-white"
                      >
                        <SelectValue
                          placeholder={
                            transferTargetsQ.isPending
                              ? "Memuat proyek…"
                              : (transferTargetsQ.data?.length ?? 0) === 0
                                ? "Tidak ada proyek tujuan"
                                : "Pilih proyek…"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent align="center">
                        {(transferTargetsQ.data ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name.trim()
                              ? `${p.name.trim()} (${p.code})`
                              : p.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
                </div>

                {/* Description */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Deskripsi</p>
                  {t.description ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{t.description}</p>
                  ) : (
                    <p className="rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-400">Tidak ada deskripsi.</p>
                  )}
                </div>

                {/* Checklist */}
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Checklist</p>
                      {canMutate && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 px-2.5 text-xs"
                          disabled={!rowId || createChecklistGroup.isPending}
                          onClick={() => createChecklistGroup.mutate()}
                        >
                          <Plus className="size-3 shrink-0" />
                          Checklist baru
                        </Button>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400">{checkDone}/{checkTotal}</span>
                  </div>
                  {checkTotal > 0 && (
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${checkPct}%` }} />
                      </div>
                      <span className="text-[11px] tabular-nums text-zinc-400">{checkPct}%</span>
                    </div>
                  )}
                  {t.checklistGroups.length === 0 && (
                    <p className="mb-3 text-sm text-zinc-400">
                      Belum ada checklist.
                      {canMutate
                        ? ' Tekan "Checklist baru", lalu tambahkan item di dalamnya.'
                        : ""}
                    </p>
                  )}
                  <div className="space-y-4">
                    {t.checklistGroups.map((group) => (
                      <div key={group.id} className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50/80 px-3 py-2">
                          {editingChecklistGroupId === group.id ? (
                            <Input
                              value={editingChecklistGroupTitle}
                              onChange={(e) =>
                                setEditingChecklistGroupTitle(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  (e.target as HTMLInputElement).blur();
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  cancelEditChecklistGroup();
                                }
                              }}
                              onBlur={() => commitEditChecklistGroup(group.title)}
                              onFocus={(e) => e.target.select()}
                              disabled={updateChecklistGroupTitle.isPending}
                              className="h-7 min-w-0 flex-1 text-sm font-medium"
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              className={cn(
                                "group/title flex min-w-0 flex-1 items-center gap-1.5 text-left",
                                canMutate &&
                                  "cursor-pointer rounded px-1 -mx-1 hover:bg-zinc-100/80",
                              )}
                              disabled={!canMutate || updateChecklistGroupTitle.isPending}
                              onClick={() => {
                                if (canMutate) startEditChecklistGroup(group);
                              }}
                            >
                              <span className="min-w-0 truncate text-sm font-medium text-zinc-800">
                                {group.title}
                              </span>
                              {canMutate ? (
                                <Pencil className="size-3 shrink-0 text-zinc-400 opacity-0 transition-opacity group-hover/title:opacity-100" />
                              ) : null}
                            </button>
                          )}
                          {canMutate && (
                            <button
                              type="button"
                              className="shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label="Hapus checklist beserta semua item"
                              disabled={removeChecklistGroup.isPending}
                              onClick={() => setDeleteChecklistGroupId(group.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-2 p-3">
                          {group.items.length > 0 ? (
                            <ul className="space-y-2">
                              {group.items.map((c) => (
                                <li key={c.id} className="flex items-start gap-2">
                                  <Checkbox
                                    checked={c.done}
                                    disabled={
                                      !canMutate ||
                                      toggleCheck.isPending ||
                                      editingChecklistId === c.id ||
                                      updateCheckText.isPending
                                    }
                                    onCheckedChange={(v) => {
                                      if (
                                        canMutate &&
                                        editingChecklistId !== c.id
                                      ) {
                                        toggleCheck.mutate({
                                          checklistId: c.id,
                                          done: Boolean(v),
                                        });
                                      }
                                    }}
                                    className="mt-0.5 shrink-0"
                                  />
                                  {editingChecklistId === c.id ? (
                                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center">
                                      <Input
                                        value={editingChecklistText}
                                        onChange={(e) =>
                                          setEditingChecklistText(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            commitEditChecklist(c.text);
                                          }
                                          if (e.key === "Escape") {
                                            e.preventDefault();
                                            cancelEditChecklist();
                                          }
                                        }}
                                        className="h-8 text-sm"
                                        autoFocus
                                      />
                                      <div className="flex shrink-0 gap-1">
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="h-8"
                                          disabled={updateCheckText.isPending}
                                          onClick={() => commitEditChecklist(c.text)}
                                        >
                                          Simpan
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          className="h-8"
                                          disabled={updateCheckText.isPending}
                                          onClick={cancelEditChecklist}
                                        >
                                          Batal
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <span
                                        className={cn(
                                          "min-w-0 flex-1 text-sm leading-snug",
                                          c.done &&
                                            "text-zinc-400 line-through",
                                        )}
                                      >
                                        {c.text}
                                      </span>
                                      {canMutate && (
                                        <div className="flex shrink-0 items-center gap-0.5">
                                          <button
                                            type="button"
                                            className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                                            aria-label="Edit item checklist"
                                            disabled={
                                              deleteCheck.isPending ||
                                              updateCheckText.isPending ||
                                              addCheck.isPending
                                            }
                                            onClick={() => startEditChecklist(c)}
                                          >
                                            <Pencil className="size-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                            aria-label="Hapus item checklist"
                                            disabled={deleteCheck.isPending}
                                            onClick={() => deleteCheck.mutate(c.id)}
                                          >
                                            <Trash2 className="size-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-zinc-400">Belum ada item di checklist ini.</p>
                          )}
                          {canMutate && (
                            <div className="flex gap-2 pt-1">
                              <Input
                                placeholder="Tambah item…"
                                value={newItemByGroup[group.id] ?? ""}
                                onChange={(e) =>
                                  setNewItemByGroup((prev) => ({
                                    ...prev,
                                    [group.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  const raw = (newItemByGroup[group.id] ?? "").trim();
                                  if (e.key === "Enter" && raw) {
                                    addCheck.mutate({ groupId: group.id, text: raw });
                                  }
                                }}
                                className="h-8 text-sm"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                  !(newItemByGroup[group.id] ?? "").trim() ||
                                  addCheck.isPending
                                }
                                onClick={() => {
                                  const raw = (newItemByGroup[group.id] ?? "").trim();
                                  if (raw) {
                                    addCheck.mutate({ groupId: group.id, text: raw });
                                  }
                                }}
                              >
                                Tambah
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <Paperclip className="size-3.5 text-zinc-400" />
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                      Lampiran {t.attachments.length > 0 && `(${t.attachments.length})`}
                    </p>
                  </div>
                  {t.attachments.length > 0 && (
                    <ul className="mb-3 space-y-2">
                      {t.attachments.map((a) => {
                        const isUpload = a.url.startsWith("/uploads/");
                        const AttIcon = isUpload ? Paperclip : Link2;
                        return (
                          <li
                            key={a.id}
                            className="rounded-lg border border-zinc-100 bg-white px-3 py-2"
                          >
                            {editingAttachmentId === a.id ? (
                              <div className="flex flex-col gap-2">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                                    URL
                                  </label>
                                  <Input
                                    value={editingAttachmentUrl}
                                    onChange={(e) =>
                                      setEditingAttachmentUrl(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        commitEditAttachment({
                                          url: a.url,
                                          name: a.name,
                                        });
                                      }
                                      if (e.key === "Escape") {
                                        e.preventDefault();
                                        cancelEditAttachment();
                                      }
                                    }}
                                    className="h-8 font-mono text-xs"
                                    placeholder="https://…"
                                    autoFocus
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                                    Label
                                  </label>
                                  <Input
                                    value={editingAttachmentName}
                                    onChange={(e) =>
                                      setEditingAttachmentName(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        commitEditAttachment({
                                          url: a.url,
                                          name: a.name,
                                        });
                                      }
                                      if (e.key === "Escape") {
                                        e.preventDefault();
                                        cancelEditAttachment();
                                      }
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8"
                                    disabled={updateUrlAttachment.isPending}
                                    onClick={() =>
                                      commitEditAttachment({
                                        url: a.url,
                                        name: a.name,
                                      })
                                    }
                                  >
                                    Simpan
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-8"
                                    disabled={updateUrlAttachment.isPending}
                                    onClick={cancelEditAttachment}
                                  >
                                    Batal
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <AttIcon className="mt-0.5 size-3.5 shrink-0 text-zinc-400" />
                                <div className="min-w-0 flex-1">
                                  <a
                                    href={toDownloadUrl(a.url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    {...(a.url.startsWith("/uploads/") ? { download: a.name } : {})}
                                    className="break-all text-sm text-primary underline-offset-2 hover:underline"
                                  >
                                    {a.name}
                                  </a>
                                  <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-400">
                                    {a.url}
                                  </p>
                                </div>
                                {canMutate && (
                                  <div className="flex shrink-0 items-center gap-0.5">
                                    <button
                                      type="button"
                                      className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                                      aria-label="Edit lampiran"
                                      disabled={
                                        delAtt.isPending ||
                                        addUrlAttachment.isPending ||
                                        updateUrlAttachment.isPending
                                      }
                                      onClick={() => startEditAttachment(a)}
                                    >
                                      <Pencil className="size-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                      aria-label="Hapus lampiran"
                                      disabled={delAtt.isPending}
                                      onClick={() => delAtt.mutate(a.id)}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {canMutate && (
                    <>
                      <div className="mb-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 p-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          Tautan
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <div className="min-w-0 flex-1 space-y-1">
                            <Input
                              placeholder="https:// atau domain…"
                              value={newLinkUrl}
                              onChange={(e) => setNewLinkUrl(e.target.value)}
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  newLinkUrl.trim() &&
                                  !addUrlAttachment.isPending
                                ) {
                                  e.preventDefault();
                                  addUrlAttachment.mutate();
                                }
                              }}
                              className="h-8 font-mono text-xs"
                            />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <Input
                              placeholder="Label (opsional)"
                              value={newLinkName}
                              onChange={(e) => setNewLinkName(e.target.value)}
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  newLinkUrl.trim() &&
                                  !addUrlAttachment.isPending
                                ) {
                                  e.preventDefault();
                                  addUrlAttachment.mutate();
                                }
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 shrink-0"
                            disabled={
                              !newLinkUrl.trim() || addUrlAttachment.isPending
                            }
                            onClick={() => addUrlAttachment.mutate()}
                          >
                            <Plus className="mr-1 size-3" />
                            Tambah
                          </Button>
                        </div>
                        <p className="mt-2 text-[11px] text-zinc-400">
                          Bisa beberapa tautan — sama seperti menambah item checklist.
                        </p>
                      </div>
                      <FileDropZone
                        busy={attBusy}
                        onFiles={uploadAndAttach}
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                        label="Klik atau seret file"
                        hint="Bisa beberapa file sekaligus — maks 10 MB per file"
                      />
                    </>
                  )}
                </div>

                {/* Parking Lot status history */}
                {(t.statusLogs?.length ?? 0) > 0 ? (
                  <div>
                    <div className="mb-3 flex items-center gap-1.5">
                      <History className="size-3.5 text-zinc-400" />
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                        Riwayat Parking Lot
                      </p>
                    </div>
                    <div className="max-h-52 overflow-y-auto rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
                      <div className="relative space-y-3 pl-4 before:absolute before:left-1.5 before:top-0 before:h-full before:w-px before:bg-zinc-200">
                        {(t.statusLogs ?? []).map((log) => {
                          const isHold =
                            log.status === "ON_HOLD" || log.status === "on_hold";
                          return (
                            <div key={log.id} className="relative">
                              <div
                                className={cn(
                                  "absolute -left-[11px] top-1.5 size-2 rounded-full ring-2 ring-zinc-50",
                                  isHold ? "bg-orange-400" : "bg-red-400",
                                )}
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px] font-semibold",
                                    isHold
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-red-100 text-red-700",
                                  )}
                                >
                                  {STATUS_LOG_LABELS[log.status] ?? log.status}
                                </Badge>
                                <span className="text-[11px] text-zinc-500">
                                  {log.createdBy.name}
                                </span>
                                <span className="text-[11px] text-zinc-400">
                                  {format(new Date(log.createdAt), "PPp")}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-zinc-700">{log.reason}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Activity Log */}
                {canViewTaskActivity ? (
                <div>
                    <div className="mb-3 flex items-center gap-1.5">
                      <Activity className="size-3.5 text-zinc-400" />
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Riwayat Aktivitas</p>
                    </div>
                    <div className="max-h-52 overflow-y-auto rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
                      {activityQ.isPending ? (
                        <p className="text-xs text-zinc-400">Memuat…</p>
                      ) : (activityQ.data ?? []).filter((log) =>
                          canViewCommentAudit
                            ? !TASK_COMMENT_AUDIT_ACTIONS.has(log.action)
                            : true,
                        ).length === 0 ? (
                        <p className="text-xs text-zinc-400">Belum ada aktivitas.</p>
                      ) : (
                        <div className="relative space-y-3 pl-4 before:absolute before:left-1.5 before:top-0 before:h-full before:w-px before:bg-zinc-200">
                          {(activityQ.data ?? [])
                            .filter((log) =>
                              canViewCommentAudit
                                ? !TASK_COMMENT_AUDIT_ACTIONS.has(log.action)
                                : true,
                            )
                            .map((log) => (
                            <div key={log.id} className="relative">
                              <div className="absolute -left-[11px] top-1.5 size-2 rounded-full bg-zinc-300 ring-2 ring-zinc-50" />
                              <p className="text-sm text-zinc-700">{describeActivity(log)}</p>
                              <p className="mt-0.5 text-[11px] text-zinc-400">{format(new Date(log.createdAt), "PPp")}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                </div>
                ) : null}

                {/* Comments */}
                <div>
                  <div className="mb-3 flex items-center gap-1.5">
                    <MessageSquare className="size-3.5 text-zinc-400" />
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                      Komentar {(commentsQ.data ?? []).length > 0 && `(${(commentsQ.data ?? []).length})`}
                    </p>
                  </div>
                  {(commentsQ.data ?? []).length > 0 && (
                    <ul className="mb-4 space-y-3">
                      {(commentsQ.data ?? []).map((c) => (
                        <li key={c.id} className="flex gap-2.5">
                          <UserProfileTrigger userId={c.author.id} className="mt-0.5 shrink-0">
                            <Avatar className="size-7">
                              {c.author.image && <AvatarImage src={c.author.image} />}
                              <AvatarFallback className="text-[10px]">{c.author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          </UserProfileTrigger>
                          <div className="flex-1 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
                            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <UserProfileTrigger userId={c.author.id} className="rounded-sm">
                                  <span className="text-xs font-semibold text-zinc-800">{c.author.name}</span>
                                </UserProfileTrigger>
                                <span className="text-[11px] text-zinc-400">
                                  {format(new Date(c.createdAt), "PP · HH:mm")}
                                </span>
                                {c.editedAt ? (
                                  <span className="text-[11px] text-zinc-400">
                                    · Diedit {format(new Date(c.editedAt), "PP · HH:mm")}
                                  </span>
                                ) : null}
                              </div>
                              {userId && c.authorId === userId ? (
                                <div className="flex shrink-0 items-center gap-2">
                                  {editingCommentId === c.id ? null : (
                                    <button
                                      type="button"
                                      className="text-[11px] font-medium text-zinc-600 hover:underline disabled:opacity-50"
                                      disabled={
                                        deleteComment.isPending || updateCommentM.isPending
                                      }
                                      onClick={() => startEditComment(c)}
                                    >
                                      Edit
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="text-[11px] font-medium text-red-600 hover:underline disabled:opacity-50"
                                    disabled={deleteComment.isPending || updateCommentM.isPending}
                                    onClick={() => {
                                      if (typeof window !== "undefined" && !window.confirm("Hapus komentar ini?")) return;
                                      deleteComment.mutate(c.id);
                                    }}
                                  >
                                    Hapus
                                  </button>
                                </div>
                              ) : null}
                            </div>
                            {editingCommentId === c.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingCommentText}
                                  onChange={(e) => setEditingCommentText(e.target.value)}
                                  rows={3}
                                  className="resize-none text-sm"
                                  placeholder={
                                    (c.attachments ?? []).length > 0
                                      ? "Teks komentar (boleh kosong jika hanya lampiran)"
                                      : "Teks komentar…"
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                      e.preventDefault();
                                      cancelEditComment();
                                    }
                                  }}
                                />
                                {(c.attachments ?? []).length > 0 ? (
                                  <ul className="space-y-1 border-t border-zinc-200 pt-2">
                                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                                      Lampiran
                                    </p>
                                    {(c.attachments ?? []).map((a) => (
                                      <li key={a.id}>
                                        <a
                                          href={toDownloadUrl(a.url)}
                                          target="_blank"
                                          rel="noreferrer"
                                          {...(a.url.startsWith("/uploads/") ? { download: a.name } : {})}
                                          className="inline-flex max-w-full items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
                                        >
                                          <Paperclip className="size-3.5 shrink-0" />
                                          <span className="truncate">{a.name}</span>
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                                <div className="flex w-full flex-wrap justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8"
                                    disabled={updateCommentM.isPending}
                                    onClick={() => commitEditComment(c)}
                                  >
                                    Simpan
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-8"
                                    disabled={updateCommentM.isPending}
                                    onClick={cancelEditComment}
                                  >
                                    Batal
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {(c.content ?? "").trim() ? (
                                  <p className="whitespace-pre-wrap text-sm text-zinc-700">{c.content}</p>
                                ) : (c.attachments ?? []).length > 0 ? (
                                  <p className="text-sm italic text-zinc-400">(Hanya lampiran)</p>
                                ) : null}
                                {(c.attachments ?? []).length > 0 ? (
                                  <ul className="mt-2 space-y-1 border-t border-zinc-100 pt-2">
                                    {(c.attachments ?? []).map((a) => (
                                      <li key={a.id}>
                                        <a
                                          href={toDownloadUrl(a.url)}
                                          target="_blank"
                                          rel="noreferrer"
                                          {...(a.url.startsWith("/uploads/") ? { download: a.name } : {})}
                                          className="inline-flex max-w-full items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
                                        >
                                          <Paperclip className="size-3.5 shrink-0" />
                                          <span className="truncate">{a.name}</span>
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {canCommentOnTask && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Tulis komentar…"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={3}
                        className="resize-none text-sm"
                      />
                      <div>
                        <p className="mb-1.5 text-[11px] font-medium text-zinc-500">Lampiran komentar</p>
                        <FileDropZone
                          busy={addComment.isPending}
                          onFiles={(files) => setCommentPendingFiles((prev) => [...prev, ...files])}
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                          label="Klik atau seret file"
                          hint="Bisa beberapa file sekaligus — maks 10 MB per file"
                        />
                        {commentPendingFiles.length > 0 ? (
                          <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                            {commentPendingFiles.map((f, i) => (
                              <li key={`${f.name}-${i}`} className="flex justify-between gap-2">
                                <span className="truncate">{f.name}</span>
                                <button
                                  type="button"
                                  className="shrink-0 text-red-600 hover:underline"
                                  onClick={() => setCommentPendingFiles((p) => p.filter((_, j) => j !== i))}
                                >
                                  Hapus
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            (!commentText.trim() && commentPendingFiles.length === 0) || addComment.isPending
                          }
                          onClick={() => addComment.mutate()}
                        >
                          Kirim Komentar
                        </Button>
                      </div>
                    </div>
                  )}

                  {canViewCommentAudit ? (
                  <div className="mt-6 border-t border-zinc-100 pt-6">
                    <div className="mb-3 flex items-center gap-1.5">
                      <History className="size-3.5 text-zinc-400" />
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                        Riwayat audit komentar
                      </p>
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
                      {commentAuditQ.isPending ? (
                        <p className="text-xs text-zinc-400">Memuat…</p>
                      ) : (commentAuditQ.data ?? []).length === 0 ? (
                        <p className="text-xs text-zinc-400">Belum ada peristiwa komentar.</p>
                      ) : (
                        <div className="relative space-y-3 pl-4 before:absolute before:left-1.5 before:top-0 before:h-full before:w-px before:bg-zinc-200">
                          {(commentAuditQ.data ?? []).map((log) => (
                            <div key={log.id} className="relative">
                              <div className="absolute -left-[11px] top-1.5 size-2 rounded-full bg-zinc-300 ring-2 ring-zinc-50" />
                              <p className="text-sm text-zinc-700">{describeTaskCommentAudit(log)}</p>
                              <p className="mt-0.5 text-[11px] text-zinc-400">
                                {format(new Date(log.createdAt), "PPp")}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  ) : null}
                </div>
              </div>

              {/* RIGHT: metadata sidebar — sticky/floating saat scroll */}
              <div className="self-start lg:sticky lg:top-0">
              <div className="flex flex-col gap-0 divide-y divide-zinc-100 bg-zinc-50/60 px-4 py-4 sm:px-5 sm:py-6">

                {/* Status */}
                <div className="pb-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Status</p>
                  <span
                    className={cn(
                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                    isParked
                      ? t.status === "on_hold" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                      : currentPipelineIdx >= 0 ? "bg-primary/10 text-primary" : "bg-zinc-100 text-zinc-600"
                  )}
                    title={
                      isCompletedStatusLocked
                        ? COMPLETED_STATUS_FINAL_TOOLTIP
                        : undefined
                    }
                  >
                    {STATUS_LABEL_MAP[t.status] ?? t.status}
                  </span>
                </div>

                {/* Team */}
                <div className="py-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Tim</p>
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1.5 text-xs text-zinc-500">Dibuat oleh</p>
                      {t.reporter ? (
                        <div className="flex items-center gap-2">
                          <UserProfileTrigger userId={t.reporter.id}>
                            <Avatar className="size-6">
                              {t.reporter.image ? (
                                <AvatarImage src={t.reporter.image} alt="" />
                              ) : null}
                              <AvatarFallback className="text-[9px]">
                                {t.reporter.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </UserProfileTrigger>
                          <UserProfileTrigger userId={t.reporter.id} className="rounded-sm">
                            <span className="text-sm text-zinc-700">{t.reporter.name}</span>
                          </UserProfileTrigger>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-400">—</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs text-zinc-500">PM reporter</p>
                      {t.pmReporter ? (
                        <div className="flex items-center gap-2">
                          <UserProfileTrigger userId={t.pmReporter.id}>
                            <Avatar className="size-6">
                              {t.pmReporter.image ? (
                                <AvatarImage src={t.pmReporter.image} alt="" />
                              ) : null}
                              <AvatarFallback className="text-[9px]">
                                {t.pmReporter.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </UserProfileTrigger>
                          <UserProfileTrigger userId={t.pmReporter.id} className="rounded-sm">
                            <span className="text-sm text-zinc-700">{t.pmReporter.name}</span>
                          </UserProfileTrigger>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-400">—</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs text-zinc-500">Client reporter</p>
                      {t.clientUser ? (
                        <div className="flex items-center gap-2">
                          <UserProfileTrigger userId={t.clientUser.id}>
                            <Avatar className="size-6">
                              {t.clientUser.image ? (
                                <AvatarImage src={t.clientUser.image} alt="" />
                              ) : null}
                              <AvatarFallback className="text-[9px]">
                                {t.clientUser.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </UserProfileTrigger>
                          <UserProfileTrigger userId={t.clientUser.id} className="rounded-sm">
                            <span className="text-sm text-zinc-700">{t.clientUser.name}</span>
                          </UserProfileTrigger>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-400">—</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs text-zinc-500">Dev Assignee</p>
                      {t.assignees.length === 0 ? (
                        <p className="text-sm text-zinc-400">—</p>
                      ) : (
                        <div className="space-y-1.5">
                          {t.assignees.map((a) => (
                            <div key={a.user.id} className="flex items-center gap-2">
                              <UserProfileTrigger userId={a.user.id}>
                                <Avatar className="size-6">
                                  {a.user.image && <AvatarImage src={a.user.image} />}
                                  <AvatarFallback className="text-[9px]">{a.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                              </UserProfileTrigger>
                              <UserProfileTrigger userId={a.user.id} className="rounded-sm">
                                <span className="text-sm text-zinc-700">{a.user.name}</span>
                              </UserProfileTrigger>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div className="py-4">
                  <div className="mb-3 flex items-center gap-1.5">
                    <CalendarDays className="size-3 text-zinc-400" />
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Jadwal</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500">Mulai</span>
                      <span className="font-medium text-zinc-800">{t.startDate ? format(new Date(t.startDate), "d MMM yyyy") : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500">Tenggat</span>
                      <span className={cn("font-medium", isOverdue ? "text-red-600" : "text-zinc-800")}>
                        {t.dueDate ? format(new Date(t.dueDate), "d MMM yyyy") : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500">Dibuat</span>
                      <span className="text-zinc-800">{format(new Date(t.createdAt), "d MMM yyyy")}</span>
                    </div>
                  </div>
                </div>

                {/* Transfer history */}
                {t.transferredAt && t.transferredFromProject ? (
                  <div className="py-4">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                      Riwayat transfer
                    </p>
                    <div className="space-y-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-zinc-500">Project asal</span>
                      <span className="text-right font-medium text-zinc-800">
                        {t.transferredFromProject.name.trim()
                          ? `${t.transferredFromProject.name.trim()} (${t.transferredFromProject.code})`
                          : t.transferredFromProject.code}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-zinc-500">Tanggal pemindahan</span>
                      <span className="text-right font-medium text-zinc-800">
                        {format(new Date(t.transferredAt), "d MMM yyyy · HH:mm")}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-zinc-500">Oleh</span>
                      <span className="text-right font-medium text-zinc-800">
                        {t.transferredBy?.name ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

                {/* Referensi task (informatif; dikelola di form add/edit) */}
                {(t.references ?? []).length > 0 && (
                  <div className="py-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                      Referensi task
                    </p>
                    <div className="space-y-1.5">
                      {(t.references ?? []).map((ref) => {
                        const rt = ref.reference;
                        const pub = formatKanbanTaskPublicId({
                          id: rt.id,
                          taskNumber: rt.taskNumber,
                          project: rt.project,
                        });
                        return (
                          <div
                            key={ref.id}
                            className="flex items-start gap-2 rounded-lg bg-sky-50/80 px-2.5 py-2 text-xs text-sky-900"
                          >
                            <FileText className="size-3.5 shrink-0 opacity-90" aria-hidden />
                            <div className="min-w-0">
                              <span className="font-mono text-[10px] text-sky-700/90">
                                {pub}
                              </span>
                              <p className="truncate font-medium">{rt.title}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dependencies */}
                {t.dependsOn.length > 0 && (
                  <div className="py-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Dependensi task</p>
                    <div className="space-y-1.5">
                      {t.dependsOn.map((d) => {
                        const done = ["completed", "done"].includes(d.dependsOn.status);
                        return (
                          <div key={d.id} className={cn(
                            "flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs",
                            done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          )}>
                            {done ? <CheckCircle2 className="size-3.5 shrink-0" /> : <AlertTriangle className="size-3.5 shrink-0" />}
                            <span className="truncate">{d.dependsOn.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {(t.tags ?? []).length > 0 && (
                  <div className="pt-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {t.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs font-normal">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status-lock banners (sprint / completed) — paling bawah sidebar */}
                {isCompletedStatusLocked ? (
                  <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3.5 py-3 text-[13px] text-emerald-900">
                    <p className="leading-relaxed">{COMPLETED_STATUS_BANNER_MESSAGE}</p>
                    {onRequestCreateFollowUp && rowId ? (
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3 h-8 gap-1.5"
                        onClick={() => {
                          onRequestCreateFollowUp(rowId, t?.projectId ?? projectId);
                          handleOpenChange(false);
                        }}
                      >
                        <Plus className="size-3.5" />
                        Buat Task Baru
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {isSprintStatusLocked ? (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3.5 py-3 text-[13px] text-amber-900">
                    <p className="flex items-start gap-2 leading-relaxed">
                      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <span>{sprintLockMessage}</span>
                    </p>
                    {isSprintCompletedUnfinished ? (
                      <p className="mt-2 leading-relaxed">
                        {SPRINT_COMPLETED_TASK_UNFINISHED_BADGE}
                        {t?.sprint?.completedNote ? (
                          <span className="mt-1 block rounded border border-amber-200 bg-white/70 px-2 py-1 text-[13px] italic text-amber-800">
                            “{t.sprint.completedNote}”
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {isCancelledSprintTask ? (
                  <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50/80 px-3.5 py-3 text-[13px] text-sky-900">
                    <p className="leading-relaxed">{CANCELLED_SPRINT_INFO_BADGE}</p>
                  </div>
                ) : null}
              </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    <AlertDialog
      open={deleteChecklistGroupId !== null}
      onOpenChange={(open) => {
        if (!open) setDeleteChecklistGroupId(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus checklist ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Seluruh item di dalam checklist ini ikut dihapus. Anda bisa membuat checklist baru kapan saja.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-600/90"
            disabled={removeChecklistGroup.isPending || !deleteChecklistGroupId}
            onClick={() => {
              if (deleteChecklistGroupId) {
                removeChecklistGroup.mutate(deleteChecklistGroupId);
              }
            }}
          >
            {removeChecklistGroup.isPending ? "Menghapus…" : "Hapus checklist"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={deleteTaskOpen} onOpenChange={setDeleteTaskOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus tugas?</AlertDialogTitle>
          <AlertDialogDescription>
            Tugas akan disembunyikan secara permanen dari papan kerja (soft delete).
            Nomor tugas (ID tampilan) akan diurutkan ulang. Turunan tugas aktif ikut terhapus.
            Tindakan ini tercatat di audit trail.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-600/90"
            disabled={deleteTask.isPending || !rowId}
            onClick={() => deleteTask.mutate()}
          >
            {deleteTask.isPending ? "Menghapus…" : "Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <TaskTransferConfirmDialog
      open={transferConfirmOpen}
      onOpenChange={(o) => {
        setTransferConfirmOpen(o);
        if (!o) setTransferTargetId("");
      }}
      taskCount={1}
      targetLabel={transferTargetLabel}
      pending={transferTask.isPending}
      onConfirm={() => {
        if (transferTargetId) transferTask.mutate(transferTargetId);
      }}
    />
    <ParkingLotReasonModal
      open={pendingParkingStatus != null}
      targetStatus={pendingParkingStatus}
      onConfirm={confirmParkingLotMove}
      onCancel={() => {
        if (!updateStatus.isPending) setPendingParkingStatus(null);
      }}
      isPending={updateStatus.isPending}
    />
    </>
  );
}
