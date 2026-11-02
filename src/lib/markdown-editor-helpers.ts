/**
 * Operasi penyisipan Markdown pada textarea (posisi kursor / seleksi).
 */

function lineBounds(text: string, pos: number): [number, number] {
  const start = text.lastIndexOf("\n", pos - 1) + 1;
  const endIdx = text.indexOf("\n", pos);
  const end = endIdx === -1 ? text.length : endIdx;
  return [start, end];
}

function selectionLineBounds(text: string, selStart: number, selEnd: number): [number, number] {
  if (selStart === selEnd) {
    return lineBounds(text, selStart);
  }
  const [a] = lineBounds(text, selStart);
  const [, b] = lineBounds(text, Math.max(selStart, selEnd - 1));
  return [a, b];
}

export type PatchResult = { value: string; selStart: number; selEnd: number };

/**
 * Bungkus seleksi dengan prefix/suffix (bold, italic, dll).
 */
export function wrapSelection(
  text: string,
  selStart: number,
  selEnd: number,
  before: string,
  after: string,
  placeholderWhenEmpty: string,
): PatchResult {
  const selected = text.slice(selStart, selEnd);
  const inner = selected || placeholderWhenEmpty;
  const value =
    text.slice(0, selStart) + before + inner + after + text.slice(selEnd);
  const start = selStart + before.length;
  const end = start + inner.length;
  if (!selected) {
    return { value, selStart: start, selEnd: end };
  }
  return { value, selStart: start, selEnd: end };
}

/**
 * Sisipkan teks di posisi kursor.
 */
export function insertAtCursor(
  text: string,
  selStart: number,
  selEnd: number,
  insertion: string,
): PatchResult {
  const value = text.slice(0, selStart) + insertion + text.slice(selEnd);
  const pos = selStart + insertion.length;
  return { value, selStart: pos, selEnd: pos };
}

/**
 * Terapkan level heading (# .. ######) pada baris yang terlibat seleksi / kursor.
 */
export function setHeadingLevel(
  text: string,
  selStart: number,
  selEnd: number,
  level: 1 | 2 | 3,
): PatchResult {
  const [blockStart, blockEnd] =
    selStart === selEnd
      ? lineBounds(text, selStart)
      : selectionLineBounds(text, selStart, selEnd);
  const block = text.slice(blockStart, blockEnd);
  const lines = block.split("\n");
  const hashes = "#".repeat(level);
  const newLines = lines.map((line) => {
    const stripped = line.replace(/^#{1,6}\s+/, "");
    return `${hashes} ${stripped}`;
  });
  const newBlock = newLines.join("\n");
  const value = text.slice(0, blockStart) + newBlock + text.slice(blockEnd);
  return {
    value,
    selStart: blockStart,
    selEnd: blockStart + newBlock.length,
  };
}

/**
 * Tambah / hapus prefix daftar "- " per baris di blok seleksi.
 */
/** Hapus prefix daftar umum (-, *, 1.) di awal baris */
function stripListMarker(line: string): string {
  return line
    .replace(/^\s*-\s+/, "")
    .replace(/^\s*\*\s+/, "")
    .replace(/^\s*\d+\.\s+/, "");
}

function lineHasDashBullet(line: string): boolean {
  return /^\s*-\s+/.test(line);
}

/**
 * Toggle bullet Markdown `- ` per baris (bukan * / angka — distrip lalu diberi `- `).
 */
export function toggleBulletLines(
  text: string,
  selStart: number,
  selEnd: number,
): PatchResult {
  const [blockStart, blockEnd] = selectionLineBounds(text, selStart, selEnd);
  const block = text.slice(blockStart, blockEnd);
  const lines = block.split("\n");
  const nonEmpty = lines.filter((l) => l.length > 0);
  const allDashBullets =
    nonEmpty.length > 0 && nonEmpty.every((l) => lineHasDashBullet(l));
  const newLines = lines.map((line) => {
    if (line === "") return line;
    if (allDashBullets) {
      return line.replace(/^\s*-\s+/, "");
    }
    const body = stripListMarker(line);
    return `- ${body}`;
  });
  const newBlock = newLines.join("\n");
  const value = text.slice(0, blockStart) + newBlock + text.slice(blockEnd);
  return {
    value,
    selStart: blockStart,
    selEnd: blockStart + newBlock.length,
  };
}

/**
 * Toggle prefix per baris (blockquote: > ).
 */
export function toggleLinePrefix(
  text: string,
  selStart: number,
  selEnd: number,
  prefix: string,
  hasPrefix: (line: string) => boolean,
  stripPrefix: (line: string) => string,
): PatchResult {
  const [blockStart, blockEnd] = selectionLineBounds(text, selStart, selEnd);
  const block = text.slice(blockStart, blockEnd);
  const lines = block.split("\n");
  const allPrefixed = lines.every((l) => hasPrefix(l) || l === "");
  const newLines = lines.map((line) => {
    if (line === "") return line;
    if (allPrefixed) return stripPrefix(line);
    const stripped = stripPrefix(line);
    return `${prefix}${stripped}`;
  });
  const newBlock = newLines.join("\n");
  const value = text.slice(0, blockStart) + newBlock + text.slice(blockEnd);
  return {
    value,
    selStart: blockStart,
    selEnd: blockStart + newBlock.length,
  };
}

/**
 * Sisipkan garis horizontal di baris baru.
 */
export function insertHorizontalRule(
  text: string,
  selStart: number,
  selEnd: number,
): PatchResult {
  const prev = selStart > 0 ? text[selStart - 1] : "\n";
  const atLineStart = selStart === 0 || prev === "\n";
  const prefix = atLineStart ? "\n---\n\n" : "\n\n---\n\n";
  return insertAtCursor(text, selStart, selEnd, prefix);
}

/** Ekstensi/MIME yang diterima untuk impor catatan Personal Notes */
export const MARKDOWN_IMPORT_ACCEPT = ".md,.markdown,text/markdown";

const MARKDOWN_IMPORT_EXT_RE = /\.(md|markdown)$/i;

/** Cek apakah file berformat Markdown (.md / .markdown) */
export function isMarkdownImportFile(file: File): boolean {
  if (MARKDOWN_IMPORT_EXT_RE.test(file.name)) return true;
  const type = file.type.toLowerCase();
  return type === "text/markdown" || type === "text/x-markdown";
}

/** Pisahkan file valid vs ditolak saat impor catatan */
export function filterMarkdownImportFiles(files: File[]): {
  valid: File[];
  rejected: string[];
} {
  const valid: File[] = [];
  const rejected: string[] = [];
  for (const file of files) {
    if (isMarkdownImportFile(file)) {
      valid.push(file);
    } else {
      rejected.push(file.name);
    }
  }
  return { valid, rejected };
}

/** Parse frontmatter sederhana (title, tags) dari file .md impor */
export function parseImportedMarkdown(raw: string): {
  body: string;
  title?: string;
  tags?: string[];
} {
  const trimmed = raw.replace(/^\uFEFF/, "");
  const m = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) {
    return { body: trimmed };
  }
  const fm = m[1];
  const body = m[2].replace(/^\r?\n/, "");
  let title: string | undefined;
  const tags: string[] = [];
  for (const line of fm.split(/\r?\n/)) {
    const mTitle = line.match(/^title:\s*(.+)$/);
    if (mTitle) {
      let v = mTitle[1].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      title = v;
    }
    const mTags = line.match(/^tags:\s*(.+)$/);
    if (mTags) {
      const parts = mTags[1].split(",").map((t) => t.trim()).filter(Boolean);
      tags.push(...parts);
    }
  }
  return { body, title, tags: tags.length ? tags : undefined };
}

export function slugifyFilename(title: string): string {
  return (
    title
      .trim()
      .slice(0, 80)
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase() || "catatan"
  );
}
