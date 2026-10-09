/**
 * Community admins — who may set a feature request's status. Configured by the
 * ADMIN_UIDS env var (comma-separated member uids; Secret Manager
 * `ivi-forum-admin-uids` on Cloud Run). Server-only.
 */
export function adminUids(): string[] {
  return (process.env.ADMIN_UIDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdmin(uid: string | null | undefined): boolean {
  return Boolean(uid) && adminUids().includes(uid as string);
}
