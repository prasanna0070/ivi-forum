/**
 * POST /api/uploads — upload one forum image (multipart/form-data, field `file`).
 *
 * Member-gated. Validates content-type + size, stores it under the caller's
 * namespace in the private uploads bucket, and returns the object path the
 * composer then attaches to a topic/reply.
 * → 200 { ok:true, path } | 400 | 401 | 503 uploads off | 500
 */
import { NextResponse } from 'next/server';
import { requireUserApi } from '@/lib/session';
import { uploadPostImage, uploadsConfigured } from '@/lib/storage';
import { ALLOWED_IMAGE_TYPES, IMAGE_TYPES_LABEL, MAX_IMAGE_BYTES } from '@/lib/images';

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
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, error: 'image too large — max 5 MB' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const path = await uploadPostImage(user.id, buffer, file.type);
    return NextResponse.json({ ok: true, path });
  } catch (err) {
    console.error('POST /api/uploads failed', err);
    return NextResponse.json({ ok: false, error: 'server-error' }, { status: 500 });
  }
}
