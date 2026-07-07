'use client';

/**
 * TagChips — the curated default tags as grouped one-tap toggle chips.
 * Controlled by the composer's `tags` state (slugs): tapping toggles a slug on/off.
 * Chips reflect the current selection, so a tag added via the custom input also
 * lights up here. Non-selected chips disable once MAX_TAGS is reached.
 */
import { DEFAULT_TAG_GROUPS, MAX_TAGS } from './tags';

export default function TagChips({
  selected,
  onToggle,
  disabled = false,
}: {
  selected: string[];
  onToggle: (slug: string) => void;
  disabled?: boolean;
}) {
  const atLimit = selected.length >= MAX_TAGS;

  return (
    <div className="flex flex-col gap-3">
      {DEFAULT_TAG_GROUPS.map((group) => (
        <div key={group.group}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            {group.group}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {group.tags.map((tag) => {
              const active = selected.includes(tag.slug);
              const blocked = disabled || (!active && atLimit);
              return (
                <button
                  key={tag.slug}
                  type="button"
                  onClick={() => onToggle(tag.slug)}
                  disabled={blocked}
                  aria-pressed={active}
                  className={`inline-flex min-h-8 items-center rounded-input border px-3 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    active
                      ? 'border-brand bg-brand text-white'
                      : 'border-border bg-white text-brand hover:border-brand-light hover:text-brand-light'
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
