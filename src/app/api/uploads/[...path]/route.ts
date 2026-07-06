/**
 * GET /api/uploads/<posts/uid/uuid.ext> — serve a stored forum image.
 *
 * The bucket is private; this route streams the bytes back to signed-in members.
 * Access is gated by the auth proxy (this path is in proxy.ts's matcher, which
 * 401s unauthenticated /api requests), so any member may view any post's images
 * — no per-object ownership check. The path shape is validated to prevent
 * traversal / reads of arbitrary objects.
 */
import { NextResponse } from 'next/server';
import { readPostImage, uploadsConfigured } from '@/lib/storage';
import { isStoredImagePath } from '@/lib/images';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!uploadsConfigured()) {
    return new NextResponse('Not found', { status: 404 });
  }
  const { path } = await params;
  const objectPath = (path ?? []).join('/');
  if (!isStoredImagePath(objectPath)) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const img = await readPostImage(objectPath);
    if (!img) return new NextResponse('Not found', { status: 404 });
    return new NextResponse(new Uint8Array(img.buffer), {
      status: 200,
      headers: {
        'Content-Type': img.contentType,
        // Object names are content-unique (uuid) → safe to cache hard.
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error(`GET /api/uploads/${objectPath} failed`, err);
    return new NextResponse('Not found', { status: 404 });
  }
}
