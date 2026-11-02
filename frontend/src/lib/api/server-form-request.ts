import { cookies, headers } from "next/headers";
import {
  buildServerForwardHeaders,
  resolveServerRequestBase,
} from "@/lib/server-request-base";

export const serverFormRequest = async <T>(path: string, body: FormData) => {
  const hdrs = await headers();
  const base = resolveServerRequestBase(hdrs);
  const jar = await cookies();
  const forwardHeaders = buildServerForwardHeaders(hdrs);
  const cookieFromJar = jar
    .getAll()
    .map((cookie) => `${cookie.name}=${encodeURIComponent(cookie.value)}`)
    .join("; ");
  if (cookieFromJar) forwardHeaders.set("cookie", cookieFromJar);
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: forwardHeaders,
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`API ${path} ${response.status}`);
  return response.json() as Promise<T>;
};
