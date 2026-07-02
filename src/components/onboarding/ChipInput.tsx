'use client';

/**
 * Skills chip input — type + Enter (or comma) to add, × to remove,
 * Backspace on an empty input removes the last chip.
 */
import { useState } from 'react';

interface ChipInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Max number of chips (default 30, matching the API cap). */
  max?: number;
  /** Max length of a single chip (default 40, matching the API cap). */
  maxLength?: number;
}

export function ChipInput({
  value,
  onChange,
  placeholder = 'Type a skill and press Enter',
  max = 30,
  maxLength = 40,
}: ChipInputProps) {
  const [draft, setDraft] = useState('');

  function addChip(text: string) {
    const chip = text.trim().slice(0, maxLength);
    if (!chip || value.length >= max) return;
    if (value.some((v) => v.toLowerCase() === chip.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, chip]);
    setDraft('');
  }

  function removeChip(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addChip(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      removeChip(value.length - 1);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-2 py-2 focus-within:border-brand-light focus-within:ring-2 focus-within:ring-brand-light/20">
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((chip, i) => (
          <span
            key={`${chip}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-brand/5 px-2.5 py-1 text-xs font-medium text-brand"
          >
            {chip}
            <button
              type="button"
              onClick={() => removeChip(i)}
              aria-label={`Remove ${chip}`}
              className="rounded-full px-0.5 leading-none text-brand/50 transition-colors hover:text-brand"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addChip(draft)}
          placeholder={value.length === 0 ? placeholder : ''}
          maxLength={maxLength}
          className="min-w-32 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-ink placeholder:text-neutral-400 focus:outline-none"
        />
      </div>
    </div>
  );
}
