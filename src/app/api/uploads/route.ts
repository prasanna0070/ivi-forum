/**
 * POST /api/uploads — upload one image (multipart/form-data, field `file`).
 *
 * Optional field `kind`:
 *   "post"   (default) — a forum attachment → posts/<uid>/…, 5 MB cap
 *   "avatar"           — a profile photo   → avatars/<uid>/…, 3 MB cap
 *
 * Member-gated. Validates content-type + size, stores it under the caller's
 * namespace in the private uploads bucket, and returns the object path the
 * composer (or the onboarding form) then saves.
 * → 200 { ok:true, path } | 400 | 401 | 503 uploads off | 500
 */
import { NextResponse } from 'next/server';
import { requireUserApi } from '@/lib/session';
import { uploadAvatarImage, uploadPostImage, uploadsConfigured } from '@/lib/storage';
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_TYPES_LABEL,
  MAX_AVATAR_BYTES,
  MAX_IMAGE_BYTES,
} from '@/lib/images';

export async function POST(request: Request) {
  const user = await requireUserApi();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!uploadsConfigured()) {
    return NextResponse.json({ ok: false, error: 'image uploads are not enabled' }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid-form' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'no file' }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES[file.type]) {
    return NextResponse.json(
      { ok: false, error: `unsupported image — use ${IMAGE_TYPES_LABEL}` },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ ok: false, error: 'empty file' }, { status: 400 });
  }

  const isAvatar = form.get('kind') === 'avatar';
  const maxBytes = isAvatar ? MAX_AVATAR_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { ok: false, error: `image too large — max ${Math.round(maxBytes / (1024 * 1024))} MB` },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const path = isAvatar
      ? await uploadAvatarImage(user.id, buffer, file.type)
      : await uploadPostImage(user.id, buffer, file.type);
    return NextResponse.json({ ok: true, path });
  } catch (err) {
    console.error('POST /api/uploads failed', err);
    return NextResponse.json({ ok: false, error: 'server-error' }, { status: 500 });
  }
}
