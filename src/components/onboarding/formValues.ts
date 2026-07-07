/**
 * Form-state shape for the onboarding profile form, plus mappers between it
 * and the `Partial<MemberProfile>` wire shape (scrape prefill / Firestore
 * member / POST /api/profile payload).
 *
 * The form works in plain strings ('' instead of null) so inputs stay
 * controlled; nulls only appear at the API boundary.
 */
import type { MemberProfile } from '@/lib/types';

export interface ExperienceFormRow {
  title: string;
  company: string;
  duration: string;
  location: string;
  description: string;
}

export interface EducationFormRow {
  school: string;
  degree: string;
  fieldOfStudy: string;
  period: string;
}

export interface ProfileFormValues {
  name: string;
  photoUrl: string;
  linkedinUrl: string;
  headline: string;
  about: string;
  location: string;
  /** '' = no cohort selected. */
  cohort: '' | '1' | '2' | '3' | '4';
  startupName: string;
  startupDescription: string;
  startupWebsite: string;
  currentTitle: string;
  currentCompany: string;
  skills: string[];
  /** Interest-tag slugs the member follows (defaults + custom). */
  interestTags: string[];
  experience: ExperienceFormRow[];
  education: EducationFormRow[];
}

export const EMPTY_EXPERIENCE_ROW: ExperienceFormRow = {
  title: '',
  company: '',
  duration: '',
  location: '',
  description: '',
};

export const EMPTY_EDUCATION_ROW: EducationFormRow = {
  school: '',
  degree: '',
  fieldOfStudy: '',
  period: '',
};

/**
 * Build form values from a prefill source (scrape result or existing member).
 * `fallbackName` covers sources without a name (skip path, failed scrape).
 */
export function toFormValues(
  source: Partial<MemberProfile> | null,
  fallbackName: string,
): ProfileFormValues {
  const s = source ?? {};
  return {
    name: s.name?.trim() || fallbackName,
    photoUrl: s.photoUrl ?? '',
    linkedinUrl: s.linkedinUrl ?? '',
    headline: s.headline ?? '',
    about: s.about ?? '',
    location: s.location ?? '',
    cohort: s.cohort ? (String(s.cohort) as ProfileFormValues['cohort']) : '',
    startupName: s.startupName ?? '',
    startupDescription: s.startupDescription ?? '',
    startupWebsite: s.startupWebsite ?? '',
    currentTitle: s.currentTitle ?? '',
    currentCompany: s.currentCompany ?? '',
    skills: (s.skills ?? []).filter((skill) => typeof skill === 'string' && skill.trim() !== ''),
    interestTags: (s.interestTags ?? []).filter(
      (tag) => typeof tag === 'string' && tag.trim() !== '',
    ),
    experience: (s.experience ?? []).map((e) => ({
      title: e.title ?? '',
      company: e.company ?? '',
      duration: e.duration ?? '',
      location: e.location ?? '',
      description: e.description ?? '',
    })),
    education: (s.education ?? []).map((e) => ({
      school: e.school ?? '',
      degree: e.degree ?? '',
      fieldOfStudy: e.fieldOfStudy ?? '',
      period: e.period ?? '',
    })),
  };
}

/** Map form values to the POST /api/profile payload ('' → null, cohort → number). */
export function toProfilePayload(values: ProfileFormValues): Record<string, unknown> {
  const nn = (v: string): string | null => (v.trim() ? v.trim() : null);
  return {
    name: values.name.trim(),
    photoUrl: nn(values.photoUrl),
    linkedinUrl: nn(values.linkedinUrl),
    headline: nn(values.headline),
    about: nn(values.about),
    location: nn(values.location),
    cohort: values.cohort ? Number(values.cohort) : null,
    startupName: nn(values.startupName),
    startupDescription: nn(values.startupDescription),
    startupWebsite: nn(values.startupWebsite),
    currentTitle: nn(values.currentTitle),
    currentCompany: nn(values.currentCompany),
    skills: values.skills.map((s) => s.trim()).filter(Boolean),
    // Slugs are already normalized by the picker; the API re-sanitizes them.
    interestTags: values.interestTags,
    experience: values.experience
      .filter((row) => row.title.trim() || row.company.trim())
      .map((row) => ({
        title: row.title.trim(),
        company: row.company.trim(),
        duration: nn(row.duration),
        location: nn(row.location),
        description: nn(row.description),
      })),
    education: values.education
      .filter((row) => row.school.trim())
      .map((row) => ({
        school: row.school.trim(),
        degree: nn(row.degree),
        fieldOfStudy: nn(row.fieldOfStudy),
        period: nn(row.period),
      })),
  };
}
