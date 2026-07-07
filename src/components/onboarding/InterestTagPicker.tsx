'use client';

/**
 * InterestTagPicker — onboarding interest selector.
 *
 * Grouped one-tap toggle chips drawn from DEFAULT_TAG_GROUPS, plus a free-text
 * field to add a custom interest. Controlled by `value` (a list of tag slugs)
 * and `onChange`. Stored slugs later power email notifications when someone
 * posts under a tag the member follows.
 *
 * Self-contained on purpose — not coupled to the forum's TagChips composer
 * component, though it mirrors its toggle-chip look.
 */
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  DEFAULT_TAG_GROUPS,
  DEFAULT_TAG_SLUGS,
  slugifyTag,
  tagLabel,
} from '@/components/forum/tags';

// Matches the server cap in sanitizeInterestTags() so nothing gets silently
// dropped on save.
const MAX_INTEREST_TAGS = 40;

// Local copy of the onboarding input recipe (16px font → no iOS zoom, 44px tap
// target, ISB focus ring). Kept here so the picker stays self-contained.
const inputClass =
  'w-full min-h-[44px] rounded-input border border-border bg-white px-3 py-2.5 text-base text-ink ' +
  'transition-colors placeholder:text-placeholder focus:border-heading ' +
  'focus:[outline:2px_solid_rgba(30,45,140,0.3)] focus:[outline-offset:-2px]';

const chipBase =
  'inline-flex min-h-8 items-center gap-1 rounded-input border px-3 py-1 text-sm font-medium transition-colors';

export function InterestTagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const selected = new Set(value);
  const atLimit = value.length >= MAX_INTEREST_TAGS;

  function toggle(slug: string) {
    if (selected.has(slug)) {
      onChange(value.filter((s) => s !== slug));
    } else if (!atLimit) {
      onChange([...value, slug]);
    }
  }

  function addCustom(raw: string) {
    const slug = slugifyTag(raw);
    setDraft('');
    if (!slug || value.includes(slug) || atLimit) return;
    onChange([...value, slug]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addCustom(draft);
    }
  }

  // Selected slugs that aren't part of the curated defaults — surfaced as
  // removable chips so the member can still see/manage them.
  const customTags = value.filter((slug) => !DEFAULT_TAG_SLUGS.has(slug));

  return (
    <div className="flex flex-col gap-4">
      {DEFAULT_TAG_GROUPS.map((group) => (
        <div key={group.group}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            {group.group}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {group.tags.map((tag) => {
              const active = selected.has(tag.slug);
              const blocked = !active && atLimit;
              return (
                <button
                  key={tag.slug}
                  type="button"
                  onClick={() => toggle(tag.slug)}
                  disabled={blocked}
                  aria-pressed={active}
                  className={`${chipBase} disabled:cursor-not-allowed disabled:opacity-40 ${
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

      {/* Custom interests */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Add your own
        </p>

        {customTags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {customTags.map((slug) => (
              <span key={slug} className={`${chipBase} border-brand bg-brand text-white`}>
                {tagLabel(slug)}
                <button
                  type="button"
                  onClick={() => toggle(slug)}
                  aria-label={`Remove ${tagLabel(slug)}`}
                  className="-mr-1 inline-flex items-center justify-center leading-none text-white/70 transition-colors hover:text-white"
                >
                  <X aria-hidden strokeWidth={2} className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. climate-tech"
            aria-label="Add a custom interest"
            disabled={atLimit}
            className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
          />
          <button
            type="button"
            onClick={() => addCustom(draft)}
            disabled={atLimit || !draft.trim()}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-none border border-brand bg-transparent px-4 text-sm font-semibold text-brand transition-colors hover:border-brand-light hover:text-brand-light disabled:cursor-not-allowed disabled:border-[#c6c6c6] disabled:text-[#c6c6c6]"
          >
            <Plus aria-hidden strokeWidth={2} className="h-5 w-5" />
            Add
          </button>
        </div>

        {atLimit && (
          <p className="mt-2 text-xs text-muted">
            That&apos;s the maximum of {MAX_INTEREST_TAGS} interests.
          </p>
        )}
      </div>
    </div>
  );
}
