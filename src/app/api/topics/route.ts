/**
 * POST /api/topics — create a forum topic.
 *
 * Body: { title: string (1..200), body?: string (0..10000), tags?: string[] (≤5 slugs) }
 * → 200 { ok: true, id } | 400 { ok:false, error } | 401 | 403 | 500
 */
import { NextResponse } from 'next/server';
import { createTopic, getMember } from '@/lib/firestore';
import { notifyTopicCreated } from '@/lib/notifications';
import { requireUserApi } from '@/lib/session';
import { sanitizeTags } from '@/components/forum/tags';
import { extractMentionUids, sanitizeMentionUids, MAX_MENTIONS } from '@/components/forum/mentions';
import { sanitizeImagePaths } from '@/lib/images';

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

  // Titles are single-line and end up in email subjects — collapse control
  // characters (CR/LF included) so a crafted title can't smuggle MIME headers
  // into notification sends. Bodies keep their newlines (multi-line by design).
  const title =
    typeof payload.title === 'string'
      ? payload.title
          .replace(/[\u0000-\u001F\u007F-\u009F]+/g, ' ')
          .replace(/ {2,}/g, ' ')
          .trim()
      : '';
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
  const images = sanitizeImagePaths(payload.images, user.id);

  // Mentions: the body is the source of truth (anti-injection — we never store a
  // uid that isn't an @[Name](uid) token in the saved text). If the client sent a
  // mentionUids claim, we narrow to the intersection; otherwise we use every uid
  // found in the body, so mentions still persist even without the client array.
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

    const topic = await createTopic({
      title,
      body,
      tags,
      images,
      mentionUids,
      authorUid: user.id,
      authorName: member.name,
      authorPhotoUrl: member.photoUrl,
    });
    // Awaited inline (not fire-and-forget) because Cloud Run throttles CPU after
    // the response is sent; notifyTopicCreated never throws, so the 200 is safe.
    await notifyTopicCreated(topic);

    return NextResponse.json({ ok: true, id: topic.id });
  } catch (err) {
    console.error('POST /api/topics failed', err);
    return NextResponse.json({ ok: false, error: 'server-error' }, { status: 500 });
  }
}
