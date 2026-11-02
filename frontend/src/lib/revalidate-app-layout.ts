/**
 * Ask the Next.js server to revalidate layout RSC after a mutation.
 * For browser-only (axios runs in the client bundle for app mutations).
 */
export function requestAppLayoutRevalidation(pathname?: string) {
  if (typeof window === "undefined") return;
  const path = pathname ?? window.location.pathname;
  void fetch("/api/revalidate/layout", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  }).catch(() => {
    // non-blocking; never break mutations
  });
}
