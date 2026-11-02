/**
 * Normalisasi URL/ path lampiran tugas: `/uploads/...` atau http(s).
 * Mengembalikan null jika tidak valid.
 */
export function normalizeAttachmentUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    if (t.startsWith("/")) {
      return t.startsWith("/uploads/") ? t : null;
    }
    const withProto = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(t) ? t : `https://${t}`;
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function toDownloadUrl(url: string): string {
  if (url.startsWith("/uploads/")) {
    const withoutPrefix = url.slice("/uploads/".length);
    return `/api/upload/file/${withoutPrefix}`;
  }
  return url;
}

/** Label bawaan untuk tautan eksternal atau nama berkas dari path unggah. */
export function defaultLinkAttachmentLabel(url: string): string {
  try {
    if (url.startsWith("/")) {
      const seg = url.split("/").filter(Boolean).pop();
      return seg || "Berkas";
    }
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, "");
    return host || u.pathname || "Tautan";
  } catch {
    return "Tautan";
  }
}
