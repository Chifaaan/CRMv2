"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
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
  Minus,
  Quote,
  Strikethrough,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {children}
    </button>
  );
}

// ─── Public handle ─────────────────────────────────────────────────────────

export type NoteEditorHandle = {
  getHTML: () => string;
  setContent: (html: string) => void;
};

// ─── NoteEditor ────────────────────────────────────────────────────────────

export const NoteEditor = forwardRef<
  NoteEditorHandle,
  {
    initialContent: string;
    editable?: boolean;
    placeholder?: string;
    ownerLine?: React.ReactNode;
    /** Dipanggil saat isi dokumen berubah (ketikan/format); tidak dipanggil untuk setContent(emitUpdate:false). */
    onDocChange?: () => void;
  }
>(function NoteEditor(
  { initialContent, editable = true, placeholder, ownerLine, onDocChange },
  ref,
) {
  const onDocChangeRef = useRef(onDocChange);
  onDocChangeRef.current = onDocChange;

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: {},
        code: {},
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({
        placeholder:
          placeholder ??
          "Tulis isi catatan di sini. Gunakan toolbar untuk memformat teks.",
      }),
    ],
    content: initialContent || "",
    onUpdate: ({ transaction }) => {
      if (!transaction.docChanged) return;
      onDocChangeRef.current?.();
    },
    editorProps: {
      attributes: {
        class:
          "min-h-0 flex-1 overflow-y-auto px-4 py-3 outline-none " +
          "prose prose-sm max-w-none dark:prose-invert " +
          "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-3 " +
          "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-1.5 [&_h2]:mt-2.5 " +
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 " +
          "[&_p]:my-1 [&_p]:leading-relaxed " +
          "[&_ul]:my-1 [&_ul]:pl-5 [&_ul>li]:list-disc " +
          "[&_ol]:my-1 [&_ol]:pl-5 [&_ol>li]:list-decimal " +
          "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic " +
          "[&_code]:rounded [&_code]:bg-muted/80 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs " +
          "[&_pre]:rounded-md [&_pre]:bg-zinc-900 [&_pre]:p-3 [&_pre>code]:bg-transparent [&_pre>code]:text-zinc-100 [&_pre>code]:p-0 " +
          "[&_hr]:my-3 [&_hr]:border-border " +
          "[&_a]:text-primary [&_a]:underline",
      },
    },
  });

  useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() ?? "",
    setContent: (html: string) => {
      editor?.commands.setContent(html, { emitUpdate: false });
    },
  }));

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== initialContent) {
      editor.commands.setContent(initialContent || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      {editable && (
        <div className="bg-muted/30 border-border flex shrink-0 flex-wrap items-center gap-0.5 border-b px-2 py-1">
          <span className="text-muted-foreground mr-1 hidden text-[10px] font-semibold tracking-wide uppercase sm:inline">
            Format
          </span>
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
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="h-3.5 w-3.5" />
          </ToolbarBtn>
        </div>
      )}

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="min-h-0 flex-1 overflow-y-auto"
      />

      {/* Owner line */}
      {ownerLine && (
        <div className="border-border shrink-0 border-t px-3 py-1.5 text-[11px] md:px-4">
          {ownerLine}
        </div>
      )}
    </div>
  );
});
