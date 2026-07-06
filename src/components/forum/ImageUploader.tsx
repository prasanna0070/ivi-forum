'use client';

/**
 * ImageUploader — attach images to a topic/reply.
 *
 * Controlled: `value` is the list of uploaded object paths, `onChange` reports
 * the new list. Files upload to /api/uploads immediately on pick; the returned
 * path is appended. Shows thumbnails with remove buttons + in-flight spinners.
 * Validates type/size client-side (the API re-validates) and caps at MAX_IMAGES.
 */
import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_ACCEPT,
  IMAGE_TYPES_LABEL,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  imageSrc,
} from '@/lib/images';

export default function ImageUploader({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (paths: string[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_IMAGES - value.length - uploading;

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = ''; // let the same file be re-picked later
    if (picked.length === 0) return;
    setError(null);

    const files = picked.slice(0, Math.max(0, remaining));
    if (picked.length > files.length) {
      setError(`You can attach up to ${MAX_IMAGES} images.`);
    }

    // Accumulate locally so sequential uploads don't append to a stale `value`.
    const acc = [...value];
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES[file.type]) {
        setError(`Unsupported image — use ${IMAGE_TYPES_LABEL}.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError('Each image must be under 5 MB.');
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/uploads', { method: 'POST', body: fd });
        const data: { ok?: boolean; path?: string; error?: string } | null = await res
          .json()
          .catch(() => null);
        if (!res.ok || !data?.ok || !data.path) throw new Error(data?.error ?? 'failed');
        acc.push(data.path);
        onChange([...acc]);
      } catch (err) {
        setError(
          err instanceof Error && err.message !== 'failed'
            ? err.message
            : "Couldn't upload that image — try again.",
        );
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function remove(path: string) {
    onChange(value.filter((p) => p !== path));
  }

  const canAdd = !disabled && remaining > 0;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((path) => (
          <div
            key={path}
            className="relative h-20 w-20 overflow-hidden rounded-input border border-border bg-surface"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc(path)} alt="Attached image" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(path)}
              disabled={disabled}
              aria-label="Remove image"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-white transition-colors hover:bg-ink disabled:opacity-60"
            >
              <X strokeWidth={2.5} className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}

        {Array.from({ length: uploading }).map((_, i) => (
          <div
            key={`up-${i}`}
            className="flex h-20 w-20 items-center justify-center rounded-input border border-dashed border-border bg-surface text-muted"
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-label="Uploading" />
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-input border border-dashed border-border text-muted transition-colors hover:border-brand hover:text-brand"
          >
            <ImagePlus strokeWidth={2} className="h-5 w-5" aria-hidden="true" />
            <span className="text-[11px] font-medium">Image</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        onChange={onPick}
        className="hidden"
      />

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
