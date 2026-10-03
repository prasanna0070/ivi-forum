"use client";

/**
 * Step 2 of joining: prove you're part of I-Venture @ ISB. The member is
 * already signed in with Google; they type their ISB address (student @isb.edu
 * or alumni @ivi.isb.edu), get a 6-digit code there, and enter it. That links
 * the Google account to their membership for good.
 *
 * Post-verify navigation is a hard `window.location.assign` on purpose — a soft
 * router.push raced the auth proxy redirect and wedged the client (see git
 * history). A real navigation loads the member area cleanly every time.
 */
import { useState } from "react";
import { signOut } from "next-auth/react";
import IviArrow from "@/components/IviArrow";

type Step = "email" | "code";

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

export default function VerifyIsbCard({
  googleEmail,
  otpEnabled,
}: {
  googleEmail: string;
  otpEnabled: boolean;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (res.ok && data?.ok) {
        setSentTo(email.trim().toLowerCase());
        setStep("code");
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
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/isb/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: sentTo, code: code.trim() }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; next?: string }
        | null;
      if (res.ok && data?.ok) {
        window.location.assign(data.next || "/");
        return;
      }
      setError(data?.error ?? "That code is invalid or expired — check it or resend.");
      setPending(false);
    } catch {
      setError("Something went wrong — please try again.");
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-card border border-border bg-white p-6 shadow-card sm:p-8">
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-brand-light">
        Step 2 of 4
      </p>
      {!otpEnabled ? (
        <p className="mt-2 text-sm text-muted">
          ISB email verification isn&apos;t switched on yet. Please check back soon.
        </p>
      ) : step === "email" ? (
        <form onSubmit={requestCode} className="mt-2 flex flex-col gap-4">
          <div>
            <h2 className="font-serif text-xl font-medium text-heading">
              Confirm you&apos;re from ISB
            </h2>
            <p className="mt-1 text-sm text-muted">
              Enter your ISB email and we&apos;ll send a 6-digit code to it. Your
              student address (<span className="font-semibold text-ink">@isb.edu</span>)
              or your iVi alumni address (
              <span className="font-semibold text-ink">@ivi.isb.edu</span>) both work.
              You only do this once.
            </p>
          </div>
          <label className={labelClass}>
            ISB email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="firstname_lastname_202502@ivi.isb.edu"
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
      ) : (
        <form onSubmit={verifyCode} className="mt-2 flex flex-col gap-4">
          <div>
            <h2 className="font-serif text-xl font-medium text-heading">Enter your code</h2>
            <p className="mt-1 text-sm text-muted">
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-ink">{sentTo}</span>.
            </p>
            <p className="mt-2 rounded-input border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-muted">
              Don&apos;t see it? Check your{" "}
              <span className="font-semibold text-ink">Spam / Junk</span> folder — ISB
              mail often files a first-time sender there.
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
            {pending ? "Verifying…" : "Verify"}
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
                setStep("email");
                setError(null);
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
        Signed in with Google as <span className="font-semibold text-ink">{googleEmail}</span>.{" "}
        <button
          type="button"
          onClick={() => void signOut({ redirectTo: "/" })}
          className="font-semibold text-brand underline hover:text-brand-light"
        >
          Use another account
        </button>
      </p>
    </div>
  );
}
