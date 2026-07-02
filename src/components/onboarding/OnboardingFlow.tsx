'use client';

/**
 * Client orchestrator for /onboarding — three steps:
 *   1. 'linkedin' — welcome + LinkedIn URL input (skipped entirely in edit mode)
 *   2. 'scraping' — progress theater while POST /api/scrape runs
 *   3. 'form'     — editable profile form (prefilled from scrape / existing member)
 */
import { useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';
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
          <div
            role="status"
            className="flex items-start gap-3 rounded-card border border-border bg-surface-2 px-4 py-3 text-sm text-ink"
          >
            <Info aria-hidden strokeWidth={2} className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <p>{scrapeError}</p>
          </div>
        )}
        <ProfileForm initialValues={formValues} editMode={editMode} />
      </div>
    );
  }

  // ------------------------------------------------ Step 1: LinkedIn URL
  return (
    <div className="rounded-card border border-border bg-white p-6 sm:p-10">
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
        Set up your profile
      </p>
      <h1 className="mt-2 font-serif text-3xl font-semibold leading-[1.1] text-heading sm:text-4xl">
        Welcome, {userName}
      </h1>
      <p className="mt-4 max-w-prose text-ink">
        Drop your LinkedIn URL and we&apos;ll build your profile for you.
      </p>

      <form onSubmit={handleScrape} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">LinkedIn profile URL</span>
          <input
            type="text"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://www.linkedin.com/in/your-name"
            autoFocus
            className="min-h-[44px] w-full rounded-input border border-border bg-white px-3 py-2.5 text-base text-ink transition-colors placeholder:text-placeholder focus:border-heading focus:[outline:2px_solid_rgba(30,45,140,0.3)] focus:[outline-offset:-2px]"
          />
        </label>
        {urlError && (
          <p role="alert" className="text-sm text-danger">
            {urlError}
          </p>
        )}
        <button
          type="submit"
          className="group inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-none border border-brand bg-brand px-6 py-3 text-base font-semibold text-white transition-colors hover:border-brand-light hover:bg-brand-light active:bg-brand-dark sm:w-auto"
        >
          Build my profile
          <ArrowRight
            aria-hidden
            strokeWidth={2}
            className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-[8px]"
          />
        </button>
      </form>

      <p className="mt-6 text-sm">
        <button
          type="button"
          onClick={skipToEmptyForm}
          className="text-muted underline decoration-border underline-offset-[3px] transition-colors hover:text-brand-light"
        >
          Skip — I&apos;ll fill it in manually
        </button>
      </p>
    </div>
  );
}
