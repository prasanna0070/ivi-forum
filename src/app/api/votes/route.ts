/**
 * POST /api/votes — cast / toggle / flip a vote (SPEC vote-toggle semantics).
 *
 * Body: { targetType: 'topic'|'reply', targetId: string, topicId: string, value: 1|-1 }
 * → 200 { ok: true, upCount, downCount, score, myVote } | 400 | 401 | 404 | 500
 *
 * The transaction itself lives in `castVote` (@/lib/firestore): same-direction
 * click removes the vote, opposite direction flips it, counters stay atomic.
 */
import { NextResponse } from 'next/server';
import { castVote } from '@/lib/firestore';
import { requireUserApi } from '@/lib/session';
import type { VoteTargetType, VoteValue } from '@/lib/types';

/** Firestore doc-id safety: non-empty, no path separators, sane length. */
function isValidId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 256 && !id.includes('/');
}

export async function POST(request: Request) {
  const user = await requireUserApi();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid-json' }, { status: 400 });
  }
  const payload = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const { targetType, targetId, topicId, value } = payload;
  if (targetType !== 'topic' && targetType !== 'reply') {
    return NextResponse.json(
      { ok: false, error: "targetType must be 'topic' or 'reply'" },
      { status: 400 },
    );
  }
  if (!isValidId(targetId) || !isValidId(topicId)) {
    return NextResponse.json(
      { ok: false, error: 'targetId and topicId must be valid ids' },
      { status: 400 },
    );
  }
  if (targetType === 'topic' && targetId !== topicId) {
    return NextResponse.json(
      { ok: false, error: 'targetId must equal topicId when targetType is topic' },
      { status: 400 },
    );
  }
  if (value !== 1 && value !== -1) {
    return NextResponse.json({ ok: false, error: 'value must be 1 or -1' }, { status: 400 });
  }

  try {
    const result = await castVote(
      user.id,
      targetType as VoteTargetType,
      targetId,
      topicId,
      value as VoteValue,
    );
    if (!result) {
      return NextResponse.json({ ok: false, error: 'target-not-found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('POST /api/votes failed', err);
    return NextResponse.json({ ok: false, error: 'server-error' }, { status: 500 });
  }
}
