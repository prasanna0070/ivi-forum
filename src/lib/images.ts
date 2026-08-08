/**
 * Shared image constants + validators for forum post attachments.
 * Safe to import from BOTH client and server (no server-only deps).
 */

export const MAX_IMAGES = 4;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
/** Profile photos are one small square — no reason to accept a 5 MB original. */
export const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3 MB

/** Allowed upload content-types → canonical file extension. */
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Human list for error/help copy. */
export const IMAGE_TYPES_LABEL = 'JPEG, PNG, WebP or GIF';

/** `accept` attribute for the file picker. */
export const IMAGE_ACCEPT = Object.keys(ALLOWED_IMAGE_TYPES).join(',');

/** App-relative URL that serves a stored image object. */
export function imageSrc(path: string): string {
  return `/api/uploads/${path}`;
}

/** Object-path namespaces in the uploads bucket. */
export const POST_PREFIX = 'posts';
export const AVATAR_PREFIX = 'avatars';

/**
 * Stored object paths are `<prefix>/<uid>/<uuid>.<ext>`. Structural check only
 * (uid = UUID, object = UUID + allowed ext) — used by the serve route to reject
 * traversal/arbitrary-object reads.
 */
function isStoredPath(path: unknown, prefix: string): path is string {
  if (typeof path !== 'string') return false;
  const parts = path.split('/');
  if (parts.length !== 3) return false;
  const [got, owner, file] = parts;
  if (got !== prefix) return false;
  if (!/^[a-f0-9-]{36}$/.test(owner)) return false;
  return /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(file);
}

/** `posts/<uid>/<uuid>.<ext>` — a forum post attachment. */
export function isStoredImagePath(path: unknown): path is string {
  return isStoredPath(path, POST_PREFIX);
}

/** `avatars/<uid>/<uuid>.<ext>` — a member profile photo. */
export function isStoredAvatarPath(path: unknown): path is string {
  return isStoredPath(path, AVATAR_PREFIX);
}

/** Anything the serve route is allowed to stream back. */
export function isServableObjectPath(path: unknown): path is string {
  return isStoredImagePath(path) || isStoredAvatarPath(path);
}

/**
 * Resolve a member's stored `photoUrl` to something an <img> can load.
 *
 * Two shapes are legal, because member photos arrive two ways:
 *   - `avatars/<uid>/<uuid>.<ext>` — ours, in the uploads bucket. Served back
 *     through /api/uploads. This is the shape we want everyone on.
 *   - an absolute http(s) URL — a legacy LinkedIn hotlink. These are SIGNED AND
 *     EXPIRING (see mirrorRemoteAvatar in lib/storage) and will 403 sooner or
 *     later; passed through so existing profiles keep rendering until their
 *     next save mirrors them.
 * Anything else resolves to null → Avatar draws its initials circle.
 */
export function avatarSrc(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isStoredAvatarPath(value)) return imageSrc(value);
  return /^https?:\/\//i.test(value) ? value : null;
}

/**
 * Filter a client-sent images array down to well-formed paths OWNED by `uid`
 * (a member can only attach their own uploads), de-duped and capped at
 * MAX_IMAGES. Used server-side on topic/reply create.
 */
export function sanitizeImagePaths(input: unknown, uid: string): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of input) {
    if (isStoredImagePath(p) && p.startsWith(`posts/${uid}/`) && !seen.has(p)) {
      seen.add(p);
      out.push(p);
      if (out.length >= MAX_IMAGES) break;
    }
  }
  return out;
}
