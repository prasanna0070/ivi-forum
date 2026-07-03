"use client";

/**
 * Sign in / Sign up card for the landing page.
 * Sign up → POST /api/auth/signup → credentials signIn → /onboarding.
 * Sign in → credentials signIn → /directory.
 * Squared underline-bar tabs, recipe inputs (16px on mobile → no iOS zoom),
 * zero-radius CTA with an arrow that slides on hover.
 */
import { useState } from "react";
import { signIn } from "next-auth/react";
import IviArrow from "@/components/IviArrow";

type Tab = "signin" | "signup";

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
  );
}

const inputClass =
  "w-full rounded-input border border-border bg-white px-3 py-2.5 text-base text-ink placeholder:text-placeholder focus:border-heading focus:[outline:2px_solid_rgba(30,45,140,0.3)] focus:[outline-offset:-2px]";

const labelClass = "text-sm font-semibold text-ink";

const submitClass =
  "group mt-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-brand bg-brand px-6 text-base font-semibold text-white transition-colors hover:bg-brand-light active:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60";

export default function AuthCard({
  microsoftEnabled = false,
}: {
  microsoftEnabled?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function switchTab(next: Tab) {
    setTab(next);
    setError(null);
  }

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("Wrong email or password.");
        return;
      }
      // Hard navigation (full document load) on purpose. A soft router.push +
      // refresh here raced with the proxy's auth redirect and the landing's own
      // authed redirect, leaving the client stuck on a blank, dead page until a
      // manual reload. A real navigation loads /directory cleanly with the fresh
      // session cookie every time.
      window.location.assign("/directory");
      return;
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (res.status === 409) {
        setError("An account with this email already exists — sign in instead.");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not create your account — please try again.");
        return;
      }
      const login = await signIn("credentials", { email, password, redirect: false });
      if (login?.error) {
        // Account exists but auto-login failed — let them sign in manually.
        switchTab("signin");
        setError("Account created — please sign in.");
        return;
      }
      window.location.assign("/onboarding"); // hard nav — see handleSignIn note
      return;
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setPending(false);
    }
  }

  function handleMicrosoft() {
    setError(null);
    // Full OAuth redirect flow. New members land on /directory, which bounces
    // them to /onboarding when their profile isn't complete yet.
    void signIn("microsoft-entra-id", { callbackUrl: "/directory" });
  }

  return (
    <div className="w-full max-w-md rounded-card border border-border bg-white p-6 shadow-card sm:p-8">
      {microsoftEnabled && (
        <div className="mb-6">
          <button
            type="button"
            onClick={handleMicrosoft}
            className="group inline-flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-brand border border-border bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-brand hover:bg-surface-2"
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Continue with Microsoft
          </button>
          <p className="mt-2 text-center text-xs text-muted">
            Use your ISB email to verify you&apos;re part of the community.
          </p>
          <div className="mt-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            or with email
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}
      <div className="mb-6 flex border-b border-border">
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Sign up"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => switchTab(key)}
            aria-pressed={tab === key}
            className={`relative -mb-px flex-1 px-3 py-3 text-sm font-semibold transition-colors ${
              tab === key ? "text-brand" : "text-muted hover:text-brand"
            }`}
          >
            {label}
            {tab === key && (
              <span className="absolute inset-x-0 bottom-0 h-[3px] bg-brand" />
            )}
          </button>
        ))}
      </div>

      {tab === "signup" ? (
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <label className={labelClass}>
            Name
            <input
              type="text"
              required
              maxLength={80}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className={`mt-1.5 ${inputClass}`}
            />
          </label>
          <label className={labelClass}>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`mt-1.5 ${inputClass}`}
            />
          </label>
          <label className={labelClass}>
            Password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={`mt-1.5 ${inputClass}`}
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={pending} className={submitClass}>
            {pending && <Spinner />}
            {pending ? "Creating your account…" : "Create account"}
            {!pending && (
              <IviArrow dir="right"
                size={20}
                strokeWidth={2}
                className="transition-transform duration-200 group-hover:translate-x-2"
              />
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignIn} className="flex flex-col gap-4">
          <label className={labelClass}>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`mt-1.5 ${inputClass}`}
            />
          </label>
          <label className={labelClass}>
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className={`mt-1.5 ${inputClass}`}
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={pending} className={submitClass}>
            {pending && <Spinner />}
            {pending ? "Signing in…" : "Sign in"}
            {!pending && (
              <IviArrow dir="right"
                size={20}
                strokeWidth={2}
                className="transition-transform duration-200 group-hover:translate-x-2"
              />
            )}
          </button>
        </form>
      )}
    </div>
  );
}
