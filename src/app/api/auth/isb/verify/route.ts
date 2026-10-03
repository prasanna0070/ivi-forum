/**
 * POST /api/auth/isb/verify — { email, code }   (step 2, second half)
 *   200 { ok: true, next }      mailbox proven; Google account linked → go to `next`
 *   400 { ok: false, error }    wrong / expired code
 *   401 { ok: false, error }    not signed in with Google
 *   429 { ok: false, error }    too many wrong guesses
 *
 * Consumes the code from /api/auth/otp/request and links the signed-in Google
 * account to the member who owns that ISB mailbox (creating the member if new).
 * The session picks the link up on its next read (see the jwt callback), so the
 * client just navigates to `next`.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMember, linkGoogleAccount, verifyOtp } from "@/lib/firestore";

function bad(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

const ERRORS = {
  invalid: [400, "That code isn't right. Check it and try again."],
  expired: [400, "That code has expired. Ask for a new one."],
  not_found: [400, "Ask for a code first."],
  too_many: [429, "Too many tries. Ask for a new code."],
} as const;

export async function POST(req: Request) {
  const session = await auth();
  const sub = session?.user?.googleSub;
  if (!sub) return bad(401, "Sign in with Google first.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad(400, "Request body must be JSON.");
  }
  const { email, code } = (body ?? {}) as Record<string, unknown>;
  const emailStr = typeof email === "string" ? email.trim().toLowerCase() : "";
  const codeStr = typeof code === "string" ? code.trim() : "";
  if (!emailStr || !/^\d{6}$/.test(codeStr)) {
    return bad(400, "Enter the 6-digit code from the email.");
  }

  const result = await verifyOtp({ email: emailStr, code: codeStr });
  if (!result.ok) {
    const [status, error] = ERRORS[result.error];
    return bad(status, error);
  }

  const { uid } = await linkGoogleAccount({
    sub,
    googleEmail: session.user.googleEmail ?? "",
    isbEmail: result.email,
    name: session.user.name || result.name,
  });
  const member = await getMember(uid).catch(() => null);
  return NextResponse.json({
    ok: true,
    next: member?.profileComplete ? "/directory" : "/onboarding",
  });
}
