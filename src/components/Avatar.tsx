import Image from "next/image";
import { initials } from "@/lib/format";

/**
 * Round member photo, or a brand-tinted initials circle when no photo.
 * Photo hosts must be allowed in next.config.ts images.remotePatterns
 * (licdn.com / googleusercontent.com are).
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
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex select-none items-center justify-center rounded-full bg-brand/10 font-medium text-brand ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
    >
      {initials(name)}
    </span>
  );
}
