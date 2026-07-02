'use client';

import { useMemo, useState } from 'react';
import MemberCard from '@/components/directory/MemberCard';
import type { Cohort, MemberProfile } from '@/lib/types';

type CohortFilter = Cohort | 'all';

const COHORT_CHIPS: { value: CohortFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 1, label: 'C1' },
  { value: 2, label: 'C2' },
  { value: 3, label: 'C3' },
  { value: 4, label: 'C4' },
];

/** Case-insensitive match across name / startup / skills / company / headline. */
function matchesQuery(member: MemberProfile, q: string): boolean {
  const haystack = [
    member.name,
    member.startupName,
    member.currentCompany,
    member.headline,
    ...member.skills,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export default function DirectoryGrid({ members }: { members: MemberProfile[] }) {
  const [query, setQuery] = useState('');
  const [cohort, setCohort] = useState<CohortFilter>('all');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter(
      (m) => (cohort === 'all' || m.cohort === cohort) && (q === '' || matchesQuery(m, q)),
    );
  }, [members, query, cohort]);

  return (
    <div>
      {/* Top bar: search + cohort chips */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, startup, skills…"
            aria-label="Search members"
            className="w-full rounded-lg border border-ink/15 bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink/40 focus:border-brand-light focus:outline-none focus:ring-2 focus:ring-brand-light/25"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by cohort">
          {COHORT_CHIPS.map((chip) => {
            const active = cohort === chip.value;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => setCohort(chip.value)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-brand bg-brand text-white'
                    : 'border-ink/15 bg-white text-ink/60 hover:border-brand-light/50 hover:text-brand'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-sm text-ink/50">
        {members.length} member{members.length === 1 ? '' : 's'} · {shown.length} shown
      </p>

      {shown.length === 0 ? (
        <div className="mt-6 rounded-xl border border-ink/10 bg-white px-6 py-16 text-center">
          <p className="font-display text-base font-medium text-ink/70">
            No members match — try another search.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((member) => (
            <MemberCard key={member.uid} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
