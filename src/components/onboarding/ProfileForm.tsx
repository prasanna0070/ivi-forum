'use client';

/**
 * Step 3 — the editable profile form. Prefilled from the scrape result (or
 * the existing member in edit mode); everything optional except name.
 * Save → POST /api/profile → /directory.
 */
import { useState } from 'react';
import { AlertCircle, Plus, X } from 'lucide-react';
import Avatar from '@/components/Avatar';
import IviArrow from '@/components/IviArrow';
import { ChipInput } from '@/components/onboarding/ChipInput';
import {
  EMPTY_EDUCATION_ROW,
  EMPTY_EXPERIENCE_ROW,
  toProfilePayload,
  type EducationFormRow,
  type ExperienceFormRow,
  type ProfileFormValues,
} from '@/components/onboarding/formValues';

// ---------------------------------------------------------------------------
// Small styled primitives (local to onboarding)
// ---------------------------------------------------------------------------

// Input recipe: 2px radius, hairline #cfdbe2 border, 16px font (iOS no-zoom),
// ISB focus ring (2px rgba(30,45,140,.3) outline inset + heading-blue border).
const inputClass =
  'w-full min-h-[44px] rounded-input border border-border bg-white px-3 py-2.5 text-base text-ink ' +
  'transition-colors placeholder:text-placeholder focus:border-heading ' +
  'focus:[outline:2px_solid_rgba(30,45,140,0.3)] focus:[outline-offset:-2px]';

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required && <span className="ml-0.5 text-brand-light">*</span>}
      </span>
      {children}
    </label>
  );
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-white p-6 sm:p-8">
      <h2 className="font-serif text-xl font-medium text-heading sm:text-2xl">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function RemoveRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mr-2 inline-flex min-h-[44px] items-center gap-1.5 px-2 text-sm font-medium text-muted transition-colors hover:text-danger"
    >
      <X aria-hidden strokeWidth={2} className="h-4 w-4" />
      {label}
    </button>
  );
}

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-none border border-brand bg-transparent px-5 py-2.5 text-sm font-semibold text-brand transition-colors hover:border-brand-light hover:text-brand-light sm:w-auto"
    >
      <Plus aria-hidden strokeWidth={2} className="h-5 w-5" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

interface ProfileFormProps {
  initialValues: ProfileFormValues;
  editMode: boolean;
}

export function ProfileForm({ initialValues, editMode }: ProfileFormProps) {
  const [values, setValues] = useState<ProfileFormValues>(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setExperienceRow(index: number, patch: Partial<ExperienceFormRow>) {
    setValues((v) => ({
      ...v,
      experience: v.experience.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function setEducationRow(index: number, patch: Partial<EducationFormRow>) {
    setValues((v) => ({
      ...v,
      education: v.education.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!values.name.trim()) {
      setError('Please tell us your name — it is the one required field.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toProfilePayload(values)),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && data?.ok) {
        // Hard navigation (not router.push+refresh) so the member area always
        // loads cleanly with fresh server state — see AuthCard for the race this
        // avoids. Keeps the button pending while the page reloads.
        window.location.assign('/directory');
        return;
      }
      setError(data?.error ?? 'Could not save your profile — please try again.');
      setSaving(false);
    } catch {
      setError('Could not save your profile — please check your connection and try again.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ------------------------------------------------ Basics */}
      <SectionCard title="Basics" hint="How you'll appear in the member directory.">
        <div className="flex items-center gap-4">
          <Avatar src={values.photoUrl || null} name={values.name || 'Member'} size={64} />
          <div className="flex-1">
            <Field label="Photo URL">
              <input
                type="url"
                value={values.photoUrl}
                onChange={(e) => set('photoUrl', e.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
            </Field>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" required>
            <input
              type="text"
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Your full name"
              required
              className={inputClass}
            />
          </Field>
          <Field label="Location">
            <input
              type="text"
              value={values.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Hyderabad, India"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Headline">
          <input
            type="text"
            value={values.headline}
            onChange={(e) => set('headline', e.target.value)}
            placeholder="Founder & CEO at …"
            className={inputClass}
          />
        </Field>
        <Field label="About">
          <textarea
            value={values.about}
            onChange={(e) => set('about', e.target.value)}
            placeholder="A few lines about you — what you're building, what you care about."
            rows={4}
            className={inputClass}
          />
        </Field>
        <Field label="LinkedIn URL">
          <input
            type="url"
            value={values.linkedinUrl}
            onChange={(e) => set('linkedinUrl', e.target.value)}
            placeholder="https://www.linkedin.com/in/…"
            className={inputClass}
          />
        </Field>
      </SectionCard>

      {/* ------------------------------------------------ iVi & startup */}
      <SectionCard title="iVi & your startup" hint="Your cohort and what you're building.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="iVi cohort">
            <select
              value={values.cohort}
              onChange={(e) => set('cohort', e.target.value as ProfileFormValues['cohort'])}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="1">Cohort 1</option>
              <option value="2">Cohort 2</option>
              <option value="3">Cohort 3</option>
              <option value="4">Cohort 4</option>
            </select>
          </Field>
          <Field label="Startup name">
            <input
              type="text"
              value={values.startupName}
              onChange={(e) => set('startupName', e.target.value)}
              placeholder="Acme Labs"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="What does it do?">
          <textarea
            value={values.startupDescription}
            onChange={(e) => set('startupDescription', e.target.value)}
            placeholder="One or two lines on the problem you're solving."
            rows={3}
            className={inputClass}
          />
        </Field>
        <Field label="Startup website">
          <input
            type="url"
            value={values.startupWebsite}
            onChange={(e) => set('startupWebsite', e.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
      </SectionCard>

      {/* ------------------------------------------------ Current role */}
      <SectionCard title="Current role">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title">
            <input
              type="text"
              value={values.currentTitle}
              onChange={(e) => set('currentTitle', e.target.value)}
              placeholder="Co-founder"
              className={inputClass}
            />
          </Field>
          <Field label="Company">
            <input
              type="text"
              value={values.currentCompany}
              onChange={(e) => set('currentCompany', e.target.value)}
              placeholder="Acme Labs"
              className={inputClass}
            />
          </Field>
        </div>
      </SectionCard>

      {/* ------------------------------------------------ Skills */}
      <SectionCard title="Skills" hint="Type a skill and press Enter — up to 30.">
        <ChipInput value={values.skills} onChange={(skills) => set('skills', skills)} />
      </SectionCard>

      {/* ------------------------------------------------ Experience */}
      <SectionCard title="Experience">
        {values.experience.length === 0 && (
          <p className="rounded-card border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-muted">
            No experience added yet — add a role if you like.
          </p>
        )}
        {values.experience.map((row, i) => (
          <div key={i} className="space-y-3 rounded-card border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Role {i + 1}
              </span>
              <RemoveRowButton
                label="Remove"
                onClick={() =>
                  set(
                    'experience',
                    values.experience.filter((_, idx) => idx !== i),
                  )
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={row.title}
                onChange={(e) => setExperienceRow(i, { title: e.target.value })}
                placeholder="Title"
                aria-label={`Experience ${i + 1} title`}
                className={inputClass}
              />
              <input
                type="text"
                value={row.company}
                onChange={(e) => setExperienceRow(i, { company: e.target.value })}
                placeholder="Company"
                aria-label={`Experience ${i + 1} company`}
                className={inputClass}
              />
              <input
                type="text"
                value={row.duration}
                onChange={(e) => setExperienceRow(i, { duration: e.target.value })}
                placeholder="Duration (e.g. 2022 – present)"
                aria-label={`Experience ${i + 1} duration`}
                className={inputClass}
              />
              <input
                type="text"
                value={row.location}
                onChange={(e) => setExperienceRow(i, { location: e.target.value })}
                placeholder="Location"
                aria-label={`Experience ${i + 1} location`}
                className={inputClass}
              />
            </div>
            <textarea
              value={row.description}
              onChange={(e) => setExperienceRow(i, { description: e.target.value })}
              placeholder="What did you do there?"
              aria-label={`Experience ${i + 1} description`}
              rows={2}
              className={inputClass}
            />
          </div>
        ))}
        {values.experience.length < 20 && (
          <AddRowButton
            label="Add experience"
            onClick={() => set('experience', [...values.experience, { ...EMPTY_EXPERIENCE_ROW }])}
          />
        )}
      </SectionCard>

      {/* ------------------------------------------------ Education */}
      <SectionCard title="Education">
        {values.education.length === 0 && (
          <p className="rounded-card border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-muted">
            No education added yet — add a school if you like.
          </p>
        )}
        {values.education.map((row, i) => (
          <div key={i} className="space-y-3 rounded-card border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                School {i + 1}
              </span>
              <RemoveRowButton
                label="Remove"
                onClick={() =>
                  set(
                    'education',
                    values.education.filter((_, idx) => idx !== i),
                  )
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={row.school}
                onChange={(e) => setEducationRow(i, { school: e.target.value })}
                placeholder="School (e.g. ISB)"
                aria-label={`Education ${i + 1} school`}
                className={inputClass}
              />
              <input
                type="text"
                value={row.degree}
                onChange={(e) => setEducationRow(i, { degree: e.target.value })}
                placeholder="Degree"
                aria-label={`Education ${i + 1} degree`}
                className={inputClass}
              />
              <input
                type="text"
                value={row.fieldOfStudy}
                onChange={(e) => setEducationRow(i, { fieldOfStudy: e.target.value })}
                placeholder="Field of study"
                aria-label={`Education ${i + 1} field of study`}
                className={inputClass}
              />
              <input
                type="text"
                value={row.period}
                onChange={(e) => setEducationRow(i, { period: e.target.value })}
                placeholder="Period (e.g. 2018 – 2020)"
                aria-label={`Education ${i + 1} period`}
                className={inputClass}
              />
            </div>
          </div>
        ))}
        {values.education.length < 20 && (
          <AddRowButton
            label="Add education"
            onClick={() => set('education', [...values.education, { ...EMPTY_EDUCATION_ROW }])}
          />
        )}
      </SectionCard>

      {/* ------------------------------------------------ Save */}
      {error && (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-card border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          <AlertCircle aria-hidden strokeWidth={2} className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Sticky action bar on mobile (long form); inline right-aligned on desktop. */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)_+_0.75rem)] sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-4">
        <div className="flex sm:justify-end">
          <button
            type="submit"
            disabled={saving}
            className="group inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-none border border-brand bg-brand px-6 py-3 text-base font-semibold text-white transition-colors hover:border-brand-light hover:bg-brand-light active:bg-brand-dark disabled:cursor-not-allowed disabled:border-[#c6c6c6] disabled:bg-transparent disabled:text-[#c6c6c6] sm:w-auto"
          >
            {saving ? 'Saving…' : editMode ? 'Save changes' : 'Save profile'}
            <IviArrow dir="right"
              aria-hidden
              strokeWidth={2}
              className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-[8px]"
            />
          </button>
        </div>
      </div>
    </form>
  );
}
