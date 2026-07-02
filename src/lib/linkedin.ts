/**
 * LinkedIn scraping via Apify — TypeScript port of the Quarktex
 * qt-profile-contact-scraper normalizer (agents/.../app/tools.py).
 *
 * Actor: apimaestro~linkedin-profile-batch-scraper-no-cookies-required
 * (override with APIFY_LINKEDIN_PROFILE_ACTOR). The actor returns items with
 * identity nested under `basic_info` — we lift it, then map to
 * NormalizedLinkedIn (see @/lib/types).
 */
import type {
  EducationItem,
  ExperienceItem,
  MemberProfile,
  NormalizedLinkedIn,
} from "@/lib/types";

const APIFY_BASE = "https://api.apify.com";
const DEFAULT_ACTOR = "apimaestro~linkedin-profile-batch-scraper-no-cookies-required";
const MAX_CHARGE_USD = "0.10";
const ACTOR_TIMEOUT_S = 240;
const FETCH_TIMEOUT_MS = 90_000;

type Dict = Record<string, unknown>;

function isDict(v: unknown): v is Dict {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function list(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Slug characters LinkedIn actually uses (incl. %-encoded unicode). */
const SLUG_RE = /^[A-Za-z0-9%_.\-]+$/;

/**
 * Normalize any linkedin.com/in/<slug> form (with/without protocol, www,
 * trailing slash, query/hash junk — or a bare slug) to
 * `https://www.linkedin.com/in/<slug>`. Returns null when not parseable.
 */
export function canonicalizeLinkedInUrl(input: string): string | null {
  const u = (input ?? "").trim();
  if (!u) return null;

  const marker = "linkedin.com/in/";
  const idx = u.toLowerCase().indexOf(marker);
  if (idx !== -1) {
    const slug = u
      .slice(idx + marker.length)
      .split(/[?#]/)[0]
      .split("/")[0]
      .trim();
    if (!slug || !SLUG_RE.test(slug)) return null;
    return `https://www.linkedin.com/in/${slug}`;
  }

  // Bare slug (no URL bits at all).
  if (!u.toLowerCase().includes("linkedin.com") && !u.includes("/") && SLUG_RE.test(u)) {
    return `https://www.linkedin.com/in/${u}`;
  }
  return null;
}

/** The part after /in/, lowercased — stable identifier for matching. */
function extractSlug(url: string): string {
  const u = (url ?? "").trim();
  const marker = "linkedin.com/in/";
  const idx = u.toLowerCase().indexOf(marker);
  if (idx !== -1) {
    return u.slice(idx + marker.length).replace(/\/+$/, "").toLowerCase();
  }
  return u.replace(/^\/+|\/+$/g, "").toLowerCase();
}

/** Port of tools.py lines ~211–390: lift basic_info, map one dataset item. */
function normalizeItem(raw: Dict, fallbackUrl: string): NormalizedLinkedIn | null {
  // apimaestro returns top-level keys {basic_info, experience, education, ...}.
  const bi: Dict = isDict(raw.basic_info) ? raw.basic_info : {};

  const profUrl =
    canonicalizeLinkedInUrl(str(bi.profile_url) || str(raw.profile_url) || str(raw.url)) ??
    canonicalizeLinkedInUrl(fallbackUrl);
  if (!profUrl) return null;

  const name = (
    str(bi.fullname) ||
    [str(bi.first_name), str(bi.last_name)].filter(Boolean).join(" ")
  ).trim();
  const headline = str(bi.headline) || str(raw.headline);
  const about = str(bi.about);

  const loc: Dict = isDict(bi.location) ? bi.location : {};
  const location = str(loc.full) || str(loc.city) || str(bi.location);

  const currentCompany = str(bi.current_company);

  const experience: ExperienceItem[] = [];
  for (const e of list(raw.experience).slice(0, 10)) {
    if (!isDict(e)) continue;
    experience.push({
      title: str(e.title) || str(e.position),
      company: str(e.company_name) || str(e.companyName) || str(e.company),
      duration: str(e.duration) || str(e.dateRange) || null,
      location: str(e.location) || null,
      description: str(e.description).slice(0, 1000) || null,
    });
  }
  const currentTitle = experience[0]?.title ?? "";

  const education: EducationItem[] = [];
  for (const e of list(raw.education).slice(0, 10)) {
    if (!isDict(e)) continue;
    education.push({
      school: str(e.school_name) || str(e.schoolName) || str(e.school),
      degree: str(e.degree) || null,
      fieldOfStudy: str(e.field_of_study) || str(e.fieldOfStudy) || null,
      period: str(e.period) || str(e.dateRange) || null,
    });
  }

  const skills: string[] = [];
  const skillsRaw = Array.isArray(bi.top_skills) ? bi.top_skills : list(raw.skills);
  for (const s of skillsRaw.slice(0, 20)) {
    if (typeof s === "string" && s.trim()) skills.push(s.trim());
    else if (isDict(s) && str(s.name)) skills.push(str(s.name));
  }

  return {
    linkedinUrl: profUrl,
    publicIdentifier: str(bi.public_identifier) || extractSlug(profUrl),
    name,
    headline,
    about,
    location,
    profilePictureUrl: str(bi.profile_picture_url),
    currentTitle,
    currentCompany,
    followerCount: num(bi.follower_count),
    connectionCount: num(bi.connection_count),
    skills,
    experience,
    education,
  };
}

/**
 * Scrape one LinkedIn profile through Apify's run-sync endpoint.
 * Never throws — failures come back as `{ ok: false, error }` so the caller
 * (onboarding) can degrade to the empty form.
 */
export async function scrapeLinkedInProfile(url: string): Promise<{
  ok: boolean;
  profile?: NormalizedLinkedIn;
  raw?: unknown;
  error?: string;
}> {
  const token = process.env.APIFY_API_TOKEN ?? "";
  const actor = (process.env.APIFY_LINKEDIN_PROFILE_ACTOR || DEFAULT_ACTOR).replace(/\//g, "~");
  if (!token) return { ok: false, error: "APIFY_API_TOKEN unset." };

  const canonical = canonicalizeLinkedInUrl(url) ?? url;
  const endpoint =
    `${APIFY_BASE}/v2/acts/${actor}/run-sync-get-dataset-items` +
    `?token=${encodeURIComponent(token)}&memory=1024&timeout=${ACTOR_TIMEOUT_S}` +
    `&maxTotalChargeUsd=${MAX_CHARGE_USD}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ usernames: [canonical], includeEmail: false }),
        signal: controller.signal,
      });
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return {
        ok: false,
        error: aborted
          ? `Apify request timed out after ${FETCH_TIMEOUT_MS / 1000}s.`
          : `Apify request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // 200 OR 201 — any 2xx is success on Apify run-sync endpoints.
    if (res.status < 200 || res.status >= 300) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Apify HTTP ${res.status}: ${text.slice(0, 300)}` };
    }

    let raw: unknown;
    try {
      raw = await res.json();
    } catch (err) {
      return {
        ok: false,
        error: `Apify returned non-JSON: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const first = items.find(isDict);
    if (!first) return { ok: false, raw, error: "Apify returned no profile items." };

    const profile = normalizeItem(first, canonical);
    if (!profile) {
      return { ok: false, raw, error: "Could not parse a profile from Apify's response." };
    }
    return { ok: true, profile, raw };
  } catch (err) {
    // Absolute backstop — this function never throws.
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

/** Map a normalized LinkedIn profile onto the onboarding form prefill. */
export function toProfilePrefill(n: NormalizedLinkedIn): Partial<MemberProfile> {
  return {
    ...(n.name ? { name: n.name } : {}),
    linkedinUrl: n.linkedinUrl || null,
    photoUrl: n.profilePictureUrl || null,
    headline: n.headline || null,
    about: n.about || null,
    location: n.location || null,
    currentTitle: n.currentTitle || null,
    currentCompany: n.currentCompany || null,
    followerCount: n.followerCount ?? null,
    connectionCount: n.connectionCount ?? null,
    skills: n.skills,
    experience: n.experience,
    education: n.education,
  };
}
