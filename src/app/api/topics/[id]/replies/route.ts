/**
 * POST /api/topics/[id]/replies — create a reply on a topic.
 *
 * Body: { body: string (1..5000) }
 * → 200 { ok: true, id } | 400 | 401 | 403 | 404 topic missing | 500
 *
 * `createReply` bumps the parent topic's replyCount + lastActivityAt in the
 * same Firestore transaction (see @/lib/firestore).
 */
import { NextResponse } from 'next/server';
import { createReply, getMember } from '@/lib/firestore';
import { requireUserApi } from '@/lib/session';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUserApi();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { id: topicId } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid-json' }, { status: 400 });
  }
  const payload = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (body.length < 1 || body.length > 5000) {
    return NextResponse.json(
      { ok: false, error: 'body must be 1–5,000 characters' },
      { status: 400 },
    );
  }

  try {
    // Denormalized author fields come from the member profile, never the client.
    const member = await getMember(user.id);
    if (!member) {
      return NextResponse.json({ ok: false, error: 'profile-not-found' }, { status: 403 });
    }

    const reply = await createReply(topicId, {
      body,
      authorUid: user.id,
      authorName: member.name,
      authorPhotoUrl: member.photoUrl,
    });
    if (!reply) {
      return NextResponse.json({ ok: false, error: 'topic-not-found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id: reply.id });
  } catch (err) {
    console.error(`POST /api/topics/${topicId}/replies failed`, err);
    return NextResponse.json({ ok: false, error: 'server-error' }, { status: 500 });
  }
}
