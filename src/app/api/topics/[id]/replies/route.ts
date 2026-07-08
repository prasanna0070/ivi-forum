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
import { createReply, getMember, getReply } from '@/lib/firestore';
import { notifyReplyCreated } from '@/lib/notifications';
import { requireUserApi } from '@/lib/session';
import { sanitizeImagePaths } from '@/lib/images';
import { extractMentionUids, sanitizeMentionUids, MAX_MENTIONS } from '@/components/forum/mentions';
import { REPLY_MAX_DEPTH } from '@/lib/forum';

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
  if (body.length > 5000) {
    return NextResponse.json(
      { ok: false, error: 'body must be at most 5,000 characters' },
      { status: 400 },
    );
  }
  const images = sanitizeImagePaths(payload.images, user.id);
  // A reply must carry text OR at least one image.
  if (body.length < 1 && images.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'add a message or an image' },
      { status: 400 },
    );
  }

  // Threading: an optional parentId nests this reply. Depth is computed from the
  // parent server-side (never trusted from the client) and clamped.
  const parentIdRaw = typeof payload.parentId === 'string' ? payload.parentId : null;

  // Mentions: the saved body is the source of truth (anti-injection); a client
  // mentionUids claim, if present, narrows the body-derived set to the
  // intersection, else every uid found in the body is stored.
  const bodyMentionUids = extractMentionUids(body);
  const claimedMentionUids = new Set(sanitizeMentionUids(payload.mentionUids));
  const mentionUids = (
    claimedMentionUids.size > 0
      ? bodyMentionUids.filter((uid) => claimedMentionUids.has(uid))
      : bodyMentionUids
  ).slice(0, MAX_MENTIONS);

  try {
    // Denormalized author fields come from the member profile, never the client.
    const member = await getMember(user.id);
    if (!member) {
      return NextResponse.json({ ok: false, error: 'profile-not-found' }, { status: 403 });
    }

    let parentId: string | null = null;
    let depth = 0;
    if (parentIdRaw) {
      const parent = await getReply(topicId, parentIdRaw);
      if (!parent || parent.topicId !== topicId) {
        return NextResponse.json({ ok: false, error: 'parent reply not found' }, { status: 400 });
      }
      parentId = parent.id;
      depth = Math.min((parent.depth ?? 0) + 1, REPLY_MAX_DEPTH);
    }

    const reply = await createReply(topicId, {
      body,
      images,
      parentId,
      depth,
      mentionUids,
      authorUid: user.id,
      authorName: member.name,
      authorPhotoUrl: member.photoUrl,
    });
    if (!reply) {
      return NextResponse.json({ ok: false, error: 'topic-not-found' }, { status: 404 });
    }
    // Awaited inline (not fire-and-forget) because Cloud Run throttles CPU after
    // the response is sent; notifyReplyCreated never throws, so the 200 is safe.
    await notifyReplyCreated(topicId, reply);

    return NextResponse.json({ ok: true, id: reply.id });
  } catch (err) {
    console.error(`POST /api/topics/${topicId}/replies failed`, err);
    return NextResponse.json({ ok: false, error: 'server-error' }, { status: 500 });
  }
}
