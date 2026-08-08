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
import {
  ALLOWED_IMAGE_TYPES,
  AVATAR_PREFIX,
  MAX_AVATAR_BYTES,
  POST_PREFIX,
} from '@/lib/images';

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
 * Upload an image buffer to `<prefix>/<uid>/<uuid>.<ext>`; returns the path.
 * Throws `unsupported-type` for a content-type outside ALLOWED_IMAGE_TYPES.
 */
async function uploadImage(
  prefix: string,
  uid: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const ext = ALLOWED_IMAGE_TYPES[contentType];
  if (!ext) throw new Error('unsupported-type');
  const path = `${prefix}/${uid}/${randomUUID()}.${ext}`;
  await storage.bucket(BUCKET).file(path).save(buffer, {
    contentType,
    metadata: { cacheControl: 'public, max-age=31536000, immutable' },
  });
  return path;
}

/** Upload a forum post attachment → `posts/<uid>/<uuid>.<ext>`. */
export function uploadPostImage(
  uid: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  return uploadImage(POST_PREFIX, uid, buffer, contentType);
}

/** Upload a member profile photo → `avatars/<uid>/<uuid>.<ext>`. */
export function uploadAvatarImage(
  uid: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  return uploadImage(AVATAR_PREFIX, uid, buffer, contentType);
}

/**
 * Hosts we're willing to fetch a profile photo from, server-side.
 *
 * This is an allowlist rather than "any URL the member typed" on purpose:
 * fetching an arbitrary user-supplied URL from inside Cloud Run is a textbook
 * SSRF — the GCP metadata server (169.254.169.254) hands out service-account
 * tokens to anything that can make it issue a request. LinkedIn's CDN is the
 * only host we actually need to mirror from; members who want a different
 * photo now upload it directly, which never involves a server-side fetch.
 */
const MIRRORABLE_HOSTS = [/(^|\.)licdn\.com$/i];

/**
 * Copy a remote profile photo into our own bucket; returns the stored path,
 * or null if it couldn't be mirrored.
 *
 * WHY THIS EXISTS: LinkedIn serves profile pictures as SIGNED, EXPIRING URLs
 * (`…?e=<unix-expiry>&v=beta&t=<sig>`) with roughly five weeks of life. Storing
 * the URL we scraped means every member's photo silently starts 403ing about a
 * month after they onboard, and the directory quietly degrades to a wall of
 * initials — which is precisely what happened to 6 of the first 10 members
 * (all sharing an e=2026-07-23 expiry). Taking our own copy at save time is the
 * only durable fix; the stored object never expires.
 *
 * Best-effort by design: any failure (non-allowlisted host, timeout, non-image,
 * oversized) returns null so the caller can keep the original URL rather than
 * drop the member's photo entirely.
 */
export async function mirrorRemoteAvatar(uid: string, url: string): Promise<string | null> {
  if (!uploadsConfigured()) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (!MIRRORABLE_HOSTS.some((re) => re.test(parsed.hostname))) return null;

  try {
    const res = await fetch(parsed.toString(), {
      // Never chase a redirect — an allowlisted host could otherwise bounce us
      // at an internal address and reintroduce the SSRF this guards against.
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_IMAGE_TYPES[contentType]) return null;

    const declared = Number(res.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_AVATAR_BYTES) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    // Re-check after download: content-length is a hint, not a guarantee.
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_AVATAR_BYTES) return null;

    return await uploadAvatarImage(uid, buffer, contentType);
  } catch (err) {
    console.error(`[storage] could not mirror avatar for ${uid}:`, err);
    return null;
  }
}

/** Read a stored image object (post attachment or avatar); null if missing. */
export async function readStoredImage(
  path: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const file = storage.bucket(BUCKET).file(path);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [meta] = await file.getMetadata();
  const [buffer] = await file.download();
  return { buffer, contentType: meta.contentType || 'application/octet-stream' };
}
