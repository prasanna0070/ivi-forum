'use client';

import Link from 'next/link';
import Avatar from '@/components/Avatar';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import LinkedInIcon from '@/components/directory/LinkedInIcon';
import type { MemberProfile } from '@/lib/types';

const SKILLS_PREVIEW = 3;

/**
 * One directory card. The whole card navigates to the member's profile via a
 * stretched <Link> overlay (keeps the markup free of nested anchors); the
 * LinkedIn icon sits above it (z-10) and opens linkedinUrl instead.
 */
export default function MemberCard({ member }: { member: MemberProfile }) {
  const skills = member.skills.slice(0, SKILLS_PREVIEW);
  const extraSkills = member.skills.length - skills.length;
  const subline = [member.startupName, member.location].filter(Boolean).join(' · ');

  return (
    <Card className="group relative h-full p-5 transition-colors hover:border-brand-light/50">
      <Link
        href={`/profile/${member.uid}`}
        aria-label={`View ${member.name}’s profile`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light"
      />

      <div className="flex items-start gap-4">
        <Avatar src={member.photoUrl} name={member.name} size={56} className="shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-display text-base font-semibold text-ink group-hover:text-brand">
              {member.name}
            </h3>
            {member.linkedinUrl && (
              <a
                href={member.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label={`${member.name} on LinkedIn`}
                className="relative z-10 -m-1 rounded p-1 text-ink/40 transition-colors hover:text-brand"
              >
                <LinkedInIcon className="h-4 w-4" />
              </a>
            )}
          </div>

          {member.headline && (
            <p className="mt-0.5 line-clamp-2 text-sm text-ink/70">{member.headline}</p>
          )}

          {(member.cohort || subline) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              {member.cohort && <Badge variant="brand">Cohort {member.cohort}</Badge>}
              {subline && <span className="truncate text-xs text-ink/50">{subline}</span>}
            </div>
          )}
        </div>
      </div>

      {skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-ink/10 bg-surface px-2.5 py-0.5 text-xs text-ink/70"
            >
              {skill}
            </span>
          ))}
          {extraSkills > 0 && (
            <span className="rounded-full px-1.5 py-0.5 text-xs text-ink/40">+{extraSkills}</span>
          )}
        </div>
      )}
    </Card>
  );
}
