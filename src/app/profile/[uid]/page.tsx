import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, MapPin, Pencil } from 'lucide-react';
import Avatar from '@/components/Avatar';
import LinkedInIcon from '@/components/directory/LinkedInIcon';
import { getMember } from '@/lib/firestore';
import { requireMember } from '@/lib/session';
import type { MemberProfile } from '@/lib/types';

export const metadata: Metadata = { title: 'Profile · iVi Forum' };

/** Ensure startupWebsite renders as a clickable absolute URL. */
function toHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

/** Squared ISB cohort chip (outline badge recipe: 2px radius, #cfdbe2 hairline). */
function CohortChip({ cohort }: { cohort: number }) {
  return (
    <span className="inline-flex items-center rounded-input border border-border bg-white px-2 py-0.5 text-xs font-semibold text-brand">
      Cohort {cohort}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-white p-6 sm:p-7">
      <h2 className="font-serif text-xl font-semibold text-heading sm:text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MemberNotFound() {
  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="rounded-card border border-border bg-white p-10 text-center">
          <h1 className="font-serif text-2xl font-semibold text-heading">
            This member hasn’t joined yet
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            We couldn’t find a profile at this address — it may have moved, or they haven’t
            signed up.
          </p>
          <Link
            href="/directory"
            className="group mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-brand bg-brand px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-light"
          >
            <ArrowLeft
              strokeWidth={2}
              aria-hidden="true"
              className="h-4 w-4 transition-transform group-hover:-translate-x-1"
            />
            Back to directory
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function ProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { user } = await requireMember();
  const { uid } = await params;

  if (uid === 'me') redirect(`/profile/${user.id}`);

  const member: MemberProfile | null = await getMember(uid);
  if (!member) return <MemberNotFound />;

  const isOwn = user.id === uid;
  const firstName = member.name.split(' ')[0];

  const hasAbout = Boolean(member.about?.trim());
  const hasStartup = Boolean(
    member.startupName || member.startupDescription || member.startupWebsite,
  );
  const hasExperience = member.experience.length > 0;
  const hasEducation = member.education.length > 0;
  const hasSkills = member.skills.length > 0;
  const isThin = !hasAbout && !hasStartup && !hasExperience && !hasEducation && !hasSkills;

  const counts = [
    member.followerCount != null && `${member.followerCount.toLocaleString()} followers`,
    member.connectionCount != null && `${member.connectionCount.toLocaleString()} connections`,
  ].filter(Boolean) as string[];

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/directory"
          className="group mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-light"
        >
          <ArrowLeft
            strokeWidth={2}
            aria-hidden="true"
            className="h-4 w-4 transition-transform group-hover:-translate-x-1"
          />
          Back to directory
        </Link>

        <div className="space-y-5 sm:space-y-6">
          {/* Header card */}
          <div className="rounded-card border border-border bg-white p-6 sm:p-8">
            <div className="flex flex-col items-start gap-5 sm:flex-row">
              <Avatar src={member.photoUrl} name={member.name} size={96} className="shrink-0" />

              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-3xl font-semibold text-heading sm:text-4xl">
                  {member.name}
                </h1>
                {member.headline && (
                  <p className="mt-1.5 text-base leading-relaxed text-ink">{member.headline}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted">
                  {member.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin strokeWidth={2} aria-hidden="true" className="h-4 w-4" />
                      {member.location}
                    </span>
                  )}
                  {member.location && member.cohort && <span aria-hidden="true">·</span>}
                  {member.cohort && <CohortChip cohort={member.cohort} />}
                </div>

                {(member.currentTitle || member.currentCompany) && (
                  <p className="mt-2 text-sm text-muted">
                    {[member.currentTitle, member.currentCompany].filter(Boolean).join(' · ')}
                  </p>
                )}

                {counts.length > 0 && (
                  <p className="mt-2 text-xs text-muted">{counts.join(' · ')}</p>
                )}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  {member.linkedinUrl && (
                    <a
                      href={member.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-brand border border-brand px-6 py-3 text-base font-semibold text-brand transition-colors hover:border-brand-light hover:text-brand-light sm:w-auto"
                    >
                      <LinkedInIcon className="h-4 w-4" />
                      LinkedIn
                      <ArrowUpRight
                        strokeWidth={2}
                        aria-hidden="true"
                        className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
                      />
                    </a>
                  )}
                  {isOwn && (
                    <Link
                      href="/onboarding?edit=1"
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-brand border border-brand px-6 py-3 text-base font-semibold text-brand transition-colors hover:border-brand-light hover:text-brand-light sm:w-auto"
                    >
                      <Pencil strokeWidth={2} aria-hidden="true" className="h-4 w-4" />
                      Edit profile
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {hasAbout && (
            <SectionCard title="About">
              <p className="whitespace-pre-line text-base leading-relaxed text-ink">
                {member.about}
              </p>
            </SectionCard>
          )}

          {hasStartup && (
            <SectionCard title="Startup">
              {member.startupName && (
                <p className="font-semibold text-ink">{member.startupName}</p>
              )}
              {member.startupDescription && (
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">
                  {member.startupDescription}
                </p>
              )}
              {member.startupWebsite && (
                <a
                  href={toHref(member.startupWebsite)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-light transition-colors hover:text-brand"
                >
                  <span className="underline underline-offset-4">
                    {member.startupWebsite.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                  </span>
                  <ArrowUpRight
                    strokeWidth={2}
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </a>
              )}
            </SectionCard>
          )}

          {hasExperience && (
            <SectionCard title="Experience">
              <ol className="relative space-y-6 border-l border-border pl-6">
                {member.experience.map((item, i) => (
                  <li key={`${item.title}-${item.company}-${i}`} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-white"
                    />
                    <p className="font-semibold text-ink">{item.title}</p>
                    {item.company && <p className="text-sm text-muted">{item.company}</p>}
                    {(item.duration || item.location) && (
                      <p className="mt-0.5 text-xs text-muted">
                        {[item.duration, item.location].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {item.description && (
                      <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-ink">
                        {item.description}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </SectionCard>
          )}

          {hasEducation && (
            <SectionCard title="Education">
              <ul className="divide-y divide-border">
                {member.education.map((item, i) => (
                  <li key={`${item.school}-${i}`} className="py-4 first:pt-0 last:pb-0">
                    <p className="font-semibold text-ink">{item.school}</p>
                    {(item.degree || item.fieldOfStudy) && (
                      <p className="text-sm text-muted">
                        {[item.degree, item.fieldOfStudy].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {item.period && <p className="mt-0.5 text-xs text-muted">{item.period}</p>}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {hasSkills && (
            <SectionCard title="Skills">
              <div className="flex flex-wrap gap-2">
                {member.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-input border border-border bg-white px-3 py-1 text-sm text-brand"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {isThin && (
            <div className="rounded-card border border-border bg-white p-8 text-center">
              <p className="text-sm text-muted">
                More coming as {firstName} fills out their profile.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
