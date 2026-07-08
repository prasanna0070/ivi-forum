/**
 * Transactional email via Resend (https://resend.com) — plain REST, no SDK.
 *
 * Env:
 *   RESEND_API_KEY — Secret Manager `ivi-forum-resend-api-key` on Cloud Run.
 *                    The sending domain (isb.quarktex.com) is verified on the
 *                    same Resend account used by the ISB class-summary app.
 *   EMAIL_FROM     — sender, e.g. `iVi Forum <forum@isb.quarktex.com>`. Must
 *                    be on a Resend-verified domain. Optional (has a default).
 *
 * `emailConfigured` reflects whether the key is present — OTP sign-in and all
 * notification emails stay dormant until it is, so the app never offers a code
 * it can't send. Without the key, sends are logged to the server console
 * instead (local dev). Server-only.
 */
import { otpEmail } from "@/lib/emailTemplates";

export const emailConfigured = Boolean(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "iVi Forum <forum@isb.quarktex.com>";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Absolute origin for links inside emails (no trailing slash). */
export function appUrl(): string {
  return (process.env.AUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Extra SMTP headers, e.g. List-Unsubscribe for one-click unsubscribe. */
  headers?: Record<string, string>;
}

/** Resend's default plan allows 2 requests/second — pace everything to that. */
const RATE_LIMIT_PER_SECOND = 2;
const RATE_LIMIT_MAX_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send one email via Resend. Throws on failure (callers that must not fail —
 * notification fan-out — go through `sendEmails`, which swallows per-recipient
 * errors). A 429 (rate limited) is retried a couple of times, honoring the
 * Retry-After header, so a concurrent fan-out can't starve an OTP send.
 * When no API key is configured, logs the send and returns.
 */
export async function sendEmail(msg: OutgoingEmail): Promise<void> {
  if (!emailConfigured) {
    console.log(`[email] not configured — would send "${msg.subject}" to ${msg.to}`);
    return;
  }
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(msg.headers ? { headers: msg.headers } : {}),
      }),
    });
    if (res.ok) return;
    if (res.status === 429 && attempt < RATE_LIMIT_MAX_RETRIES) {
      const retryAfterSec = Number(res.headers.get("retry-after"));
      const waitMs =
        Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? Math.min(retryAfterSec, 10) * 1000
          : 1000 * (attempt + 1);
      await sleep(waitMs);
      continue;
    }
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}

/**
 * Best-effort fan-out: sends every message, paced to Resend's rate limit
 * (RATE_LIMIT_PER_SECOND at a time, 1s between waves — bursting past it 429s
 * most of the batch and members silently miss notifications), and never
 * throws. Failures are logged with the recipient so they're diagnosable from
 * Cloud Run logs. Fine at cohort scale (dozens of members ≈ a few seconds,
 * awaited before the posting response); if the community ever grows past a
 * few hundred, move this behind Cloud Tasks instead.
 */
export async function sendEmails(
  msgs: OutgoingEmail[],
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < msgs.length; i += RATE_LIMIT_PER_SECOND) {
    if (i > 0) await sleep(1000);
    const results = await Promise.allSettled(
      msgs.slice(i, i + RATE_LIMIT_PER_SECOND).map((m) => sendEmail(m)),
    );
    results.forEach((r, j) => {
      if (r.status === "fulfilled") {
        sent += 1;
      } else {
        failed += 1;
        console.error(`[email] send to ${msgs[i + j].to} failed:`, r.reason);
      }
    });
  }
  return { sent, failed };
}

/** Send the 6-digit sign-in code (OTP request route). */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const content = otpEmail({ code });
  await sendEmail({ to, ...content });
}
