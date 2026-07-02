import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Avatar from '@/components/Avatar';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import LinkedInIcon from '@/components/directory/LinkedInIcon';
import { getMember } from '@/lib/firestore';
import { requireMember } from '@/lib/session';
import type { MemberProfile } from '@/lib/types';

export const metadata: Metadata = { title: 'Profile · iVi Forum' };

/** Ensure startupWebsite renders as a clickable absolute URL. */
function toHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function MemberNotFound() {
  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <Card className="p-10 text-center">
          <h1 className="font-display text-xl font-semibold text-ink">
            This member hasn’t joined yet
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            We couldn’t find a profile at this address — it may have moved, or they haven’t
            signed up.
          </p>
          <Link
            href="/directory"
            className="mt-6 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-light"
          >
            Back to directory
          </Link>
        </Card>
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
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/directory"
          className="mb-4 inline-block text-sm text-ink/50 transition-colors hover:text-brand"
        >
          ← Back to directory
        </Link>

        <div className="space-y-4">
          {/* Header card */}
          <Card className="p-6 sm:p-8">
            <div className="flex flex-col items-start gap-5 sm:flex-row">
              <Avatar src={member.photoUrl} name={member.name} size={96} className="shrink-0" />

              <div className="min-w-0 flex-1">
                <h1 className="font-display text-2xl font-semibold text-ink">{member.name}</h1>
                {member.headline && <p className="mt-1 text-ink/70">{member.headline}</p>}

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/50">
                  {member.location && <span>{member.location}</span>}
                  {member.location && member.cohort && <span aria-hidden="true">·</span>}
                  {member.cohort && <Badge variant="brand">Cohort {member.cohort}</Badge>}
                </div>

                {(member.currentTitle || member.currentCompany) && (
                  <p className="mt-2 text-sm text-ink/60">
                    {[member.currentTitle, member.currentCompany].filter(Boolean).join(' · ')}
                  </p>
                )}

                {counts.length > 0 && (
                  <p className="mt-2 text-xs text-ink/40">{counts.join(' · ')}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {member.linkedinUrl && (
                    <a
                      href={member.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-brand px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand hover:text-white"
                    >
                      <LinkedInIcon className="h-4 w-4" />
                      LinkedIn
                    </a>
                  )}
                  {isOwn && (
                    <Link
                      href="/onboarding?edit=1"
                      className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-light"
                    >
                      Edit profile
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {hasAbout && (
            <SectionCard title="About">
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">
                {member.about}
              </p>
            </SectionCard>
          )}

          {hasStartup && (
            <SectionCard title="Startup">
              {member.startupName && (
                <p className="font-medium text-ink">{member.startupName}</p>
              )}
              {member.startupDescription && (
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink/70">
                  {member.startupDescription}
                </p>
              )}
              {member.startupWebsite && (
                <a
                  href={toHref(member.startupWebsite)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-brand-light hover:underline"
                >
                  {member.startupWebsite.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                </a>
              )}
            </SectionCard>
          )}

          {hasExperience && (
            <SectionCard title="Experience">
              <ol className="relative ml-1.5 space-y-6 border-l border-ink/10 pl-6">
                {member.experience.map((item, i) => (
                  <li key={`${item.title}-${item.company}-${i}`} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[30.5px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-light"
                    />
                    <p className="font-medium text-ink">{item.title}</p>
                    {item.company && <p className="text-sm text-ink/70">{item.company}</p>}
                    {(item.duration || item.location) && (
                      <p className="mt-0.5 text-xs text-ink/40">
                        {[item.duration, item.location].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {item.description && (
                      <p className="mt-1.5 line-clamp-4 text-sm leading-relaxed text-ink/60">
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
              <ul className="space-y-4">
                {member.education.map((item, i) => (
                  <li key={`${item.school}-${i}`}>
                    <p className="font-medium text-ink">{item.school}</p>
                    {(item.degree || item.fieldOfStudy) && (
                      <p className="text-sm text-ink/70">
                        {[item.degree, item.fieldOfStudy].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {item.period && <p className="mt-0.5 text-xs text-ink/40">{item.period}</p>}
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
                    className="rounded-full border border-ink/10 bg-surface px-3 py-1 text-sm text-ink/70"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {isThin && (
            <Card className="p-8 text-center">
              <p className="text-sm text-ink/50">
                More coming as {firstName} fills out their profile.
              </p>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
