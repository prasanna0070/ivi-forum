'use client';

/**
 * VoteWidget — the ▲ score ▼ column used for both topics and replies.
 *
 * Optimistic: clicking computes the expected toggle result locally (same
 * semantics as `castVote` in @/lib/firestore), POSTs /api/votes, then
 * reconciles with the server's fresh VoteResult; on failure it reverts and
 * shows a transient error.
 */
import { useEffect, useRef, useState } from 'react';
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

function Arrow({ direction, className }: { direction: 'up' | 'down'; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      {direction === 'up' ? (
        <path d="M12 5.5 20 17H4l8-11.5Z" />
      ) : (
        <path d="M12 18.5 4 7h16l-8 11.5Z" />
      )}
    </svg>
  );
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

  const arrowSize = compact ? 'h-4 w-4' : 'h-5 w-5';
  const buttonPad = compact ? 'p-0.5' : 'p-1';
  const scoreColor =
    state.myVote === 1 ? 'text-brand-light' : state.myVote === -1 ? 'text-accent' : 'text-ink';

  return (
    <div className="relative flex shrink-0 flex-col items-center self-start">
      <button
        type="button"
        onClick={() => vote(1)}
        disabled={pending}
        aria-label="Upvote"
        aria-pressed={state.myVote === 1}
        className={`rounded-md ${buttonPad} transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-light disabled:opacity-60 ${
          state.myVote === 1 ? 'text-brand-light' : 'text-neutral-400 hover:text-ink'
        }`}
      >
        <Arrow direction="up" className={arrowSize} />
      </button>
      <span
        aria-live="polite"
        className={`select-none font-semibold tabular-nums ${compact ? 'text-xs' : 'text-sm'} ${scoreColor}`}
      >
        {state.score}
      </span>
      <button
        type="button"
        onClick={() => vote(-1)}
        disabled={pending}
        aria-label="Downvote"
        aria-pressed={state.myVote === -1}
        className={`rounded-md ${buttonPad} transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-light disabled:opacity-60 ${
          state.myVote === -1 ? 'text-accent' : 'text-neutral-400 hover:text-ink'
        }`}
      >
        <Arrow direction="down" className={arrowSize} />
      </button>
      {error && (
        <span
          role="status"
          className="absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600"
        >
          {error}
        </span>
      )}
    </div>
  );
}
