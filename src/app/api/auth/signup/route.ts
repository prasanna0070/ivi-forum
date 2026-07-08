/**
 * POST /api/auth/signup — { name, email, password }
 *   200 { ok: true }            account created (client then signs in)
 *   400 { ok: false, error }    validation failure
 *   403 { ok: false, error }    email domain not allowed
 *   409 { ok: false, error }    email already registered
 *   429 { ok: false, error }    too many attempts from this IP
 *
 * Passwords are bcrypt-hashed here (cost 10) — `createAuthUser` expects the
 * caller to hash. `ivi_auth` is never read outside this route and auth.ts.
 *
 * The 409-vs-200 split is deliberate signup UX, but it also tells an
 * unauthenticated caller whether an email has an account — so the route is
 * rate-limited per IP to keep bulk enumeration of @isb.edu addresses
 * impractical. The limit is in-memory (per Cloud Run instance): imperfect
 * across instances, but real users need 1–2 attempts and the window is
 * generous enough for a shared campus NAT.
 */
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { createAuthUser } from "@/lib/firestore";
import { isEmailAllowed } from "@/lib/access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --- Per-IP rate limit (anti-enumeration) ----------------------------------

const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_MAX_ATTEMPTS = 15; // per IP per window

const attemptsByIp = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  // Opportunistic cleanup so the map can't grow unbounded on a long-lived
  // instance.
  if (attemptsByIp.size > 500) {
    for (const [key, times] of attemptsByIp) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) attemptsByIp.delete(key);
    }
  }
  const recent = (attemptsByIp.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_ATTEMPTS) {
    attemptsByIp.set(ip, recent);
    return true;
  }
  recent.push(now);
  attemptsByIp.set(ip, recent);
  return false;
}

/** Client IP: first hop of X-Forwarded-For (set by Cloud Run's front end). */
function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() || "unknown";
}

function bad(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  if (rateLimited(clientIp(req))) {
    return bad(429, "Too many sign-up attempts — please try again in a few minutes.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad(400, "Request body must be JSON.");
  }

  const { name, email, password } = (body ?? {}) as Record<string, unknown>;

  const nameStr = typeof name === "string" ? name.trim() : "";
  if (!nameStr) return bad(400, "Please enter your name.");
  if (nameStr.length > 80) return bad(400, "Name must be 80 characters or fewer.");

  const emailStr = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(emailStr)) return bad(400, "Please enter a valid email address.");

  if (typeof password !== "string" || password.length < 8) {
    return bad(400, "Password must be at least 8 characters.");
  }

  // Membership gate (shared with OTP sign-in): ALLOWED_EMAIL_DOMAINS +
  // ALLOWED_EMAILS. Unconfigured = open. isb.edu covers @ivi.isb.edu etc.
  if (!isEmailAllowed(emailStr)) {
    return bad(403, "Sign-ups are limited to ISB (@isb.edu) email addresses.");
  }

  const passwordHash = await hash(password, 10);
  const result = await createAuthUser({ name: nameStr, email: emailStr, passwordHash });

  if (!result.ok) {
    return bad(409, "An account with this email already exists.");
  }
  return NextResponse.json({ ok: true });
}
