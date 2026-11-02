/** Relatif singkat (ID), selaras UX notifikasi referensi. */
export function formatRelativeTimeId(iso: string | Date): string {
  const t = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Date.now() - t.getTime();
  if (diff < 60_000) return "baru saja";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} menit lalu`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} jam lalu`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} hari lalu`;
  return `${Math.floor(diff / 604_800_000)} minggu lalu`;
}
