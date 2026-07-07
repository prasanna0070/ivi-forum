/**
 * Forum tag helpers — pure functions shared by the TopicComposer (client)
 * and the POST /api/topics route (server). Owned by the forum agent.
 */

export const MAX_TAGS = 8;
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

// ---------------------------------------------------------------------------
// Curated default tag taxonomy — the SHARED vocabulary used both as one-tap
// suggested chips in the composer AND as the interest tags collected at
// onboarding, so posts and member interests line up for future notifications.
// Members can still type their own custom tags on a post; these are just the
// common set. `slug` (what gets stored) is derived from `label` via slugifyTag.
// ---------------------------------------------------------------------------

export interface TagOption {
  label: string;
  slug: string;
}

export interface TagGroup {
  group: string;
  tags: TagOption[];
}

const opt = (label: string): TagOption => ({ label, slug: slugifyTag(label) });

export const DEFAULT_TAG_GROUPS: TagGroup[] = [
  { group: 'Business model', tags: ['B2B', 'B2C', 'B2G', 'B2B2C', 'D2C', 'SaaS', 'Marketplace'].map(opt) },
  { group: 'Funding', tags: ['Fundraising', 'Grants', 'Bootstrapped', 'Angel', 'Venture Capital'].map(opt) },
  {
    group: 'Tech & product',
    tags: ['AI', 'Automation', 'No-Code', 'Data', 'Digital Product', 'Physical Product', 'Hardware', 'Deep Tech'].map(opt),
  },
  {
    group: 'Function',
    tags: ['Marketing', 'Sales', 'Growth', 'Business Development', 'Product', 'Design', 'Engineering', 'Finance', 'Legal', 'HR', 'Operations'].map(opt),
  },
  { group: 'Community', tags: ['Events/Meetups', 'Hiring', 'Cofounder Search', 'Ask/Advice', 'Wins', 'Resources'].map(opt) },
];

/** Flat list of every default tag option. */
export const DEFAULT_TAGS: TagOption[] = DEFAULT_TAG_GROUPS.flatMap((g) => g.tags);

/** Fast membership check: is a slug one of the curated defaults? */
export const DEFAULT_TAG_SLUGS: Set<string> = new Set(DEFAULT_TAGS.map((o) => o.slug));

/** Look up a default tag's display label by slug (falls back to the slug). */
export function tagLabel(slug: string): string {
  return DEFAULT_TAGS.find((o) => o.slug === slug)?.label ?? slug;
}

/**
 * Sanitize an untrusted interest-tags payload: unique slugs, capped. Allows both
 * default and custom slugs (a member may follow any tag). Cap is generous.
 */
export function sanitizeInterestTags(raw: unknown, max = 40): string[] {
  return sanitizeTags(raw, max);
}
