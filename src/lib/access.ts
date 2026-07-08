/**
 * Membership gate — who is allowed into the community.
 *
 * Controlled by two env vars (both optional, comma-separated):
 *   ALLOWED_EMAIL_DOMAINS=isb.edu           → only these email domains may join
 *   ALLOWED_EMAILS=someone@gmail.com,...     → specific extra addresses (allowlist)
 *
 * If BOTH are empty/unset, the gate is OPEN (any email) — the original behaviour.
 * A configured domain also admits its subdomains, so a single `isb.edu` entry
 * covers ISB subdomains like `@ivi.isb.edu` (alumni IDs) too.
 * Used by the password signup route and the OTP request route, so both entry
 * paths enforce the same policy (no back door).
 *
 * Pure + dependency-free so it's safe to import anywhere.
 */
function csv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!e.includes("@")) return false;

  const domains = csv(process.env.ALLOWED_EMAIL_DOMAINS);
  const allowlist = csv(process.env.ALLOWED_EMAILS);

  // Unconfigured → open (keeps local dev / self-hosters frictionless).
  if (domains.length === 0 && allowlist.length === 0) return true;

  if (allowlist.includes(e)) return true;

  const domain = e.split("@")[1] ?? "";
  // Match the exact domain OR any subdomain of it, so one "isb.edu" entry also
  // admits ISB's subdomains — e.g. alumni on "@ivi.isb.edu". The leading dot is
  // required so "isb.edu" never matches a lookalike like "notisb.edu".
  return domains.some((d) => domain === d || domain.endsWith(`.${d}`));
}
