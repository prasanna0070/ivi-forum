/**
 * Shared image constants + validators for forum post attachments.
 * Safe to import from BOTH client and server (no server-only deps).
 */

export const MAX_IMAGES = 4;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

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

/**
 * A stored image path is `posts/<uid>/<uuid>.<ext>`. Structural check only
 * (uid = UUID, object = UUID + allowed ext) — used by the serve route to reject
 * traversal/arbitrary-object reads.
 */
export function isStoredImagePath(path: unknown): path is string {
  if (typeof path !== 'string') return false;
  const parts = path.split('/');
  if (parts.length !== 3) return false;
  const [prefix, owner, file] = parts;
  if (prefix !== 'posts') return false;
  if (!/^[a-f0-9-]{36}$/.test(owner)) return false;
  return /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(file);
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
