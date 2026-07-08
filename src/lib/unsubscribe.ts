/**
 * One-click unsubscribe tokens for notification emails.
 *
 * The link in every notification email footer carries an HMAC of the member's
 * uid (keyed by AUTH_SECRET), so hitting /api/email/unsubscribe can flip
 * `emailNotifications=false` WITHOUT a signed-in session — email clients open
 * links logged-out. The token grants exactly one power (mute notifications for
 * one uid); it can't read or change anything else. Server-only.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { appUrl } from "@/lib/email";

const TOKEN_BYTES = 16; // 32 hex chars — plenty for a single-purpose HMAC

/**
 * FAIL CLOSED: an empty HMAC key would make every token forgeable by anyone
 * who has read this file, so a missing AUTH_SECRET throws (mint) / verifies
 * nothing (verify) instead of silently signing with "".
 */
function hmacSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET must be set to mint or verify unsubscribe tokens");
  }
  return secret;
}

export function mintUnsubscribeToken(uid: string): string {
  return createHmac("sha256", hmacSecret())
    .update(`unsubscribe:${uid}`)
    .digest("hex")
    .slice(0, TOKEN_BYTES * 2);
}

export function verifyUnsubscribeToken(uid: string, token: string): boolean {
  if (!uid || typeof token !== "string") return false;
  let expected: Buffer;
  try {
    expected = Buffer.from(mintUnsubscribeToken(uid), "utf8");
  } catch {
    return false; // no AUTH_SECRET → no token can ever be valid
  }
  const actual = Buffer.from(token, "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Absolute unsubscribe URL for a member — used by email footers. */
export function unsubscribeUrl(uid: string): string {
  return `${appUrl()}/api/email/unsubscribe?uid=${encodeURIComponent(uid)}&token=${mintUnsubscribeToken(uid)}`;
}
