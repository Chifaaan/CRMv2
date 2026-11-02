"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  Loader2,
  Minus,
  Quote,
  Strikethrough,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  meetingNotulensiDraftKey,
  safeClearDraft,
  safeReadDraftJson,
  safeWriteDraft,
} from "@/lib/local-draft";

const AUTOSAVE_MS = 30_000;
/** Tanpa edit lokal selama ini → autosave ke server dijeda (hemat beban). */
const AUTOSAVE_IDLE_MS = 60_000;

// ─── Toolbar button ────────────────────────────────────────────────────────

function ToolbarBtn({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault(); // prevent editor losing focus
        onClick();
      }}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors",
        active
          ? "bg-zinc-200 text-zinc-900"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {children}
    </button>
  );
}

// ─── Main editor component ─────────────────────────────────────────────────

export function NotulensiEditor({
  meetingId,
  initialContent,
  saving,
  onSave,
  autosaveEnabled = true,
}: {
  meetingId: string;
  /** HTML string — synced when the meeting loads or server copy updates. */
  initialContent: string;
  saving: boolean;
  onSave: (html: string, opts?: { silent?: boolean }) => void;
  autosaveEnabled?: boolean;
}) {
  const baselineRef = useRef("");
  const serverSnapshotRef = useRef(initialContent);
  const editorRef = useRef<Editor | null>(null);
  const onSaveRef = useRef(onSave);
  const savingRef = useRef(saving);
  const lastLocalEditAtRef = useRef(Date.now());
  const [localDraftHtml, setLocalDraftHtml] = useState<string | null>(null);

  onSaveRef.current = onSave;
  savingRef.current = saving;

  useEffect(() => {
    serverSnapshotRef.current = initialContent;
  }, [initialContent]);

  useEffect(() => {
    lastLocalEditAtRef.current = Date.now();
  }, [meetingId]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Keep default extensions; heading levels 1-3 only
        heading: { levels: [1, 2, 3] },
        // CodeBlock uses basic backtick code blocks
        codeBlock: {},
        code: {},
        // HorizontalRule included in starter kit
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-blue-600 underline cursor-pointer",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({
        placeholder: "Tulis notulensi di sini…",
      }),
    ],
    content: initialContent || "",
    onUpdate: ({ transaction }) => {
      if (!transaction.docChanged) return;
      lastLocalEditAtRef.current = Date.now();
    },
    editorProps: {
      attributes: {
        class:
          "min-h-0 flex-1 overflow-y-auto px-4 py-3 outline-none " +
          "prose prose-sm max-w-none " +
          // Override prose defaults that don't look good in a small editor
          "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-3 " +
          "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-1.5 [&_h2]:mt-2.5 " +
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 " +
          "[&_p]:my-1 [&_p]:leading-relaxed " +
          "[&_ul]:my-1 [&_ul]:pl-5 [&_ul>li]:list-disc " +
          "[&_ol]:my-1 [&_ol]:pl-5 [&_ol>li]:list-decimal " +
          "[&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-600 [&_blockquote]:italic " +
          "[&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-zinc-800 " +
          "[&_pre]:rounded-md [&_pre]:bg-zinc-900 [&_pre]:p-3 [&_pre>code]:bg-transparent [&_pre>code]:text-zinc-100 [&_pre>code]:p-0 " +
          "[&_hr]:my-3 [&_hr]:border-zinc-200 " +
          "[&_a]:text-blue-600 [&_a]:underline",
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Sync server HTML and baseline (meeting change or cache update after save)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== initialContent) {
      editor.commands.setContent(initialContent || "", { emitUpdate: false });
    }
    baselineRef.current = editor.getHTML();
  }, [initialContent, editor, meetingId]);

  // Local draft recovery (e.g. after failed sync)
  useEffect(() => {
    if (!meetingId || !autosaveEnabled) {
      setLocalDraftHtml(null);
      return;
    }
    const key = meetingNotulensiDraftKey(meetingId);
    const parsed = safeReadDraftJson<{ html?: string }>(
      typeof localStorage !== "undefined" ? localStorage.getItem(key) : null,
    );
    if (!parsed?.html || parsed.html === initialContent) {
      setLocalDraftHtml(null);
      return;
    }
    setLocalDraftHtml(parsed.html);
  }, [meetingId, autosaveEnabled, initialContent]);

  // Interval autosave (+ local draft on dirty only). Deps deliberately exclude
  // `editor` / saving state so manual "Simpan" does not reset the 30s clock.
  useEffect(() => {
    if (!autosaveEnabled || !meetingId) return;
    const key = meetingNotulensiDraftKey(meetingId);
    const tick = () => {
      const ed = editorRef.current;
      if (!ed) return;
      const html = ed.getHTML();
      if (html === baselineRef.current) return;
      if (Date.now() - lastLocalEditAtRef.current > AUTOSAVE_IDLE_MS) return;
      safeWriteDraft(key, { html, at: Date.now() });
      if (savingRef.current) return;
      onSaveRef.current(html, { silent: true });
    };
    const id = window.setInterval(tick, AUTOSAVE_MS);
    return () => clearInterval(id);
  }, [autosaveEnabled, meetingId]);

  useEffect(() => {
    if (!autosaveEnabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      const ed = editorRef.current;
      if (!ed || ed.getHTML() === baselineRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [autosaveEnabled]);

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL tautan:", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  }

  if (!editor) return null;

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
      {localDraftHtml ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <span className="min-w-0 flex-1 leading-snug">
            Ada cadangan lokal (misalnya saat server tidak tersedia). Anda bisa
            memulihkannya ke editor.
          </span>
          <div className="flex shrink-0 gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 border-amber-300 bg-white text-xs"
              onClick={() => {
                editor.commands.setContent(localDraftHtml, {
                  emitUpdate: false,
                });
                baselineRef.current = serverSnapshotRef.current;
                safeClearDraft(meetingNotulensiDraftKey(meetingId));
                setLocalDraftHtml(null);
                lastLocalEditAtRef.current = Date.now();
              }}
            >
              Pulihkan
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-amber-900"
              onClick={() => {
                safeClearDraft(meetingNotulensiDraftKey(meetingId));
                setLocalDraftHtml(null);
              }}
            >
              Abaikan
            </Button>
          </div>
        </div>
      ) : null}
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5">
        <ToolbarBtn
          title="Tebal (Ctrl+B)"
          active={isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Miring (Ctrl+I)"
          active={isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Coret"
          active={isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        <ToolbarBtn
          title="Heading 1"
          active={isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Heading 2"
          active={isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Heading 3"
          active={isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        <ToolbarBtn
          title="Daftar bullet"
          active={isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Kutipan"
          active={isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Kode satu baris"
          active={isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Blok kode"
          active={isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Tautan"
          active={isActive("link")}
          onClick={setLink}
        >
          <Link2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Garis pemisah"
          onClick={() =>
            editor.chain().focus().setHorizontalRule().run()
          }
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="min-h-0 flex-1 overflow-y-auto"
      />

      {/* Footer: save button */}
      <div className="shrink-0 border-t border-zinc-100 bg-zinc-50/50 px-3 py-2">
        <p className="mb-2 text-[10px] leading-snug text-zinc-500">
          Autosave ke server setiap {AUTOSAVE_MS / 1000} detik jika ada perubahan
          belum tersimpan dan Anda mengedit lagi dalam {AUTOSAVE_IDLE_MS / 60_000}{" "}
          menit terakhir; setelah {AUTOSAVE_IDLE_MS / 60_000} menit tanpa
          perubahan, autosave dijeda sampai Anda mengedit lagi. Tombol
          &quot;Simpan notulensi&quot; selalu bekerja dan tidak mengatur ulang
          jadwal autosave. Cadangan lokal jika server gagal.
        </p>
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={() => onSave(editor.getHTML())}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Menyimpan…
            </>
          ) : (
            "Simpan notulensi"
          )}
        </Button>
      </div>
    </div>
  );
}
