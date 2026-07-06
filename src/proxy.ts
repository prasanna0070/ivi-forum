/**
 * Route protection (Next 16 renamed `middleware.ts` → `proxy.ts`).
 *
 * Optimistic check only: verifies the NextAuth JWT session cookie with
 * `getToken` (jose — edge-safe, no Node/Firestore deps). Every protected API
 * handler re-verifies for real via `requireUserApi()` / `requireUser()`, so
 * this layer just keeps signed-out users off member pages and APIs.
 *
 * Do NOT import `@/auth` or `@/lib/firestore` here — they pull Node-only
 * dependencies into the proxy bundle.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

async function hasSession(req: NextRequest): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false; // fail closed; handlers re-verify anyway

  const secure = req.nextUrl.protocol === "https:";
  // Cookie name differs between http (authjs.session-token) and https
  // (__Secure-authjs.session-token) — try the likely one first, then the other.
  const token =
    (await getToken({ req, secret, secureCookie: secure })) ??
    (await getToken({ req, secret, secureCookie: !secure }));
  return token !== null;
}

export async function proxy(req: NextRequest) {
  if (await hasSession(req)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Unauthenticated." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  // `:path*` matches zero or more segments, so `/directory` itself is covered.
  matcher: [
    "/directory/:path*",
    "/forum/:path*",
    "/onboarding/:path*",
    "/profile/:path*",
    "/api/scrape/:path*",
    "/api/profile/:path*",
    "/api/topics/:path*",
    "/api/votes/:path*",
    "/api/uploads/:path*",
  ],
};
