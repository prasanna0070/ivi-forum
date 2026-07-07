'use client';

/**
 * TopicComposer — "Start a topic" button + composer.
 * Full-screen sheet on mobile (safe-area padded, sticky action bar); centered
 * modal on desktop. Title, plain-text body, tag chips (comma/Enter, ≤5). On
 * success navigates to the new thread.
 */
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { X } from 'lucide-react';
import { DEFAULT_TAG_SLUGS, MAX_TAGS, slugifyTag } from './tags';
import ImageUploader from './ImageUploader';
import TagChips from './TagChips';
import { MAX_IMAGES } from '@/lib/images';
import IviArrow from '@/components/IviArrow';

const inputClass =
  'w-full rounded-input border border-border bg-white px-3 py-2.5 text-base text-ink placeholder:text-placeholder transition-colors focus:border-heading focus:outline-2 focus:-outline-offset-2 focus:outline-heading/30';

export default function TopicComposer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [images, setImages] = useState<string[]>([]);
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

  function toggleTag(slug: string) {
    setTags((prev) =>
      prev.includes(slug)
        ? prev.filter((t) => t !== slug)
        : prev.length >= MAX_TAGS
          ? prev
          : [...prev, slug],
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
        body: JSON.stringify({ title: trimmedTitle, body: body.trim(), tags: finalTags, images }),
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
        className="group inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-brand bg-brand px-6 py-3 text-base font-semibold text-white transition-all hover:bg-brand-light active:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heading/40 sm:w-auto"
      >
        Start a topic
        <IviArrow dir="right"
          strokeWidth={2}
          className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-2"
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="topic-composer-heading"
          className="fixed inset-0 z-50 flex bg-ink/40 md:items-start md:justify-center md:overflow-y-auto md:p-4 md:pt-[8vh]"
          onClick={(event) => {
            if (event.target === event.currentTarget && !pending) setOpen(false);
          }}
        >
          <form
            onSubmit={submit}
            className="flex h-full w-full flex-col bg-white md:h-auto md:max-h-[85vh] md:max-w-xl md:rounded-card md:border md:border-border md:shadow-pop"
          >
            {/* Header — stays in view while the body scrolls */}
            <div className="flex items-center justify-between gap-4 border-b border-border px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:px-6 md:pt-4">
              <h2 id="topic-composer-heading" className="font-serif text-xl font-medium text-heading">
                Start a topic
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (!pending) setOpen(false);
                }}
                disabled={pending}
                aria-label="Close"
                className="-mr-1 flex h-11 w-11 items-center justify-center rounded-card text-muted transition-colors hover:bg-surface-2 hover:text-brand disabled:opacity-60 md:h-9 md:w-9"
              >
                <X strokeWidth={2} className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Body — the only scrollable region */}
            <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
              <label htmlFor="topic-title" className="block text-sm font-semibold text-ink">
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
                className={`mt-1.5 ${inputClass}`}
              />

              <label htmlFor="topic-body" className="mt-4 block text-sm font-semibold text-ink">
                Body <span className="font-normal text-muted">— plain text, be kind</span>
              </label>
              <textarea
                id="topic-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={10000}
                rows={6}
                placeholder="Add context, links, questions…"
                className={`mt-1.5 resize-y ${inputClass}`}
              />

              <label className="mt-4 block text-sm font-semibold text-ink">
                Tags <span className="font-normal text-muted">— up to {MAX_TAGS}; tap to add</span>
              </label>
              <div className="mt-2">
                <TagChips selected={tags} onToggle={toggleTag} disabled={pending} />
              </div>

              <label htmlFor="topic-tags" className="mt-3 block text-xs font-medium text-muted">
                Or add your own <span className="font-normal">— comma or Enter</span>
              </label>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-input border border-border bg-white px-2 py-1.5 transition-colors focus-within:border-heading focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-heading/30">
                {tags.filter((t) => !DEFAULT_TAG_SLUGS.has(t)).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-input border border-border bg-surface px-2 py-0.5 text-xs font-medium text-brand"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      aria-label={`Remove tag ${tag}`}
                      className="text-brand/60 transition-colors hover:text-brand"
                    >
                      <X strokeWidth={2} className="h-3 w-3" aria-hidden="true" />
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
                  placeholder={tags.length >= MAX_TAGS ? `Max ${MAX_TAGS} tags` : 'e.g. fundraising'}
                  className="min-w-24 flex-1 border-none bg-transparent px-1 py-0.5 text-base text-ink placeholder:text-placeholder focus:outline-none"
                />
              </div>

              <div className="mt-4 block text-sm font-semibold text-ink">
                Images <span className="font-normal text-muted">— up to {MAX_IMAGES}, 5 MB each</span>
              </div>
              <div className="mt-1.5">
                <ImageUploader value={images} onChange={setImages} disabled={pending} />
              </div>

              {error && (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {error}
                </p>
              )}
            </div>

            {/* Action bar — pinned bottom on mobile, primary on top when stacked */}
            <div className="flex flex-col-reverse gap-3 border-t border-border px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:flex-row md:justify-end md:px-6 md:py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-brand border border-brand px-6 py-3 text-base font-semibold text-brand transition-colors hover:border-brand-light hover:text-brand-light disabled:opacity-60 md:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || title.trim().length === 0}
                className="group inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-brand bg-brand px-6 py-3 text-base font-semibold text-white transition-all hover:bg-brand-light active:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
              >
                {pending ? 'Posting…' : 'Post topic'}
                {!pending && (
                  <IviArrow dir="right"
                    strokeWidth={2}
                    className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-2"
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
