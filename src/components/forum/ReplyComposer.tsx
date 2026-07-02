'use client';

/**
 * ReplyComposer — textarea + Reply button at the bottom of a thread.
 * POSTs /api/topics/[id]/replies, then clears and refreshes the page data.
 */
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

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
      className="rounded-xl border border-neutral-200 bg-white p-4"
      aria-label="Reply to this topic"
    >
      <label htmlFor="reply-body" className="block text-xs font-medium text-neutral-500">
        Your reply <span className="font-normal text-neutral-400">— plain text, be kind</span>
      </label>
      <textarea
        id="reply-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={5000}
        rows={4}
        placeholder="Share your thoughts…"
        className="mt-1 w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-ink placeholder:text-neutral-400 focus:border-brand-light focus:outline-none focus:ring-2 focus:ring-brand-light/25"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Posting…' : 'Reply'}
        </button>
      </div>
    </form>
  );
}
