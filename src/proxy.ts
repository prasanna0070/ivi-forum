/**
 * Canonical host + route protection (Next 16 renamed `middleware.ts` →
 * `proxy.ts`).
 *
 * Canonical host: Cloud Run answers on two hostnames (the readable
 * `ivi-forum-<project-number>.asia-south1.run.app` and the legacy hashed
 * `ivi-forum-<hash>-el.a.run.app`). Google sign-in only works on the host in
 * AUTH_URL (its callback and cookies live there), so every request on any
 * other host is redirected to it, keeping the path.
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

const PROTECTED = [
  "/directory",
  "/forum",
  "/onboarding",
  "/profile",
  "/api/scrape",
  "/api/profile",
  "/api/members",
  "/api/topics",
  "/api/votes",
  "/api/uploads",
];

function canonicalRedirect(req: NextRequest): NextResponse | null {
  const authUrl = process.env.AUTH_URL;
  if (!authUrl) return null;
  let canonical: URL;
  try {
    canonical = new URL(authUrl);
  } catch {
    return null;
  }
  // Only the other PUBLIC Cloud Run hostname is redirected. Internal requests
  // (e.g. the next/image optimizer fetching /brand/*.png from this same server
  // under a container-local host) must pass through untouched, or the
  // optimizer receives a redirect instead of the image and every logo breaks.
  const host = req.headers.get("host") ?? req.nextUrl.host;
  if (!host || host === canonical.host || !host.endsWith(".run.app")) return null;
  const target = new URL(req.nextUrl.pathname + req.nextUrl.search, canonical.origin);
  return NextResponse.redirect(target, 308);
}

export async function proxy(req: NextRequest) {
  const redirect = canonicalRedirect(req);
  if (redirect) return redirect;

  const path = req.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));
  if (!isProtected || (await hasSession(req))) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Unauthenticated." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  // Every page and API route (for the canonical-host redirect); static build
  // assets are skipped. Protection is decided by PROTECTED above.
  // /brand/ is the public logos + photos folder. Uploaded images under
  // /api/uploads stay matched: they rely on the session check below.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/).*)"],
};
