'use client';

/**
 * Progress theater shown while POST /api/scrape runs (one long 20–60s
 * request). The status lines rotate on a pure client-side timer — they don't
 * reflect real progress, they just keep the wait warm.
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Skeleton from '@/components/Skeleton';

const STATUS_LINES = [
  'Reading your LinkedIn…',
  'Pulling your experience…',
  'Tracing your education…',
  'Collecting your skills…',
  'Building your profile…',
  'Polishing the details…',
] as const;

const LINE_INTERVAL_MS = 5000;

export function ScrapeProgress() {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      // Advance to the last line and hold there — the request decides when we're done.
      setLineIndex((i) => Math.min(i + 1, STATUS_LINES.length - 1));
    }, LINE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-card border border-border bg-white p-6 sm:p-8">
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
        Setting up your profile
      </p>
      <h1 className="mt-2 font-serif text-2xl font-medium text-heading sm:text-3xl">
        Building your profile
      </h1>

      <div className="mt-4 flex items-center gap-3">
        <Loader2 aria-hidden strokeWidth={2} className="h-5 w-5 shrink-0 animate-spin text-brand" />
        <p key={lineIndex} role="status" aria-live="polite" className="animate-pulse font-medium text-brand">
          {STATUS_LINES[lineIndex]}
        </p>
      </div>
      <p className="mt-2 text-sm text-muted">This usually takes under a minute — hang tight.</p>

      {/* Ghost of the profile being assembled */}
      <div className="mt-8 space-y-6" aria-hidden>
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-none" />
          <Skeleton className="h-6 w-24 rounded-none" />
          <Skeleton className="h-6 w-16 rounded-none" />
          <Skeleton className="h-6 w-28 rounded-none" />
        </div>
      </div>
    </div>
  );
}
