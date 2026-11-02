/**
 * Public base URL for SSR fetches to this Next app (`/api/*` rewrites to Nest).
 * Fixes reverse proxies that set `X-Forwarded-Proto: http` behind TLS termination.
 */
export function resolveServerRequestBase(hdrs: Headers): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const hostRaw = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const host = hostRaw?.split(",")[0]?.trim();

  if (configured && host) {
    try {
      if (new URL(configured).host === host) {
        return configured;
      }
    } catch {
      /* fall through */
    }
  }

  if (configured && !host) {
    return configured;
  }

  const proto = resolveRequestProto(hdrs, configured);
  if (host) {
    return `${proto}://${host}`;
  }

  return (
    configured ??
    (process.env.PORT
      ? `http://localhost:${process.env.PORT}`
      : "http://localhost:3000")
  );
}

/** Prefer HTTPS when the public app URL is HTTPS, even if the proxy sends `http`. */
export function resolveRequestProto(
  hdrs: Headers,
  configuredPublicUrl?: string,
): "http" | "https" {
  const configured = configuredPublicUrl ?? process.env.NEXT_PUBLIC_APP_URL;
  const forwarded = hdrs
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwarded === "https") return "https";
  if (forwarded === "http") {
    if (configured?.startsWith("https://")) return "https";
    if (process.env.FORCE_HTTPS === "true" || process.env.FORCE_HTTPS === "1") {
      return "https";
    }
    const host = (
      hdrs.get("x-forwarded-host") ??
      hdrs.get("host") ??
      ""
    ).toLowerCase();
    if (
      host &&
      !host.includes("localhost") &&
      !host.startsWith("127.0.0.1")
    ) {
      return "https";
    }
    return "http";
  }

  if (configured?.startsWith("https://")) return "https";
  return "http";
}

/** Headers to forward from the incoming request for SSR API/auth calls. */
export function buildServerForwardHeaders(hdrs: Headers): Headers {
  const out = new Headers();

  for (const name of [
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-forwarded-for",
    "host",
    "origin",
    "referer",
  ] as const) {
    const value = hdrs.get(name);
    if (value) out.set(name, value);
  }

  const base = resolveServerRequestBase(hdrs);
  if (base.startsWith("https://")) {
    out.set("x-forwarded-proto", "https");
  }

  return out;
}
