"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { marked } from "marked";
import { api } from "@/lib/api/client";
import {
  personalNoteDraftKey,
  safeClearDraft,
  safeReadDraftJson,
  safeWriteDraft,
} from "@/lib/local-draft";
import { useSession } from "@/lib/auth-client";
import { formatRelativeTimeId } from "@/lib/format-relative-time";
import {
  clipAuditPreview,
  stripHtmlForAudit,
} from "@/lib/strip-html-for-audit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  FileText,
  Folder,
  FolderPlus,
  Info,
  Pin,
  Search,
  Share2,
  Upload,
  X,
} from "lucide-react";
import {
  filterMarkdownImportFiles,
  MARKDOWN_IMPORT_ACCEPT,
  parseImportedMarkdown,
  slugifyFilename,
} from "@/lib/markdown-editor-helpers";
import {
  NoteEditor,
  type NoteEditorHandle,
} from "@/components/features/notes/NoteEditor";
import { isAdminOrPmRole } from "@/lib/role-constants";

/** Convert markdown or HTML content to HTML for TipTap */
function toHtml(content: string): string {
  if (!content?.trim()) return "";
  if (content.trimStart().startsWith("<")) return content;
  return marked.parse(content, { async: false }) as string;
}

/** Payload sent to PATCH /api/notes/:id */
type NoteSaveBody = {
  title: string;
  content: string;
  folderId: string | null;
  pinned: boolean;
  color?: string | null;
  tags: string[];
};

function normalizeNoteTags(tags: string[]) {
  return [...tags].map((t) => t.trim()).filter(Boolean).sort();
}

function stableNotePayloadString(p: NoteSaveBody): string {
  return JSON.stringify({
    title: p.title,
    content: p.content,
    folderId: p.folderId,
    pinned: p.pinned,
    color: p.color ?? null,
    tags: normalizeNoteTags(p.tags),
  });
}

const NOTE_AUTOSAVE_MS = 30_000;
/** Tanpa perubahan lokal selama ini → autos ke server dijeda (hemat beban). */
const NOTE_AUTOSAVE_IDLE_MS = 60_000;

type FolderRow = { id: string; name: string; color: string | null };

type NoteListItem = {
  id: string;
  ownerId: string;
  title: string;
  content?: string;
  folderId: string | null;
  pinned: boolean;
  updatedAt: string;
  color?: string | null;
  tags?: string[];
  shares: {
    userId: string;
    permission: string;
    user: { id: string; name: string };
  }[];
};

type NoteDetail = NoteListItem & {
  content: string;
  owner: { id: string; name: string };
};

type AuditRow = {
  id: string;
  action: string;
  userName: string;
  detail?: string | null;
  createdAt: string;
  diff: unknown;
};

type UserOpt = { id: string; name: string; email: string };

type Filter = { kind: "all" } | { kind: "folder"; id: string };

const NOTE_COLORS = [
  { hex: "#ffffff", label: "Putih" },
  { hex: "#fef9c3", label: "Kuning" },
  { hex: "#dcfce7", label: "Hijau" },
  { hex: "#dbeafe", label: "Biru" },
  { hex: "#fce7f3", label: "Pink" },
  { hex: "#ede9fe", label: "Ungu" },
  { hex: "#ffedd5", label: "Oranye" },
] as const;

const NOTE_SHARE_PERM_ITEMS = [
  { value: "VIEW", label: "Lihat saja" },
  { value: "EDIT", label: "Lihat & edit" },
];

const NOTE_IMPORT_TEMPLATE = `---
title: Judul Catatan
tags: tag1, tag2
---

# Heading

Isi catatan dalam format **Markdown**.`;

const NOTE_IMPORT_STEPS = [
  "Siapkan file berformat .md (Markdown) — file selain .md tidak dapat diimpor.",
  "Opsional: tambahkan frontmatter title dan tags di bagian atas file.",
  "Klik Impor berkas, lalu seret file ke area upload atau klik untuk memilih.",
  "Periksa daftar file di pratinjau, lalu klik Impor untuk menambahkan catatan.",
] as const;

type AuditChange = { field?: string; label?: string; before?: string; after?: string };

const AUDIT_ACTION_LABELS: Record<string, string> = {
  note_updated: "Pembaruan catatan",
  note_deleted: "Catatan dihapus",
  update: "Pembaruan (format lama)",
};

function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

function formatAuditValue(value: string | undefined, field?: string): string {
  const raw = value ?? "—";
  if (raw === "—") return raw;
  if (field === "content") return stripHtmlForAudit(raw);
  return raw;
}

function getAuditContentPreview(diff: unknown): string | null {
  if (diff && typeof diff === "object" && "changes" in diff) {
    const changes = (diff as { changes?: unknown }).changes;
    if (Array.isArray(changes)) {
      const contentChange = (changes as AuditChange[]).find(
        (c) => c.field === "content",
      );
      const snippet = contentChange?.after ?? contentChange?.before;
      if (snippet) return clipAuditPreview(snippet);
    }
  }
  if (
    diff &&
    typeof diff === "object" &&
    "next" in diff &&
    !("changes" in diff)
  ) {
    const nx = (diff as { next: { content?: string } }).next;
    if (nx.content) return clipAuditPreview(nx.content);
  }
  return null;
}

function AuditDiffPanel({ diff }: { diff: unknown }) {
  if (diff && typeof diff === "object" && "changes" in diff) {
    const changes = (diff as { changes?: unknown }).changes;
    if (Array.isArray(changes) && changes.length > 0) {
      return (
        <div className="mt-3 space-y-3">
          {(changes as AuditChange[]).map((c, i) => {
            const before = formatAuditValue(c.before, c.field);
            const after = formatAuditValue(c.after, c.field);
            return (
              <div
                key={i}
                className="border-border bg-background/80 rounded-md border p-3 text-[11px]"
              >
                <p className="text-primary text-xs font-semibold">
                  {c.label ?? c.field ?? "Perubahan"}
                </p>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                      Sebelum
                    </span>
                    <pre className="border-border mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded border bg-muted/30 p-2 font-sans text-[11px] leading-relaxed">
                      {before}
                    </pre>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                      Sesudah
                    </span>
                    <pre className="border-border mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded border bg-muted/30 p-2 font-sans text-[11px] leading-relaxed">
                      {after}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  }
  if (
    diff &&
    typeof diff === "object" &&
    "prev" in diff &&
    "next" in diff &&
    !("changes" in diff)
  ) {
    const p = (diff as { prev: { title?: string; content?: string } }).prev;
    const nx = (diff as { next: { title?: string; content?: string } }).next;
    const nextContent = stripHtmlForAudit(nx.content);
    return (
      <div className="mt-3 space-y-2 text-[11px]">
        {p.title !== nx.title ? (
          <div className="border-border bg-background/80 rounded-md border p-2">
            <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Judul
            </span>
            <p className="mt-1 leading-relaxed">
              <span className="line-through opacity-70">{p.title}</span>
              <span className="text-muted-foreground mx-1">→</span>
              <span>{nx.title}</span>
            </p>
          </div>
        ) : null}
        {p.content !== nx.content ? (
          <div className="border-border bg-background/80 rounded-md border p-2">
            <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Isi catatan
            </span>
            <pre className="border-border mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded border bg-muted/30 p-2 font-sans text-[11px] leading-relaxed">
              {nextContent}
            </pre>
          </div>
        ) : null}
      </div>
    );
  }
  return null;
}

function noteTitle(n: Pick<NoteListItem, "title" | "content">) {
  const t = n.title?.trim();
  if (t) return t;
  const c = n.content?.trim();
  if (c) return c.slice(0, 40) + (c.length > 40 ? "…" : "");
  return "Tanpa judul";
}

export function NotesPageClient() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";

  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<"editor" | "audit">("editor");
  const [search, setSearch] = useState("");
  const [confirmDelNote, setConfirmDelNote] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [shareUserId, setShareUserId] = useState("");
  const [sharePerm, setSharePerm] = useState<"VIEW" | "EDIT">("VIEW");
  const [noteDraftOffer, setNoteDraftOffer] = useState<NoteSaveBody | null>(
    null,
  );
  const [importOpen, setImportOpen] = useState(false);
  const [importGuideOpen, setImportGuideOpen] = useState(false);
  const [pendingImportFiles, setPendingImportFiles] = useState<File[]>([]);

  const noteEditorRef = useRef<NoteEditorHandle>(null);
  const lastSavedPayloadRef = useRef("");
  const savePendingRef = useRef(false);
  const saveNoteMutateRef = useRef<
    ((p: NoteSaveBody & { silent?: boolean }) => void) | null
  >(null);
  const buildPayloadRef = useRef<() => NoteSaveBody>(() => ({
    title: "",
    content: "",
    folderId: null,
    pinned: false,
    color: null,
    tags: [],
  }));
  const lastLocalEditAtRef = useRef(Date.now());

  const bumpNoteLocalEdit = useCallback(() => {
    lastLocalEditAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    lastLocalEditAtRef.current = Date.now();
  }, [openId]);

  const foldersQ = useQuery({
    queryKey: ["note-folders"],
    queryFn: async () => {
      const res = await api.get<FolderRow[]>("/api/note-folders");
      return res.data;
    },
  });

  const notesQ = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const res = await api.get<NoteListItem[]>("/api/notes");
      return res.data;
    },
  });

  const detailQ = useQuery({
    queryKey: ["note", openId],
    queryFn: async () => {
      const res = await api.get<NoteDetail>(`/api/notes/${openId}`);
      return res.data;
    },
    enabled: !!openId,
  });

  const auditQ = useQuery({
    queryKey: ["note-audit", openId],
    queryFn: async () => {
      const res = await api.get<AuditRow[]>(`/api/notes/${openId}/audit`);
      return res.data;
    },
    enabled: tab === "audit" && !!openId,
  });

  const usersQ = useQuery({
    queryKey: ["users", "notes-share"],
    queryFn: async () => {
      const res = await api.get<UserOpt[]>("/api/users");
      return res.data;
    },
    enabled: (isAdminOrPmRole(role)) && shareOpen && !!openId,
  });

  const isSearch = search.trim().length > 0;
  const qLower = search.trim().toLowerCase();

  const { ownNotes, sharedNotes, folderCounts } = useMemo(() => {
    const rows = notesQ.data ?? [];
    const own = userId ? rows.filter((n) => n.ownerId === userId) : rows;
    const shared = userId ? rows.filter((n) => n.ownerId !== userId) : [];
    const counts: Record<string, number> = {};
    for (const f of foldersQ.data ?? []) {
      counts[f.id] = own.filter(
        (n) => n.folderId === f.id && !n.pinned,
      ).length;
    }
    return { ownNotes: own, sharedNotes: shared, folderCounts: counts };
  }, [notesQ.data, foldersQ.data, userId]);

  const searchHits = useMemo(() => {
    if (!isSearch) return [];
    const rows = notesQ.data ?? [];
    return rows.filter((n) => {
      const inTitle = noteTitle(n).toLowerCase().includes(qLower);
      const inTags = (n.tags ?? []).some((t) =>
        t.toLowerCase().includes(qLower),
      );
      const inContent = (n.content ?? "").toLowerCase().includes(qLower);
      return inTitle || inTags || inContent;
    });
  }, [notesQ.data, isSearch, qLower]);

  const folderNotes = useMemo(() => {
    if (filter.kind !== "folder" || !userId) return [];
    return ownNotes.filter(
      (n) => n.folderId === filter.id && !n.pinned,
    );
  }, [filter, ownNotes, userId]);

  const pinnedList = useMemo(
    () => ownNotes.filter((n) => n.pinned),
    [ownNotes],
  );

  const ungroupedList = useMemo(
    () => ownNotes.filter((n) => !n.pinned && !n.folderId),
    [ownNotes],
  );

  const createFolderM = useMutation({
    mutationFn: async (name: string) => {
      await api.post("/api/note-folders", { name });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["note-folders"] });
      setNewFolderName("");
      setNewFolderOpen(false);
      toast.success("Folder dibuat");
    },
    onError: () => toast.error("Gagal membuat folder"),
  });

  const createNoteM = useMutation({
    mutationFn: async () => {
      let folderId: string | undefined;
      if (filter.kind === "folder") folderId = filter.id;
      const res = await api.post<NoteListItem>("/api/notes", {
        title: "Catatan tanpa judul",
        content: "",
        folderId,
      });
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      if (data?.id) setOpenId(data.id);
      setTab("editor");
      toast.success("Catatan baru");
    },
    onError: () => toast.error("Gagal membuat catatan"),
  });

  const importNotesFromFilesM = useMutation({
    mutationFn: async (payload: { files: File[]; folderId?: string }) => {
      const { files, folderId } = payload;
      const created: NoteListItem[] = [];
      for (const file of files) {
        const raw = await file.text();
        const parsed = parseImportedMarkdown(raw);
        const baseName = file.name.replace(/\.(md|markdown)$/i, "").trim();
        const title =
          parsed.title?.trim() || baseName || "Catatan dari impor";
        const res = await api.post<NoteListItem>("/api/notes", {
          title,
          content: parsed.body,
          tags: parsed.tags ?? [],
          folderId,
        });
        created.push(res.data);
      }
      return created;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      setImportOpen(false);
      setPendingImportFiles([]);
      if (data.length === 1 && data[0]?.id) {
        setOpenId(data[0].id);
        setTab("editor");
      } else if (data.length > 1 && data[0]?.id) {
        setOpenId(data[0].id);
        setTab("editor");
      }
      toast.success(
        data.length === 1
          ? "Berkas ditambahkan sebagai catatan baru"
          : `${data.length} catatan berhasil diimpor`,
      );
    },
    onError: () => toast.error("Gagal mengimpor berkas"),
  });

  const saveNoteM = useMutation({
    mutationFn: async (payload: NoteSaveBody & { silent?: boolean }) => {
      if (!openId) return null;
      const { silent, ...body } = payload;
      await api.patch(`/api/notes/${openId}`, body);
      return { silent: !!silent, body, noteId: openId };
    },
    onSuccess: (result) => {
      if (!result) return;
      safeClearDraft(personalNoteDraftKey(result.noteId));
      lastSavedPayloadRef.current = stableNotePayloadString(result.body);
      const b = result.body;
      if (result.silent) {
        qc.setQueryData<NoteDetail | undefined>(
          ["note", result.noteId],
          (old) =>
            old
              ? {
                  ...old,
                  title: b.title,
                  content: b.content,
                  folderId: b.folderId,
                  pinned: b.pinned,
                  color: b.color ?? null,
                  tags: b.tags,
                  updatedAt: new Date().toISOString(),
                }
              : old,
        );
        qc.setQueryData<NoteListItem[] | undefined>(["notes"], (old) =>
          old?.map((row) =>
            row.id === result.noteId
              ? {
                  ...row,
                  title: b.title,
                  folderId: b.folderId,
                  pinned: b.pinned,
                  color: b.color ?? null,
                  tags: b.tags,
                  updatedAt: new Date().toISOString(),
                }
              : row,
          ),
        );
      } else {
        qc.invalidateQueries({ queryKey: ["notes"] });
        qc.invalidateQueries({ queryKey: ["note", openId] });
        toast.success("Disimpan");
      }
    },
    onError: (_err, variables) =>
      toast.error(
        variables?.silent
          ? "Autosave gagal — cadangan lokal di perangkat ini tetap tersimpan"
          : "Gagal menyimpan",
      ),
  });

  saveNoteMutateRef.current = saveNoteM.mutate;

  useEffect(() => {
    savePendingRef.current = saveNoteM.isPending;
  }, [saveNoteM.isPending]);

  const patchPinM = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      await api.patch(`/api/notes/${id}`, { pinned });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["note", openId] });
    },
    onError: () => toast.error("Gagal mengubah sematan"),
  });

  const deleteNoteM = useMutation({
    mutationFn: async () => {
      if (!openId) return;
      await api.delete(`/api/notes/${openId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      setOpenId(null);
      setConfirmDelNote(false);
      toast.success("Catatan dihapus");
    },
    onError: () => toast.error("Gagal menghapus"),
  });

  const shareM = useMutation({
    mutationFn: async () => {
      if (!openId || !shareUserId.trim()) return;
      await api.post(`/api/notes/${openId}/share`, {
        userId: shareUserId.trim(),
        permission: sharePerm,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["note", openId] });
      setShareUserId("");
      setShareOpen(false);
      toast.success("Dibagikan");
    },
    onError: () => toast.error("Gagal berbagi"),
  });

  const n = detailQ.data;
  const isOwner = !!(n && userId && n.ownerId === userId);
  const myShare = n?.shares.find((s) => s.userId === userId);
  const canEdit = isOwner || myShare?.permission === "EDIT";

  const serverBaselineStr = useMemo(() => {
    if (!n || !openId || n.id !== openId) return "";
    return stableNotePayloadString({
      title: (n.title ?? "").trim() || "Tanpa judul",
      content: toHtml(n.content ?? ""),
      folderId: n.folderId,
      pinned: n.pinned,
      color: n.color ?? null,
      tags: n.tags ?? [],
    });
  }, [n, openId]);

  const [editTitle, setEditTitle] = useState("");
  const [editFolderId, setEditFolderId] = useState<string | "">("");
  const [editPinned, setEditPinned] = useState(false);
  const [editColor, setEditColor] = useState<string>("");
  const [editTags, setEditTags] = useState("");

  useEffect(() => {
    const row = detailQ.data;
    if (!openId || !row || row.id !== openId) return;
    queueMicrotask(() => {
      setEditTitle(row.title);
      setEditFolderId(row.folderId ?? "");
      setEditPinned(row.pinned);
      setEditColor(row.color ?? "#ffffff");
      setEditTags((row.tags ?? []).join(", "));
    });
  }, [openId, detailQ.data]);

  function buildSavePayload(): NoteSaveBody {
    return {
      title: editTitle.trim() || "Tanpa judul",
      content: noteEditorRef.current?.getHTML() ?? "",
      folderId: editFolderId ? editFolderId : null,
      pinned: editPinned,
      color: editColor || null,
      tags: editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
  }
  buildPayloadRef.current = buildSavePayload;

  const editorInitialContent = useMemo(
    () => toHtml(n?.content ?? ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openId, n?.content],
  );

  useEffect(() => {
    if (!openId || !n || n.id !== openId || !serverBaselineStr) return;
    lastSavedPayloadRef.current = serverBaselineStr;
  }, [openId, n?.id, serverBaselineStr]);

  useEffect(() => {
    if (!openId || !n || n.id !== openId || !canEdit) {
      setNoteDraftOffer(null);
      return;
    }
    const raw =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(personalNoteDraftKey(openId))
        : null;
    const parsed = safeReadDraftJson<{ payload?: NoteSaveBody; at?: number }>(
      raw,
    );
    if (!parsed?.payload) {
      setNoteDraftOffer(null);
      return;
    }
    if (stableNotePayloadString(parsed.payload) === serverBaselineStr) {
      setNoteDraftOffer(null);
      return;
    }
    setNoteDraftOffer(parsed.payload);
  }, [openId, n?.id, canEdit, serverBaselineStr]);

  useEffect(() => {
    if (!openId || !canEdit || tab !== "editor") return;
    if (!n || n.id !== openId) return;
    const key = personalNoteDraftKey(openId);
    const id = window.setInterval(() => {
      const payload = buildPayloadRef.current();
      const cur = stableNotePayloadString(payload);
      if (cur === lastSavedPayloadRef.current) return;
      if (Date.now() - lastLocalEditAtRef.current > NOTE_AUTOSAVE_IDLE_MS)
        return;
      safeWriteDraft(key, { payload, at: Date.now() });
      if (savePendingRef.current) return;
      const run = saveNoteMutateRef.current;
      if (run) run({ ...payload, silent: true });
    }, NOTE_AUTOSAVE_MS);
    return () => clearInterval(id);
  }, [openId, n?.id, canEdit, tab]);

  useEffect(() => {
    if (!openId || !canEdit || tab !== "editor") return;
    if (!n || n.id !== openId) return;
    const handler = (e: BeforeUnloadEvent) => {
      const cur = stableNotePayloadString(buildPayloadRef.current());
      if (cur === lastSavedPayloadRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [openId, n?.id, canEdit, tab]);

  function handleExportHtml() {
    const title = editTitle.trim() || "catatan";
    const html = noteEditorRef.current?.getHTML() ?? "";
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slugifyFilename(title)}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Berkas HTML diunduh");
  }

  function resetImportDialog() {
    setPendingImportFiles([]);
  }

  function handleImportFilesSelected(files: File[]) {
    const { valid, rejected } = filterMarkdownImportFiles(files);
    if (rejected.length) {
      toast.error(
        rejected.length === 1
          ? `"${rejected[0]}" ditolak — hanya file .md yang diizinkan`
          : `${rejected.length} file ditolak — hanya file .md yang diizinkan: ${rejected.join(", ")}`,
      );
    }
    if (!valid.length) return;
    setPendingImportFiles((prev) => {
      const next = [...prev];
      for (const file of valid) {
        const exists = next.some(
          (f) => f.name === file.name && f.size === file.size,
        );
        if (!exists) next.push(file);
      }
      return next;
    });
  }

  function confirmImportNotes() {
    if (!pendingImportFiles.length) return;
    const folderId = filter.kind === "folder" ? filter.id : undefined;
    importNotesFromFilesM.mutate({
      files: pendingImportFiles,
      folderId,
    });
  }

  function renderNoteRow(note: NoteListItem) {
    const active = note.id === openId;
    const isSharedToMe = !!(userId && note.ownerId !== userId);

    return (
      <button
        key={note.id}
        type="button"
        onClick={() => {
          setOpenId(note.id);
          setTab("editor");
        }}
        className={cn(
          "hover:bg-muted/60 relative flex w-full flex-col border-l-[3px] border-transparent px-3 py-2 text-left transition-colors",
          active && "bg-primary/10 border-primary",
        )}
      >
        {note.pinned ? (
          <Pin
            className="absolute top-2 right-2 h-3 w-3 text-amber-500"
            aria-hidden
          />
        ) : null}
        <div className="text-foreground flex items-center gap-1.5 pr-5 text-[0.8125rem] font-medium">
          {note.color && note.color !== "#ffffff" ? (
            <span
              className="h-2 w-2 shrink-0 rounded-full border border-black/10"
              style={{ backgroundColor: note.color }}
            />
          ) : null}
          <span className="truncate">{noteTitle(note)}</span>
          {isSharedToMe ? (
            <Badge variant="secondary" className="h-5 shrink-0 px-1 text-[10px]">
              Shared
            </Badge>
          ) : null}
          {!isSharedToMe && (note.shares?.length ?? 0) > 0 ? (
            <Share2 className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          ) : null}
        </div>
        <div className="text-muted-foreground mt-0.5 text-[0.6875rem]">
          {formatRelativeTimeId(note.updatedAt)}
        </div>
        {isSharedToMe ? (
          <div className="text-muted-foreground mt-0.5 text-[0.65rem]">
            Catatan dibagikan ke Anda
          </div>
        ) : null}
      </button>
    );
  }

  const activeFolder =
    filter.kind === "folder"
      ? foldersQ.data?.find((f) => f.id === filter.id)
      : undefined;

  const folderOptions = foldersQ.data ?? [];
  const folderIdSet = useMemo(
    () => new Set(folderOptions.map((f) => f.id)),
    [folderOptions],
  );
  const folderUnknown =
    isOwner &&
    !!editFolderId &&
    foldersQ.isFetched &&
    !folderIdSet.has(editFolderId);

  const noteFolderSelectItems = useMemo(() => {
    const rows: {
      value: string;
      label: string;
      itemClassName?: string;
    }[] = [{ value: "__none__", label: "Tanpa folder" }];
    if (folderUnknown && editFolderId) {
      rows.push({
        value: editFolderId,
        label: "Folder tidak ada di daftar (pilih ulang)",
        itemClassName: "text-amber-800 dark:text-amber-200",
      });
    }
    for (const f of folderOptions) {
      rows.push({ value: f.id, label: f.name });
    }
    return rows;
  }, [folderUnknown, editFolderId, folderOptions]);

  const shareUserSelectItems = useMemo(
    () =>
      (usersQ.data ?? [])
        .filter((u) => u.id !== userId)
        .map((u) => ({
          value: u.id,
          label: `${u.name} (${u.email})`,
        })),
    [usersQ.data, userId],
  );

  return (
    <div className="border-border bg-card flex h-[calc(100dvh-3.5rem-4.5rem)] min-h-[420px] flex-col overflow-hidden rounded-lg border shadow-sm md:h-[calc(100dvh-3.5rem-2.5rem)]">
      {/* Header — notes-page__header */}
      <header className="border-border flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <FileText className="text-primary h-5 w-5" aria-hidden />
          <h2 className="text-foreground text-lg font-semibold tracking-tight">
            Personal Notes
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 gap-1"
            type="button"
            onClick={() => setImportGuideOpen(true)}
          >
            <Info className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lihat Panduan</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1"
            type="button"
            disabled={importNotesFromFilesM.isPending}
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            Impor berkas
          </Button>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => createNoteM.mutate()}
            disabled={createNoteM.isPending}
          >
            + Catatan baru
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        {/* Left — notes-panel-left */}
        <aside className="bg-muted/40 border-border flex max-h-[40vh] w-full min-w-0 shrink-0 flex-col border-b sm:max-h-none sm:w-[260px] sm:min-w-[260px] sm:border-b-0 sm:border-r">
          <div className="border-border border-b p-3">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                placeholder="Cari catatan…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-border h-8 bg-background pl-8 text-[0.8125rem] shadow-none"
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="pb-4">
              {isSearch ? (
                <div>
                  <div className="text-muted-foreground flex items-center justify-between px-3 py-2 text-[0.6875rem] font-semibold tracking-wide uppercase">
                    Hasil pencarian
                  </div>
                  {searchHits.length === 0 ? (
                    <p className="text-muted-foreground px-3 py-4 text-center text-sm">
                      Tidak ada catatan
                    </p>
                  ) : (
                    searchHits.map((note) => renderNoteRow(note))
                  )}
                </div>
              ) : filter.kind === "folder" ? (
                <div>
                  <div className="border-border flex items-center gap-2 border-b px-2 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 px-2 text-xs"
                      onClick={() => setFilter({ kind: "all" })}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Kembali
                    </Button>
                    <span className="text-muted-foreground flex items-center gap-1 truncate text-xs font-medium">
                      <Folder className="h-3.5 w-3.5 shrink-0" />
                      {activeFolder?.name ?? "Folder"}
                    </span>
                  </div>
                  {folderNotes.length === 0 ? (
                    <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                      Belum ada catatan di folder ini
                    </p>
                  ) : (
                    folderNotes.map((note) => renderNoteRow(note))
                  )}
                </div>
              ) : (
                <>
                  {pinnedList.length > 0 ? (
                    <div className="mb-1">
                      <div className="text-muted-foreground flex items-center gap-1 px-3 py-2 text-[0.6875rem] font-semibold tracking-wide uppercase">
                        <Pin className="h-3 w-3" />
                        Disematkan
                      </div>
                      {pinnedList.map((note) => renderNoteRow(note))}
                    </div>
                  ) : null}

                  <div className="mb-1">
                    <div className="text-muted-foreground flex items-center justify-between px-3 py-2 text-[0.6875rem] font-semibold tracking-wide uppercase">
                      <span className="flex items-center gap-1">
                        <Folder className="h-3 w-3" />
                        Folder
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary mx-2 mb-1 h-8 w-[calc(100%-1rem)] justify-start gap-2 text-xs"
                      onClick={() => setNewFolderOpen(true)}
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                      Folder baru
                    </Button>
                    {(foldersQ.data ?? []).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilter({ kind: "folder", id: f.id })}
                        className="hover:bg-muted/60 flex w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] text-foreground/90"
                      >
                        <Folder className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">
                          {f.name}
                        </span>
                        <span className="text-muted-foreground text-[0.7rem] tabular-nums">
                          {folderCounts[f.id] ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>

                  <Separator className="my-1" />

                  <div className="mb-1">
                    <div className="text-muted-foreground flex items-center justify-between px-3 py-2 text-[0.6875rem] font-semibold tracking-wide uppercase">
                      <span>Catatan tanpa folder</span>
                      <span className="text-muted-foreground font-normal tabular-nums">
                        {ungroupedList.length}
                      </span>
                    </div>
                    {ungroupedList.length === 0 ? (
                      <p className="text-muted-foreground px-3 py-2 text-sm">
                        Belum ada catatan di luar folder
                      </p>
                    ) : (
                      ungroupedList.map((note) => renderNoteRow(note))
                    )}
                  </div>

                  {sharedNotes.length > 0 ? (
                    <div className="mt-2">
                      <div className="text-muted-foreground px-3 py-2 text-[0.6875rem] font-semibold tracking-wide uppercase">
                        Dibagikan ke saya
                      </div>
                      {sharedNotes.map((note) => renderNoteRow(note))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Right — editor */}
        <section className="bg-background flex min-w-0 flex-1 flex-col">
          {!openId ? (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <FileText className="h-12 w-12 opacity-30" />
              <p className="max-w-sm text-sm">
                Pilih catatan di daftar kiri, atau buat catatan baru untuk mulai
                menulis dengan Markdown.
              </p>
              <Button
                variant="outline"
                onClick={() => createNoteM.mutate()}
                disabled={createNoteM.isPending}
              >
                Catatan baru
              </Button>
            </div>
          ) : detailQ.isLoading ? (
            <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
              Memuat…
            </div>
          ) : n ? (
            <>
              <div className="border-border flex flex-shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2 md:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant={tab === "audit" ? "outline" : "default"}
                      onClick={() => setTab("editor")}
                    >
                      Editor
                    </Button>
                    <Button
                      size="sm"
                      variant={tab === "audit" ? "default" : "outline"}
                      onClick={() => setTab("audit")}
                    >
                      Audit
                    </Button>
                  </div>
                </div>
                {canEdit ? (
                  <>
                    <Separator orientation="vertical" className="mx-1 h-6" />
                    <div className="flex items-center gap-1">
                      {NOTE_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          title={c.label}
                          onClick={() => {
                            bumpNoteLocalEdit();
                            setEditColor(c.hex);
                          }}
                          className={cn(
                            "h-6 w-6 rounded-full border-2 shadow-sm transition-transform hover:scale-110",
                            editColor === c.hex
                              ? "border-primary ring-primary ring-2 ring-offset-1"
                              : "border-border",
                          )}
                          style={{
                            backgroundColor: c.hex,
                          }}
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => {
                        if (!openId) return;
                        bumpNoteLocalEdit();
                        patchPinM.mutate({
                          id: openId,
                          pinned: !editPinned,
                        });
                        setEditPinned(!editPinned);
                      }}
                    >
                      <Pin className="h-3.5 w-3.5" />
                      {editPinned ? "Lepas semat" : "Sematkan"}
                    </Button>
                    {isOwner ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => setShareOpen(true)}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Bagikan
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={() =>
                        saveNoteM.mutate({
                          ...buildSavePayload(),
                          silent: false,
                        })
                      }
                      disabled={saveNoteM.isPending}
                    >
                      Simpan
                    </Button>
                    {isOwner ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmDelNote(true)}
                      >
                        Hapus
                      </Button>
                    ) : null}
                  </>
                ) : null}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground ml-auto shrink-0"
                  title="Tutup catatan"
                  aria-label="Tutup catatan"
                  onClick={() => {
                    setOpenId(null);
                    setTab("editor");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {canEdit && tab === "editor" ? (
                <div className="text-muted-foreground border-border border-b px-4 py-1.5 text-[10px] leading-snug md:px-5">
                  Autosave ke server setiap {NOTE_AUTOSAVE_MS / 1000} detik jika
                  ada perubahan belum tersimpan dan Anda mengedit lagi dalam{" "}
                  {NOTE_AUTOSAVE_IDLE_MS / 60_000} menit terakhir; setelah{" "}
                  {NOTE_AUTOSAVE_IDLE_MS / 60_000} menit tanpa perubahan,
                  autosave dijeda sampai Anda mengedit lagi. Tombol
                  &quot;Simpan&quot; selalu bekerja dan tidak mengatur ulang
                  jadwal autosave. Cadangan lokal jika server gagal.
                </div>
              ) : null}

              {tab === "audit" ? (
                <ScrollArea className="min-h-0 flex-1">
                  <div className="p-4 md:p-6">
                    <div className="max-w-2xl space-y-2">
                      {auditQ.isLoading ? (
                        <p className="text-muted-foreground text-sm">
                          Memuat riwayat…
                        </p>
                      ) : (
                        auditQ.data?.map((a) => {
                          const actionLabel = auditActionLabel(a.action);
                          const contentPreview = getAuditContentPreview(a.diff);
                          const when = new Date(a.createdAt);
                          const whenFull = when.toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          });
                          return (
                            <div
                              key={a.id}
                              className="border-border rounded-lg border bg-muted/20 p-3 text-xs"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold leading-snug">
                                    {actionLabel}
                                  </p>
                                  {a.detail ? (
                                    <p className="text-muted-foreground mt-1 text-[11px] leading-snug">
                                      {a.detail}
                                    </p>
                                  ) : null}
                                </div>
                                <time
                                  className="text-muted-foreground shrink-0 text-[10px] leading-snug"
                                  dateTime={a.createdAt}
                                  title={whenFull}
                                >
                                  {formatRelativeTimeId(a.createdAt)}
                                </time>
                              </div>
                              <p className="text-muted-foreground mt-2 text-[10px]">
                                <span className="font-medium text-foreground/90">
                                  {a.userName}
                                </span>
                                <span className="mx-1">·</span>
                                <span title={whenFull}>{whenFull}</span>
                              </p>
                              {contentPreview ? (
                                <p className="border-border bg-background/70 text-muted-foreground mt-2 line-clamp-3 rounded-md border px-2.5 py-2 text-[11px] leading-relaxed">
                                  {contentPreview}
                                </p>
                              ) : null}
                              <AuditDiffPanel diff={a.diff} />
                            </div>
                          );
                        })
                      )}
                      {!auditQ.data?.length && !auditQ.isLoading ? (
                        <p className="text-muted-foreground text-sm">
                          Belum ada entri audit.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                /* Editor tab — always shown when not in audit */
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {canEdit && noteDraftOffer && (
                    <div className="border-border bg-amber-50/90 text-amber-950 flex flex-wrap items-center gap-2 border-b px-3 py-2 text-xs">
                      <span className="min-w-0 flex-1 leading-snug">
                        Ada cadangan lokal untuk catatan ini (misalnya saat
                        server tidak tersedia).
                      </span>
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 border-amber-300 bg-white text-xs"
                          onClick={() => {
                            const payload = noteDraftOffer;
                            setEditTitle(payload.title);
                            setEditFolderId(payload.folderId ?? "");
                            setEditPinned(payload.pinned);
                            setEditColor(payload.color ?? "#ffffff");
                            setEditTags((payload.tags ?? []).join(", "));
                            queueMicrotask(() =>
                              noteEditorRef.current?.setContent(
                                payload.content,
                              ),
                            );
                            lastSavedPayloadRef.current = serverBaselineStr;
                            safeClearDraft(personalNoteDraftKey(openId!));
                            setNoteDraftOffer(null);
                            bumpNoteLocalEdit();
                          }}
                        >
                          Pulihkan
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-amber-950"
                          onClick={() => {
                            safeClearDraft(personalNoteDraftKey(openId!));
                            setNoteDraftOffer(null);
                          }}
                        >
                          Abaikan
                        </Button>
                      </div>
                    </div>
                  )}
                  {canEdit && (
                    <div className="bg-muted/20 border-border flex shrink-0 flex-wrap items-end gap-3 border-b px-3 py-2 md:px-4">
                      <div className="min-w-0 flex-[2] basis-[200px] space-y-0.5">
                        <Label className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                          Judul
                        </Label>
                        <Input
                          value={editTitle}
                          onChange={(e) => {
                            bumpNoteLocalEdit();
                            setEditTitle(e.target.value);
                          }}
                          className="border-border h-9 text-base font-semibold shadow-none"
                          placeholder="Judul catatan"
                        />
                      </div>
                      <div className="min-w-[120px] flex-1 basis-[140px] space-y-0.5 md:max-w-[220px]">
                        <Label className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                          Tag
                        </Label>
                        <Input
                          value={editTags}
                          onChange={(e) => {
                            bumpNoteLocalEdit();
                            setEditTags(e.target.value);
                          }}
                          className="border-border h-9 shadow-none"
                          placeholder="koma, pisahkan"
                        />
                      </div>
                      {isOwner ? (
                        <div className="min-w-[140px] flex-1 basis-[160px] space-y-0.5 md:max-w-[200px]">
                          <Label className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                            Folder
                          </Label>
                          <Select
                            value={
                              !editFolderId || editFolderId === ""
                                ? "__none__"
                                : editFolderId
                            }
                            onValueChange={(v) => {
                              bumpNoteLocalEdit();
                              setEditFolderId(
                                !v || v === "__none__" ? "" : (v ?? ""),
                              );
                            }}
                            disabled={!foldersQ.isFetched}
                            items={noteFolderSelectItems}
                          >
                            <SelectTrigger className="border-border h-9 w-full shadow-none">
                              <SelectValue placeholder="Tanpa folder" />
                            </SelectTrigger>
                            <SelectContent>
                              {noteFolderSelectItems.map((it) => (
                                <SelectItem
                                  key={it.value}
                                  value={it.value}
                                  className={it.itemClassName}
                                >
                                  {it.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                      <div className="flex shrink-0 pb-0.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 gap-1"
                          onClick={handleExportHtml}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Ekspor
                        </Button>
                      </div>
                    </div>
                  )}

                  <NoteEditor
                    ref={noteEditorRef}
                    initialContent={editorInitialContent}
                    editable={canEdit}
                    onDocChange={canEdit ? bumpNoteLocalEdit : undefined}
                    ownerLine={
                      <span className="text-muted-foreground">
                        Pemilik: {n.owner.name}
                        {!isOwner && myShare
                          ? ` · Akses: ${myShare.permission}`
                          : null}
                      </span>
                    }
                  />
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>

      <AlertDialog open={confirmDelNote} onOpenChange={setConfirmDelNote}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus catatan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive"
              onClick={() => deleteNoteM.mutate()}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bagikan catatan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {isAdminOrPmRole(role) ? (
              usersQ.data ? (
                <div className="space-y-1">
                  <Label>Pengguna</Label>
                  <Select
                    value={shareUserId}
                    onValueChange={(v) => setShareUserId(v ?? "")}
                    items={shareUserSelectItems}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pengguna" />
                    </SelectTrigger>
                    <SelectContent>
                      {shareUserSelectItems.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Memuat daftar…</p>
              )
            ) : (
              <div className="space-y-1">
                <Label>ID pengguna</Label>
                <Input
                  placeholder="Tempel ID pengguna"
                  value={shareUserId}
                  onChange={(e) => setShareUserId(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Admin/PM dapat memilih dari daftar.
                </p>
              </div>
            )}
            <div className="space-y-1">
              <Label>Izin</Label>
              <Select
                value={sharePerm}
                onValueChange={(v) =>
                  setSharePerm(v === "EDIT" || v === "VIEW" ? v : "VIEW")
                }
                items={NOTE_SHARE_PERM_ITEMS}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_SHARE_PERM_ITEMS.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => shareM.mutate()}
              disabled={!shareUserId.trim() || shareM.isPending}
            >
              Bagikan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Folder baru</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nama folder"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newFolderName.trim()) {
                createFolderM.mutate(newFolderName.trim());
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                const name = newFolderName.trim();
                if (name) createFolderM.mutate(name);
              }}
              disabled={!newFolderName.trim() || createFolderM.isPending}
            >
              Buat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) resetImportDialog();
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Impor Catatan Markdown</DialogTitle>
            <DialogDescription>
              Unggah satu atau beberapa file .md. Catatan baru akan dibuat dari
              isi setiap file.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <FileDropZone
              busy={importNotesFromFilesM.isPending}
              onFiles={handleImportFilesSelected}
              accept={MARKDOWN_IMPORT_ACCEPT}
              multiple
              label="Seret file .md ke sini atau klik untuk memilih"
              hint="Hanya Markdown (.md) — bisa beberapa file sekaligus"
            />
            {pendingImportFiles.length > 0 ? (
              <div className="space-y-2">
                <p className="text-foreground text-xs font-medium">
                  Pratinjau ({pendingImportFiles.length} file)
                </p>
                <ul className="border-border divide-border max-h-40 divide-y overflow-y-auto rounded-md border">
                  {pendingImportFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                    >
                      <span className="text-foreground truncate font-medium">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        className="text-destructive hover:underline shrink-0"
                        disabled={importNotesFromFilesM.isPending}
                        onClick={() =>
                          setPendingImportFiles((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Hapus
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Button
              type="button"
              variant="link"
              className="text-muted-foreground h-auto justify-start p-0 text-xs"
              onClick={() => setImportGuideOpen(true)}
            >
              <Info className="mr-1 h-3.5 w-3.5" />
              Lihat panduan format &amp; langkah impor
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportOpen(false)}
              disabled={importNotesFromFilesM.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={confirmImportNotes}
              disabled={
                pendingImportFiles.length === 0 ||
                importNotesFromFilesM.isPending
              }
            >
              {importNotesFromFilesM.isPending
                ? "Mengimpor…"
                : pendingImportFiles.length > 1
                  ? `Impor ${pendingImportFiles.length} file`
                  : "Impor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importGuideOpen} onOpenChange={setImportGuideOpen}>
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Panduan Import</DialogTitle>
            <DialogDescription>
              Format Markdown yang didukung dan cara mengimpor catatan ke
              Personal Notes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <p className="text-foreground text-sm font-medium">
                Contoh template
              </p>
              <pre className="border-border bg-muted/40 max-h-48 overflow-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                {NOTE_IMPORT_TEMPLATE}
              </pre>
              <p className="text-muted-foreground text-xs">
                Frontmatter opsional. Jika <code>title</code> kosong, nama file
                dipakai sebagai judul catatan.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-foreground text-sm font-medium">
                Langkah impor
              </p>
              <ol className="text-muted-foreground list-decimal space-y-2 pl-5 text-sm">
                {NOTE_IMPORT_STEPS.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportGuideOpen(false)}>
              Tutup
            </Button>
            <Button
              onClick={() => {
                setImportGuideOpen(false);
                setImportOpen(true);
              }}
            >
              Mulai impor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
