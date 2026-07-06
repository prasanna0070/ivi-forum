/**
 * Google Cloud Storage client for forum image uploads (server-side ONLY —
 * never import from a client component).
 *
 * Uses Application Default Credentials: on Cloud Run this is the runtime
 * service account (ivi-forum-run) which holds objectAdmin on the uploads
 * bucket. The bucket is PRIVATE (public access prevention enforced) — images
 * are read back and served through /api/uploads/[...path], never a public URL.
 */
import { randomUUID } from 'node:crypto';
import { Storage } from '@google-cloud/storage';
import { ALLOWED_IMAGE_TYPES } from '@/lib/images';

const BUCKET = process.env.UPLOADS_BUCKET || '';

// Singleton cached on globalThis so dev-mode hot reloads don't leak clients.
const globalForStorage = globalThis as unknown as { __iviStorage?: Storage };
export const storage: Storage =
  globalForStorage.__iviStorage ??
  new Storage({ projectId: process.env.GCP_PROJECT || undefined });
if (!globalForStorage.__iviStorage) globalForStorage.__iviStorage = storage;

/** Whether an uploads bucket is configured (feature is off without one). */
export function uploadsConfigured(): boolean {
  return BUCKET.length > 0;
}

/**
 * Upload an image buffer to `posts/<uid>/<uuid>.<ext>`; returns the object path.
 * Throws `unsupported-type` for a content-type outside ALLOWED_IMAGE_TYPES.
 */
export async function uploadPostImage(
  uid: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const ext = ALLOWED_IMAGE_TYPES[contentType];
  if (!ext) throw new Error('unsupported-type');
  const path = `posts/${uid}/${randomUUID()}.${ext}`;
  await storage.bucket(BUCKET).file(path).save(buffer, {
    contentType,
    metadata: { cacheControl: 'public, max-age=31536000, immutable' },
  });
  return path;
}

/** Read a stored image object; returns null if it doesn't exist. */
export async function readPostImage(
  path: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const file = storage.bucket(BUCKET).file(path);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [meta] = await file.getMetadata();
  const [buffer] = await file.download();
  return { buffer, contentType: meta.contentType || 'application/octet-stream' };
}
