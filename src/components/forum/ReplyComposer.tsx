'use client';

/**
 * ReplyComposer — textarea + Reply button.
 *
 * Two modes:
 *  - top-level (no `parentId`): the composer at the bottom of a thread.
 *  - nested (`parentId` set + `onDone`): an inline reply under a specific reply;
 *    autofocuses, shows a Cancel button, and closes itself via `onDone` on
 *    success or cancel.
 * POSTs /api/topics/[id]/replies (with parentId when nested), then refreshes.
 */
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import ImageUploader from './ImageUploader';
import IviArrow from '@/components/IviArrow';

export default function ReplyComposer({
  topicId,
  parentId = null,
  onDone,
}: {
  topicId: string;
  parentId?: string | null;
  onDone?: () => void;
}) {
  const router = useRouter();
  const fieldId = useId();
  const nested = Boolean(parentId);
  const [body, setBody] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = body.trim().length > 0 || images.length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || pending) return;

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/topics/${topicId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim(), images, parentId }),
      });
      const data: { ok?: boolean; id?: string; error?: string } | null = await res
        .json()
        .catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? 'failed');
      setBody('');
      setImages([]);
      router.refresh();
      onDone?.();
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
      aria-label={nested ? 'Reply to this comment' : 'Reply to this topic'}
    >
      <label htmlFor={fieldId} className="block text-sm font-semibold text-ink">
        {nested ? 'Your reply' : 'Your reply'}{' '}
        <span className="font-normal text-muted">— plain text, be kind</span>
      </label>
      <textarea
        id={fieldId}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={5000}
        rows={nested ? 3 : 4}
        autoFocus={nested}
        placeholder="Share your thoughts…"
        className="mt-1.5 w-full resize-y rounded-input border border-border bg-white px-3 py-2.5 text-base text-ink placeholder:text-placeholder transition-colors focus:border-heading focus:outline-2 focus:-outline-offset-2 focus:outline-heading/30"
      />
      <div className="mt-3">
        <ImageUploader value={images} onChange={setImages} disabled={pending} />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {nested && (
          <button
            type="button"
            onClick={() => onDone?.()}
            disabled={pending}
            className="inline-flex min-h-[44px] items-center justify-center rounded-brand border border-brand px-6 py-3 text-base font-semibold text-brand transition-colors hover:border-brand-light hover:text-brand-light disabled:opacity-60 sm:min-h-0 sm:py-2.5"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="group inline-flex min-h-[44px] items-center justify-center gap-2 rounded-brand bg-brand px-6 py-3 text-base font-semibold text-white transition-all hover:bg-brand-light active:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:py-2.5"
        >
          {pending ? 'Posting…' : 'Reply'}
          {!pending && (
            <IviArrow
              dir="right"
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
