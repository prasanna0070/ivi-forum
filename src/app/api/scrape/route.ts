/**
 * POST /api/scrape — LinkedIn scrape for onboarding prefill.
 *
 * Request:  { linkedinUrl: string }
 * Response: 200 { ok: true, prefill: Partial<MemberProfile> }
 *           400 { ok: false, error } — missing/unparseable LinkedIn URL
 *           401 { ok: false, error: 'unauthenticated' }
 *           429 { ok: false, error } — scraped within the last 10 minutes
 *           502 { ok: false, error } — Apify/scrape failure (caller degrades to empty form)
 *
 * Rate limiting: `lastScrapeAt` is written BEFORE the Apify call so even
 * failed attempts count against the 10-minute window (SPEC "Onboarding flow").
 */
import { NextResponse } from 'next/server';
import { requireUserApi } from '@/lib/session';
import {
  canonicalizeLinkedInUrl,
  scrapeLinkedInProfile,
  toProfilePrefill,
} from '@/lib/linkedin';
import { getMember, saveScrapeRaw, upsertMember } from '@/lib/firestore';

/** Apify runs take 20–60s; Cloud Run request timeout is 300s (SPEC Deploy). */
export const maxDuration = 300;

const SCRAPE_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: Request): Promise<NextResponse> {
  const user = await requireUserApi();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { linkedinUrl?: unknown } | null;
  const rawUrl = typeof body?.linkedinUrl === 'string' ? body.linkedinUrl : '';
  const linkedinUrl = canonicalizeLinkedInUrl(rawUrl);
  if (!linkedinUrl) {
    return NextResponse.json(
      { ok: false, error: 'That does not look like a LinkedIn profile URL' },
      { status: 400 },
    );
  }

  // Rate limit: max 1 scrape per user per 10 minutes.
  const now = Date.now();
  const member = await getMember(user.id);
  if (member?.lastScrapeAt && now - member.lastScrapeAt < SCRAPE_COOLDOWN_MS) {
    return NextResponse.json(
      { ok: false, error: 'Please wait a few minutes before scraping again' },
      { status: 429 },
    );
  }

  // Record the attempt BEFORE calling Apify so failed runs also consume the window.
  await upsertMember(user.id, { lastScrapeAt: now, linkedinUrl });

  const result = await scrapeLinkedInProfile(linkedinUrl);
  if (!result.ok || !result.profile) {
    return NextResponse.json(
      { ok: false, error: result.error ?? 'Could not read that LinkedIn profile' },
      { status: 502 },
    );
  }

  // Keep the raw payload for future re-parsing (never rendered).
  await saveScrapeRaw(user.id, result.raw ?? null);

  return NextResponse.json({ ok: true, prefill: toProfilePrefill(result.profile) });
}
