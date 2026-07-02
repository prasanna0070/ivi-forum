'use client';

/**
 * VoteWidget — the up / score / down column used for both topics and replies.
 *
 * Optimistic: clicking computes the expected toggle result locally (same
 * semantics as `castVote` in @/lib/firestore), POSTs /api/votes, then
 * reconciles with the server's fresh VoteResult; on failure it reverts and
 * shows a transient error.
 */
import { useEffect, useRef, useState } from 'react';
import { ArrowBigDown, ArrowBigUp } from 'lucide-react';
import type { VoteTargetType, VoteValue } from '@/lib/types';

interface VoteWidgetProps {
  targetType: VoteTargetType;
  targetId: string;
  topicId: string;
  score: number;
  myVote: VoteValue | null;
  compact?: boolean;
}

interface VoteState {
  score: number;
  myVote: VoteValue | null;
}

/** Mirror of the server toggle: same direction removes, opposite flips. */
function toggle(state: VoteState, value: VoteValue): VoteState {
  if (state.myVote === value) return { score: state.score - value, myVote: null };
  if (state.myVote === null) return { score: state.score + value, myVote: value };
  return { score: state.score + 2 * value, myVote: value };
}

export default function VoteWidget({
  targetType,
  targetId,
  topicId,
  score,
  myVote,
  compact = false,
}: VoteWidgetProps) {
  const [state, setState] = useState<VoteState>({ score, myVote });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-seed local state when the server re-renders with fresh values
  // (e.g. after router.refresh()). Render-phase "derived state" pattern.
  const serverKey = `${score}|${myVote ?? 0}`;
  const [seenKey, setSeenKey] = useState(serverKey);
  if (serverKey !== seenKey) {
    setSeenKey(serverKey);
    if (!pending) setState({ score, myVote });
  }

  useEffect(() => {
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    };
  }, []);

  function flashError(message: string) {
    setError(message);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 2500);
  }

  async function vote(value: VoteValue) {
    if (pending) return;
    const previous = state;
    setState(toggle(previous, value)); // optimistic
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, topicId, value }),
      });
      const data: { ok?: boolean; score?: number; myVote?: VoteValue | null } | null = await res
        .json()
        .catch(() => null);
      if (!res.ok || !data?.ok || typeof data.score !== 'number') {
        throw new Error('vote-failed');
      }
      // Reconcile with server truth.
      setState({ score: data.score, myVote: data.myVote ?? null });
    } catch {
      setState(previous); // revert
      flashError("Couldn't save vote");
    } finally {
      setPending(false);
    }
  }

  const upActive = state.myVote === 1;
  const downActive = state.myVote === -1;
  const iconSize = compact ? 18 : 20;
  const scoreColor = upActive ? 'text-brand-light' : downActive ? 'text-muted' : 'text-ink';

  // ISB line-icon language: 2px stroke, round caps, currentColor. Tap targets
  // stay ≥44px on mobile via spacing, tightening on desktop for density.
  const tapClass =
    'flex items-center justify-center rounded-card transition-colors ' +
    'min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-[32px] ' +
    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-heading/40 ' +
    'disabled:opacity-60';

  return (
    <div className="relative flex shrink-0 flex-col items-center self-start">
      <button
        type="button"
        onClick={() => vote(1)}
        disabled={pending}
        aria-label="Upvote"
        aria-pressed={upActive}
        className={`${tapClass} ${
          upActive ? 'text-brand-light' : 'text-placeholder hover:bg-surface-2 hover:text-brand'
        }`}
      >
        <ArrowBigUp strokeWidth={2} width={iconSize} height={iconSize} aria-hidden="true" />
      </button>
      <span
        aria-live="polite"
        className={`select-none font-semibold leading-none tabular-nums ${
          compact ? 'text-xs' : 'text-sm'
        } ${scoreColor}`}
      >
        {state.score}
      </span>
      <button
        type="button"
        onClick={() => vote(-1)}
        disabled={pending}
        aria-label="Downvote"
        aria-pressed={downActive}
        className={`${tapClass} ${
          downActive ? 'text-muted' : 'text-placeholder hover:bg-surface-2 hover:text-brand'
        }`}
      >
        <ArrowBigDown strokeWidth={2} width={iconSize} height={iconSize} aria-hidden="true" />
      </button>
      {error && (
        <span
          role="status"
          className="absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded-input bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger"
        >
          {error}
        </span>
      )}
    </div>
  );
}
