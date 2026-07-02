'use client';

/**
 * ReplyComposer — textarea + Reply button at the bottom of a thread.
 * POSTs /api/topics/[id]/replies, then clears and refreshes the page data.
 */
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';

export default function ReplyComposer({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || pending) return;

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/topics/${topicId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      });
      const data: { ok?: boolean; id?: string; error?: string } | null = await res
        .json()
        .catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? 'failed');
      setBody('');
      router.refresh();
    } catch {
      setError("Couldn't post your reply — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-card border border-border bg-white p-4"
      aria-label="Reply to this topic"
    >
      <label htmlFor="reply-body" className="block text-sm font-semibold text-ink">
        Your reply <span className="font-normal text-muted">— plain text, be kind</span>
      </label>
      <textarea
        id="reply-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={5000}
        rows={4}
        placeholder="Share your thoughts…"
        className="mt-1.5 w-full resize-y rounded-input border border-border bg-white px-3 py-2.5 text-base text-ink placeholder:text-placeholder transition-colors focus:border-heading focus:outline-2 focus:-outline-offset-2 focus:outline-heading/30"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-3 flex">
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          className="group inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-brand bg-brand px-6 py-3 text-base font-semibold text-white transition-all hover:bg-brand-light active:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto sm:w-auto"
        >
          {pending ? 'Posting…' : 'Reply'}
          {!pending && (
            <ArrowRight
              strokeWidth={2}
              className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-2"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    </form>
  );
}
