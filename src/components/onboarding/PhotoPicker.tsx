'use client';

/**
 * Profile photo control for the onboarding/edit form.
 *
 * Controlled: `value` is whatever gets saved to `photoUrl` — always an
 * `avatars/<uid>/…` object path in our bucket: uploaded here, or downloaded
 * from LinkedIn by the scrape. There is no image-URL field on purpose: photos
 * are never stored as links (LinkedIn's expire in about five weeks).
 */
import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import Avatar from '@/components/Avatar';
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_ACCEPT,
  IMAGE_TYPES_LABEL,
  MAX_AVATAR_BYTES,
  isStoredAvatarPath,
} from '@/lib/images';

const MAX_MB = Math.round(MAX_AVATAR_BYTES / (1024 * 1024));

export function PhotoPicker({
  value,
  name,
  onChange,
}: {
  value: string;
  name: string;
  onChange: (next: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // let the same file be re-picked later
    if (!file) return;
    setError(null);

    if (!ALLOWED_IMAGE_TYPES[file.type]) {
      setError(`Unsupported image — use ${IMAGE_TYPES_LABEL}.`);
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError(`Your photo must be under ${MAX_MB} MB.`);
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'avatar');
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      const data: { ok?: boolean; path?: string; error?: string } | null = await res
        .json()
        .catch(() => null);
      if (!res.ok || !data?.ok || !data.path) throw new Error(data?.error ?? 'failed');
      onChange(data.path);
    } catch (err) {
      setError(
        err instanceof Error && err.message !== 'failed'
          ? err.message
          : "Couldn't upload that photo — try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  const uploaded = isStoredAvatarPath(value);

  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar src={value || null} name={name || 'Member'} size={64} className="shrink-0" />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-none border border-brand px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:border-[#c6c6c6] disabled:text-[#c6c6c6] disabled:hover:bg-transparent"
          >
            {uploading ? (
              <Loader2 aria-hidden strokeWidth={2} className="h-4 w-4 animate-spin" />
            ) : (
              <Upload aria-hidden strokeWidth={2} className="h-4 w-4" />
            )}
            {uploading ? 'Uploading…' : value ? 'Replace photo' : 'Upload photo'}
          </button>

          {value && !uploading && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                onChange('');
              }}
              className="text-sm font-medium text-muted underline underline-offset-2 transition-colors hover:text-ink"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={onPick}
        className="hidden"
        aria-label="Upload a profile photo"
      />

      <p className="mt-2 text-xs text-muted">
        {uploaded
          ? 'Saved on the forum. This photo will not expire.'
          : `JPEG, PNG, WebP or GIF, up to ${MAX_MB} MB.`}
      </p>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
