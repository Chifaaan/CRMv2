import { cookies, headers } from "next/headers";
import {
  buildServerForwardHeaders,
  resolveServerRequestBase,
} from "@/lib/server-request-base";

export const serverJsonRequest = async <T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
) => {
  const hdrs = await headers();
  const base = resolveServerRequestBase(hdrs);
  const jar = await cookies();
  const forwardHeaders = buildServerForwardHeaders(hdrs);
  const cookieFromJar = jar
    .getAll()
    .map((cookie) => `${cookie.name}=${encodeURIComponent(cookie.value)}`)
    .join("; ");

  if (cookieFromJar) {
    forwardHeaders.set("cookie", cookieFromJar);
  }
  if (body !== undefined) {
    forwardHeaders.set("content-type", "application/json");
  }

  const response = await fetch(`${base}${path}`, {
    method,
    headers: forwardHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API ${path} ${response.status}`);
  }

  return response.json() as Promise<T>;
};
