/**
 * GET /api/members — member directory for @-mention autocomplete.
 *
 * Auth: member-gated via requireUserApi() (401 when signed out); the proxy
 *       matcher also guards this path.
 * Query: ?q= optional, case-insensitive. Matches when the full name — OR any
 *       word in it — starts with `q` (so typing a first OR last name works).
 * Response: 200 { ok: true, members: [{ uid, name, photoUrl }] }
 *           — capped at MENTION_RESULTS_LIMIT, ordered by name (listMembers is
 *           pre-sorted). 401 { ok:false } | 500 { ok:false }.
 */
import { NextResponse } from 'next/server';
import { listMembers } from '@/lib/firestore';
import { requireUserApi } from '@/lib/session';

/** Keep the dropdown short and the payload cheap. */
const MENTION_RESULTS_LIMIT = 8;

export async function GET(request: Request) {
  const user = await requireUserApi();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().toLowerCase();

  try {
    const members = await listMembers();
    const matched = q
      ? members.filter((m) => {
          const name = (m.name || '').toLowerCase();
          return name.startsWith(q) || name.split(/\s+/).some((w) => w.startsWith(q));
        })
      : members;

    const out = matched.slice(0, MENTION_RESULTS_LIMIT).map((m) => ({
      uid: m.uid,
      name: m.name,
      photoUrl: m.photoUrl,
    }));

    return NextResponse.json({ ok: true, members: out });
  } catch (err) {
    console.error('GET /api/members failed', err);
    return NextResponse.json({ ok: false, error: 'server-error' }, { status: 500 });
  }
}
