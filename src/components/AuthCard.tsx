"use client";

/**
 * Sign in / Sign up card for the landing page.
 * Sign up → POST /api/auth/signup → credentials signIn → /onboarding.
 * Sign in → credentials signIn → /directory.
 * Squared underline-bar tabs, recipe inputs (16px on mobile → no iOS zoom),
 * zero-radius CTA with an arrow that slides on hover.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight } from "lucide-react";

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

export default function AuthCard() {
  const router = useRouter();
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
      router.push("/directory");
      router.refresh();
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
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-card border border-border bg-white p-6 shadow-card sm:p-8">
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
              <ArrowRight
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
              <ArrowRight
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
