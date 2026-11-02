"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";
import {
  AlertOctagon,
  Archive,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  ImageIcon,
  List,
  Lock,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { toDownloadUrl } from "@/lib/attachment-url";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { useSession } from "@/lib/auth-client";
import { useProjectDetail } from "../project-detail-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { UserProfileTrigger } from "@/components/features/users/UserProfileTrigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  canParticipateInDiscussion,
  canStartDiscussionThread,
  isReadOnlyProjectRole,
} from "@/lib/project-detail-permissions";
import {
  APP_ROLES,
  isAdminOrPmRole,
  normalizeRole,
} from "@/lib/role-constants";

const PAGE_SIZE = 20;
const REPLY_PREVIEW = 3;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const POST_TYPES = [
  { value: "update", label: "Update" },
  { value: "question", label: "Question" },
  { value: "decision", label: "Decision" },
  { value: "blocker", label: "Blocker" },
  { value: "general", label: "General" },
] as const;

const POST_TYPE_SELECT_ITEMS = POST_TYPES.map((t) => ({
  value: t.value,
  label: t.label,
}));
const DISC_TYPE_FILTER_ITEMS = [
  { value: "__all__", label: "All types" },
  ...POST_TYPE_SELECT_ITEMS,
];

const TYPE_META: Record<
  string,
  { label: string; badgeClass: string; Icon: typeof MessageCircle }
> = {
  update: {
    label: "Update",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    Icon: RefreshCw,
  },
  question: {
    label: "Question",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-800",
    Icon: HelpCircle,
  },
  decision: {
    label: "Decision",
    badgeClass: "border-violet-200 bg-violet-50 text-violet-800",
    Icon: CheckSquare,
  },
  blocker: {
    label: "Blocker",
    badgeClass: "border-red-200 bg-red-50 text-red-800",
    Icon: AlertOctagon,
  },
  general: {
    label: "General",
    badgeClass: "border-zinc-200 bg-zinc-50 text-zinc-700",
    Icon: MessageCircle,
  },
};

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeIcon(mime: string | null) {
  if (!mime) return Paperclip;
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.includes("pdf")) return FileText;
  if (mime.includes("zip") || mime.includes("compressed")) return Archive;
  return Paperclip;
}

type Attachment = {
  id: string;
  url: string;
  name: string;
  mimeType: string | null;
  size: number | null;
};

type Reply = {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  author: { id: string; name: string; image: string | null };
  attachments: Attachment[];
};

type FeedPost = {
  id: string;
  projectId: string;
  title: string;
  content: string;
  type: string;
  pinned: boolean;
  authorId: string;
  createdAt: string;
  author: { id: string; name: string; image: string | null };
  replies: Reply[];
  attachments: Attachment[];
};

const mdClass =
  "prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1";

const feedKey = (projectId: string) => ["discussions", projectId, "feed"] as const;

export function DiscussionPageClient() {
  const { id: projectId } = useParams<{ id: string }>();
  const { project } = useProjectDetail();
  const { data: session } = useSession();
  const role =
    (session?.user as { role?: string; id?: string } | undefined)?.role ?? "";
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const canAccess = (APP_ROLES as readonly string[]).includes(
    normalizeRole(role),
  );
  const canPin = isAdminOrPmRole(role);
  const canStartThread = canStartDiscussionThread(role);
  const canReplyInThread = canParticipateInDiscussion(role);
  const qc = useQueryClient();

  const [listPage, setListPage] = useState(1);
  const [discSearch, setDiscSearch] = useState("");
  const [discType, setDiscType] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<string>("general");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState("general");
  const [editPendingFiles, setEditPendingFiles] = useState<File[]>([]);

  const [repliesOpen, setRepliesOpen] = useState<Record<string, boolean>>({});
  const [showAllReplies, setShowAllReplies] = useState<Record<string, boolean>>(
    {},
  );
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replyPendingFiles, setReplyPendingFiles] = useState<
    Record<string, File[]>
  >({});


  const [confirmDelThreadId, setConfirmDelThreadId] = useState<string | null>(
    null,
  );
  const [confirmDelReply, setConfirmDelReply] = useState<{
    discussionId: string;
    replyId: string;
  } | null>(null);
  const [confirmDelAtt, setConfirmDelAtt] = useState<{
    discussionId: string;
    attachmentId: string;
  } | null>(null);

  const feedQ = useQuery({
    queryKey: feedKey(projectId),
    queryFn: async () => {
      const res = await api.get<FeedPost[]>("/api/discussions", {
        params: { projectId, expanded: "1" },
      });
      return res.data;
    },
    enabled: !!projectId && canAccess,
  });

  const filteredThreads = useMemo(() => {
    let rows = feedQ.data ?? [];
    const q = discSearch.trim().toLowerCase();
    if (discType) rows = rows.filter((r) => r.type === discType);
    if (q) {
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [feedQ.data, discSearch, discType]);

  const { pinnedPosts, regularPosts } = useMemo(() => {
    const pinned = filteredThreads.filter((p) => p.pinned);
    const regular = filteredThreads.filter((p) => !p.pinned);
    return { pinnedPosts: pinned, regularPosts: regular };
  }, [filteredThreads]);

  const totalPages = Math.max(
    1,
    Math.ceil(regularPosts.length / PAGE_SIZE),
  );
  const safeListPage = Math.min(Math.max(1, listPage), totalPages);

  const paginatedRegular = useMemo(() => {
    const start = (safeListPage - 1) * PAGE_SIZE;
    return {
      slice: regularPosts.slice(start, start + PAGE_SIZE),
      total: regularPosts.length,
    };
  }, [regularPosts, safeListPage]);

  const editingPost = useMemo(
    () =>
      editingPostId && feedQ.data
        ? (feedQ.data.find((p) => p.id === editingPostId) ?? null)
        : null,
    [editingPostId, feedQ.data],
  );

  const createM = useMutation({
    mutationFn: async () => {
      const res = await api.post<FeedPost>("/api/discussions", {
        projectId,
        title: newTitle.trim() || "(No title)",
        content: newContent.trim(),
        type: newType,
      });
      const created = res.data;
      for (const file of pendingFiles) {
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.warning(`"${file.name}" exceeds 5MB. Skipped.`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        const up = await api.post<{
          url: string;
          name: string;
          mimeType: string;
          size: number;
        }>("/api/upload?category=discussion", fd);
        await api.post(`/api/discussions/${created.id}/attachments`, {
          url: up.data.url,
          name: up.data.name,
          mimeType: up.data.mimeType,
          size: up.data.size,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKey(projectId) });
      setCreateOpen(false);
      setNewTitle("");
      setNewContent("");
      setNewType("general");
      setPendingFiles([]);
      setListPage(1);
      toast.success("Post created");
    },
    onError: () => toast.error("Could not create post"),
  });

  const patchM = useMutation({
    mutationFn: async (payload: {
      id: string;
      title: string;
      content: string;
      type: string;
      pendingFiles: File[];
    }) => {
      await api.patch(`/api/discussions/${payload.id}`, {
        title: payload.title.trim() || "(No title)",
        content: payload.content.trim(),
        type: payload.type,
      });
      for (const file of payload.pendingFiles) {
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.warning(`"${file.name}" exceeds 5MB. Skipped.`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        const up = await api.post<{
          url: string;
          name: string;
          mimeType: string;
          size: number;
        }>("/api/upload?category=discussion", fd);
        await api.post(`/api/discussions/${payload.id}/attachments`, {
          url: up.data.url,
          name: up.data.name,
          mimeType: up.data.mimeType,
          size: up.data.size,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKey(projectId) });
      resetEditForm();
      toast.success("Saved");
    },
    onError: () => toast.error("Could not save"),
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/discussions/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKey(projectId) });
      setConfirmDelThreadId(null);
      toast.success("Post deleted");
    },
    onError: () => toast.error("Could not delete"),
  });

  const pinM = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/api/discussions/${id}/pin`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKey(projectId) });
    },
    onError: () => toast.error("Could not toggle pin"),
  });

  const replyM = useMutation({
    mutationFn: async ({
      id,
      content,
      files,
    }: {
      id: string;
      content: string;
      files: File[];
    }) => {
      const atts: {
        url: string;
        name: string;
        mimeType: string;
        size: number;
      }[] = [];
      for (const file of files) {
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.warning(`"${file.name}" exceeds 5MB. Skipped.`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        const up = await api.post<{
          url: string;
          name: string;
          mimeType: string;
          size: number;
        }>("/api/upload?category=discussion", fd);
        atts.push({
          url: up.data.url,
          name: up.data.name,
          mimeType: up.data.mimeType,
          size: up.data.size,
        });
      }
      const text = content.trim();
      await api.post(`/api/discussions/${id}/replies`, {
        content: text,
        attachments: atts.length ? atts : undefined,
      });
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: feedKey(projectId) });
      setReplyDraft((d) => ({ ...d, [id]: "" }));
      setReplyPendingFiles((d) => {
        const n = { ...d };
        delete n[id];
        return n;
      });
      toast.success("Reply posted");
    },
    onError: () => toast.error("Could not post reply"),
  });

  const delReplyM = useMutation({
    mutationFn: async ({
      discussionId,
      replyId,
    }: {
      discussionId: string;
      replyId: string;
    }) => {
      await api.delete(`/api/discussions/${discussionId}/replies/${replyId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKey(projectId) });
      setConfirmDelReply(null);
    },
    onError: () => toast.error("Could not delete reply"),
  });

  const delAttM = useMutation({
    mutationFn: async ({
      discussionId,
      attachmentId,
    }: {
      discussionId: string;
      attachmentId: string;
    }) => {
      await api.delete(
        `/api/discussions/${discussionId}/attachments/${attachmentId}`,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKey(projectId) });
      setConfirmDelAtt(null);
    },
    onError: () => toast.error("Could not remove attachment"),
  });

  function startEdit(p: FeedPost) {
    setEditingPostId(p.id);
    setEditTitle(p.title);
    setEditContent(p.content);
    setEditType(p.type || "general");
    setEditPendingFiles([]);
  }

  function resetEditForm() {
    setEditingPostId(null);
    setEditTitle("");
    setEditContent("");
    setEditType("general");
    setEditPendingFiles([]);
  }

  function resetCreateForm() {
    setNewTitle("");
    setNewContent("");
    setNewType("general");
    setPendingFiles([]);
  }

  function toggleReplies(id: string) {
    setRepliesOpen((s) => ({ ...s, [id]: !s[id] }));
  }

  function canDeletePost(p: FeedPost) {
    if (isReadOnlyProjectRole(role)) return false;
    if (!userId) return false;
    return p.authorId === userId || isAdminOrPmRole(role);
  }

  function canEditPost(p: FeedPost) {
    if (isReadOnlyProjectRole(role)) return false;
    if (!userId) return false;
    return p.authorId === userId;
  }

  function canDeleteReply(r: Reply) {
    if (!canReplyInThread) return false;
    if (!userId) return false;
    return r.authorId === userId;
  }

  function canManageAttachments(p: FeedPost) {
    if (isReadOnlyProjectRole(role)) return false;
    if (!userId) return false;
    return p.authorId === userId || isAdminOrPmRole(role);
  }

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 py-16 text-center">
        <Lock className="mb-3 size-10 text-zinc-400" aria-hidden />
        <p className="text-sm font-medium text-zinc-800">Access restricted</p>
        <p className="mt-1 max-w-sm text-xs text-zinc-500">
          Discussion is only available to developers, PMs, and admins on this
          project.
        </p>
      </div>
    );
  }

  if (feedQ.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-8 text-center text-sm text-red-800">
        Could not load discussion. Refresh the page or try again later.
      </div>
    );
  }

  const isEmpty =
    !feedQ.isLoading &&
    pinnedPosts.length === 0 &&
    paginatedRegular.slice.length === 0;

  function renderPostCard(p: FeedPost, opts: { isPinnedSection: boolean }) {
    const meta = TYPE_META[p.type] ?? TYPE_META.general;
    const TypeIcon = meta.Icon;
    const replies = p.replies ?? [];
    const open = repliesOpen[p.id];
    const showAll = showAllReplies[p.id];
    const visibleReplies =
      showAll || replies.length <= REPLY_PREVIEW
        ? replies
        : replies.slice(-REPLY_PREVIEW);

    return (
      <Card
        key={p.id}
        className={cn(
          "group/card overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-md shadow-zinc-950/[0.06] ring-0",
          "transition-[box-shadow,border-color,transform] duration-200 ease-out",
          "hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-950/[0.09]",
          (opts.isPinnedSection || p.pinned) &&
            "border-amber-200/90 shadow-amber-950/5 ring-1 ring-amber-200/70 hover:border-amber-300/90 hover:ring-amber-300/80",
        )}
      >
        <CardContent className="space-y-0 p-0">
          <div
            className={cn(
              "border-b border-zinc-200/80 bg-gradient-to-b from-zinc-50/95 to-zinc-50/50 px-4 py-3.5 sm:px-5 sm:py-4",
              (opts.isPinnedSection || p.pinned) &&
                "from-amber-50/80 to-amber-50/30 border-amber-100/80",
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <Avatar className="size-9 shrink-0 ring-2 ring-white shadow-sm">
                  {p.author.image ? (
                    <AvatarImage src={p.author.image} alt="" />
                  ) : null}
                  <AvatarFallback className="text-xs">
                    {initials(p.author.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold tracking-tight text-zinc-900">
                    {p.author.name}
                  </p>
                  <p
                    className="text-xs text-zinc-500"
                    title={new Date(p.createdAt).toLocaleString()}
                  >
                    {formatDistanceToNow(new Date(p.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium shadow-sm",
                    meta.badgeClass,
                  )}
                >
                  <TypeIcon className="size-3.5 shrink-0" aria-hidden />
                  {meta.label}
                </span>
                {opts.isPinnedSection || p.pinned ? (
                  <span
                    className="inline-flex items-center rounded-md border border-amber-200/80 bg-amber-50/90 px-1.5 py-0.5 text-amber-700 shadow-sm"
                    title="Pinned"
                  >
                    <Pin className="size-3.5" aria-hidden />
                  </span>
                ) : null}
                <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200/60 bg-white/80 p-0.5 shadow-sm">
                  {canPin ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="size-8 text-zinc-500 hover:bg-zinc-100"
                      title={p.pinned ? "Unpin" : "Pin"}
                      onClick={() => pinM.mutate(p.id)}
                      disabled={pinM.isPending}
                    >
                      {p.pinned ? (
                        <PinOff className="size-3.5" />
                      ) : (
                        <Pin className="size-3.5" />
                      )}
                    </Button>
                  ) : null}
                  {canEditPost(p) ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="size-8 text-zinc-500 hover:bg-zinc-100"
                      title="Edit"
                      onClick={() => startEdit(p)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  ) : null}
                  {canDeletePost(p) ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="size-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                      title="Delete"
                      onClick={() => setConfirmDelThreadId(p.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
            {p.title?.trim() && p.title !== "(No title)" ? (
              <h3 className="text-base font-semibold leading-snug tracking-tight text-zinc-900">
                {p.title}
              </h3>
            ) : null}

            <div
              className={cn(
                "rounded-lg border border-zinc-200/70 bg-zinc-50/40 px-4 py-3 shadow-inner shadow-zinc-950/[0.03]",
                "transition-colors duration-200 group-hover/card:border-zinc-200 group-hover/card:bg-zinc-50/60",
              )}
            >
              <div className={mdClass}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {p.content}
                </ReactMarkdown>
              </div>
            </div>

            {p.attachments.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-zinc-200/70 bg-white p-3 shadow-sm shadow-zinc-950/[0.04]">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Attachments
                </p>
                <ul className="space-y-2">
                  {p.attachments.map((a) => {
                    const Icon = mimeIcon(a.mimeType);
                    return (
                      <li
                        key={a.id}
                        className="flex items-center gap-2 rounded-md border border-zinc-100 bg-zinc-50/50 px-2 py-1.5 text-sm transition-colors hover:border-zinc-200 hover:bg-zinc-50"
                      >
                        <Icon className="size-4 shrink-0 text-zinc-400" />
                        <a
                          href={toDownloadUrl(a.url)}
                          target="_blank"
                          rel="noreferrer"
                          {...(a.url.startsWith("/uploads/") ? { download: a.name } : {})}
                          className="min-w-0 flex-1 truncate font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-2 hover:decoration-blue-600"
                        >
                          {a.name}
                        </a>
                        <span className="shrink-0 text-xs text-zinc-500">
                          {formatBytes(a.size ?? 0)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="flex border-t border-zinc-200/80 bg-zinc-50/40 px-4 py-2 sm:px-5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "gap-1.5 rounded-lg text-zinc-700",
                open && "bg-white shadow-sm ring-1 ring-zinc-200/80",
              )}
              aria-expanded={open}
              onClick={() => toggleReplies(p.id)}
            >
              <MessageSquare className="size-3.5" />
              {replies.length > 0
                ? `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`
                : "Reply"}
            </Button>
          </div>

          {open ? (
            <div className="space-y-4 border-t border-zinc-200/80 bg-zinc-50/25 px-4 py-4 sm:px-5 sm:py-5">
              {!showAll && replies.length > REPLY_PREVIEW ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    setShowAllReplies((s) => ({ ...s, [p.id]: true }))
                  }
                >
                  Show all {replies.length} replies
                </Button>
              ) : null}

              <div className="space-y-3">
                {visibleReplies.map((r) => (
                  <div
                    key={r.id}
                    className="flex gap-3 rounded-lg border border-zinc-200/70 bg-white p-3 shadow-sm shadow-zinc-950/[0.04]"
                  >
                    <UserProfileTrigger userId={r.author.id} className="shrink-0">
                      <Avatar className="size-7 ring-1 ring-zinc-100">
                        {r.author.image ? (
                          <AvatarImage src={r.author.image} alt="" />
                        ) : null}
                        <AvatarFallback className="text-[10px]">
                          {initials(r.author.name)}
                        </AvatarFallback>
                      </Avatar>
                    </UserProfileTrigger>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <UserProfileTrigger userId={r.author.id} className="rounded-sm">
                          <span className="text-sm font-semibold text-zinc-800">
                            {r.author.name}
                          </span>
                        </UserProfileTrigger>
                        <span
                          className="text-xs text-zinc-500"
                          title={new Date(r.createdAt).toLocaleString()}
                        >
                          {formatDistanceToNow(new Date(r.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {canDeleteReply(r) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-7 text-red-600 hover:bg-red-50"
                            onClick={() =>
                              setConfirmDelReply({
                                discussionId: p.id,
                                replyId: r.id,
                              })
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                      <div className={cn(mdClass, "text-sm")}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {r.content}
                        </ReactMarkdown>
                      </div>
                      {(r.attachments ?? []).length > 0 ? (
                        <ul className="space-y-1.5 rounded-md border border-zinc-100 bg-zinc-50/60 p-2">
                          {(r.attachments ?? []).map((a) => {
                            const Icon = mimeIcon(a.mimeType);
                            return (
                              <li
                                key={a.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Icon className="size-3.5 shrink-0 text-zinc-400" />
                                <a
                                  href={toDownloadUrl(a.url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  {...(a.url.startsWith("/uploads/") ? { download: a.name } : {})}
                                  className="min-w-0 flex-1 truncate font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-2 hover:decoration-blue-600"
                                >
                                  {a.name}
                                </a>
                                <span className="shrink-0 text-xs text-zinc-500">
                                  {formatBytes(a.size ?? 0)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {canReplyInThread ? (
                <div className="flex gap-3 rounded-lg border border-dashed border-zinc-300/90 bg-white/90 p-3 shadow-sm sm:p-4">
                  <Avatar className="size-7 shrink-0 ring-1 ring-zinc-100">
                    {session?.user?.image ? (
                      <AvatarImage src={session.user.image} alt="" />
                    ) : null}
                    <AvatarFallback className="text-[10px]">
                      {session?.user?.name
                        ? initials(session.user.name)
                        : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Textarea
                      placeholder="Write a reply…"
                      rows={2}
                      className="resize-y border-zinc-200 bg-white shadow-inner shadow-zinc-950/[0.02] transition-shadow focus-visible:ring-zinc-300"
                      value={replyDraft[p.id] ?? ""}
                      onChange={(e) =>
                        setReplyDraft((d) => ({
                          ...d,
                          [p.id]: e.target.value,
                        }))
                      }
                    />
                    <div>
                      <p className="mb-1 text-[11px] font-medium text-zinc-500">
                        Attachments{" "}
                        <span className="font-normal text-zinc-400">
                          (max 5 MB per file, multiple allowed)
                        </span>
                      </p>
                      <FileDropZone
                        busy={replyM.isPending}
                        onFiles={(files) =>
                          setReplyPendingFiles((d) => ({
                            ...d,
                            [p.id]: [...(d[p.id] ?? []), ...files],
                          }))
                        }
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                        hint="Select or drop several files at once"
                      />
                      {(replyPendingFiles[p.id] ?? []).length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                          {(replyPendingFiles[p.id] ?? []).map((f, i) => (
                            <li
                              key={`${f.name}-${i}`}
                              className="flex justify-between gap-2"
                            >
                              <span className="truncate">{f.name}</span>
                              <button
                                type="button"
                                className="text-red-600 hover:underline"
                                onClick={() =>
                                  setReplyPendingFiles((d) => ({
                                    ...d,
                                    [p.id]: (d[p.id] ?? []).filter(
                                      (_, j) => j !== i,
                                    ),
                                  }))
                                }
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5 shadow-sm"
                      disabled={
                        (!(replyDraft[p.id] ?? "").trim() &&
                          (replyPendingFiles[p.id] ?? []).length === 0) ||
                        replyM.isPending
                      }
                      onClick={() =>
                        replyM.mutate({
                          id: p.id,
                          content: (replyDraft[p.id] ?? "").trim(),
                          files: replyPendingFiles[p.id] ?? [],
                        })
                      }
                    >
                      <Send className="size-3.5" />
                      Reply
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900">Discussion</h1>
          <p className="text-sm text-zinc-500">
            {project.name} — Project updates, questions, decisions, and blockers
          </p>
        </div>
        {canStartThread ? (
          <Button
            type="button"
            className="shrink-0 gap-2 self-start"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            New post
          </Button>
        ) : null}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New post</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="space-y-1">
              <Label htmlFor="dsc-type">Type</Label>
              <Select
                value={newType}
                onValueChange={(v) => v && setNewType(v)}
                items={POST_TYPE_SELECT_ITEMS}
              >
                <SelectTrigger id="dsc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_TYPE_SELECT_ITEMS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dsc-title">
                Title{" "}
                <span className="font-normal text-zinc-500">(optional)</span>
              </Label>
              <Input
                id="dsc-title"
                placeholder="Post title…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dsc-body">
                Content <span className="text-red-600">*</span>{" "}
                <span className="font-normal text-zinc-500">(Markdown)</span>
              </Label>
              <Textarea
                id="dsc-body"
                rows={8}
                className="font-mono text-sm"
                placeholder="Write your post…"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Lampiran{" "}
                <span className="font-normal text-zinc-500">
                  (maks 5 MB per file)
                </span>
              </Label>
              <FileDropZone
                onFiles={(files) => setPendingFiles((p) => [...p, ...files])}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                hint="Bisa pilih beberapa file sekaligus"
              />
              {pendingFiles.length > 0 ? (
                <ul className="space-y-1 text-xs text-zinc-600">
                  {pendingFiles.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex justify-between gap-2"
                    >
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        onClick={() =>
                          setPendingFiles((p) => p.filter((_, j) => j !== i))
                        }
                      >
                        Hapus
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="button"
              disabled={!newContent.trim() || createM.isPending}
              onClick={() => createM.mutate()}
            >
              Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingPostId !== null}
        onOpenChange={(open) => {
          if (!open) resetEditForm();
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="space-y-1">
              <Label htmlFor="dsc-edit-type">Type</Label>
              <Select
                value={editType}
                onValueChange={(v) => v && setEditType(v)}
                items={POST_TYPE_SELECT_ITEMS}
              >
                <SelectTrigger id="dsc-edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_TYPE_SELECT_ITEMS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dsc-edit-title">
                Title{" "}
                <span className="font-normal text-zinc-500">(optional)</span>
              </Label>
              <Input
                id="dsc-edit-title"
                placeholder="Post title…"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dsc-edit-body">
                Content <span className="text-red-600">*</span>{" "}
                <span className="font-normal text-zinc-500">(Markdown)</span>
              </Label>
              <Textarea
                id="dsc-edit-body"
                rows={8}
                className="font-mono text-sm"
                placeholder="Write your post…"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            </div>
            {editingPost && editingPost.attachments.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-zinc-700">Lampiran saat ini</Label>
                <ul className="space-y-2 rounded-lg border border-zinc-100 bg-zinc-50/40 p-3">
                  {editingPost.attachments.map((a) => {
                    const Icon = mimeIcon(a.mimeType);
                    return (
                      <li
                        key={a.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Icon className="size-4 shrink-0 text-zinc-400" />
                        <a
                          href={toDownloadUrl(a.url)}
                          target="_blank"
                          rel="noreferrer"
                          {...(a.url.startsWith("/uploads/") ? { download: a.name } : {})}
                          className="min-w-0 flex-1 truncate font-medium text-blue-600 underline"
                        >
                          {a.name}
                        </a>
                        <span className="shrink-0 text-xs text-zinc-500">
                          {formatBytes(a.size ?? 0)}
                        </span>
                        {canManageAttachments(editingPost) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-red-600"
                            onClick={() =>
                              setConfirmDelAtt({
                                discussionId: editingPost.id,
                                attachmentId: a.id,
                              })
                            }
                          >
                            Remove
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>
                Tambah lampiran{" "}
                <span className="font-normal text-zinc-500">
                  (maks 5 MB per file, disimpan saat Anda klik Simpan)
                </span>
              </Label>
              <FileDropZone
                onFiles={(files) =>
                  setEditPendingFiles((p) => [...p, ...files])
                }
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                hint="Bisa pilih beberapa file sekaligus"
              />
              {editPendingFiles.length > 0 ? (
                <ul className="space-y-1 text-xs text-zinc-600">
                  {editPendingFiles.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex justify-between gap-2"
                    >
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        onClick={() =>
                          setEditPendingFiles((p) =>
                            p.filter((_, j) => j !== i),
                          )
                        }
                      >
                        Hapus
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="button"
              disabled={
                !editContent.trim() || patchM.isPending || !editingPostId
              }
              onClick={() => {
                if (!editingPostId) return;
                patchM.mutate({
                  id: editingPostId,
                  title: editTitle,
                  content: editContent,
                  type: editType,
                  pendingFiles: editPendingFiles,
                });
              }}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label htmlFor="dsc-search" className="text-xs text-zinc-500">
            Search
          </Label>
          <Input
            id="dsc-search"
            placeholder="Search posts…"
            value={discSearch}
            onChange={(e) => {
              setDiscSearch(e.target.value);
              setListPage(1);
            }}
          />
        </div>
        <div className="w-full space-y-1 sm:w-48">
          <Label htmlFor="dsc-filter-type" className="text-xs text-zinc-500">
            Type
          </Label>
          <Select
            value={discType || "__all__"}
            onValueChange={(v) => {
              setDiscType(v === "__all__" ? "" : (v ?? ""));
              setListPage(1);
            }}
            items={DISC_TYPE_FILTER_ITEMS}
          >
            <SelectTrigger id="dsc-filter-type" className="w-full">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              {DISC_TYPE_FILTER_ITEMS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {feedQ.isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-sm text-zinc-500">
          <div className="mb-3 size-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600" />
          Loading discussion…
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 py-16 text-center">
          <MessageCircle className="mb-3 size-10 text-zinc-400" aria-hidden />
          <p className="text-sm font-medium text-zinc-800">No posts yet</p>
          <p className="mt-1 max-w-sm text-xs text-zinc-500">
            Start the conversation — post a project update, question, or decision.
          </p>
          {canStartThread ? (
            <Button
              type="button"
              className="mt-4 gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              Create first post
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-8">
          {pinnedPosts.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <Pin className="size-3.5" aria-hidden />
                Pinned posts
              </div>
              <div className="space-y-4">
                {pinnedPosts.map((p) =>
                  renderPostCard(p, { isPinnedSection: true }),
                )}
              </div>
            </section>
          ) : null}

          {paginatedRegular.slice.length > 0 ? (
            <section className="space-y-3">
              {pinnedPosts.length > 0 ? (
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <List className="size-3.5" aria-hidden />
                  All posts
                </div>
              ) : null}
              <div className="space-y-4">
                {paginatedRegular.slice.map((p) =>
                  renderPostCard(p, { isPinnedSection: false }),
                )}
              </div>
            </section>
          ) : null}

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1"
                disabled={safeListPage <= 1}
                onClick={() => setListPage(safeListPage - 1)}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <span className="text-sm text-zinc-600">
                Page {safeListPage} of {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1"
                disabled={safeListPage >= totalPages}
                onClick={() => setListPage(safeListPage + 1)}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <AlertDialog
        open={!!confirmDelThreadId}
        onOpenChange={(o) => !o && setConfirmDelThreadId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-600/90"
              onClick={() =>
                confirmDelThreadId && deleteM.mutate(confirmDelThreadId)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmDelReply}
        onOpenChange={(o) => !o && setConfirmDelReply(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reply?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-600/90"
              onClick={() =>
                confirmDelReply && delReplyM.mutate(confirmDelReply)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmDelAtt}
        onOpenChange={(o) => !o && setConfirmDelAtt(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove attachment?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelAtt && delAttM.mutate(confirmDelAtt)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
