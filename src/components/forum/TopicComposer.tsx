'use client';

/**
 * TopicComposer — "Start a topic" button + modal composer.
 * Title, plain-text body, tag chips (comma/Enter, ≤5). On success navigates
 * to the new thread.
 */
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { MAX_TAGS, slugifyTag } from './tags';

const inputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-ink placeholder:text-neutral-400 focus:border-brand-light focus:outline-none focus:ring-2 focus:ring-brand-light/25';

export default function TopicComposer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function addTag(raw: string) {
    const slug = slugifyTag(raw);
    setTagInput('');
    if (!slug) return;
    setTags((prev) =>
      prev.includes(slug) || prev.length >= MAX_TAGS ? prev : [...prev, slug],
    );
  }

  function onTagKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(tagInput);
    } else if (event.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || pending) return;

    // Fold any uncommitted tag text into the list.
    const finalTags = [...tags];
    const rest = slugifyTag(tagInput);
    if (rest && !finalTags.includes(rest) && finalTags.length < MAX_TAGS) finalTags.push(rest);

    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmedTitle, body: body.trim(), tags: finalTags }),
      });
      const data: { ok?: boolean; id?: string; error?: string } | null = await res
        .json()
        .catch(() => null);
      if (!res.ok || !data?.ok || !data.id) {
        throw new Error(data?.error ?? 'failed');
      }
      router.push(`/forum/${data.id}`);
      router.refresh();
      // Keep `pending` true — we're navigating away.
    } catch (err) {
      setError(err instanceof Error && err.message !== 'failed' ? err.message : "Couldn't post your topic — try again.");
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light"
      >
        Start a topic
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="topic-composer-heading"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-[8vh]"
          onClick={(event) => {
            if (event.target === event.currentTarget && !pending) setOpen(false);
          }}
        >
          <form
            onSubmit={submit}
            className="w-full max-w-xl rounded-xl border border-neutral-200 bg-white p-6 shadow-lg"
          >
            <h2 id="topic-composer-heading" className="font-display text-lg font-semibold text-ink">
              Start a topic
            </h2>

            <label htmlFor="topic-title" className="mt-4 block text-xs font-medium text-neutral-500">
              Title
            </label>
            <input
              id="topic-title"
              ref={titleRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
              placeholder="What do you want to discuss?"
              className={`mt-1 ${inputClass}`}
            />

            <label htmlFor="topic-body" className="mt-4 block text-xs font-medium text-neutral-500">
              Body <span className="font-normal text-neutral-400">— plain text, be kind</span>
            </label>
            <textarea
              id="topic-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={10000}
              rows={6}
              placeholder="Add context, links, questions…"
              className={`mt-1 resize-y ${inputClass}`}
            />

            <label htmlFor="topic-tags" className="mt-4 block text-xs font-medium text-neutral-500">
              Tags <span className="font-normal text-neutral-400">— up to {MAX_TAGS}, comma or Enter</span>
            </label>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 focus-within:border-brand-light focus-within:ring-2 focus-within:ring-brand-light/25">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-brand"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                    aria-label={`Remove tag ${tag}`}
                    className="text-brand/60 transition-colors hover:text-brand"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                id="topic-tags"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={() => addTag(tagInput)}
                disabled={tags.length >= MAX_TAGS}
                placeholder={tags.length >= MAX_TAGS ? 'Max 5 tags' : 'e.g. fundraising'}
                className="min-w-24 flex-1 border-none bg-transparent px-1 py-0.5 text-sm text-ink placeholder:text-neutral-400 focus:outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500 transition-colors hover:bg-surface hover:text-ink disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || title.trim().length === 0}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? 'Posting…' : 'Post topic'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
