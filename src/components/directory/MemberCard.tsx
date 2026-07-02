'use client';

import Link from 'next/link';
import Avatar from '@/components/Avatar';
import LinkedInIcon from '@/components/directory/LinkedInIcon';
import type { MemberProfile } from '@/lib/types';

const SKILLS_PREVIEW = 3;

/**
 * One directory card (ISB flat-card recipe: 6px radius, #cfdbe2 hairline, no
 * shadow, border brightens to #245bff on hover). The whole card navigates to
 * the member's profile via a stretched <Link> overlay (keeps the markup free
 * of nested anchors); the LinkedIn icon sits above it (z-10) and opens
 * linkedinUrl instead.
 */
export default function MemberCard({ member }: { member: MemberProfile }) {
  const skills = member.skills.slice(0, SKILLS_PREVIEW);
  const extraSkills = member.skills.length - skills.length;
  const subline = [member.startupName, member.location].filter(Boolean).join(' · ');

  return (
    <div className="group relative h-full rounded-card border border-border bg-white p-5 transition-colors hover:border-brand-light sm:p-6">
      <Link
        href={`/profile/${member.uid}`}
        aria-label={`View ${member.name}’s profile`}
        className="absolute inset-0 z-0 rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light"
      />

      <div className="flex items-start gap-4">
        <Avatar src={member.photoUrl} name={member.name} size={56} className="shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-serif text-lg font-semibold text-heading transition-colors group-hover:text-brand-light">
              {member.name}
            </h3>
            {member.linkedinUrl && (
              <a
                href={member.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label={`${member.name} on LinkedIn`}
                className="relative z-10 -m-1 rounded-input p-1 text-muted transition-colors hover:text-brand-light"
              >
                <LinkedInIcon className="h-4 w-4" />
              </a>
            )}
          </div>

          {member.headline && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink">{member.headline}</p>
          )}

          {(member.cohort || subline) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
              {member.cohort && (
                <span className="inline-flex items-center rounded-input border border-border bg-white px-2 py-0.5 text-xs font-semibold text-brand">
                  Cohort {member.cohort}
                </span>
              )}
              {subline && <span className="truncate text-xs text-muted">{subline}</span>}
            </div>
          )}
        </div>
      </div>

      {skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-input border border-border bg-surface px-2.5 py-0.5 text-xs text-ink"
            >
              {skill}
            </span>
          ))}
          {extraSkills > 0 && (
            <span className="rounded-input px-1.5 py-0.5 text-xs text-muted">+{extraSkills}</span>
          )}
        </div>
      )}
    </div>
  );
}
