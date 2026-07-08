/**
 * POST /api/auth/otp/request — { name?, email }
 *   200 { ok: true }            code emailed
 *   400 { ok: false, error }    invalid email
 *   403 { ok: false, error }    email not allowed (non-ISB)
 *   429 { ok: false, error }    rate limited
 *   502 { ok: false, error }    email send failed
 *   503 { ok: false, error }    OTP not configured (no Resend API key)
 *
 * Gates to ISB emails, mints a 6-digit code (hashed in Firestore), emails it.
 * Verification happens through the NextAuth "otp" provider.
 */
import { NextResponse } from "next/server";
import { isEmailAllowed } from "@/lib/access";
import { startOtp } from "@/lib/firestore";
import { sendOtpEmail, emailConfigured } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  if (!emailConfigured) {
    return bad(503, "Email sign-in isn't set up yet.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad(400, "Request body must be JSON.");
  }

  const { name, email } = (body ?? {}) as Record<string, unknown>;
  const emailStr = typeof email === "string" ? email.trim().toLowerCase() : "";
  const nameStr = typeof name === "string" ? name.trim().slice(0, 80) : "";

  if (!EMAIL_RE.test(emailStr)) {
    return bad(400, "Please enter a valid email address.");
  }
  if (!isEmailAllowed(emailStr)) {
    return bad(403, "Only ISB (@isb.edu) email addresses can join right now.");
  }

  const res = await startOtp({ email: emailStr, name: nameStr });
  if (!res.ok) {
    return bad(429, `Please wait ${res.retryAfterSec}s before requesting another code.`);
  }

  try {
    await sendOtpEmail(emailStr, res.code);
  } catch (err) {
    console.error("OTP email send failed:", err);
    return bad(502, "Couldn't send the code — please try again in a moment.");
  }

  return NextResponse.json({ ok: true });
}
