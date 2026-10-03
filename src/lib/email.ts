/**
 * Transactional email. Two transports, picked by which secrets are present:
 *
 *  1. Gmail SMTP (primary) — nodemailer over smtp.gmail.com:587, signed in as
 *     the cohort mailbox with a Gmail app password. Mail from a real Gmail
 *     account lands in ISB's Microsoft 365 inboxes where Resend mail from
 *     isb.quarktex.com was being quarantined; the IVI valedictorian nomination
 *     app proved this path on the same tenant.
 *  2. Resend REST (fallback) — used only when SMTP is not configured.
 *
 * Env:
 *   SMTP_USER      — Gmail address, e.g. isbivico4@gmail.com.
 *   SMTP_PASS      — its 16-char Gmail app password. Secret Manager
 *                    `ivi-forum-smtp-pass` on Cloud Run.
 *   RESEND_API_KEY — Secret Manager `ivi-forum-resend-api-key` (fallback only).
 *   EMAIL_FROM     — sender display. With SMTP it must use the SMTP_USER
 *                    address (Gmail rewrites any other From); defaults to
 *                    `iVi Forum <SMTP_USER>`. With Resend it must be on a
 *                    Resend-verified domain.
 *   EMAIL_REPLY_TO — optional Reply-To. Point it at a mailbox a human actually
 *                    reads: mail that can be replied to scores better with
 *                    Microsoft EOP than a dead no-reply sender, and a member
 *                    who can just hit reply is a member who doesn't hit
 *                    "report phishing". Unset = no header.
 *
 * `emailConfigured` reflects whether either transport is present — OTP sign-in
 * and all notification emails stay dormant until one is, so the app never
 * offers a code it can't send. Without either, sends are logged to the server
 * console instead (local dev). Server-only.
 */
import nodemailer from "nodemailer";
import { otpEmail } from "@/lib/emailTemplates";

const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const smtpConfigured = Boolean(SMTP_USER && SMTP_PASS);
const resendConfigured = Boolean(process.env.RESEND_API_KEY);

export const emailConfigured = smtpConfigured || resendConfigured;

const FROM =
  process.env.EMAIL_FROM ||
  (smtpConfigured ? `iVi Forum <${SMTP_USER}>` : "iVi Forum <forum@isb.quarktex.com>");
const REPLY_TO = process.env.EMAIL_REPLY_TO || "";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

const smtp = smtpConfigured
  ? nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

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

/**
 * Resend's default plan allows 2 requests/second; Gmail has no per-second cap
 * but throttles bursts. Pace everything to 2/s either way.
 */
const RATE_LIMIT_PER_SECOND = 2;
const RATE_LIMIT_MAX_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send one email over Gmail SMTP (or Resend as fallback). Throws on failure (callers that must not fail —
 * notification fan-out — go through `sendEmails`, which swallows per-recipient
 * errors). A 429 (rate limited) is retried a couple of times, honoring the
 * Retry-After header, so a concurrent fan-out can't starve an OTP send.
 * When no transport is configured, logs the send and returns.
 */
export async function sendEmail(msg: OutgoingEmail): Promise<void> {
  if (!emailConfigured) {
    console.log(`[email] not configured — would send "${msg.subject}" to ${msg.to}`);
    return;
  }
  if (smtp) {
    const info = await smtp.sendMail({
      from: FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
      ...(msg.headers ? { headers: msg.headers } : {}),
    });
    if (info.rejected && info.rejected.length > 0) {
      throw new Error(`SMTP rejected ${msg.to}: ${String(info.response).slice(0, 300)}`);
    }
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
        ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
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

/**
 * Send the 6-digit sign-in code (OTP request route). The recipient address is
 * echoed inside the body on purpose — see the deliverability note on otpEmail.
 */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const content = otpEmail({ code, email: to });
  await sendEmail({ to, ...content });
}
