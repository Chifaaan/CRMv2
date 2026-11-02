import { cookies, headers } from "next/headers";
import { authClient } from "./auth-client";
import { buildServerForwardHeaders } from "./server-request-base";

export async function getServerSession() {
  const hdrs = await headers();
  const forwardHeaders = buildServerForwardHeaders(hdrs);

  const jar = await cookies();
  const cookieFromJar = jar
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join("; ");
  if (cookieFromJar) {
    forwardHeaders.set("cookie", cookieFromJar);
  }

  return authClient.getSession({
    fetchOptions: { headers: forwardHeaders },
  });
}
