"use client";

import { useState } from "react";
import { initials } from "@/lib/format";
import { avatarSrc } from "@/lib/images";

/**
 * Round member photo, or a brand-tinted initials circle when there's no photo
 * or the photo fails to load.
 *
 * `src` takes a raw stored `photoUrl`, which is either an `avatars/…` object
 * path (ours, permanent) or a legacy remote URL; avatarSrc resolves both. The
 * onError fallback still matters, because the remaining legacy values are
 * LinkedIn signed URLs that expire and start 403ing — see mirrorRemoteAvatar.
 *
 * Uses a plain <img> on purpose: routing avatars through Next's on-container
 * image optimizer added real latency (a server-side fetch + re-encode per
 * avatar) and could hang on licdn throttling. A direct, lazy <img> lets the
 * browser fetch them off the critical path — the page renders instantly,
 * photos fill in after.
 */
export default function Avatar({
  src,
  name,
  size = 32,
  className = "",
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = avatarSrc(src);

  if (resolved && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars are intentionally unoptimized (see file header)
      <img
        src={resolved}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`rounded-full object-cover ring-1 ring-border ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex select-none items-center justify-center rounded-full bg-brand/10 font-semibold text-brand ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.38)),
      }}
    >
      {initials(name)}
    </span>
  );
}
