import type { CSSProperties } from "react";

/** Path relatif `/uploads/...` atau URL absolut — sama seperti di project detail. */
export function bannerImageCssUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  if (!t) return null;
  if (t.startsWith("/")) {
    return `url(${JSON.stringify(t)})`;
  }
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `url(${JSON.stringify(u.href)})`;
  } catch {
    return null;
  }
}

const BANNER_IMAGE_OVERLAY_GRADIENT =
  "linear-gradient(115deg, rgba(15,23,42,0.88) 0%, rgba(15,23,42,0.55) 45%, rgba(15,23,42,0.72) 100%)";

/**
 * Banner permukaan (warna + gambar opsional) — dipakai project detail & kartu daftar
 * agar gambar yang sama tampil konsisten.
 */
export function projectBannerSurfaceStyle(
  coverColor: string,
  coverImageUrl: string | null | undefined,
): CSSProperties {
  const bannerColor = coverColor.trim() || "#2563eb";
  const imgCss = bannerImageCssUrl(coverImageUrl);
  if (!imgCss) {
    return { backgroundColor: bannerColor };
  }
  return {
    backgroundColor: bannerColor,
    backgroundImage: `${BANNER_IMAGE_OVERLAY_GRADIENT}, ${imgCss}`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };
}
