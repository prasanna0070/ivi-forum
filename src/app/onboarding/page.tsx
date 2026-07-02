/**
 * /onboarding — the "magic" onboarding moment (SPEC "Onboarding flow").
 *
 * Server component: reads the session + member doc, then hands off to the
 * client-side <OnboardingFlow>. `?edit=1` (profile edit) jumps straight to
 * the prefilled form — no scrape step.
 */
import type { Metadata } from 'next';
import { requireUser } from '@/lib/session';
import { getMember } from '@/lib/firestore';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import type { MemberProfile } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Set up your profile · iVi Forum',
};

interface OnboardingPageProps {
  /** Next 16: searchParams is a Promise — must be awaited. */
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** Editable subset of the member doc passed to the client (nothing private). */
function toInitialProfile(member: MemberProfile): Partial<MemberProfile> {
  return {
    name: member.name,
    photoUrl: member.photoUrl,
    linkedinUrl: member.linkedinUrl,
    headline: member.headline,
    about: member.about,
    location: member.location,
    cohort: member.cohort,
    startupName: member.startupName,
    startupDescription: member.startupDescription,
    startupWebsite: member.startupWebsite,
    currentTitle: member.currentTitle,
    currentCompany: member.currentCompany,
    skills: member.skills ?? [],
    experience: member.experience ?? [],
    education: member.education ?? [],
  };
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const user = await requireUser(); // redirects when unauthenticated
  const sp = await searchParams;
  const member = await getMember(user.id);

  // Edit mode only makes sense when there's an existing member doc to edit.
  const editMode = sp.edit === '1' && member !== null;
  const userName = member?.name?.trim() || user.name?.trim() || 'there';

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {editMode && (
          <header className="mb-6">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
              Your profile
            </p>
            <h1 className="mt-2 font-serif text-3xl font-medium leading-[1.1] text-heading sm:text-4xl">
              Edit your profile
            </h1>
            <p className="mt-4 max-w-prose text-ink">
              Update anything below — changes go live in the directory as soon as you save.
            </p>
          </header>
        )}
        <OnboardingFlow
          userName={userName}
          editMode={editMode}
          initialProfile={member ? toInitialProfile(member) : null}
        />
      </div>
    </main>
  );
}
