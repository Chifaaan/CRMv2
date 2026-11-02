import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";

const PATH_MAX = 512;

function safePathname(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/")) return null;
  if (raw.length > PATH_MAX) return null;
  if (raw.includes("\0") || /[\n\r]/.test(raw)) return null;
  return raw;
}

/**
 * Revalidates the root and app layout tree after a client-side mutation
 * (API calls are proxied to the Nest backend, so mutations never hit a Next
 * server handler unless we call this route explicitly).
 */
export async function POST(request: Request) {
  const { data: session } = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let pathname = "/dashboard";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "path" in body) {
      const p = safePathname((body as { path: unknown }).path);
      if (p) pathname = p;
    }
  } catch {
    // empty body
  }

  revalidatePath("/", "layout");
  revalidatePath(pathname, "layout");

  return NextResponse.json({ ok: true });
}
