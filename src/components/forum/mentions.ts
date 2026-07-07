/**
 * Mention token format + pure parsers — shared by the client MentionTextarea,
 * the MentionedBody server renderer, and the topics/replies API routes.
 *
 * Stored token (lives inside the body text):  @[Full Name](uid)
 *   - the embedded uid makes each mention unambiguous for storage + future
 *     email notifications, independent of display-name collisions.
 *   - the UI renders a friendly "@Full Name" linking to /profile/<uid>.
 *
 * Grammar: the name segment is any run of chars except `]`; the uid segment is
 * any run except `(`, `)`, or whitespace (uids are UUIDs).
 */

/** Max mentions persisted per post/reply (the API caps to this). */
export const MAX_MENTIONS = 20;

/**
 * A FRESH global matcher for mention tokens. Returned per-call so callers never
 * share a stateful `lastIndex` between `exec` loops.
 */
function mentionRegex(): RegExp {
  return /@\[([^\]]+)]\(([^()\s]+)\)/g;
}

/**
 * Strip the characters that would break a token out of a display name so
 * `formatMention` always emits a parseable `@[name](uid)`.
 */
export function sanitizeMentionName(name: string): string {
  return name
    .replace(/[[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Build the storage token for a member. */
export function formatMention(name: string, uid: string): string {
  return `@[${sanitizeMentionName(name) || 'member'}](${uid})`;
}

export type MentionSegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; uid: string; name: string };

/**
 * Split a body into ordered text / mention segments. Whitespace and newlines
 * are preserved verbatim in the text segments, so a caller can render with
 * `whitespace-pre-line` and keep the original layout.
 */
export function parseMentions(body: string): MentionSegment[] {
  if (typeof body !== 'string' || body.length === 0) return [];
  const segments: MentionSegment[] = [];
  const re = mentionRegex();
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: body.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'mention', name: match[1], uid: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) {
    segments.push({ type: 'text', value: body.slice(lastIndex) });
  }
  return segments;
}

/** Unique uids mentioned in the body, in first-seen order. */
export function extractMentionUids(body: string): string[] {
  if (typeof body !== 'string' || body.length === 0) return [];
  const out: string[] = [];
  const re = mentionRegex();
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    const uid = match[2];
    if (!out.includes(uid)) out.push(uid);
  }
  return out;
}

/**
 * Sanitize an untrusted `mentionUids` payload from a client into unique,
 * non-empty strings, capped. Non-arrays / non-strings are ignored.
 */
export function sanitizeMentionUids(raw: unknown, max = MAX_MENTIONS): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (out.length >= max) break;
    if (typeof item !== 'string') continue;
    const uid = item.trim();
    if (uid && !out.includes(uid)) out.push(uid);
  }
  return out;
}
