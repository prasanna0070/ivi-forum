/**
 * POST /api/profile — save the onboarding/edit profile form.
 *
 * Request body: the editable subset of MemberProfile —
 *   { name, photoUrl, linkedinUrl, headline, about, location, cohort,
 *     startupName, startupDescription, startupWebsite, currentTitle,
 *     currentCompany, skills, experience, education }
 * Everything is validated defensively (types, lengths, list caps) and unknown
 * keys are stripped — the client is never trusted.
 *
 * Response: 200 { ok: true }
 *           400 { ok: false, error } — validation failure (name required)
 *           401 { ok: false, error: 'unauthenticated' }
 */
import { NextResponse } from 'next/server';
import { requireUserApi } from '@/lib/session';
import { upsertMember } from '@/lib/firestore';
import type { Cohort, EducationItem, ExperienceItem, MemberProfile } from '@/lib/types';

// ---------------------------------------------------------------------------
// Field caps
// ---------------------------------------------------------------------------

const MAX = {
  name: 120,
  headline: 300,
  about: 5000,
  location: 160,
  url: 500,
  startupName: 160,
  startupDescription: 2000,
  title: 160,
  company: 160,
  skill: 40,
  skills: 30,
  listItems: 20,
  duration: 80,
  description: 2000,
  school: 200,
  degree: 160,
  fieldOfStudy: 160,
  period: 80,
} as const;

// ---------------------------------------------------------------------------
// Defensive coercers — anything that isn't the expected shape becomes null/[].
// ---------------------------------------------------------------------------

/** Trimmed, length-capped string, or null for empty/non-string input. */
function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanCohort(value: unknown): Cohort | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return n === 1 || n === 2 || n === 3 || n === 4 ? n : null;
}

function cleanSkills(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const skill = cleanString(item, MAX.skill);
    if (skill && !out.some((s) => s.toLowerCase() === skill.toLowerCase())) out.push(skill);
    if (out.length >= MAX.skills) break;
  }
  return out;
}

function cleanExperience(value: unknown): ExperienceItem[] {
  if (!Array.isArray(value)) return [];
  const out: ExperienceItem[] = [];
  for (const row of value) {
    if (typeof row !== 'object' || row === null) continue;
    const r = row as Record<string, unknown>;
    const title = cleanString(r.title, MAX.title);
    const company = cleanString(r.company, MAX.company);
    if (!title && !company) continue; // empty row
    out.push({
      title: title ?? '',
      company: company ?? '',
      duration: cleanString(r.duration, MAX.duration),
      location: cleanString(r.location, MAX.location),
      description: cleanString(r.description, MAX.description),
    });
    if (out.length >= MAX.listItems) break;
  }
  return out;
}

function cleanEducation(value: unknown): EducationItem[] {
  if (!Array.isArray(value)) return [];
  const out: EducationItem[] = [];
  for (const row of value) {
    if (typeof row !== 'object' || row === null) continue;
    const r = row as Record<string, unknown>;
    const school = cleanString(r.school, MAX.school);
    if (!school) continue; // school is the anchor field
    out.push({
      school,
      degree: cleanString(r.degree, MAX.degree),
      fieldOfStudy: cleanString(r.fieldOfStudy, MAX.fieldOfStudy),
      period: cleanString(r.period, MAX.period),
    });
    if (out.length >= MAX.listItems) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<NextResponse> {
  const user = await requireUserApi();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }

  const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const name = cleanString(raw.name, MAX.name);
  if (!name) {
    return NextResponse.json({ ok: false, error: 'Name is required' }, { status: 400 });
  }

  // Only these keys ever reach Firestore — unknown keys are dropped here.
  const validated: Partial<MemberProfile> = {
    name,
    photoUrl: cleanString(raw.photoUrl, MAX.url),
    linkedinUrl: cleanString(raw.linkedinUrl, MAX.url),
    headline: cleanString(raw.headline, MAX.headline),
    about: cleanString(raw.about, MAX.about),
    location: cleanString(raw.location, MAX.location),
    cohort: cleanCohort(raw.cohort),
    startupName: cleanString(raw.startupName, MAX.startupName),
    startupDescription: cleanString(raw.startupDescription, MAX.startupDescription),
    startupWebsite: cleanString(raw.startupWebsite, MAX.url),
    currentTitle: cleanString(raw.currentTitle, MAX.title),
    currentCompany: cleanString(raw.currentCompany, MAX.company),
    skills: cleanSkills(raw.skills),
    experience: cleanExperience(raw.experience),
    education: cleanEducation(raw.education),
  };

  await upsertMember(user.id, {
    ...validated,
    email: user.email ?? undefined,
    profileComplete: true,
    updatedAt: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
