/**
 * POST /api/topics — create a forum topic.
 *
 * Body: { title: string (1..200), body?: string (0..10000), tags?: string[] (≤5 slugs) }
 * → 200 { ok: true, id } | 400 { ok:false, error } | 401 | 403 | 500
 */
import { NextResponse } from 'next/server';
import { createTopic, getMember } from '@/lib/firestore';
import { requireUserApi } from '@/lib/session';
import { sanitizeTags } from '@/components/forum/tags';

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

  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (title.length < 1 || title.length > 200) {
    return NextResponse.json(
      { ok: false, error: 'title must be 1–200 characters' },
      { status: 400 },
    );
  }
  if (body.length > 10000) {
    return NextResponse.json(
      { ok: false, error: 'body must be at most 10,000 characters' },
      { status: 400 },
    );
  }
  const tags = sanitizeTags(payload.tags);

  try {
    // Denormalized author fields come from the member profile, never the client.
    const member = await getMember(user.id);
    if (!member) {
      return NextResponse.json({ ok: false, error: 'profile-not-found' }, { status: 403 });
    }

    const topic = await createTopic({
      title,
      body,
      tags,
      authorUid: user.id,
      authorName: member.name,
      authorPhotoUrl: member.photoUrl,
    });
    return NextResponse.json({ ok: true, id: topic.id });
  } catch (err) {
    console.error('POST /api/topics failed', err);
    return NextResponse.json({ ok: false, error: 'server-error' }, { status: 500 });
  }
}
