import { cookies, headers } from "next/headers";
import {
  buildServerForwardHeaders,
  resolveServerRequestBase,
} from "@/lib/server-request-base";

/**
 * Server-side fetch to the app’s own `/api/*` routes (rewritten to Nest).
 * Uses `NEXT_PUBLIC_APP_URL` when host matches (correct HTTPS behind misconfigured proxies).
 */
export async function serverFetch<T>(path: string): Promise<T> {
  const hdrs = await headers();
  const base = resolveServerRequestBase(hdrs);

  const jar = await cookies();
  const cookieFromJar = jar
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join("; ");

  const forwardHeaders = buildServerForwardHeaders(hdrs);
  if (cookieFromJar) {
    forwardHeaders.set("cookie", cookieFromJar);
  }

  const res = await fetch(`${base}${path}`, {
    headers: forwardHeaders,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API ${path} ${res.status}`);
  }
  return res.json() as Promise<T>;
}
