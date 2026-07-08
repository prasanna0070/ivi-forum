/**
 * GET/POST /api/email/unsubscribe — mute notification emails.
 *
 * GET  (footer link, opened in a browser) — NEVER mutates. Renders a tiny
 *      branded confirmation page whose button POSTs back here. Corporate
 *      mail scanners (Defender Safe Links etc.) prefetch every link in a
 *      delivered email with GET; if GET flipped the flag, members would be
 *      silently unsubscribed the moment an email arrived.
 * POST (the confirmation form, and mail clients implementing RFC 8058
 *      one-click unsubscribe via the List-Unsubscribe/-Post header pair) —
 *      sets `emailNotifications=false` on the member doc.
 *
 * Both carry `?uid=…&token=…`. The token is a single-purpose HMAC
 * (lib/unsubscribe.ts), so this works WITHOUT a session — email links open
 * logged-out, and src/proxy.ts deliberately does not cover /api/email.
 *
 * Valid token + existing member → flag saved, 200 + confirmation page.
 * Valid token, member deleted   → no write (a merge upsert would recreate a
 *                                 ghost doc), still the 200 page.
 * Invalid token                 → 400 + a "this link isn't valid" page. The
 *                                 response never reveals whether a uid exists
 *                                 — verification is pure HMAC, no lookup.
 */
import type { NextRequest } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { getMember, upsertMember } from "@/lib/firestore";
import { appUrl } from "@/lib/email";

// ---------------------------------------------------------------------------
// Tiny self-contained branded pages (inline styles only — no app CSS here)
// ---------------------------------------------------------------------------

function page(title: string, heading: string, body: string, action?: { html: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;background:#f4f8fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:48px 20px">
  <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#525252;margin:0 0 8px">I-Venture @ ISB &middot; iVi Forum</p>
  <div style="background:#ffffff;border:1px solid #cfdbe2;padding:32px 28px">
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:500;color:#192890;margin:0 0 14px">${heading}</h1>
    <p style="font-size:15px;line-height:1.6;color:#1d252a;margin:0">${body}</p>
    ${action?.html ?? ""}
  </div>
  <p style="font-size:12px;color:#95a9b4;margin:20px 0 0">Built by the iVi community — not an official ISB product.</p>
</div>
</body>
</html>`;
}

const BUTTON_STYLE =
  "background:#192890;color:#ffffff;padding:12px 24px;text-decoration:none;display:inline-block;font-weight:600;font-size:15px;border:0;cursor:pointer;font-family:inherit";

function linkButton(href: string, label: string): { html: string } {
  return {
    html: `<p style="margin:28px 0 0"><a href="${href}" style="${BUTTON_STYLE}">${label}</a></p>`,
  };
}

/** Self-posting form — the only thing that actually flips the flag. */
function confirmForm(uid: string, token: string): { html: string } {
  const action = `${appUrl()}/api/email/unsubscribe?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`;
  return {
    html: `<form method="post" action="${action}" style="margin:28px 0 0"><button type="submit" style="${BUTTON_STYLE}">Unsubscribe</button></form>`,
  };
}

function htmlResponse(html: string, status: number): Response {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function invalidPage(): Response {
  return htmlResponse(
    page(
      "iVi Forum",
      "This link isn't valid",
      "This unsubscribe link is incomplete or no longer works. You can manage notification emails anytime from your profile on the forum.",
      linkButton(appUrl(), "Back to the forum"),
    ),
    400,
  );
}

function unsubscribedPage(): Response {
  return htmlResponse(
    page(
      "Unsubscribed · iVi Forum",
      "You're unsubscribed",
      "You won't get notification emails from the iVi Forum anymore. You can turn them back on anytime from your profile.",
      linkButton(`${appUrl()}/forum`, "Back to the forum"),
    ),
    200,
  );
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function tokenParams(request: NextRequest): { uid: string; token: string } | null {
  const params = request.nextUrl.searchParams;
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  if (!uid || !token || !verifyUnsubscribeToken(uid, token)) return null;
  return { uid, token };
}

/** Footer link. Read-only: shows a confirm page; the button POSTs back here. */
export async function GET(request: NextRequest): Promise<Response> {
  const valid = tokenParams(request);
  if (!valid) return invalidPage();

  return htmlResponse(
    page(
      "Unsubscribe · iVi Forum",
      "Unsubscribe from notification emails?",
      "You'll stop getting emails about new posts, replies, and mentions from the iVi Forum. You can turn them back on anytime from your profile.",
      confirmForm(valid.uid, valid.token),
    ),
    200,
  );
}

/** Confirmation form + RFC 8058 one-click clients. The only mutating path. */
export async function POST(request: NextRequest): Promise<Response> {
  const valid = tokenParams(request);
  if (!valid) return invalidPage();

  try {
    // Look up first: upsertMember merge-writes, which would recreate a ghost
    // ivi_users doc for a deleted member. No doc → nothing to mute → no-op.
    const member = await getMember(valid.uid);
    if (member) {
      await upsertMember(valid.uid, { emailNotifications: false });
    }
  } catch (err) {
    console.error("[unsubscribe] failed to save preference:", err);
    return htmlResponse(
      page(
        "iVi Forum",
        "Something went wrong",
        "We couldn't save your preference just now — please try the link again in a moment, or turn notifications off from your profile.",
        linkButton(appUrl(), "Back to the forum"),
      ),
      500,
    );
  }

  return unsubscribedPage();
}
