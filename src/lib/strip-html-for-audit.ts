const HTML_TAG_RE = /<[a-z][\s\S]*>/i;
const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'TR',
  'BLOCKQUOTE',
  'PRE',
]);

/** Strip HTML for audit display (handles legacy rows stored with raw HTML). */
export function stripHtmlForAudit(raw: string | null | undefined): string {
  const input = raw ?? '';
  if (!input.trim()) return '(kosong)';
  if (!HTML_TAG_RE.test(input)) return normalizePlainAuditText(input);

  if (typeof DOMParser === 'undefined') {
    return normalizePlainAuditText(input.replace(/<[^>]+>/g, ' '));
  }

  const doc = new DOMParser().parseFromString(input, 'text/html');
  const lines: string[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.replace(/\u00a0/g, ' ') ?? '';
      if (text.trim()) lines.push(text.trim());
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    if (el.tagName === 'BR') {
      lines.push('');
      return;
    }

    for (const child of Array.from(el.childNodes)) walk(child);

    if (BLOCK_TAGS.has(el.tagName)) lines.push('');
  };

  walk(doc.body);
  return normalizePlainAuditText(lines.join('\n')) || '(kosong)';
}

function normalizePlainAuditText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Short preview for audit list entries. */
export function clipAuditPreview(raw: string, max = 240): string {
  const text = stripHtmlForAudit(raw);
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}
