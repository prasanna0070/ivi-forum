'use client';

/**
 * Client orchestrator for /onboarding — three steps:
 *   1. 'linkedin' — welcome + LinkedIn URL input (skipped entirely in edit mode)
 *   2. 'scraping' — progress theater while POST /api/scrape runs
 *   3. 'form'     — editable profile form (prefilled from scrape / existing member)
 */
import { useState } from 'react';
import Card from '@/components/Card';
import { ProfileForm } from '@/components/onboarding/ProfileForm';
import { ScrapeProgress } from '@/components/onboarding/ScrapeProgress';
import { toFormValues, type ProfileFormValues } from '@/components/onboarding/formValues';
import type { MemberProfile } from '@/lib/types';

type Step = 'linkedin' | 'scraping' | 'form';

interface OnboardingFlowProps {
  /** Display name from signup — greets the user and seeds the form. */
  userName: string;
  /** True for `/onboarding?edit=1`: jump straight to the form, no scrape. */
  editMode: boolean;
  /** Existing member doc (editable subset) — the form's initial data in edit mode. */
  initialProfile: Partial<MemberProfile> | null;
}

export function OnboardingFlow({ userName, editMode, initialProfile }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>(editMode ? 'form' : 'linkedin');
  const [linkedinUrl, setLinkedinUrl] = useState(initialProfile?.linkedinUrl ?? '');
  const [formValues, setFormValues] = useState<ProfileFormValues>(() =>
    toFormValues(editMode ? initialProfile : null, userName),
  );
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  function skipToEmptyForm() {
    setScrapeError(null);
    setFormValues(toFormValues(null, userName));
    setStep('form');
  }

  async function handleScrape(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const url = linkedinUrl.trim();
    if (!url) {
      setUrlError('Paste your LinkedIn profile URL first — or skip below.');
      return;
    }
    setUrlError(null);
    setScrapeError(null);
    setStep('scraping');

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedinUrl: url }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; prefill?: Partial<MemberProfile>; error?: string }
        | null;

      if (res.ok && data?.ok && data.prefill) {
        setFormValues(toFormValues({ linkedinUrl: url, ...data.prefill }, userName));
        setStep('form');
        return;
      }

      // Scrape failure is non-fatal — land on the empty form with a friendly banner.
      setScrapeError(data?.error ?? "Couldn't read your LinkedIn — no stress, fill what you like.");
      setFormValues(toFormValues({ linkedinUrl: url }, userName));
      setStep('form');
    } catch {
      setScrapeError("Couldn't read your LinkedIn — no stress, fill what you like.");
      setFormValues(toFormValues({ linkedinUrl: url }, userName));
      setStep('form');
    }
  }

  // ------------------------------------------------ Step 2: progress theater
  if (step === 'scraping') {
    return <ScrapeProgress />;
  }

  // ------------------------------------------------ Step 3: the form
  if (step === 'form') {
    return (
      <div className="space-y-6">
        {scrapeError && (
          <p
            role="status"
            className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-ink"
          >
            {scrapeError}
          </p>
        )}
        <ProfileForm initialValues={formValues} editMode={editMode} />
      </div>
    );
  }

  // ------------------------------------------------ Step 1: LinkedIn URL
  return (
    <Card className="p-6 sm:p-10">
      <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
        Welcome, {userName} <span aria-hidden>👋</span>
      </h1>
      <p className="mt-3 max-w-prose text-neutral-600">
        Drop your LinkedIn URL and we&apos;ll build your profile for you.
      </p>

      <form onSubmit={handleScrape} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">LinkedIn profile URL</span>
          <input
            type="text"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://www.linkedin.com/in/your-name"
            autoFocus
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-neutral-400 focus:border-brand-light focus:outline-none focus:ring-2 focus:ring-brand-light/20"
          />
        </label>
        {urlError && (
          <p role="alert" className="text-sm text-red-600">
            {urlError}
          </p>
        )}
        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-light sm:w-auto"
        >
          Build my profile
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-500">
        <button
          type="button"
          onClick={skipToEmptyForm}
          className="underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-brand"
        >
          skip — I&apos;ll fill it manually
        </button>
      </p>
    </Card>
  );
}
