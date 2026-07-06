"use client";

/**
 * Blocking cookie-consent gate.
 *
 * Mounted in the root layout, so on a visitor's first arrival it overlays every
 * page — including the landing page that hosts the sign-in card. The page paints
 * behind a dimmed + blurred backdrop but stays uninteractive until "Accept &
 * continue" is clicked, i.e. consent is required *before* browsing or logging in.
 *
 * The choice is remembered in a first-party cookie (`ivi_cookie_consent`, 1yr),
 * so the gate never reappears once accepted. This app sets only essential
 * cookies — the NextAuth session cookie and this consent cookie — so there is
 * nothing optional to reject; a single accept is the honest, complete choice.
 *
 * Consent lives in the cookie itself, read via `useSyncExternalStore`: the
 * server snapshot reports "consented" so nothing renders during SSR (no gate
 * flash for returning visitors, no hydration mismatch), then the client reads
 * the real cookie on hydration and shows the gate only when it's absent.
 */
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Cookie } from "lucide-react";

const CONSENT_COOKIE = "ivi_cookie_consent";
const ONE_YEAR = 60 * 60 * 24 * 365;

function hasConsent(): boolean {
  return document.cookie
    .split("; ")
    .some((c) => c.startsWith(`${CONSENT_COOKIE}=`));
}

function persistConsent() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=1; path=/; max-age=${ONE_YEAR}; SameSite=Lax${secure}`;
}

// Tiny external store over the consent cookie so accepting re-renders the gate.
const listeners = new Set<() => void>();
const consentStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  getSnapshot: () => hasConsent(),
  getServerSnapshot: () => true, // SSR: assume consented → render nothing
  notify: () => listeners.forEach((l) => l()),
};

export default function CookieConsent() {
  const consented = useSyncExternalStore(
    consentStore.subscribe,
    consentStore.getSnapshot,
    consentStore.getServerSnapshot,
  );
  const open = !consented;
  const acceptRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll + focus the primary action while the gate is up.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    acceptRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function accept() {
    persistConsent();
    consentStore.notify();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-brand-dark/60 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-md rounded-card border border-border bg-white p-6 shadow-pop sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-surface text-brand">
            <Cookie size={22} strokeWidth={2} aria-hidden="true" />
          </span>
          <h2
            id="cookie-consent-title"
            className="font-serif text-xl font-medium text-heading"
          >
            Cookies on iVi Forum
          </h2>
        </div>

        <p id="cookie-consent-desc" className="mt-4 text-[15px] leading-relaxed text-ink">
          We use only <span className="font-semibold">essential cookies</span> —
          one to keep you signed in, and one to remember this choice. No tracking,
          no ads, no third-party analytics. By continuing you agree to these
          essential cookies.
        </p>

        <details className="mt-4 text-sm text-muted">
          <summary className="cursor-pointer font-semibold text-brand hover:text-brand-light">
            What cookies we use
          </summary>
          <ul className="mt-2 space-y-1.5 pl-1">
            <li>
              <span className="font-semibold text-ink">Session</span> — keeps you
              signed in to your member account (set only after you log in).
            </li>
            <li>
              <span className="font-semibold text-ink">Consent</span> — remembers
              that you accepted this notice, so it doesn&apos;t show again.
            </li>
          </ul>
        </details>

        <button
          ref={acceptRef}
          type="button"
          onClick={accept}
          className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-brand bg-brand px-6 text-base font-semibold text-white transition-colors hover:bg-brand-light active:bg-brand-dark"
        >
          Accept &amp; continue
        </button>
      </div>
    </div>
  );
}
