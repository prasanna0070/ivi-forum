/**
 * Branded email templates — every mail the forum sends is built here.
 *
 * Contract (imported by lib/email.ts + lib/notifications.ts — keep signatures):
 *   otpEmail       — 6-digit sign-in code (signup + login)
 *   welcomeEmail   — sent once, when a member first completes onboarding
 *   newPostEmail   — a new topic matched one of the member's interest tags
 *   mentionEmail   — the member was @-mentioned in a post or reply
 *   replyEmail     — someone replied to the member's post ('post') or to
 *                    their reply ('comment')
 *   previewText    — plain-text preview of a topic/reply body for emails
 *                    (mention tokens humanized, whitespace collapsed, truncated)
 *
 * Design (branding-assets/DESIGN.md, adapted for email clients):
 *   - One shared shell: navy #192890 header band with the white iVi logo, a
 *     3px peach #ffb172 accent rule, a white content card on the #f4f8fa page
 *     background, and a 12px slate #95a9b4 footer.
 *   - Serif headings in the email-safe Georgia stack (Fraunces won't load in
 *     mail clients), sans body, ZERO border-radius, bulletproof squared navy
 *     buttons with a trailing "→".
 *   - Each template gets one recognizable accent: OTP = boxed code, welcome =
 *     mint highlight, new-post = blue kicker + tag chips, mention = peach
 *     chip + peach quote rule, reply = navy quote rule.
 *   - Table layout, max-width 600px, ALL styles inline (Gmail/Outlook/Apple
 *     Mail safe), hidden preheader per template.
 *
 * Rules:
 *   - ALL user-generated strings (names, titles, previews, tags) are
 *     HTML-escaped at render time, in here. Callers pass raw strings.
 *   - Subjects are header-safe: control characters (CR/LF) in user content
 *     collapse to spaces so a crafted title/name can't inject MIME headers.
 *   - Links are absolute, built from appUrl().
 *   - An empty bodyPreview on a REPLY means an image-only reply (replies
 *     require body or image) — the quote block falls back to an italic
 *     "Shared an image." Topics may legally be title-only, so newPostEmail
 *     additionally takes `hasImages` and drops the quote block when a topic
 *     has neither body nor images.
 *   - otp/welcome carry NO unsubscribe link; notification templates always do.
 */
import { appUrl } from "@/lib/email";
import { tagLabel } from "@/components/forum/tags";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Header-safe single line: C0/C1 control characters (CR/LF included) collapse
 * to a space, runs of spaces collapse, ends trimmed. Subjects interpolate
 * user content (member names, topic titles) — without this, a crafted title
 * like `x\r\nBcc: evil@x.com` would reach the transport in header position.
 */
function headerSafe(s: string): string {
  return s
    .replace(/[\u0000-\u001F\u007F-\u009F]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

/**
 * Body → short plain-text preview: `@[Name](uid)` tokens become `@Name`,
 * whitespace collapses, output truncates on a word boundary with an ellipsis.
 * Returns "" for empty/image-only bodies (templates handle the fallback copy).
 */
export function previewText(body: string, max = 240): string {
  const flat = body
    .replace(/@\[([^\]]+)\]\(([^)]+)\)/g, "@$1")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 40))}…`;
}

function topicUrl(topicId: string): string {
  return `${appUrl()}/forum/${encodeURIComponent(topicId)}`;
}

// ---------------------------------------------------------------------------
// Design tokens (branding-assets/DESIGN.md, email-safe subset)
// ---------------------------------------------------------------------------

const C = {
  brand: "#192890", // primary indigo — header band, buttons, strong text
  heading: "#1e2d8c", // serif headings
  navyDark: "#131f70", // text on peach chips
  ink: "#1d252a", // body copy
  muted: "#525252", // kickers, secondary copy
  border: "#cfdbe2", // hairline borders
  surface: "#f4f8fa", // page background, quote/chip fills
  link: "#245bff", // links, "new post" accent
  peach: "#ffb172", // accent rule, mention accent
  mint: "#80edd9", // welcome highlight (ISB aquamarine, verbatim palette token)
  footer: "#95a9b4", // footer text
} as const;

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// ---------------------------------------------------------------------------
// Building blocks (all take PRE-ESCAPED html unless noted)
// ---------------------------------------------------------------------------

/** Hidden inbox-preview line. Takes RAW text; escapes + pads it out. */
function preheader(raw: string): string {
  const pad = "&nbsp;&zwnj;".repeat(48);
  return `<div style="display:none; max-height:0px; overflow:hidden; mso-hide:all">${escapeHtml(raw.slice(0, 140))}${pad}</div>`;
}

/** Uppercase editorial kicker above the heading. */
function kicker(label: string, color: string = C.muted): string {
  return `<p style="margin:0 0 14px; font-family:${SANS}; font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:${color}">${label}</p>`;
}

/** Small solid peach chip (the brand's "warm highlight" badge). */
function peachChip(label: string): string {
  return `<p style="margin:0 0 16px"><span style="display:inline-block; padding:4px 10px; background-color:${C.peach}; font-family:${SANS}; font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:${C.navyDark}">${label}</span></p>`;
}

/** Serif page heading — blue-on-light, never black. */
function heading(html: string): string {
  return `<h1 style="margin:0 0 18px; font-family:${SERIF}; font-size:26px; line-height:1.3; font-weight:normal; letter-spacing:-0.2px; color:${C.heading}">${html}</h1>`;
}

function para(html: string): string {
  return `<p style="margin:0 0 16px; font-family:${SANS}; font-size:15px; line-height:1.6; color:${C.ink}">${html}</p>`;
}

function fine(html: string): string {
  return `<p style="margin:0; font-family:${SANS}; font-size:13px; line-height:1.6; color:${C.muted}">${html}</p>`;
}

/** Bulletproof squared button: padded <a> in a solid navy cell, arrow glyph. */
function button(href: string, label: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:26px 0 6px"><tr><td bgcolor="${C.brand}" style="background-color:${C.brand}"><a href="${escapeHtml(href)}" style="display:inline-block; padding:13px 28px; font-family:${SANS}; font-size:15px; font-weight:700; line-height:1.3; color:#ffffff; text-decoration:none">${label} &rarr;</a></td></tr></table>`;
}

/**
 * Quoted body preview: hairline accent rule + surface fill. Takes the RAW
 * preview (escapes it); empty preview = image-only → italic fallback copy.
 */
function quote(rawPreview: string, accent: string): string {
  const inner = rawPreview
    ? escapeHtml(rawPreview)
    : `<em>Shared an image.</em>`;
  return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:4px 0 8px"><tr><td width="3" bgcolor="${accent}" style="width:3px; font-size:0px; line-height:0px">&nbsp;</td><td bgcolor="${C.surface}" style="background-color:${C.surface}; padding:14px 18px; font-family:${SANS}; font-size:14px; line-height:1.6; color:${C.muted}">${inner}</td></tr></table>`;
}

/** Matched-tag chips: flat, squared, hairline-bordered. Takes RAW slugs. */
function tagChips(slugs: string[]): string {
  if (!Array.isArray(slugs) || slugs.length === 0) return "";
  const chips = slugs
    .map(
      (s) =>
        `<span style="display:inline-block; margin:0 6px 6px 0; padding:4px 10px; background-color:${C.surface}; border:1px solid ${C.border}; font-family:${SANS}; font-size:12px; font-weight:600; color:${C.brand}">${escapeHtml(tagLabel(s))}</span>`,
    )
    .join("");
  return `<p style="margin:0 0 14px">${chips}</p>`;
}

/**
 * Shared shell: preheader → navy logo band → peach rule → white card →
 * slate footer, centered at 600px on the surface background. The MSO ghost
 * table pins the width in Outlook, which ignores max-width.
 */
function shell(i: {
  preheader: string;
  bodyHtml: string;
  unsubscribeUrl?: string;
}): string {
  const unsub = i.unsubscribeUrl
    ? `You&rsquo;re getting this because you&rsquo;re an iVi Forum member. <a href="${escapeHtml(i.unsubscribeUrl)}" style="color:${C.footer}; text-decoration:underline">Unsubscribe</a>.<br>`
    : "";
  return `<div style="margin:0; padding:0; background-color:${C.surface}">
${preheader(i.preheader)}
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${C.surface}" style="background-color:${C.surface}">
  <tr>
    <td align="center" style="padding:28px 12px 36px">
      <!--[if mso]><table role="presentation" width="600" align="center" border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; text-align:left">
        <tr>
          <td bgcolor="${C.brand}" style="background-color:${C.brand}; padding:22px 32px">
            <img src="${appUrl()}/brand/ivi-logo-white.png" width="96" alt="iVi Forum" style="display:block; width:96px; height:auto; border:0">
          </td>
        </tr>
        <tr>
          <td bgcolor="${C.peach}" height="3" style="background-color:${C.peach}; height:3px; font-size:0px; line-height:0px">&nbsp;</td>
        </tr>
        <tr>
          <td bgcolor="#ffffff" style="background-color:#ffffff; border:1px solid ${C.border}; border-top:0; padding:34px 32px 30px">
            ${i.bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 4px 0; font-family:${SANS}; font-size:12px; line-height:1.7; color:${C.footer}">
            ${unsub}Built by the iVi community &mdash; not an official ISB product.
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</div>`;
}

/** Plain-text footer, kept in sync with the HTML one. */
function textFooter(unsubscribeUrl?: string): string {
  const unsub = unsubscribeUrl
    ? `You're getting this because you're an iVi Forum member.\nUnsubscribe: ${unsubscribeUrl}\n`
    : "";
  return `\n\n—\n${unsub}Built by the iVi community — not an official ISB product.`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function otpEmail(i: { code: string }): EmailContent {
  const code = escapeHtml(i.code);
  return {
    // Deliverability: the code must NOT appear in the subject. A "<digits> is
    // your sign-in code" subject is the canonical OTP-phishing shape and gets
    // hard-quarantined by strict tenants (ISB's Microsoft 365 did exactly this
    // — verified: the identical mail with the code removed from the subject
    // delivered fine). Keep the subject digit-free; the code lives in the body.
    subject: "Sign in to the iVi Forum",
    html: shell({
      preheader: "Enter this code to finish signing in. It expires in 10 minutes.",
      bodyHtml: [
        kicker("Sign in"),
        heading("Your sign-in code"),
        para(
          "Enter this code to finish signing in to the iVi Forum. It expires in <strong>10 minutes</strong>.",
        ),
        `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:22px 0 24px"><tr><td align="center" bgcolor="${C.surface}" style="background-color:${C.surface}; border:1px solid ${C.border}; padding:22px 12px"><span style="font-family:${SANS}; font-size:34px; font-weight:700; line-height:1.2; letter-spacing:8px; color:${C.brand}">${code}</span></td></tr></table>`,
        fine(
          "Didn&rsquo;t request this? Ignore this email &mdash; no one can sign in without the code.",
        ),
      ].join("\n"),
    }),
    text: `Your iVi Forum sign-in code is ${i.code}. It expires in 10 minutes.\n\nDidn't request this? Ignore this email — no one can sign in without the code.${textFooter()}`,
  };
}

export function welcomeEmail(i: { name: string }): EmailContent {
  const name = escapeHtml(i.name);
  return {
    subject: "Welcome to the iVi Forum — every cohort, one room",
    html: shell({
      preheader:
        "Your profile is live in the member directory. Come meet the community.",
      bodyHtml: [
        kicker("Welcome"),
        heading(
          `Welcome, <span style="background-color:${C.mint}; padding:0 6px">${name}</span>`,
        ),
        para(
          "Every cohort. One room. Your profile is now live in the member directory, alongside founders from every iVi cohort.",
        ),
        para(
          "Browse the directory, follow the topics you care about, and start your first discussion &mdash; the room is yours.",
        ),
        button(`${appUrl()}/directory`, "Meet the community"),
        `<p style="margin:14px 0 0; font-family:${SANS}; font-size:14px; line-height:1.6; color:${C.ink}">Or jump straight into <a href="${appUrl()}/forum" style="color:${C.link}; font-weight:600; text-decoration:underline">the forum &rarr;</a></p>`,
      ].join("\n"),
    }),
    text: `Welcome to the iVi Forum, ${i.name}!\n\nEvery cohort. One room. Your profile is now live in the member directory, alongside founders from every iVi cohort.\n\nMeet the community: ${appUrl()}/directory\nOr jump straight into the forum: ${appUrl()}/forum${textFooter()}`,
  };
}

export function newPostEmail(i: {
  recipientName: string;
  actorName: string;
  topicTitle: string;
  topicId: string;
  bodyPreview: string;
  matchedTags: string[];
  /**
   * Whether the topic carries images. Distinguishes an image-only post (empty
   * preview + images → "Shared an image.") from a legal title-only post
   * (empty preview + no images → no quote block, no false image claim).
   */
  hasImages?: boolean;
  unsubscribeUrl: string;
}): EmailContent {
  const tagsPlain = i.matchedTags.map(tagLabel).join(", ");
  const previewLine = i.bodyPreview || (i.hasImages ? "shared an image." : "");
  const textPreview = i.bodyPreview || (i.hasImages ? "(image-only post)" : "");
  return {
    subject: headerSafe(`New in ${tagsPlain}: ${i.topicTitle}`),
    html: shell({
      preheader: previewLine
        ? `${i.actorName} just posted — ${previewLine}`
        : `${i.actorName} just posted in a topic you follow.`,
      unsubscribeUrl: i.unsubscribeUrl,
      bodyHtml: [
        kicker("New in your topics", C.link),
        heading(escapeHtml(i.topicTitle)),
        para(
          `<strong style="color:${C.brand}">${escapeHtml(i.actorName)}</strong> posted in a topic you follow.`,
        ),
        tagChips(i.matchedTags),
        i.bodyPreview || i.hasImages ? quote(i.bodyPreview, C.link) : "",
        button(topicUrl(i.topicId), "Read the post"),
      ]
        .filter(Boolean)
        .join("\n"),
    }),
    text: `${i.actorName} posted "${i.topicTitle}" in ${tagsPlain}.${textPreview ? `\n\n${textPreview}` : ""}\n\nRead the post: ${topicUrl(i.topicId)}${textFooter(i.unsubscribeUrl)}`,
  };
}

export function mentionEmail(i: {
  recipientName: string;
  actorName: string;
  topicTitle: string;
  topicId: string;
  bodyPreview: string;
  where: "post" | "reply";
  unsubscribeUrl: string;
}): EmailContent {
  const where = i.where === "post" ? "post" : "reply";
  return {
    subject: headerSafe(`${i.actorName} mentioned you — ${i.topicTitle}`),
    html: shell({
      preheader: `In a ${where} on "${i.topicTitle}" — ${i.bodyPreview || "shared an image."}`,
      unsubscribeUrl: i.unsubscribeUrl,
      bodyHtml: [
        peachChip("Mention"),
        heading(`${escapeHtml(i.actorName)} mentioned you`),
        para(
          `In a ${where} on <strong style="color:${C.brand}">&ldquo;${escapeHtml(i.topicTitle)}&rdquo;</strong>.`,
        ),
        quote(i.bodyPreview, C.peach),
        button(topicUrl(i.topicId), "See the conversation"),
      ].join("\n"),
    }),
    text: `${i.actorName} mentioned you in a ${where} on "${i.topicTitle}".\n\n${i.bodyPreview || "(image-only " + where + ")"}\n\nSee the conversation: ${topicUrl(i.topicId)}${textFooter(i.unsubscribeUrl)}`,
  };
}

export function replyEmail(i: {
  recipientName: string;
  actorName: string;
  topicTitle: string;
  topicId: string;
  bodyPreview: string;
  /** 'post' = reply on the recipient's topic; 'comment' = reply to their reply. */
  kind: "post" | "comment";
  unsubscribeUrl: string;
}): EmailContent {
  const what = i.kind === "post" ? "your post" : "your reply";
  return {
    subject: headerSafe(`${i.actorName} replied to ${what} — ${i.topicTitle}`),
    html: shell({
      preheader: `${i.actorName} replied — ${i.bodyPreview || "shared an image."}`,
      unsubscribeUrl: i.unsubscribeUrl,
      bodyHtml: [
        kicker("New reply"),
        heading(`${escapeHtml(i.actorName)} replied to ${what}`),
        para(
          `On <strong style="color:${C.brand}">&ldquo;${escapeHtml(i.topicTitle)}&rdquo;</strong>.`,
        ),
        quote(i.bodyPreview, C.brand),
        button(topicUrl(i.topicId), "View the reply"),
      ].join("\n"),
    }),
    text: `${i.actorName} replied to ${what} on "${i.topicTitle}".\n\n${i.bodyPreview || "(image-only reply)"}\n\nView the reply: ${topicUrl(i.topicId)}${textFooter(i.unsubscribeUrl)}`,
  };
}
