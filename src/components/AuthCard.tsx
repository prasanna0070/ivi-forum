"use client";

/**
 * Sign-in card for the landing page.
 *
 * When email OTP is configured (`otpEnabled`), the verified passwordless flow is
 * primary: enter ISB email → get a 6-digit code → verify → in. Email + password
 * remains available as a fallback for existing accounts. When OTP isn't
 * configured, only the password tabs show.
 *
 * Post-auth navigation is a hard `window.location.assign` on purpose — a soft
 * router.push raced the auth proxy redirect and wedged the client (see git
 * history). A real navigation loads the member area cleanly every time.
 */
import { useState } from "react";
import { signIn } from "next-auth/react";
import IviArrow from "@/components/IviArrow";

type Tab = "signin" | "signup";
type Mode = "otp" | "password";
type OtpStep = "email" | "code";

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
  otpEnabled = false,
}: {
  otpEnabled?: boolean;
}) {
  // Password is the PRIMARY path: it needs no email delivery, so it works even
  // where ISB's Microsoft 365 tenant quarantines our sign-in codes (it does —
  // identical mail lands in Gmail but is held for @isb.edu). OTP stays as a
  // secondary option ("email code instead") for inboxes that do accept it.
  const [mode, setMode] = useState<Mode>("password");

  // shared
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP
  const [otpTab, setOtpTab] = useState<Tab>("signin");
  const [otpStep, setOtpStep] = useState<OtpStep>("email");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");

  // password
  const [tab, setTab] = useState<Tab>("signin");
  const [password, setPassword] = useState("");

  function resetMsgs() {
    setError(null);
  }

  // ── OTP ──────────────────────────────────────────────────────────────────
  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    resetMsgs();
    // On the Sign-up tab a name is required (it's what the new account is
    // created with); the Sign-in tab never asks for it.
    if (otpTab === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (res.ok && data?.ok) {
        setSentTo(email.trim().toLowerCase());
        setOtpStep("code");
        setCode("");
      } else {
        setError(data?.error ?? "Could not send a code — please try again.");
      }
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setPending(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    resetMsgs();
    setPending(true);
    try {
      const res = await signIn("otp", {
        email: sentTo,
        code: code.trim(),
        redirect: false,
      });
      if (res?.error) {
        setError("That code is invalid or expired — check it or resend.");
        setPending(false);
        return;
      }
      window.location.assign("/directory");
    } catch {
      setError("Something went wrong — please try again.");
      setPending(false);
    }
  }

  // ── password (fallback) ────────────────────────────────────────────────────
  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetMsgs();
    setPending(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("Wrong email or password.");
        setPending(false);
        return;
      }
      window.location.assign("/directory");
    } catch {
      setError("Something went wrong — please try again.");
      setPending(false);
    }
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetMsgs();
    setPending(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (res.status === 409) {
        setError("An account with this email already exists — sign in instead.");
        setPending(false);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not create your account — please try again.");
        setPending(false);
        return;
      }
      const login = await signIn("credentials", { email, password, redirect: false });
      if (login?.error) {
        setTab("signin");
        setError("Account created — please sign in.");
        setPending(false);
        return;
      }
      window.location.assign("/onboarding");
    } catch {
      setError("Something went wrong — please try again.");
      setPending(false);
    }
  }

  const cardClass =
    "w-full max-w-md rounded-card border border-border bg-white p-6 shadow-card sm:p-8";

  // ── OTP mode ───────────────────────────────────────────────────────────────
  if (otpEnabled && mode === "otp") {
    const isSignup = otpTab === "signup";
    return (
      <div className={cardClass}>
        {otpStep === "email" ? (
          <>
            {/* Sign in / Sign up chooser */}
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
                  onClick={() => {
                    setOtpTab(key);
                    resetMsgs();
                  }}
                  aria-pressed={otpTab === key}
                  className={`relative -mb-px flex-1 px-3 py-3 text-sm font-semibold transition-colors ${
                    otpTab === key ? "text-brand" : "text-muted hover:text-brand"
                  }`}
                >
                  {label}
                  {otpTab === key && (
                    <span className="absolute inset-x-0 bottom-0 h-[3px] bg-brand" />
                  )}
                </button>
              ))}
            </div>

            <form onSubmit={requestCode} className="flex flex-col gap-4">
              <div>
                <h2 className="font-serif text-xl font-medium text-heading">
                  {isSignup ? "Create your account" : "Welcome back"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {isSignup
                    ? "Enter your name and ISB email — we'll send a 6-digit code to verify it. Membership is limited to I-Venture @ ISB (@isb.edu)."
                    : "Enter your ISB email and we'll send a 6-digit code to sign you in."}
                </p>
              </div>
              {isSignup && (
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
              )}
              <label className={labelClass}>
                ISB email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@isb.edu"
                  className={`mt-1.5 ${inputClass}`}
                />
              </label>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button type="submit" disabled={pending} className={submitClass}>
                {pending && <Spinner />}
                {pending ? "Sending code…" : "Email me a code"}
                {!pending && (
                  <IviArrow
                    dir="right"
                    size={20}
                    className="transition-transform duration-200 group-hover:translate-x-2"
                  />
                )}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={verifyCode} className="flex flex-col gap-4">
            <div>
              <h2 className="font-serif text-xl font-medium text-heading">
                Enter your code
              </h2>
              <p className="mt-1 text-sm text-muted">
                We sent a 6-digit code to{" "}
                <span className="font-semibold text-ink">{sentTo}</span>.
              </p>
              <p className="mt-2 rounded-input border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-muted">
                Don&apos;t see it? Check your{" "}
                <span className="font-semibold text-ink">Spam / Junk</span> folder
                — ISB mail often files a first-time sender there. Mark it{" "}
                <span className="font-semibold text-ink">Not junk</span> so future
                codes land in your inbox.
              </p>
            </div>
            <label className={labelClass}>
              6-digit code
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className={`mt-1.5 text-center text-2xl tracking-[0.4em] ${inputClass}`}
                autoFocus
              />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" disabled={pending} className={submitClass}>
              {pending && <Spinner />}
              {pending ? "Verifying…" : "Verify & sign in"}
              {!pending && (
                <IviArrow
                  dir="right"
                  size={20}
                  className="transition-transform duration-200 group-hover:translate-x-2"
                />
              )}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setOtpStep("email");
                  resetMsgs();
                }}
                className="text-muted underline hover:text-brand-light"
              >
                Change email
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => requestCode()}
                className="text-muted underline hover:text-brand-light disabled:opacity-60"
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 border-t border-border pt-4 text-center text-sm text-muted">
          Have a password?{" "}
          <button
            type="button"
            onClick={() => {
              setMode("password");
              resetMsgs();
            }}
            className="font-semibold text-brand underline hover:text-brand-light"
          >
            Sign in with password
          </button>
        </p>
      </div>
    );
  }

  // ── Password mode ──────────────────────────────────────────────────────────
  return (
    <div className={cardClass}>
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
            onClick={() => {
              setTab(key);
              resetMsgs();
            }}
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
              placeholder="you@isb.edu"
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
              <IviArrow
                dir="right"
                size={20}
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
              placeholder="you@isb.edu"
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
              <IviArrow
                dir="right"
                size={20}
                className="transition-transform duration-200 group-hover:translate-x-2"
              />
            )}
          </button>
        </form>
      )}

      {otpEnabled && (
        <p className="mt-6 border-t border-border pt-4 text-center text-sm text-muted">
          <button
            type="button"
            onClick={() => {
              setMode("otp");
              setOtpStep("email");
              resetMsgs();
            }}
            className="font-semibold text-brand underline hover:text-brand-light"
          >
            Sign in with an email code instead
          </button>
        </p>
      )}
    </div>
  );
}
