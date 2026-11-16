import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

/**
 * Passcode gate (Phase 8, L35). Next 16 renamed middleware → proxy.
 * Pages without a session redirect to /login; API calls and Server Action
 * POSTs get a 401. No-op when APP_PASSCODE isn't set.
 */
export async function proxy(request: NextRequest) {
  if (await isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  const wantsPage = request.method === "GET" && (request.headers.get("accept") ?? "").includes("text/html");
  if (wantsPage) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.json({ error: "Locked — enter your passcode." }, { status: 401 });
}

export const config = {
  matcher: [
    // Everything EXCEPT: static assets, PWA files (manifest, SW, icons — the
    // install flow fetches them unauthenticated), the login page, and the two
    // cron routes, which carry their own CRON_SECRET bearer.
    "/((?!_next/static|_next/image|favicon\\.ico|icon|apple-icon|badge\\.png|manifest\\.json|sw\\.js|login|api/cron|api/push/test).*)",
  ],
};
