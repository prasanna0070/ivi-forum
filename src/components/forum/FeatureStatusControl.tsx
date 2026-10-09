'use client';

/**
 * Admin-only status picker on a feature request's page. Saves on change
 * (PATCH /api/requests/<id>) and refreshes the page so the badge and lists
 * update.
 */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FEATURE_STATUSES, FEATURE_STATUS_LABEL } from '@/lib/features';
import type { FeatureStatus } from '@/lib/types';

export default function FeatureStatusControl({
  topicId,
  status,
}: {
  topicId: string;
  status: FeatureStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState<FeatureStatus>(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: FeatureStatus) {
    const previous = value;
    setValue(next);
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${encodeURIComponent(topicId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.refresh();
    } catch {
      setValue(previous);
      setError("Couldn't update the status. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-input border border-border bg-surface px-3 py-2">
      <label htmlFor={`status-${topicId}`} className="text-sm font-semibold text-ink">
        Status <span className="font-normal text-muted">(admin)</span>
      </label>
      <select
        id={`status-${topicId}`}
        value={value}
        disabled={pending}
        onChange={(event) => void save(event.target.value as FeatureStatus)}
        className="min-h-[36px] rounded-input border border-border bg-white px-2 text-sm text-ink focus:border-heading focus:outline-2 focus:-outline-offset-2 focus:outline-heading/30 disabled:opacity-60"
      >
        {FEATURE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {FEATURE_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-muted">Saving…</span>}
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
