'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            strokeWidth={2}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-placeholder"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, startup, skills…"
            aria-label="Search members"
            className="w-full rounded-input border border-border bg-white py-2.5 pl-10 pr-3 text-base text-ink transition-colors placeholder:text-placeholder focus:border-heading focus:[outline:2px_solid_rgba(30,45,140,0.3)] focus:[outline-offset:-2px]"
          />
        </div>

        {/* Squared cohort chips — 44px tap height on mobile, edge-to-edge snap-scroll if they overflow */}
        <div
          role="group"
          aria-label="Filter by cohort"
          className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {COHORT_CHIPS.map((chip) => {
            const active = cohort === chip.value;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => setCohort(chip.value)}
                aria-pressed={active}
                className={`inline-flex min-h-11 shrink-0 snap-start items-center rounded-input border px-4 text-sm font-semibold transition-colors md:min-h-9 ${
                  active
                    ? 'border-brand bg-brand text-white'
                    : 'border-border bg-white text-brand hover:border-brand-light hover:text-brand-light'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-5 text-sm text-muted">
        {members.length} member{members.length === 1 ? '' : 's'} · {shown.length} shown
      </p>

      {shown.length === 0 ? (
        <div className="mt-6 rounded-card border border-border bg-white px-6 py-16 text-center">
          <p className="font-serif text-lg font-medium text-heading">
            No members match — try another search.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((member) => (
            <MemberCard key={member.uid} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
