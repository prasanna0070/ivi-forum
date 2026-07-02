/**
 * POST /api/auth/signup — { name, email, password }
 *   200 { ok: true }            account created (client then signs in)
 *   400 { ok: false, error }    validation failure
 *   403 { ok: false, error }    email domain not allowed
 *   409 { ok: false, error }    email already registered
 *
 * Passwords are bcrypt-hashed here (cost 10) — `createAuthUser` expects the
 * caller to hash. `ivi_auth` is never read outside this route and auth.ts.
 */
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { createAuthUser } from "@/lib/firestore";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
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

  // Optional domain gate: ALLOWED_EMAIL_DOMAINS=isb.edu,example.com
  const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (allowedDomains.length > 0) {
    const domain = emailStr.split("@")[1] ?? "";
    if (!allowedDomains.includes(domain)) {
      return bad(403, "Signups are limited to approved email domains.");
    }
  }

  const passwordHash = await hash(password, 10);
  const result = await createAuthUser({ name: nameStr, email: emailStr, passwordHash });

  if (!result.ok) {
    return bad(409, "An account with this email already exists.");
  }
  return NextResponse.json({ ok: true });
}
