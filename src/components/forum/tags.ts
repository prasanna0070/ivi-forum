/**
 * Forum tag helpers — pure functions shared by the TopicComposer (client)
 * and the POST /api/topics route (server). Owned by the forum agent.
 */

export const MAX_TAGS = 5;
export const MAX_TAG_LENGTH = 30;

/**
 * Normalize one raw tag into a lowercase slug: letters/digits/hyphens only,
 * trimmed to MAX_TAG_LENGTH. Returns '' when nothing survives.
 */
export function slugifyTag(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_TAG_LENGTH)
    .replace(/-+$/, '');
}

/**
 * Sanitize an untrusted `tags` payload into ≤5 unique lowercase slugs.
 * Non-arrays and non-string items are ignored.
 */
export function sanitizeTags(raw: unknown, max = MAX_TAGS): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (out.length >= max) break;
    if (typeof item !== 'string') continue;
    const slug = slugifyTag(item);
    if (slug && !out.includes(slug)) out.push(slug);
  }
  return out;
}
