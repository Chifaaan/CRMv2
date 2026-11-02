export type SortDirection = "asc" | "desc";

/** Next sort when clicking a column header: first click asc, toggle on same column. */
export function toggleColumnSort(
  currentKey: string,
  currentDir: SortDirection,
  clickedKey: string,
): { key: string; dir: SortDirection } {
  if (currentKey !== clickedKey) return { key: clickedKey, dir: "asc" };
  return { key: clickedKey, dir: currentDir === "asc" ? "desc" : "asc" };
}

export function cmpOptionalStringDir(
  a: string | null | undefined,
  b: string | null | undefined,
  dir: SortDirection,
): number {
  const as = (a ?? "").toLocaleLowerCase();
  const bs = (b ?? "").toLocaleLowerCase();
  const c = as.localeCompare(bs, undefined, { sensitivity: "base" });
  return dir === "asc" ? c : -c;
}

export function cmpOptionalDateDir(
  a: string | null | undefined,
  b: string | null | undefined,
  dir: SortDirection,
): number {
  const ta = a ? new Date(a).getTime() : NaN;
  const tb = b ? new Date(b).getTime() : NaN;
  const va = Number.isNaN(ta) ? null : ta;
  const vb = Number.isNaN(tb) ? null : tb;
  if (va == null && vb == null) return 0;
  if (va == null) return dir === "asc" ? 1 : -1;
  if (vb == null) return dir === "asc" ? -1 : 1;
  const raw = va - vb;
  return dir === "asc" ? raw : -raw;
}
