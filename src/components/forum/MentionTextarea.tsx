'use client';

/**
 * MentionTextarea — a controlled <textarea> with an @-autocomplete dropdown.
 *
 * Type `@` (at the start of the text or after whitespace) then part of a name;
 * a dropdown of members appears. Arrow keys move the highlight, Enter/Tab (or a
 * click/tap) inserts the mention as a `@[Full Name](uid)` token into the body,
 * Escape dismisses. Candidates come from GET /api/members?q=.
 *
 * Controlled contract:
 *   value            — the raw body text (contains @[Name](uid) tokens)
 *   onChange(text)   — new body text
 *   onMentionsChange(uids) — the uids currently mentioned in the text
 *                            (derived via extractMentionUids)
 * Passthrough props (id/placeholder/rows/maxLength/className) drop it into the
 * existing composer forms in place of a plain <textarea>.
 */
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type SyntheticEvent,
} from 'react';
import Avatar from '@/components/Avatar';
import { extractMentionUids, formatMention } from './mentions';

interface MemberLite {
  uid: string;
  name: string;
  photoUrl: string | null;
}

/**
 * The active mention query at the caret: an `@` at start-of-text or after
 * whitespace, then up to 40 name chars. Brackets/parens/`@`/newline are
 * excluded — they never appear mid-name and signal an already-inserted token,
 * so the dropdown never reopens on a completed mention.
 */
const TRIGGER_RE = /(?:^|\s)@([^[\]()@\n]{0,40})$/;

// Mirrors the composer textareas' styling (globals.css tokens).
const inputClass =
  'w-full rounded-input border border-border bg-white px-3 py-2.5 text-base text-ink placeholder:text-placeholder transition-colors focus:border-heading focus:outline-2 focus:-outline-offset-2 focus:outline-heading/30';

export default function MentionTextarea({
  value,
  onChange,
  onMentionsChange,
  id,
  placeholder,
  rows = 4,
  maxLength,
  className = '',
}: {
  value: string;
  onChange: (text: string) => void;
  onMentionsChange: (uids: string[]) => void;
  id?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listboxId = useId();
  const [query, setQuery] = useState<string | null>(null); // null = not mentioning
  const [atIndex, setAtIndex] = useState(-1); // index of the active `@`
  const [candidates, setCandidates] = useState<MemberLite[]>([]);
  const [highlight, setHighlight] = useState(0);
  const pendingCaret = useRef<number | null>(null);

  const open = query !== null && candidates.length > 0;

  /** Recompute the active mention query from the text + caret position. */
  const syncTrigger = useCallback((text: string, caret: number) => {
    const before = text.slice(0, caret);
    const m = TRIGGER_RE.exec(before);
    if (m) {
      setQuery(m[1]);
      setAtIndex(caret - m[1].length - 1);
    } else {
      setQuery(null);
      setAtIndex(-1);
      setCandidates((c) => (c.length === 0 ? c : [])); // no churn when already empty
    }
  }, []);

  // Fetch candidates (debounced) whenever the active query changes.
  useEffect(() => {
    if (query === null) return; // candidates are cleared on the event path
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/members?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { ok?: boolean; members?: MemberLite[] } | null) => {
          if (data?.ok && Array.isArray(data.members)) {
            setCandidates(data.members);
            setHighlight(0);
          } else {
            setCandidates([]);
          }
        })
        .catch(() => {
          /* aborted / network error — leave candidates empty */
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Restore the caret after a programmatic value change (mention insert).
  useLayoutEffect(() => {
    if (pendingCaret.current !== null && textareaRef.current) {
      const pos = pendingCaret.current;
      pendingCaret.current = null;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(pos, pos);
    }
  });

  function emit(text: string) {
    onChange(text);
    onMentionsChange(extractMentionUids(text));
  }

  function close() {
    setQuery(null);
    setAtIndex(-1);
    setCandidates([]);
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    emit(text);
    syncTrigger(text, e.target.selectionStart ?? text.length);
  }

  function handleSelect(e: SyntheticEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    syncTrigger(el.value, el.selectionStart ?? el.value.length);
  }

  function pick(member: MemberLite) {
    if (atIndex < 0) return;
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? atIndex + (query?.length ?? 0) + 1;
    const token = formatMention(member.name, member.uid);
    const next = `${value.slice(0, atIndex)}${token} ${value.slice(caret)}`;
    pendingCaret.current = atIndex + token.length + 1; // after the trailing space
    close();
    emit(next);
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % candidates.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + candidates.length) % candidates.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      pick(candidates[highlight]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  const activeOptionId = open ? `${listboxId}-opt-${highlight}` : undefined;

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Delay so a mousedown/tap on an option runs first.
          window.setTimeout(close, 120);
        }}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        className={`${inputClass} ${className}`}
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Members to mention"
          className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-card border border-border bg-white py-1 shadow-pop"
        >
          {candidates.map((m, i) => (
            <li
              key={m.uid}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus in the textarea
                pick(m);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                i === highlight ? 'bg-surface-2 text-brand' : 'text-ink'
              }`}
            >
              <Avatar src={m.photoUrl} name={m.name} size={24} className="shrink-0" />
              <span className="min-w-0 truncate font-medium">{m.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
