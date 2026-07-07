/**
 * MentionedBody — server component that renders a post/reply body with
 * `@[Name](uid)` tokens turned into links to /profile/<uid>, while preserving
 * plain text (including newlines) via `whitespace-pre-line`.
 *
 * Drop-in replacement for the raw `<p className="whitespace-pre-line …">{body}</p>`
 * blocks in the thread page + ReplyTree. `whitespace-pre-line` is always applied;
 * pass the rest of the classes (spacing/type) via `className`.
 */
import Link from 'next/link';
import { parseMentions } from './mentions';

export default function MentionedBody({
  body,
  className = 'text-base leading-[1.6] text-ink',
}: {
  body: string;
  className?: string;
}) {
  const segments = parseMentions(body);

  return (
    <p className={`whitespace-pre-line ${className}`}>
      {segments.map((seg, i) =>
        seg.type === 'mention' ? (
          <Link
            key={i}
            href={`/profile/${seg.uid}`}
            className="font-medium text-brand hover:text-brand-light"
          >
            @{seg.name}
          </Link>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </p>
  );
}
