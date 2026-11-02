import { NextRequest, NextResponse } from "next/server";

/**
 * Prototype mode: authentication is replaced by the local role switcher.
 * Keep this proxy as a pass-through so the existing SIMPRO routes can render
 * without a backend session.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next|uploads|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|otf|ico)$).*)",
  ],
};
